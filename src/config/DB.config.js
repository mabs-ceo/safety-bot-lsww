const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;
const ATLASDB_URI = process.env.ATLASDB_URI;

const connectDB = async (attempt = 1) => {
  try {
    console.log(
      `Connecting to MongoDB Atlas... (attempt ${attempt}/${MAX_RETRIES})`,
    );
    console.log(`Using URI: ${ATLASDB_URI}`);

    await mongoose.connect(ATLASDB_URI);

    console.log("✅ MongoDB Atlas connected successfully");
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);

    if (attempt >= MAX_RETRIES) {
      console.error("🚨 Max retries reached. Exiting process.");
      process.exit(1);
    }

    console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB(attempt + 1);
  }
};

// Optional: log disconnects/reconnects after the initial connection succeeds
mongoose.connection.on("disconnected", () => {
  console.warn(
    "⚠️ MongoDB disconnected. Mongoose will attempt to reconnect automatically.",
  );
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

module.exports = connectDB;
