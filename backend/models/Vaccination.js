
const mongoose = require("mongoose");

const vaccinationSchema = new mongoose.Schema(
  {
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

    vaccineName: {
      type: String,
      required: true,
      trim: true
    },

    dateGiven: {
      type: String,
      required: true
    },

    nextDueDate: {
      type: String,
      default: ""
    },

    vetName: {
      type: String,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Vaccination",
  vaccinationSchema
);
