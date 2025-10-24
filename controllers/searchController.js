const User = require('../models/userModel');
const Repository = require('../models/repoModel');

async function searchAll(req, res) {
    // Get the search query from the URL (?q=...)
    const query = req.query.q;

    if (!query) {
        // If no query is provided, return empty results
        return res.json({ users: [], repositories: [] });
    }

    try {
        // Create a case-insensitive regular expression
        const regex = new RegExp(query, 'i');

        // Search for users by username, limit to 5 results
        const users = await User.find({ username: regex })
            .select('username _id') // Only select username and ID
            .limit(5);

        // Search for repositories by name, limit to 5 results
        // Also populate the owner's username for display
        const repositories = await Repository.find({ name: regex })
            .select('name owner _id') // Select name, owner, and ID
            .populate('owner', 'username') // Get username from owner ref
            .limit(5);

        res.json({ users, repositories });

    } catch (err) {
        console.error("Error during search: ", err.message);
        res.status(500).json({ error: "Server error during search." });
    }
}

module.exports = {
    searchAll,
};