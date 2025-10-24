const express = require("express");
const userController = require("../controllers/userController");
const { protect } = require('../middleware/authMiddleware');
// FIX 1: Import the upload middleware
const uploadAvatar = require('../middleware/uploadMiddleware');
const userRouter = express.Router();

// Public routes
userRouter.get("/allUsers", userController.getAllUsers);
userRouter.post("/signup", userController.signup);
userRouter.post("/login", userController.login);

// --- Protected Routes ---

// Profile routes
userRouter.get("/userProfile/:id", protect, userController.getUserProfile);
userRouter.put("/updateProfile/:id", protect, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", protect, userController.deleteUserProfile);

// Route to get a user's starred repositories
userRouter.get("/:id/starred", protect, userController.getStarredRepos);

// --- NEW: ROUTE FOR HEAT MAP DATA ---
userRouter.get("/:id/contributions", protect, userController.getContributionData);

// FIX 2: Add route for avatar upload. Uses 'protect' then 'uploadAvatar' middleware.
// 'uploadAvatar' expects a single file field named 'avatar'. PUT or POST can be used.
userRouter.put("/updateAvatar", protect, uploadAvatar, userController.updateUserAvatar);

// Follow/Unfollow routes
userRouter.post("/follow/:idToFollow", protect, userController.followUser);
userRouter.post("/unfollow/:idToUnfollow", protect, userController.unfollowUser);

// FIX: Add Star/Unstar routes
userRouter.post("/star/:repoId", protect, userController.starRepo);
userRouter.post("/unstar/:repoId", protect, userController.unstarRepo);

module.exports = userRouter;