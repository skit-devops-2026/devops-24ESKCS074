
const express = require("express");
const mongoose = require("mongoose");

const Care = require("../models/Care");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

// Login is required for every care route
router.use(auth);

// Check whether this pet belongs to the logged-in user
async function checkPet(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.petId)) {
      return res.status(400).json({
        message: "Invalid pet ID"
      });
    }

    const pet = await Pet.findOne({
      _id: req.params.petId,
      userId: req.userId
    });

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    next();

  } catch (error) {
    res.status(500).json({
      message: "Could not verify pet"
    });
  }
}

// Validate the date
function validDate(date) {
  if (typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(date + "T00:00:00Z");

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

// GET DAILY CARE
router.get("/:petId", checkPet, async (req, res) => {
  try {
    const date = req.query.date;

    if (!validDate(date)) {
      return res.status(400).json({
        message: "Valid date required"
      });
    }

    const care = await Care.findOne({
      userId: req.userId,
      petId: req.params.petId,
      date: date
    });

    // Return default tasks if no record exists
    if (!care) {
      return res.json({
        feeding: false,
        walking: false,
        grooming: false,
        customTasks: []
      });
    }

    res.json(care);

  } catch (error) {
    res.status(500).json({
      message: "Could not load daily care"
    });
  }
});

// SAVE DAILY CARE
router.put("/:petId", checkPet, async (req, res) => {
  try {
    const {
      date,
      feeding,
      walking,
      grooming,
      customTasks = []
    } = req.body;

    // Check date
    if (!validDate(date)) {
      return res.status(400).json({
        message: "Invalid date"
      });
    }

    // Check default tasks
    if (
      typeof feeding !== "boolean" ||
      typeof walking !== "boolean" ||
      typeof grooming !== "boolean"
    ) {
      return res.status(400).json({
        message: "Invalid care details"
      });
    }

    // Check custom tasks
    if (
      !Array.isArray(customTasks) ||
      customTasks.length > 30 ||
      customTasks.some(
        (task) =>
          !task ||
          typeof task.name !== "string" ||
          !task.name.trim() ||
          task.name.length > 100 ||
          typeof task.done !== "boolean"
      )
    ) {
      return res.status(400).json({
        message: "Invalid custom tasks"
      });
    }

    // Save or update the daily care record
    const care = await Care.findOneAndUpdate(
      {
        userId: req.userId,
        petId: req.params.petId,
        date: date
      },
      {
        $set: {
          feeding,
          walking,
          grooming,
          customTasks: customTasks.map((task) => ({
            name: task.name.trim(),
            done: task.done
          }))
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json(care);

  } catch (error) {
    res.status(500).json({
      message: "Could not save daily care"
    });
  }
});

module.exports = router;
