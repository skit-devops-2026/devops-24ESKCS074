
const mongoose = require("mongoose");

const careSchema = new mongoose.Schema({
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

  feeding: {
    type: Boolean,
    default: false
  },

  walking: {
    type: Boolean,
    default: false
  },

  grooming: {
    type: Boolean,
    default: false
  },
  customTasks: [
  {
    name: {
      type: String,
      required: true
    },
    done: {
      type: Boolean,
      default: false
    }
  }
]
});

careSchema.index(
  { userId: 1, petId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Care", careSchema);
