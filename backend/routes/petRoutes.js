
const express = require("express");
const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

// All pet routes require login
router.use(auth);

// GET MY PETS
router.get("/", async (req, res) => {
  try {
    const pets = await Pet.find({ userId: req.userId });
    res.json(pets);
  } catch (error) {
    res.status(500).json({ message: "Could not load pets" });
  }
});

// ADD PET
router.post("/", async (req, res) => {
  try {
    const { name, breed, age, photo } = req.body;

    if (!name?.trim() || !breed?.trim() ||
        age === "" || age == null ||
        !Number.isFinite(Number(age)) || Number(age) < 0) {
      return res.status(400).json({
        message: "Please enter valid pet details"
      });
    }

    const pet = await Pet.create({
      userId: req.userId,
      name: name.trim(),
      breed: breed.trim(),
      age: Number(age),
      photo: photo || ""
    });

    res.status(201).json(pet);
  } catch (error) {
    res.status(500).json({ message: "Could not add pet" });
  }
});

// UPDATE PET
router.put("/:id", async (req, res) => {
  try {
    const { name, breed, age, photo } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid pet ID" });
    }

    if (!name?.trim() || !breed?.trim() ||
        age === "" || age == null ||
        !Number.isFinite(Number(age)) || Number(age) < 0) {
      return res.status(400).json({
        message: "Please enter valid pet details"
      });
    }

    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        name: name.trim(),
        breed: breed.trim(),
        age: Number(age),
        photo: photo || ""
      },
      { new: true, runValidators: true }
    );

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    res.json(pet);
  } catch (error) {
    res.status(500).json({ message: "Could not update pet" });
  }
});

// DELETE PET
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid pet ID" });
    }

    const pet = await Pet.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    res.json({ message: "Pet deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete pet" });
  }
});

module.exports = router;
