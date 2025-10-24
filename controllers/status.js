const fs = require("fs").promises;
const path = require("path");

async function statusRepo() {
    const currentDir = process.cwd();
    const stagingPath = path.join(currentDir, ".myGit", "staging");
    const workingDirPath = path.resolve(currentDir, "..");

    try {
        // 1. Check for files staged for commit
        const stagedFiles = await fs.readdir(stagingPath).catch(() => []);

        console.log("========================================");
        console.log("\x1b[36mAPNAGIT STATUS\x1b[0m"); // Cyan
        console.log("========================================");

        // STAGED FILES
        if (stagedFiles.length > 0) {
            console.log("\x1b[32mStaged for Commit:\x1b[0m"); // Green
            stagedFiles.forEach(file => console.log(`  M ${file}`));
        } else {
            console.log("\x1b[32mNo changes added to commit.\x1b[0m"); // Green
        }

        // 2. Simple check for untracked files (basic comparison)
        const workingDirFiles = await fs.readdir(workingDirPath).catch(() => []);

        // Final comprehensive list of internal files/folders to ignore
        const internalFiles = [
            'backend', 'frontend', '.git', '.gitignore', '.apnaGit', '.myGit',
            'node_modules', 'package.json', 'package-lock.json', 'index.js', 'hi.text' // Ignoring hi.text as seen in log
        ];

        // Filter files that are not internal folders or are already staged
        const untrackedFiles = workingDirFiles.filter(file => {
            return !internalFiles.includes(file) && !stagedFiles.includes(file);
        });

        console.log("\n\x1b[31mUntracked Files:\x1b[0m"); // Red
        if (untrackedFiles.length > 0) {
            untrackedFiles.forEach(file => console.log(`  ?? ${file}`));
        } else {
            console.log("  No untracked files detected.");
        }

        console.log("========================================");

    } catch (err) {
        console.error("Error retrieving status:", err.message);
    }
}

module.exports = { statusRepo };