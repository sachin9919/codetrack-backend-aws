const Event = require("../models/eventModel");
const mongoose = require("mongoose");

// --- Get Upcoming Events ---
async function getUpcomingEvents(req, res) {
    try {
        const today = new Date();
        // Set time to the beginning of the day to include events happening today
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = await Event.find({
            eventDate: { $gte: today } // Find events on or after today
        })
            .sort({ eventDate: 1 }) // Sort by date ascending (soonest first)
            .limit(7); // Limit to the next 3 events

        res.json(upcomingEvents);

    } catch (err) {
        console.error("Error fetching upcoming events: ", err.message);
        res.status(500).json({ error: "Server error fetching upcoming events." });
    }
}

// --- NEW: Create Event ---
async function createEvent(req, res) {
    // --- ADDED DEBUG LOG ---
    console.log("DEBUG: Received body in createEvent:", req.body);

    // --- ERROR OCCURS ON THIS LINE IF req.body IS UNDEFINED ---
    const { title, eventDate } = req.body;

    // Basic Validation
    if (!title || !eventDate) {
        return res.status(400).json({ error: "Both title and eventDate are required." });
    }

    // Validate Date Format (optional but recommended)
    const date = new Date(eventDate);
    if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid eventDate format. Please use a valid date string (e.g., YYYY-MM-DD)." });
    }

    try {
        const newEvent = new Event({
            title: title,
            eventDate: date, // Use the validated Date object
        });

        const savedEvent = await newEvent.save();

        res.status(201).json({ message: "Event created successfully!", event: savedEvent });

    } catch (err) {
        console.error("Error creating event: ", err.message);
        // Handle potential validation errors from Mongoose schema
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Server error creating event." });
    }
}


module.exports = {
    getUpcomingEvents,
    createEvent,
};