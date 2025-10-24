const fs = require("fs").promises;
const path = require("path");
const { s3Client, S3_BUCKET } = require("../config/aws-config");
const { ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

// FIX: Define the base path for repos relative to the project root
const REPOS_BASE_PATH = path.resolve(__dirname, "..", "apnaGits");

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

// This function now accepts repoId as an argument
async function pullRepo(repoId) {
  const repoPath = path.join(REPOS_BASE_PATH, repoId);
  const commitsPath = path.join(repoPath, "commits");

  try {
    if (!repoId) {
      throw new Error("Repository ID is required to pull.");
    }

    const s3Prefix = `${repoId}/commits/`;

    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: s3Prefix,
    });
    const data = await s3Client.send(listCommand);

    const objects = data.Contents;
    if (!objects || objects.length === 0) {
      const msg = `No remote content found for repo: ${repoId}.`;
      console.log(msg);
      return { message: msg };
    }

    for (const object of objects) {
      const key = object.Key;
      if (key.endsWith("/")) continue;

      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });
      const fileData = await s3Client.send(getCommand);
      const fileContent = await streamToBuffer(fileData.Body);

      // Construct the local file path correctly
      const relativePath = key.substring(repoId.length + 1);
      const localFilePath = path.join(repoPath, relativePath);

      await fs.mkdir(path.dirname(localFilePath), { recursive: true });
      await fs.writeFile(localFilePath, fileContent);
    }

    const successMessage = `Pull successful for Repo ID: ${repoId}`;
    console.log(`✅ ${successMessage}`);
    return { message: successMessage };
  } catch (err) {
    const errorMessage = `ERROR PULLING FROM S3: ${err.message}`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

module.exports = { pullRepo };