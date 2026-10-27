
const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
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

  name: {
    type: String,
    required: true
  },

  dosage: {
    type: String,
    required: true
  },

  frequency: {
    type: String,
    enum: ["Once Daily", "Twice Daily", "As Needed"],
    required: true
  },

  time: {
    type: String,
    default: ""
  },

  notes: {
    type: String,
    default: ""
  },

  given: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Medicine", medicineSchema);
