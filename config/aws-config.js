const { S3Client } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
dotenv.config();

// Load credentials and region from environment variables
const s3Client = new S3Client({
    region: process.env.AWS_REGION, // e.g., "eu-north-1"
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const S3_BUCKET = process.env.S3_BUCKET;

module.exports = { s3Client, S3_BUCKET };