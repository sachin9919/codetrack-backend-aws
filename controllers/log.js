const path = require("path");
const { default: fetch } = require('node-fetch'); // Use for API call

// --- CONFIGURATION ---
const API_URL = "http://localhost:3000/repo";
const USER_ID = process.env.APNA_USER_ID;

// Utility to read config.json
async function readConfig(repoPath) {
    try {
        const configPath = path.join(repoPath, '.myGit', 'config.json');
        const content = await fetchConfig(configPath);
        return JSON.parse(content);
    } catch (err) {
        throw new Error("Repository configuration not found. Please ensure you are in the project root.");
    }
}

// Helper to read local file content
async function fetchConfig(configPath) {
    const fs = require('fs').promises;
    return fs.readFile(configPath, 'utf8');
}


async function logRepo() {
    const repoPath = path.resolve(process.cwd());

    if (!USER_ID) {
        console.error("FATAL: Cannot log. APNA_USER_ID environment variable is missing.");
        return;
    }

    try {
        // 1. Get Repo ID
        const config = await readConfig(repoPath);
        const repoId = config.repoId;

        if (!repoId) {
            console.error("FATAL: Repository ID not found in config.json.");
            return;
        }

        // 2. Fetch Repository Details (including content/commits)
        const endpoint = `${API_URL}/${repoId}`;
        const response = await fetch(endpoint);
        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ API Error: Failed to fetch repository data: ${data.error || 'Unknown error'}`);
            return;
        }

        const commits = data.content || [];

        console.log("==================================================");
        console.log(`COMMIT HISTORY for ${data.name}`);
        console.log("==================================================");

        if (commits.length === 0) {
            console.log("No commits found in MongoDB history.");
            return;
        }

        // 3. Display history in reverse chronological order
        commits.reverse().forEach((commit) => {
            const date = new Date(commit.timestamp).toLocaleString();
            const authorId = commit.author;

            // Format the output
            console.log(`\nCommit: \x1b[33m${commit._id || 'N/A'}\x1b[0m`); // Yellow for ID
            console.log(`Author: ${authorId}`);
            console.log(`Date:   ${date}`);
            console.log(`\n    \x1b[32m${commit.message}\x1b[0m`); // Green for message
        });
        console.log("==================================================");

    } catch (err) {
        console.error("Error fetching commit history:", err.message);
    }
}

module.exports = { logRepo };