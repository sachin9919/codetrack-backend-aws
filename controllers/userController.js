const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Repository = require('../models/repoModel'); // Import Repository model
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

// --- Signup ---
async function signup(req, res) {
  const { username, password, email } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "User already exists!" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ username, password: hashedPassword, email });
    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: "8h" });

    res.json({ token, userId: savedUser._id, avatarUrl: savedUser.avatarUrl });
  } catch (err) {
    console.error("Error during signup : ", err.message);
    res.status(500).json({ error: "Server error during signup." });
  }
}


// --- Login ---
async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password avatarUrl');
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "8h" });

    res.json({ token, userId: user._id, avatarUrl: user.avatarUrl });
  } catch (err) {
    console.error("Error during login : ", err.message);
    res.status(500).json({ error: "Server error during login." });
  }
}

// --- Get All Users ---
async function getAllUsers(req, res) {
  try {
    const users = await User.find({}).select('username _id avatarUrl');
    res.json(users);
  } catch (err) {
    console.error("Error fetching all users: ", err.message);
    res.status(500).json({ error: "Server error fetching users." });
  }
}

// --- Get User Profile ---
async function getUserProfile(req, res) {
  const profileUserId = req.params.id;
  const loggedInUserId = req.user?.id;

  if (!mongoose.Types.ObjectId.isValid(profileUserId)) {
    return res.status(400).json({ message: "Invalid profile user ID format." });
  }

  try {
    const [user, followerCount] = await Promise.all([
      User.findById(profileUserId)
        .select('username email followedUsers repositories starRepos createdAt avatarUrl')
        .populate({
          path: 'repositories', select: 'name description visibility _id',
          options: { limit: 10, sort: { createdAt: -1 } }
        }),
      User.countDocuments({ followedUsers: profileUserId })
    ]);


    if (!user) { return res.status(404).json({ message: "User not found!" }); }

    const followingCount = user.followedUsers.length;
    let isFollowing = false;
    let starredRepoIds = [];

    if (loggedInUserId && mongoose.Types.ObjectId.isValid(loggedInUserId)) {
      const loggedInUser = await User.findById(loggedInUserId).select('followedUsers starRepos');
      isFollowing = loggedInUser?.followedUsers?.some(id => id.toString() === profileUserId.toString()) || false;
      starredRepoIds = loggedInUser?.starRepos?.map(id => id.toString()) || [];
    }

    const userProfileData = user.toObject();
    userProfileData.followingCount = followingCount;
    userProfileData.followerCount = followerCount;
    userProfileData.isFollowing = isFollowing;
    userProfileData.loggedInUserStarredRepoIds = starredRepoIds;

    res.send(userProfileData);

  } catch (err) {
    console.error("Error during fetching profile: ", err.message);
    res.status(500).json({ error: "Server error fetching profile." });
  }
}


// --- Update User Profile ---
async function updateUserProfile(req, res) {
  const profileUserId = req.params.id;
  const loggedInUserId = req.user?.id;
  const { email, password } = req.body;

  if (!loggedInUserId || loggedInUserId !== profileUserId) { return res.status(403).json({ error: "Forbidden: You can only update your own profile." }); }
  if (!mongoose.Types.ObjectId.isValid(profileUserId)) { return res.status(400).json({ message: "Invalid user ID format." }); }

  try {
    const user = await User.findById(profileUserId);
    if (!user) { return res.status(404).json({ message: "User not found!" }); }
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    const updatedUser = await user.save();
    updatedUser.password = undefined;
    res.send(updatedUser);
  } catch (err) {
    console.error("Error during updating profile: ", err.message);
    res.status(500).json({ error: "Server error updating profile." });
  }
}

// --- Delete User Profile ---
async function deleteUserProfile(req, res) {
  const profileUserId = req.params.id;
  const loggedInUserId = req.user?.id;

  if (!loggedInUserId || loggedInUserId !== profileUserId) { return res.status(403).json({ error: "Forbidden: You can only delete your own profile." }); }
  if (!mongoose.Types.ObjectId.isValid(profileUserId)) { return res.status(400).json({ message: "Invalid user ID format." }); }

  try {
    const result = await User.findByIdAndDelete(profileUserId);
    if (!result) { return res.status(404).json({ message: "User not found!" }); }
    res.json({ message: "User Profile Deleted!" });
  } catch (err) {
    console.error("Error during deleting profile: ", err.message);
    res.status(500).json({ error: "Server error deleting profile." });
  }
}


// --- Follow User ---
async function followUser(req, res) {
  const idToFollow = req.params.idToFollow;
  const currentUserId = req.user?.id;

  if (!currentUserId) { return res.status(401).json({ error: "Not authenticated" }); }
  if (currentUserId === idToFollow) { return res.status(400).json({ error: "You cannot follow yourself." }); }
  if (!mongoose.Types.ObjectId.isValid(idToFollow)) { return res.status(400).json({ message: "Invalid user ID format to follow." }); }

  try {
    const userToFollow = await User.findById(idToFollow);
    if (!userToFollow) { return res.status(404).json({ error: "User to follow not found." }); }

    const updatedUser = await User.findByIdAndUpdate(currentUserId, { $addToSet: { followedUsers: idToFollow } }, { new: true }).select('followedUsers');
    if (!updatedUser) { return res.status(404).json({ error: "Current user not found." }); }
    res.json({ message: `Successfully followed ${userToFollow.username}`, followedUsers: updatedUser.followedUsers });
  } catch (err) {
    console.error("Error during follow user: ", err.message);
    res.status(500).json({ error: "Server error during follow." });
  }
}

// --- Unfollow User ---
async function unfollowUser(req, res) {
  const idToUnfollow = req.params.idToUnfollow;
  const currentUserId = req.user?.id;

  if (!currentUserId) { return res.status(401).json({ error: "Not authenticated" }); }
  if (currentUserId === idToUnfollow) { return res.status(400).json({ error: "You cannot unfollow yourself." }); }
  if (!mongoose.Types.ObjectId.isValid(idToUnfollow)) { return res.status(400).json({ message: "Invalid user ID format to unfollow." }); }

  try {
    const userToUnfollow = await User.findById(idToUnfollow).select('username');
    if (!userToUnfollow) { console.log(`Attempted to unfollow non-existent user ID: ${idToUnfollow}`); }

    const updatedUser = await User.findByIdAndUpdate(currentUserId, { $pull: { followedUsers: idToUnfollow } }, { new: true }).select('followedUsers');
    if (!updatedUser) { return res.status(404).json({ error: "Current user not found." }); }
    res.json({ message: `Successfully unfollowed user`, followedUsers: updatedUser.followedUsers });
  } catch (err) {
    console.error("Error during unfollow user: ", err.message);
    res.status(500).json({ error: "Server error during unfollow." });
  }
}

// --- Star Repo ---
async function starRepo(req, res) {
  const repoIdToStar = req.params.repoId;
  const currentUserId = req.user?.id;

  if (!currentUserId) { return res.status(401).json({ error: "Not authenticated" }); }
  if (!mongoose.Types.ObjectId.isValid(repoIdToStar)) { return res.status(400).json({ message: "Invalid repository ID format." }); }

  try {
    const repo = await Repository.findById(repoIdToStar).select('_id name');
    if (!repo) { return res.status(404).json({ error: "Repository not found." }); }

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { starRepos: repoIdToStar } },
      { new: true }
    ).select('starRepos');

    if (!updatedUser) { return res.status(404).json({ error: "Current user not found." }); }
    res.json({ message: `Successfully starred repository '${repo.name}'`, starRepos: updatedUser.starRepos });
  } catch (err) {
    console.error("Error during star repo: ", err.message);
    res.status(500).json({ error: "Server error during star repo." });
  }
}

// --- Unstar Repo ---
async function unstarRepo(req, res) {
  const repoIdToUnstar = req.params.repoId;
  const currentUserId = req.user?.id;

  if (!currentUserId) { return res.status(401).json({ error: "Not authenticated" }); }
  if (!mongoose.Types.ObjectId.isValid(repoIdToUnstar)) { return res.status(400).json({ message: "Invalid repository ID format." }); }

  try {
    const repo = await Repository.findById(repoIdToUnstar).select('_id name');

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { starRepos: repoIdToUnstar } },
      { new: true }
    ).select('starRepos');

    if (!updatedUser) { return res.status(404).json({ error: "Current user not found." }); }

    res.json({ message: `Successfully unstarred repository '${repo?.name || repoIdToUnstar}'`, starRepos: updatedUser.starRepos });
  } catch (err) {
    console.error("Error during unstar repo: ", err.message);
    res.status(500).json({ error: "Server error during unstar repo." });
  }
}

// --- Update User Avatar ---
async function updateUserAvatar(req, res) {
  const userId = req.user?.id;
  if (!userId) { return res.status(401).json({ error: "Not authenticated." }); }
  if (!req.file) { return res.status(400).json({ error: "No avatar file uploaded." }); }

  const avatarUrl = req.file.location;
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { avatarUrl: avatarUrl }, { new: true }).select('username email avatarUrl');
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found during avatar update." });
    }
    res.json({
      message: "Avatar updated successfully!",
      user: updatedUser
    });
  } catch (err) {
    console.error("Error updating user avatar:", err.message);
    res.status(500).json({ error: "Server error updating avatar." });
  }
}

// --- Get Starred Repos ---
async function getStarredRepos(req, res) {
  let profileUserId = req.params.id;

  if (profileUserId && profileUserId.startsWith(':')) {
    profileUserId = profileUserId.substring(1);
  }

  if (!mongoose.Types.ObjectId.isValid(profileUserId)) {
    return res.status(400).json({ message: "Invalid profile user ID format." });
  }

  try {
    const user = await User.findById(profileUserId)
      .select('starRepos')
      .populate({
        path: 'starRepos',
        select: 'name description owner visibility createdAt',
        populate: {
          path: 'owner',
          select: 'username _id'
        }
      });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(user.starRepos);

  } catch (err) {
    console.error("Error fetching starred repos: ", err.message);
    res.status(500).json({ error: "Server error fetching starred repos." });
  }
}


// --- GET CONTRIBUTION DATA FOR HEAT MAP (CORRECTED) ---
async function getContributionData(req, res) {
  let profileUserId = req.params.id; // Use let

  // --- ID Parsing/Validation (omitted logging) ---
  if (profileUserId && profileUserId.startsWith(':')) {
    profileUserId = profileUserId.substring(1);
  }
  if (!mongoose.Types.ObjectId.isValid(profileUserId)) {
    return res.status(400).json({ message: "Invalid user ID format." });
  }

  let userId;
  try {
    userId = new mongoose.Types.ObjectId(profileUserId);
  } catch (error) {
    return res.status(400).json({ message: "Invalid user ID format during conversion." });
  }


  try {
    const contributions = await Repository.aggregate([
      // 1. Deconstruct the 'content' (commits) array
      { $unwind: "$content" },

      // 2. Find all commits where the author matches the user ID
      { $match: { "content.author": userId } },

      // *** CRITICAL FIX: Shift the UTC date to local IST time before converting to string ***
      {
        $addFields: {
          // Add 5 hours and 30 minutes (5.5 * 60 * 60 * 1000 milliseconds) to the UTC timestamp
          localTimestamp: {
            $add: [
              "$content.timestamp",
              19800000 // 5 hours 30 minutes in milliseconds
            ]
          }
        }
      },

      // 3. Project the locally corrected timestamp into a YYYY-MM-DD date string (in UTC format now)
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$localTimestamp", // Use the new localTimestamp field
              // We no longer need the 'timezone' field here since the time is already corrected
            }
          }
        }
      }, // <<<--- COMMA IS HERE

      // 4. Group all commits by that date string and count them
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 }
        }
      },

      // 5. Format the output to match what the heat map component needs
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: "$count"
        }
      },

      // 6. Sort by date (good practice)
      { $sort: { "date": 1 } }
    ]);
    console.log(`DEBUG: Aggregation finished. Found ${contributions.length} contribution days.`); // Log result count

    res.json(contributions);

  } catch (err) {
    console.error("Error fetching contribution data during aggregation: ", err.message); // More specific error log
    res.status(500).json({ error: "Server error fetching contribution data." });
  }
}

module.exports = {
  getAllUsers,
  signup,
  login,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  followUser,
  unfollowUser,
  starRepo,
  unstarRepo,
  updateUserAvatar,
  getStarredRepos,
  getContributionData,
};