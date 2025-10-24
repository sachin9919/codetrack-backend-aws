const fs = require("fs").promises; // Use modern asynchronous fs.promises
const path = require("path");

async function revertRepo(commitID) {
  // Base path is where the command is executed (e.g., C:\...\backend)
  const currentDir = process.cwd();
  const commitsPath = path.join(currentDir, ".myGit", "commits");

  // Path to the target commit directory
  const commitDir = path.join(commitsPath, commitID);

  // Path to the project root (where the working files live, one level up)
  const parentDir = path.resolve(currentDir, "..");

  try {
    // 1. Check if the commit directory exists
    await fs.access(commitDir);

    // 2. Read all files within the commit directory
    const files = await fs.readdir(commitDir);

    console.log(`Reverting to commit: ${commitID}`);

    let filesReverted = 0;

    // 3. Copy each file from the commit directory to the working directory
    for (const file of files) {
      // Skip control files like commit.json or Readme.md in commit history
      if (file.endsWith('.json') || file.endsWith('.md')) continue;

      const sourcePath = path.join(commitDir, file);
      const destinationPath = path.join(parentDir, file);

      // Perform the copy operation
      await fs.copyFile(sourcePath, destinationPath);
      filesReverted++;
    }

    console.log(`\nCommit ${commitID} reverted successfully!`);
    console.log(`Total files restored to project root: ${filesReverted}`);

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`❌ Error: Commit directory not found at ${commitDir}`);
      console.error("Action: Please verify the Commit ID exists in your .myGit/commits folder.");
    } else {
      console.error("❌ Unable to revert : ", err.message);
    }
  }
}

module.exports = { revertRepo };