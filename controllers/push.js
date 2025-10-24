const fs = require("fs").promises;
const path = require("path");
const { s3Client, S3_BUCKET } = require("../config/aws-config");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

// FIX: Define the base path for repos relative to the project root
const REPOS_BASE_PATH = path.resolve(__dirname, "..", "apnaGits");

// This function now accepts repoId as an argument
async function pushRepo(repoId) {
  // Construct the path to the specific repository on the server
  const repoPath = path.join(REPOS_BASE_PATH, repoId);
  const commitsPath = path.join(repoPath, "commits");

  try {
    if (!repoId) {
      throw new Error("Repository ID is required to push.");
    }

    // Check if the commits directory exists
    try {
      await fs.access(commitsPath);
    } catch (e) {
      console.log(`No commits directory found for ${repoId}. Nothing to push.`);
      return { message: "No new commits found to push." };
    }

    const commitDirs = await fs.readdir(commitsPath);
    if (commitDirs.length === 0) {
      console.log("No new commits found to push.");
      return { message: "No new commits to push." };
    }

    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);
      const files = await fs.readdir(commitPath);

      for (const file of files) {
        const filePath = path.join(commitPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) continue;

        const fileContent = await fs.readFile(filePath);
        const s3Key = `${repoId}/commits/${commitDir}/${file}`;

        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileContent,
        });

        await s3Client.send(command);
      }
    }

    const successMessage = `Push successful for Repo ID: ${repoId}`;
    console.log(`✅ ${successMessage}`);
    return { message: successMessage };
  } catch (err) {
    const errorMessage = `ERROR PUSHING TO S3: ${err.message}`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

module.exports = { pushRepo };