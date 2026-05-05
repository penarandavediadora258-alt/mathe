const router = require("express").Router();
const Ride = require("../models/Ride");

router.post("/", async (req, res) => {
  const ride = await Ride.create(req.body);
  res.json(ride);
});

router.get("/", async (req, res) => {
  const rides = await Ride.find().populate("rider driver");
  res.json(rides);
});

module.exports = router;