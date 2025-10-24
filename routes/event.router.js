const express = require("express");
const eventController = require("../controllers/eventController");
// Import protect middleware
const { protect } = require('../middleware/authMiddleware');

const eventRouter = express.Router();

// GET /api/events/upcoming
// Public route (anyone can see upcoming events) - remove protect if you added it previously
eventRouter.get("/upcoming", eventController.getUpcomingEvents);

// --- NEW: POST /api/events/create ---
// Protected route - only logged-in users can create events
eventRouter.post("/create", protect, eventController.createEvent);


module.exports = eventRouter;