const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const careRoutes = require("./routes/careRoutes");
const walkRoutes = require("./routes/walkRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const vaccinationRoutes = require("./routes/vaccinationRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));


// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/care", careRoutes);
app.use("/api/walks", walkRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/appointments", appointmentRoutes);
// Homepage
app.get("/", (req, res) => {
  res.send("PetPal Backend is Running!");
});

// MongoDB connection
async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected Successfully!");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log("PetPal Backend running on port " + PORT);
    });

  } catch (error) {
    console.log("Server error:", error.message);
  }
}

startServer();
