const { Worker } = require("bullmq");
const connection = require("../config/redis.config");
const { QUEUE_NAME } = require("../queues/whatsapp.queue");
const { processWhatsappMessage } = require("../services/whatsapp.service");

// The Worker listens on the same queue name the producer (webhook) pushes to.
// job.data is whatever was passed to queue.add() — here it's { message, allowedGroupId }.
const whatsappWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { message, allowedGroupId } = job.data;
    console.log(
      `⚙️  Processing job ${job.id} (attempt ${job.attemptsMade + 1})`,
    );
    // The `return` here matters: BullMQ saves whatever the processor
    // returns as job.returnvalue, which is how the /recent endpoint
    // below finds out what happened without touching a database.
    return await processWhatsappMessage(message, allowedGroupId);
  },
  {
    connection,
    // How many jobs this worker processes in parallel. Since each job does
    // network + DB calls (not CPU-heavy), a small concurrency is safe and
    // helps keep messages processed roughly in order for a busy group.
    concurrency: 5,
  },
);

whatsappWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

whatsappWorker.on("failed", (job, err) => {
  console.log(err);
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

module.exports = whatsappWorker;
