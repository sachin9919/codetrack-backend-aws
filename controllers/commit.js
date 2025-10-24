const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
// FIX: Using destructuring to explicitly pull 'fetch' for maximum reliability
const { default: fetch } = require('node-fetch');


// --- CONFIGURATION ---
const API_URL = "http://localhost:3000/repo";
const USER_ID = process.env.APNA_USER_ID;

// Utility to read config.json
async function readConfig(repoPath) {
  try {
    const configPath = path.join(repoPath, '.myGit', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error("CRITICAL: Failed to read .myGit/config.json. Is your repo initialized?", err.message);
    throw new Error("Repository configuration not found. Please ensure you are in the project root.");
  }
}

// NEW FUNCTION: Clears the staging area after successful commit
async function clearStagingArea(stagedPath) {
  try {
    const files = await fs.readdir(stagedPath);
    const deletionPromises = files.map(file => fs.unlink(path.join(stagedPath, file)));
    await Promise.all(deletionPromises);
    console.log(`🧹 Staging area successfully cleared: ${files.length} files removed.`);
  } catch (err) {
    // Log a warning if cleanup fails, but do not fail the overall commit
    console.warn(`WARNING: Failed to clear staging area. Please check permissions. Error: ${err.message}`);
  }
}


async function commitRepo(message) {
  const repoPath = path.resolve(process.cwd()); // Assume running from project root
  const stagedPath = path.join(repoPath, ".myGit", "staging");
  const commitPath = path.join(repoPath, ".myGit", "commits");

  if (!USER_ID) {
    console.error("FATAL: Cannot commit. APNA_USER_ID environment variable is missing.");
    console.error("Action: Please set it (e.g., export APNA_USER_ID=\"<YourUserId>\").");
    return;
  }

  try {
    // Check if staging area is empty before proceeding (optional but good practice)
    const stagedFiles = await fs.readdir(stagedPath);
    if (stagedFiles.length === 0) {
      console.log("No files staged. Commit aborted.");
      return;
    }

    // STEP 1: Read Repository ID from local config
    const config = await readConfig(repoPath);
    const repoId = config.repoId;

    if (!repoId) {
      console.error("FATAL: Repository ID not found in config.json. Please ensure config.json has {'repoId': '<MongoDB_ID>'}");
      return;
    }

    // STEP 2: Perform Local File Operations (Committing files from staging to history)
    const commitID = uuidv4();
    const commitDir = path.join(commitPath, commitID);
    await fs.mkdir(commitDir, { recursive: true });

    for (const file of stagedFiles) { // Use stagedFiles array here
      await fs.copyFile(
        path.join(stagedPath, file),
        path.join(commitDir, file)
      );
    }

    await fs.writeFile(
      path.join(commitDir, "commit.json"),
      JSON.stringify({ message, date: new Date().toISOString() })
    );

    // ------------------------------------------------------------------
    // STEP 3: INTEGRATE WITH WEB API (Send Commit Metadata to MongoDB)
    // ------------------------------------------------------------------

    const endpoint = `${API_URL}/${repoId}/commit`;

    console.log(`\nSending commit metadata to MongoDB via API: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        userId: USER_ID
      })
    });

    const data = await response.json();

    if (response.ok) {
      // FINAL ACTION: Clear staging area upon successful remote commit
      await clearStagingArea(stagedPath);

      console.log("-----------------------------------------");
      console.log(`✅ COMMIT SUCCESSFUL: Local files saved and metadata recorded in MongoDB.`);
      console.log(`Local Commit ID: ${commitID}`);
      console.log(`Commit Message: ${data.commit.message}`);
      console.log("-----------------------------------------");
    } else {
      console.log("-----------------------------------------");
      console.error("❌ WARNING: Local files saved, but METADATA FAILED to save to MongoDB.");
      console.error(`API Error: ${data.error || data.message || 'Unknown server error.'}`);
      console.log("-----------------------------------------");
    }


  } catch (err) {
    console.error("Error executing commit:", err.message);
  }
}

module.exports = { commitRepo };