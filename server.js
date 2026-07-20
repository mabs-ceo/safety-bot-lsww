const express = require("express");
const helmet = require("helmet");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./src/config/DB.config");

const cors = require("cors");
const {
  replyToGroup,
  processWhatsappMessage,
} = require("./src/services/whatsapp.service");

// ---------------------------------------------------------------------------
// Env validation — fail fast at boot instead of crashing on the first request
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS = ["GROUP_ID", "AUTHORIZED_NUMBERS", "SAFETY_NUM"];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length) {
  console.error(
    `❌ Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

const ALLOWED_GROUP_ID = process.env.GROUP_ID;
const AUTHORIZED_NUMBERS = process.env.AUTHORIZED_NUMBERS.split(",");
const SAFETY_NUM = process.env.SAFETY_NUM;
const KEYWORDS = ["finding:", "close$", "view$", "no$"];

// job (finding: / close: / view$ logic all lives there now, not here).

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// CORS — origin allowlist as a lookup + dynamic origin function.
// NOTE: the previous version passed an *array* of option objects directly to
// cors(), which the cors package does not support as a multi-origin
// allowlist (it expects a single object or a function). This preserves the
// exact same allowed origins, methods, and headers, but actually enforces
// the restriction.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  BASE_URL,
  "http://localhost:3000",
  "https://feeble-resume-android.ngrok-free.dev",
  "https://safety-bot-lsww.onrender.com",
];

const corsOptions = {
  origin(origin, callback) {
    // allow non-browser requests (no Origin header, e.g. webhook callers)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const app = express();

// Required on Render/behind any reverse proxy so req.ip, secure cookies,
// and rate limiting see the real client IP instead of the proxy's.
app.set("trust proxy", 1);

app.use(cors(corsOptions));
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(helmet());

// ---------------------------------------------------------------------------
// Minimal in-memory rate limiter for the webhook endpoint, so a retry storm
// or misbehaving client can't hammer the process. Fine for a single
// instance; swap for a shared store (Redis) if you scale to multiple
// instances.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const requestLog = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const timestamps = (requestLog.get(key) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

app.get("/", async (req, res) => {
  try {
    console.log("✅ Selected group fetched successfully");
    res.json("webhook working");
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

app.post("/webhook", async (req, res) => {
  console.log("✅ Webhook called");

  if (isRateLimited(req.ip)) {
    console.warn(`⚠️ Rate limit exceeded for ${req.ip}`);
    return res.sendStatus(429);
  }

  const messages = req.body?.messages ?? [];
  if (messages.length && messages[0].chat_id !== ALLOWED_GROUP_ID) {
    return res.sendStatus(200);
  }
  console.log(`📥 Received ${messages.length} messages: `);
  if (!messages.length) {
    return res.sendStatus(200);
  }

  const jobs = [];

  for (const message of messages) {
    if (message.chat_id !== ALLOWED_GROUP_ID) continue;

    let text = message.text?.body || message.image?.caption;
    const context = message.context?.quoted_id || null;
    if (context) {
      console.log(`✅ Quoted message context: ${context}`);
      let subKeyWOrd = "";
    }
    if (!text) continue;

    const lower = text.toLowerCase();

    if (lower.includes("view$") && !AUTHORIZED_NUMBERS.includes(message.from)) {
      await replyToGroup(
        `❌ You are not authorized to view safety observations summary.`,
      );
      return res.sendStatus(200);
    }

    if (lower.includes("no$") && message.from !== SAFETY_NUM) {
      await replyToGroup(
        `❌ You are not authorized to reopen safety observations.`,
      );
      return res.sendStatus(200);
    }

    if (!KEYWORDS.some((keyword) => lower.includes(keyword))) {
      console.log(`⏭️ Skipped ${message.id}`);
      continue;
    }

    console.log("not skipping");

    jobs.push(message);
  }

  for (const job of jobs) {
    try {
      await processWhatsappMessage(job);
    } catch (error) {
      console.error("❌ Failed to process message:", error);
    }
  }

  res.sendStatus(200);
});

// ---------------------------------------------------------------------------
// 404 + global error handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "Internal server error" });
});

// ---------------------------------------------------------------------------
// Process-level safety nets — log instead of letting Render silently
// restart on an unhandled rejection with no trace of why.
// ---------------------------------------------------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — Render sends SIGTERM on every redeploy/scale event.
// Let in-flight requests finish instead of dropping them mid-webhook.
// ---------------------------------------------------------------------------
let server;

function shutdown(signal) {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  if (!server) return process.exit(0);

  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });

  // Force-exit if something hangs
  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const start = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

start();
