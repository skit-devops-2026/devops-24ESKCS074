
const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// Check that the pet belongs to the logged-in user
async function checkPet(petId, userId) {
  if (!mongoose.isValidObjectId(petId)) return false;

  const pet = await Pet.findOne({
    _id: petId,
    userId: userId
  });

  return !!pet;
}

function validDate(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(date + "T00:00:00Z");

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

function validTime(time) {
  return typeof time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function validDetails(data) {
  return (
    typeof data.vetName === "string" &&
    data.vetName.trim() &&
    typeof data.clinic === "string" &&
    data.clinic.trim() &&
    validDate(data.date) &&
    validTime(data.time) &&
    typeof data.reason === "string" &&
    data.reason.trim()
  );
}

// GET appointments for a pet
router.get("/:petId", async (req, res) => {
  try {
    if (!(await checkPet(req.params.petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const appointments = await Appointment.find({
      petId: req.params.petId,
      userId: req.userId
    }).sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Could not load appointments"
    });
  }
});

// ADD appointment
router.post("/", async (req, res) => {
  try {
    const { petId, vetName, clinic, date, time, reason } = req.body;

    if (!(await checkPet(petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    if (!validDetails(req.body)) {
      return res.status(400).json({
        message: "Please enter valid appointment details"
      });
    }

    const appointment = await Appointment.create({
      userId: req.userId,
      petId,
      vetName: vetName.trim(),
      clinic: clinic.trim(),
      date,
      time,
      reason: reason.trim()
    });

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({
      message: "Could not add appointment"
    });
  }
});

// EDIT appointment
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid appointment ID"
      });
    }

    if (!validDetails(req.body)) {
      return res.status(400).json({
        message: "Please enter valid appointment details"
      });
    }

    const { vetName, clinic, date, time, reason } = req.body;

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId
      },
      {
        vetName: vetName.trim(),
        clinic: clinic.trim(),
        date,
        time,
        reason: reason.trim()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({
      message: "Could not edit appointment"
    });
  }
});

// UPDATE appointment status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid appointment ID"
      });
    }

    if (!["Scheduled", "Completed", "Cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId
      },
      { status },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({
      message: "Could not change appointment status"
    });
  }
});

// DELETE appointment
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid appointment ID"
      });
    }

    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }

    res.json({ message: "Appointment deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Could not delete appointment"
    });
  }
});

module.exports = router;
