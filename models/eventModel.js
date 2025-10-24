const mongoose = require("mongoose");
const { Schema } = mongoose;

const EventSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        eventDate: {
            type: Date,
            required: true,
        },
        // Optional: Add a description or link field if you want
        // description: { type: String },
        // link: { type: String }
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Optional: Index the date for faster sorting
EventSchema.index({ eventDate: 1 });

const Event = mongoose.model("Event", EventSchema);
module.exports = Event;