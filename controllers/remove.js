const fs = require("fs").promises;
const path = require("path");

async function removeRepo(filesArray) {
    if (!filesArray || filesArray.length === 0) {
        console.error("Error: No files specified. Use: node index.js rm <file1> [file2]...");
        return;
    }

    const currentDir = process.cwd();
    const stagingPath = path.join(currentDir, ".myGit", "staging");
    let successCount = 0;

    try {
        for (const filePath of filesArray) {
            const fileName = path.basename(filePath);
            const stagedFilePath = path.join(stagingPath, fileName);

            try {
                // Check if the file is currently staged
                await fs.access(stagedFilePath);

                // Delete the file from the staging directory
                await fs.unlink(stagedFilePath);

                console.log(`✅ Removed: ${fileName} staged for deletion.`);
                successCount++;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    // This is expected if the file wasn't staged to begin with
                    console.warn(`⚠️ Warning: ${fileName} was not found in staging.`);
                } else {
                    console.error(`❌ Failed to remove ${fileName}: ${err.message}`);
                }
            }
        }

        console.log(`\nSummary: Successfully staged ${successCount} file(s) for removal.`);

    } catch (err) {
        console.error("Fatal Error during remove operation:", err.message);
    }
}

module.exports = { removeRepo };