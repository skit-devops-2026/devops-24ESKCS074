
const express = require("express");
const mongoose = require("mongoose");

const Vaccination = require("../models/Vaccination");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Check that the pet belongs to this user
async function petBelongsToUser(petId, userId) {
  if (!mongoose.isValidObjectId(petId)) {
    return false;
  }

  const pet = await Pet.findOne({
    _id: petId,
    userId: userId
  });

  return !!pet;
}

// Check YYYY-MM-DD dates
function validDate(value) {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value + "T00:00:00Z");

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// GET vaccinations for selected pet
router.get("/:petId", async (req, res) => {
  try {
    const allowed = await petBelongsToUser(
      req.params.petId,
      req.userId
    );

    if (!allowed) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const vaccinations = await Vaccination.find({
      userId: req.userId,
      petId: req.params.petId
    }).sort({ dateGiven: -1 });

    res.json(vaccinations);

  } catch (error) {
    res.status(500).json({
      message: "Could not load vaccinations"
    });
  }
});

// ADD vaccination
router.post("/", async (req, res) => {
  try {
    const {
      petId,
      vaccineName,
      dateGiven,
      nextDueDate,
      vetName,
      notes
    } = req.body;

    const allowed = await petBelongsToUser(
      petId,
      req.userId
    );

    if (!allowed) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    if (
      typeof vaccineName !== "string" ||
      !vaccineName.trim() ||
      !validDate(dateGiven) ||
      (nextDueDate && !validDate(nextDueDate))
    ) {
      return res.status(400).json({
        message: "Enter valid vaccination details"
      });
    }

    if (nextDueDate && nextDueDate < dateGiven) {
      return res.status(400).json({
        message: "Next due date cannot be before date given"
      });
    }

    const vaccination = await Vaccination.create({
      userId: req.userId,
      petId,
      vaccineName: vaccineName.trim(),
      dateGiven,
      nextDueDate: nextDueDate || "",
      vetName: typeof vetName === "string" ? vetName.trim() : "",
      notes: typeof notes === "string" ? notes.trim() : ""
    });

    res.status(201).json(vaccination);

  } catch (error) {
    res.status(500).json({
      message: "Could not save vaccination"
    });
  }
});

// DELETE vaccination
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid vaccination ID"
      });
    }

    const vaccination = await Vaccination.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!vaccination) {
      return res.status(404).json({
        message: "Vaccination not found"
      });
    }

    res.json({
      message: "Vaccination deleted"
    });

  } catch (error) {
    res.status(500).json({
      message: "Could not delete vaccination"
    });
  }
});

module.exports = router;
