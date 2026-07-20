const { Queue } = require("bullmq");
const connection = require("../config/redis.config");

// Queue name is also used by the Worker to know which queue to listen on —
// keep this string identical in both files.
const QUEUE_NAME = "whatsapp-messages";

const whatsappQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    // If processing a message fails (e.g. Mongo blip, whapi.cloud 500),
    // retry up to 3 times with exponential backoff instead of losing the job.
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s
    },
    // Auto-clean old jobs from Redis so the queue doesn't grow forever.
    removeOnComplete: { age: 3600 }, // keep completed jobs for 1 hour
    removeOnFail: { age: 86400 }, // keep failed jobs for 1 day (for debugging)
  },
});

module.exports = { whatsappQueue, QUEUE_NAME };
