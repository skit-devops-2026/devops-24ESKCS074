
const mongoose = require("mongoose");

const walkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
    required: true
  },

  date: {
    type: String,
    required: true
  },

  startedAt: {
    type: Date,
    default: null
  },

  endedAt: {
    type: Date,
    default: null
  },

  // Total walking time in seconds
  duration: {
    type: Number,
    default: 0,
    min: 0
  },

  // GPS distance in kilometres
  distance: {
    type: Number,
    default: null,
    min: 0
  },

  status: {
    type: String,
    enum: ["pending", "walking", "paused", "completed"],
    default: "pending"
  },

  mode: {
    type: String,
    enum: ["timer", "gps"],
    default: "timer"
  },

  lastResumedAt: {
    type: Date,
    default: null
  },

  elapsedSeconds: {
    type: Number,
    default: 0,
    min: 0
  },

  // Temporary phone handoff
  handoffTokenHash: {
    type: String,
    default: null,
    select: false
  },

  handoffExpiresAt: {
    type: Date,
    default: null
  },

  notes: {
    type: String,
    default: ""
  }
});

module.exports = mongoose.model("Walk", walkSchema);
