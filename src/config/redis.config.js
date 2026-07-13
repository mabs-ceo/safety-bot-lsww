const IORedis = require("ioredis");
const dotenv = require("dotenv");
dotenv.config();
// --- Upstash Redis connection ---
// Get this from Upstash console → your database → "Redis" tab →
// copy the "ioredis" connection string. It looks like:
//   rediss://default:<password>@<endpoint>.upstash.io:6379
// Note the DOUBLE "s" in "rediss://" — that's TLS-enabled Redis, required
// by Upstash. A plain "redis://" URL will fail to connect.
const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  // Required by BullMQ regardless of provider — without this, BullMQ
  // throws an error on startup.
  maxRetriesPerRequest: null,

  // Upstash terminates idle TCP connections, and free/low tiers can be
  // slower to respond to the initial handshake. These two options stop
  // ioredis from giving up too early or blocking startup waiting on a
  // slow "ready" check.
  enableReadyCheck: false,
  connectTimeout: 10000,

  // Upstash requires TLS. Passing an empty object enables it with
  // Node's default (secure) settings — do NOT set rejectUnauthorized:
  // false, that would disable certificate verification.
  tls: {},

  // Auto-reconnect with a capped backoff instead of giving up — serverless
  // Redis can drop idle connections more aggressively than self-hosted.
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

connection.on("connect", () => {
  console.log("✅ Upstash Redis connected (BullMQ)");
});

connection.on("error", (err) => {
  console.error("❌ Upstash Redis connection error:", err.message);
});

module.exports = connection;
