const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommitSchema = new Schema({
  message: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now },
});

const RepositorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      // Consider making unique index compound with owner: unique: true, index: { unique: true, scope: 'owner' }
    },
    description: {
      type: String,
    },
    // Commit history array
    content: [CommitSchema],
    // FIX 1: Add field to store the latest content (simple version)
    latestContent: {
      type: String,
      default: "", // Default to empty string
    },
    visibility: {
      type: Boolean,
      default: true, // Default to public
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issues: [
      {
        type: Schema.Types.ObjectId,
        ref: "Issue",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Optional: Add compound index if name should be unique per owner
// RepositorySchema.index({ name: 1, owner: 1 }, { unique: true });

const Repository = mongoose.model("Repository", RepositorySchema);
module.exports = Repository;