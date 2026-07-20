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
const ALLOWED_GROUP_ID = process.env.GROUP_ID;
const KEYWORDS = ["finding:", "close$", "view$", "no$"];
// Starts the BullMQ worker in this same process — it listens on the
// "whatsapp-messages" queue and calls processWhatsappMessage() for each
// job (finding: / close: / view$ logic all lives there now, not here).

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const corsOptions = [
  {
    origin: BASE_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  {
    origin: "https://feeble-resume-android.ngrok-free.dev",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  {
    origin: "https://safety-bot-lsww.onrender.com",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
];
const app = express();
app.use(cors(corsOptions));
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(helmet());

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
    const authorizedNumbers = process.env.AUTHORIZED_NUMBERS.split(",");

    if (lower.includes("view$") && !authorizedNumbers.includes(message.from)) {
      await replyToGroup(
        `❌ You are not authorized to view safety observations summary.`,
      );
      return;
    }

    const safetyNum = process.env.SAFETY_NUM;
    if (lower.includes("no$") && message.from !== safetyNum) {
      await replyToGroup(
        `❌ You are not authorized to reopen safety observations.`,
      );
      return;
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

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

start();
