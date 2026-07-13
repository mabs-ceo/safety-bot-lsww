const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./src/config/DB.config");
const { whatsappQueue } = require("./src/queues/whatsapp.queue");
const cors = require("cors");
const ALLOWED_GROUP_ID = process.env.GROUP_ID;
const KEYWORDS = ["finding:", "close$:", "view$"];
// Starts the BullMQ worker in this same process — it listens on the
// "whatsapp-messages" queue and calls processWhatsappMessage() for each
// job (finding: / close: / view$ logic all lives there now, not here).
require("./src/workers/whatsapp.worker");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const corsOptions = [
  {
    origin: BASE_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  // {
  //   origin: "http://localhost:3000",
  //   methods: ["GET", "POST"],
  //   allowedHeaders: ["Content-Type", "Authorization"],
  //   credentials: true,
  // },
];
const app = express();
app.use(cors(corsOptions));
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

  if (!messages.length) {
    return res.sendStatus(200);
  }

  const jobs = [];

  for (const message of messages) {
    console.log(`📥 Received ${message.id} from ${message.chat_id}`);

    if (message.chat_id !== ALLOWED_GROUP_ID) continue;

    const text = message.text?.body || message.image?.caption;

    if (!text) continue;

    const lower = text.toLowerCase();

    if (!KEYWORDS.some((keyword) => lower.includes(keyword))) {
      console.log(`⏭️ Skipped ${message.id}`);
      continue;
    }

    console.log("not skipping");

    jobs.push(
      whatsappQueue.add("process-message", { message }, { jobId: message.id }),
    );
  }

  try {
    console.log(
      `📥 Enqueuing ${jobs.length} jobs... called BULLMQ using UPSTASH`,
    );
    await Promise.all(jobs);
  } catch (err) {
    console.error("Failed to enqueue jobs:", err);
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
