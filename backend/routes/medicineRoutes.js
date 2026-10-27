
const express = require("express");
const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Verify the pet belongs to the logged-in user
async function checkPet(petId, userId) {
  if (!mongoose.isValidObjectId(petId)) return false;

  const pet = await Pet.findOne({
    _id: petId,
    userId
  });

  return !!pet;
}

// GET MEDICINES FOR A PET
router.get("/:petId", async (req, res) => {
  try {
    if (!(await checkPet(req.params.petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const medicines = await Medicine.find({
      petId: req.params.petId,
      userId: req.userId
    });

    res.json(medicines);

  } catch (error) {
    res.status(500).json({
      message: "Could not load medicines"
    });
  }
});

// ADD MEDICINE
router.post("/", async (req, res) => {
  try {
    const { petId, name, dosage, frequency, time, notes } = req.body;

    if (!(await checkPet(petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    if (
      typeof name !== "string" || !name.trim() ||
      typeof dosage !== "string" || !dosage.trim() ||
      !["Once Daily", "Twice Daily", "As Needed"].includes(frequency)
    ) {
      return res.status(400).json({
        message: "Enter valid medicine details"
      });
    }

    const medicine = await Medicine.create({
      userId: req.userId,
      petId,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      time: time || "",
      notes: notes || ""
    });

    res.status(201).json(medicine);

  } catch (error) {
    res.status(500).json({
      message: "Could not add medicine"
    });
  }
});

// UPDATE MEDICINE STATUS
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid medicine ID"
      });
    }

    if (typeof req.body.given !== "boolean") {
      return res.status(400).json({
        message: "Invalid medicine status"
      });
    }

    const medicine = await Medicine.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId
      },
      { given: req.body.given },
      { new: true }
    );

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found"
      });
    }

    res.json(medicine);

  } catch (error) {
    res.status(500).json({
      message: "Could not update medicine"
    });
  }
});

// DELETE MEDICINE
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid medicine ID"
      });
    }

    const medicine = await Medicine.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found"
      });
    }

    res.json({
      message: "Medicine deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Could not delete medicine"
    });
  }
});

module.exports = router;
