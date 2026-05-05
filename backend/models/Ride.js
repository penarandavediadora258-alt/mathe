const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  origin: Object,
  destination: Object,
  status: {
    type: String,
    enum: ["pending", "accepted", "completed"],
    default: "pending"
  }
});

module.exports = mongoose.model("Ride", rideSchema);