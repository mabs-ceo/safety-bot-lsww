const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/DB.config");
const { whatsappQueue } = require("./src/queues/whatsapp.queue");

// Starts the BullMQ worker in this same process — it listens on the
// "whatsapp-messages" queue and calls processWhatsappMessage() for each
// job (finding: / close: / view$ logic all lives there now, not here).
require("./src/workers/whatsapp.worker");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
app.use(express.json());

app.get("/test", async (req, res) => {
  try {
    console.log("✅ Selected group fetched successfully");
    res.json("webhook working");
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

app.post("/webhook", async (req, res) => {
  console.log("✅ Webhook called");
  const messages = req.body?.messages || [];
  const ALLOWED_GROUP_ID = process.env.GROUP_ID;

  // This handler does ONE job: filter + enqueue. It does not parse
  // "finding:"/"close:"/"view$", does not call replyToGroup, and does
  // not know about safetyFindingsController — all of that lives in
  // src/services/whatsapp.service.js and runs inside the worker.
  //
  // Keeping that logic out of here is what lets res.sendStatus(200) fire
  // once, immediately, regardless of which command was sent or whether
  // it succeeds — the webhook response and the actual processing are
  // now fully decoupled.
  for (const message of messages) {
    if (message.chat_id !== ALLOWED_GROUP_ID) continue;

    // jobId: message.id makes this idempotent — if whapi.cloud redelivers
    // the same webhook payload, BullMQ won't queue a duplicate job.
    await whatsappQueue.add(
      "process-message",
      { message, allowedGroupId: ALLOWED_GROUP_ID },
      { jobId: message.id },
    );
    console.log(`📥 Queued message ${message.id}`);
  }

  // Single response, always last, never inside the loop.
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
