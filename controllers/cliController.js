const fs = require("fs").promises;
const path = require("path");

async function setRepositoryId(req, res) {
    const { repoId } = req.body;

    // Determine the path to the config file: <project_root>/.myGit/config.json
    // process.cwd() is safe here because the Express server starts from the backend directory.
    const configFilePath = path.join(process.cwd(), '.myGit', 'config.json');

    if (!repoId) {
        return res.status(400).json({ error: "Repository ID is required." });
    }

    try {
        // Data to write to config.json
        const configData = {
            repoId: repoId
        };

        // Write the data to the file, overwriting existing content
        // The null, 2 provides nice formatting for easy reading
        await fs.writeFile(configFilePath, JSON.stringify(configData, null, 2), 'utf8');

        // Success response
        return res.status(200).json({
            message: `repoId ${repoId} successfully saved to local config.json.`,
            repoId: repoId
        });

    } catch (err) {
        console.error("Error writing to config.json:", err);
        // Provide a clear error if the file system operation fails (e.g., directory missing)
        return res.status(500).json({
            error: "Failed to save configuration locally. Ensure the .myGit folder structure exists and Node has write permissions.",
            details: err.message
        });
    }
}

module.exports = { setRepositoryId };