
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Walk = require("../models/Walk");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

// All walk APIs require login
router.use(auth);

// Check whether the pet belongs to this user
async function checkPet(petId, userId) {
  if (!mongoose.isValidObjectId(petId)) {
    return false;
  }

  const pet = await Pet.findOne({
    _id: petId,
    userId: userId
  });

  return !!pet;
}

// Get today's local date
function getToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

// START WALK
router.post("/start", async (req, res) => {
  try {
    const { petId, mode = "timer" } = req.body;

    if (!(await checkPet(petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    if (!["timer", "gps"].includes(mode)) {
      return res.status(400).json({
        message: "Invalid tracking mode"
      });
    }

    // Check for an unfinished walk
    const existing = await Walk.findOne({
      petId,
      userId: req.userId,
      status: { $in: ["pending", "walking", "paused"] }
    });

    if (existing) {
      return res.status(409).json({
        message: "A walk is already active for this pet"
      });
    }

    const now = new Date();

    const walk = await Walk.create({
      userId: req.userId,
      petId,
      date: getToday(),
      startedAt: now,
      lastResumedAt: now,
      elapsedSeconds: 0,
      status: "walking",
      mode
    });

    res.status(201).json(walk);

  } catch (error) {
    console.error("Start walk error:", error.message);

    res.status(500).json({
      message: "Could not start walk"
    });
  }
});

// CREATE PHONE HANDOFF
router.post("/:id/handoff", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "timer",
      status: { $in: ["walking", "paused"] }
    });

    if (!walk) {
      return res.status(404).json({
        message: "Timer walk not found"
      });
    }

    // Pause walking time before transferring
    if (walk.status === "walking") {
      const now = new Date();

      walk.elapsedSeconds += Math.max(
        0,
        (now - walk.lastResumedAt) / 1000
      );

      walk.lastResumedAt = null;
      walk.status = "paused";
    }

    // Generate a temporary random handoff token
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    walk.handoffTokenHash = tokenHash;

    // Token expires after five minutes
    walk.handoffExpiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await walk.save();

    res.json({
      message: "Phone handoff ready",
      token,
      expiresIn: 300
    });

  } catch (error) {
    console.error("Handoff error:", error.message);

    res.status(500).json({
      message: "Could not create phone handoff"
    });
  }
});

// CLAIM WALK ON PHONE
router.post("/claim", async (req, res) => {
  try {
    const { token } = req.body;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return res.status(400).json({
        message: "Invalid handoff token"
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const walk = await Walk.findOneAndUpdate(
      {
        userId: req.userId,
        handoffTokenHash: tokenHash,
        handoffExpiresAt: { $gt: new Date() },
        status: "paused",
        mode: "timer"
      },
      {
        $set: {
          mode: "gps"
        },
        $unset: {
          handoffTokenHash: "",
          handoffExpiresAt: ""
        }
      },
      { new: true }
    );

    if (!walk) {
      return res.status(400).json({
        message: "Handoff invalid or expired"
      });
    }

    // Keep paused until phone GPS starts
    res.json({
      message: "Walk transferred to phone",
      walk
    });

  } catch (error) {
    console.error("Claim error:", error.message);

    res.status(500).json({
      message: "Could not claim walk"
    });
  }
});

// GET ACTIVE WALK
router.get("/active/:petId", async (req, res) => {
  try {
    const { petId } = req.params;

    if (!(await checkPet(petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const walk = await Walk.findOne({
      userId: req.userId,
      petId,
      status: { $in: ["pending", "walking", "paused"] }
    });

    // null means there is no active walk
    res.json(walk);

  } catch (error) {
    console.error("Active walk error:", error.message);

    res.status(500).json({
      message: "Could not load active walk"
    });
  }
});

// PAUSE WALK
router.put("/:id/pause", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "timer",
      status: "walking"
    });

    if (!walk) {
      return res.status(404).json({
        message: "Active timer walk not found"
      });
    }

    const now = new Date();

    walk.elapsedSeconds += Math.max(
      0,
      (now - walk.lastResumedAt) / 1000
    );

    walk.status = "paused";
    walk.lastResumedAt = null;

    await walk.save();

    res.json(walk);

  } catch (error) {
    console.error("Pause error:", error.message);

    res.status(500).json({
      message: "Could not pause walk"
    });
  }
});

// RESUME WALK
router.put("/:id/resume", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "timer",
      status: "paused"
    });

    if (!walk) {
      return res.status(404).json({
        message: "Paused timer walk not found"
      });
    }

    walk.status = "walking";
    walk.lastResumedAt = new Date();

    await walk.save();

    res.json(walk);

  } catch (error) {
    console.error("Resume error:", error.message);

    res.status(500).json({
      message: "Could not resume walk"
    });
  }
});

// FINISH WALK
router.put("/:id/finish", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "timer",
      status: { $in: ["walking", "paused"] }
    });

    if (!walk) {
      return res.status(404).json({
        message: "Timer walk not found"
      });
    }

    const now = new Date();

    // Add the final active segment
    if (walk.status === "walking") {
      walk.elapsedSeconds += Math.max(
        0,
        (now - walk.lastResumedAt) / 1000
      );
    }

    walk.duration = Math.round(walk.elapsedSeconds);
    walk.endedAt = now;
    walk.lastResumedAt = null;
    walk.status = "completed";

    // Clear any unused phone handoff
    walk.handoffTokenHash = null;
    walk.handoffExpiresAt = null;

    await walk.save();

    res.json(walk);

  } catch (error) {
    console.error("Finish error:", error.message);

    res.status(500).json({
      message: "Could not finish walk"
    });
  }
});

// START GPS WALK
router.put("/:id/gps/start", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "gps",
      status: "paused"
    });

    if (!walk) {
      return res.status(404).json({
        message: "GPS walk not found"
      });
    }

    walk.status = "walking";
    walk.lastResumedAt = new Date();

    await walk.save();

    res.json(walk);

  } catch (error) {
    res.status(500).json({
      message: "Could not start GPS walk"
    });
  }
});


// PAUSE GPS WALK
router.put("/:id/gps/pause", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "gps",
      status: "walking"
    });

    if (!walk) {
      return res.status(404).json({
        message: "Active GPS walk not found"
      });
    }

    const now = new Date();

    walk.elapsedSeconds += Math.max(
      0,
      (now - walk.lastResumedAt) / 1000
    );

    walk.status = "paused";
    walk.lastResumedAt = null;

    await walk.save();

    res.json(walk);

  } catch (error) {
    res.status(500).json({
      message: "Could not pause GPS walk"
    });
  }
});


// RESUME GPS WALK
router.put("/:id/gps/resume", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "gps",
      status: "paused"
    });

    if (!walk) {
      return res.status(404).json({
        message: "Paused GPS walk not found"
      });
    }

    walk.status = "walking";
    walk.lastResumedAt = new Date();

    await walk.save();

    res.json(walk);

  } catch (error) {
    res.status(500).json({
      message: "Could not resume GPS walk"
    });
  }
});


// FINISH GPS WALK
router.put("/:id/gps/finish", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid walk ID"
      });
    }

    const walk = await Walk.findOne({
      _id: req.params.id,
      userId: req.userId,
      mode: "gps",
      status: { $in: ["walking", "paused"] }
    });

    if (!walk) {
      return res.status(404).json({
        message: "GPS walk not found"
      });
    }

    const { distance } = req.body;

    if (
      distance !== null &&
      distance !== undefined &&
      (typeof distance !== "number" ||
        !Number.isFinite(distance) ||
        distance < 0 ||
        distance > 1000)
    ) {
      return res.status(400).json({
        message: "Invalid GPS distance"
      });
    }

    const now = new Date();

    if (walk.status === "walking") {
      walk.elapsedSeconds += Math.max(
        0,
        (now - walk.lastResumedAt) / 1000
      );
    }

    walk.duration = Math.round(walk.elapsedSeconds);
    walk.distance = distance ?? null;
    walk.endedAt = now;
    walk.lastResumedAt = null;
    walk.status = "completed";

    await walk.save();

    res.json(walk);

  } catch (error) {
    res.status(500).json({
      message: "Could not finish GPS walk"
    });
  }
});

// WALK HISTORY
router.get("/:petId", async (req, res) => {
  try {
    const { petId } = req.params;

    if (!(await checkPet(petId, req.userId))) {
      return res.status(404).json({
        message: "Pet not found"
      });
    }

    const walks = await Walk.find({
      petId,
      userId: req.userId,
      status: "completed"
    }).sort({ startedAt: -1 });

    res.json(walks);

  } catch (error) {
    console.error("History error:", error.message);

    res.status(500).json({
      message: "Could not load walk history"
    });
  }
});

module.exports = router;
