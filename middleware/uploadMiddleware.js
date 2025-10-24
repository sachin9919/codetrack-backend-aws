const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client, S3_BUCKET } = require('../config/aws-config'); // Import S3 client and bucket name
const path = require('path');

// Configure multer-s3 storage
const s3Storage = multerS3({
    s3: s3Client, // Pass the initialized S3 client
    bucket: S3_BUCKET, // Your S3 bucket name
    // acl: 'public-read', // FIX: REMOVE this line - ACLs are disabled on your bucket
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname }); // Optional: Add metadata
    },
    key: function (req, file, cb) {
        // Define how files are named in S3
        // Example: user-avatars/[userId]-[timestamp]-[originalName]
        const userId = req.user?.id || 'unknown-user'; // Get userId from auth middleware
        const timestamp = Date.now();
        const ext = path.extname(file.originalname); // Get file extension
        const uniqueFileName = `${userId}-${timestamp}${ext}`;
        const filePath = `user-avatars/${uniqueFileName}`; // Store in 'user-avatars' folder
        cb(null, filePath);
    }
});

// File filter (optional, example: only allow images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Not an image! Please upload only images.'), false); // Reject file
    }
};

// Configure multer middleware
const uploadAvatar = multer({
    storage: s3Storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // Limit file size to 5MB (optional)
    }
});

// Export the middleware configured for single file upload with field name 'avatar'
module.exports = uploadAvatar.single('avatar'); // 'avatar' must match the name attribute in the form input