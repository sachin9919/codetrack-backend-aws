const fs = require("fs").promises;
const path = require("path");

async function addRepo(filesArray) {
  if (!filesArray || filesArray.length === 0) {
    console.error("Error: No files specified. Use: node index.js add <file1> [file2]...");
    return;
  }

  const currentDir = process.cwd();
  const stagingPath = path.join(currentDir, ".myGit", "staging");

  let successCount = 0;

  try {
    await fs.mkdir(stagingPath, { recursive: true });

    for (const filePath of filesArray) {

      // CRITICAL FIX: Use path.join to ensure the file path is correct, relative to the project root (..)
      const fileToAddPath = path.join(currentDir, "..", filePath);
      const fileName = path.basename(filePath);

      try {
        // Check if the file exists before attempting to copy
        await fs.access(fileToAddPath);

        // Copy the file from the project root to the staging folder
        await fs.copyFile(fileToAddPath, path.join(stagingPath, fileName));
        console.log(`✅ Staged: ${fileName}`);
        successCount++;
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.error(`❌ Failed: File not found. Ensure file exists at: ${fileToAddPath}`);
        } else {
          console.error(`❌ Failed to stage ${fileName}: ${err.message}`);
        }
      }
    }

    console.log(`\nSummary: Successfully staged ${successCount} file(s).`);

  } catch (err) {
    console.error("Fatal Error during staging initialization:", err.message);
  }
}

module.exports = { addRepo };