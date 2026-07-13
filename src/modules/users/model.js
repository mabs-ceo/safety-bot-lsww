const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10,}$/,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    role: {
      type: String,
      enum: [
        "safety_officer",
        "admin",
        "public_user",
        "manager",
        "super_admin",
      ],
      default: "public_user",
      required: true,
    },
    location: {
      type: String,
      enum: ["lsww"],
      default: "lsww",
      required: true,
    },
    dashboardAccess: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      minlength: 6,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
