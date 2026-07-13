const mongoose = require("mongoose");

const safetyObservationSchema = new mongoose.Schema({
  observationId: {
    type: String,
    unique: true,
    required: true,
  },
  observedBy: {
    type: String,
    required: true,
  },
  //   observedBy: {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "User",
  //     required: true,
  //   },
  observationDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  location: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["Near Miss", "Hazard", "Unsafe Act", "Unsafe Condition"],
    required: true,
  },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  correctionsTaken: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Resolved", "Closed"],
    default: "Open",
  },
  attachments: [String],
  observationDate: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SafetyObservation", safetyObservationSchema);
