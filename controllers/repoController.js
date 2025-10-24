const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

const { pushRepo } = require("./push");
const { pullRepo } = require("./pull");

// --- REPOSITORY CRUD & OTHER ACTIONS ---

async function createRepository(req, res) {
  const { name, description, visibility } = req.body;
  // Get owner from the 'protect' middleware
  const owner = req.user.id;
  try {
    if (!name) { return res.status(400).json({ error: "Repository name is required!" }); }
    if (!mongoose.Types.ObjectId.isValid(owner)) { return res.status(400).json({ error: "Invalid User ID!" }); }
    const ownerUser = await User.findById(owner);
    if (!ownerUser) { return res.status(404).json({ error: "Owner user not found!" }); }
    const existingRepo = await Repository.findOne({ name: name, owner: owner });
    if (existingRepo) { return res.status(400).json({ error: `Repository named '${name}' already exists for this user.` }); }
    const newRepository = new Repository({ name, description: description || "", visibility: visibility !== undefined ? visibility : true, owner });
    const savedRepository = await newRepository.save();
    ownerUser.repositories.push(savedRepository._id);
    await ownerUser.save();
    console.log(`Repository ${savedRepository.name} added to user ${ownerUser.username}`);
    res.status(201).json({ message: "Repository created successfully!", repositoryID: savedRepository._id });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      console.error("Duplicate repository name error:", err.message);
      return res.status(400).json({ error: `A repository named '${name}' might already exist.` });
    }
    console.error("Error during repository creation : ", err.message);
    res.status(500).json({ error: "Server error during repository creation." });
  }
}

// --- Commit Function ---
async function commitToRepository(req, res) {
  const { id } = req.params; // Repository ID
  // Get 'content' (file content) from body along with message
  const { message, content } = req.body;
  // --- FIX 1: Get author ID from 'protect' middleware, not req.body ---
  const authorId = req.user.id;

  try {
    if (!message) { return res.status(400).json({ error: "Commit message is required." }); }
    if (!mongoose.Types.ObjectId.isValid(authorId)) { return res.status(400).json({ error: "Invalid User ID format provided." }); }

    const repository = await Repository.findById(id);
    if (!repository) { return res.status(404).json({ error: "Repository not found!" }); }

    // Check if the user is the owner
    if (repository.owner.toString() !== authorId) {
      return res.status(403).json({ error: "Forbidden: Only the owner can commit to this repository." });
    }

    // Add commit message to history
    const newCommit = { message: message, author: authorId, timestamp: new Date() };
    repository.content.push(newCommit);

    repository.latestContent = content || "";

    let updatedRepository = await repository.save();

    // --- FIX 2: Repopulate owner info before sending back ---
    updatedRepository = await updatedRepository.populate("owner", "username _id");

    res.status(200).json({
      message: "Commit successful!",
      // Send back the full, populated repository
      repository: updatedRepository
    });

  } catch (err) {
    console.error("Error during commit : ", err.message);
    res.status(500).json({ error: "Server error during commit." });
  }
}

async function getAllRepositories(req, res) {
  try {
    const repositories = await Repository.find({}).populate("owner", "username").sort({ createdAt: -1 });
    res.json(repositories);
  } catch (err) {
    console.error("Error during fetching repositories : ", err.message);
    res.status(500).json({ error: "Server error fetching repositories." });
  }
}

// --- Fetch Single Repo ---
async function fetchRepositoryById(req, res) {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ error: "Invalid Repository ID format." }); }
    const repository = await Repository.findById(id)
      .populate("owner", "username _id")
      .select('name description visibility owner createdAt content latestContent');

    if (!repository) { return res.status(404).json({ error: "Repository not found!" }); }
    res.json(repository);
  } catch (err) {
    console.error("Error during fetching repository : ", err.message);
    res.status(500).json({ error: "Server error fetching repository." });
  }
}

async function fetchRepositoryByName(req, res) {
  const { name } = req.params;
  try {
    const repositories = await Repository.find({ name }).populate("owner", "username");
    if (!repositories || repositories.length === 0) { return res.status(404).json({ error: `No repositories found with name '${name}'.` }); }
    res.json(repositories);
  } catch (err) {
    console.error("Error during fetching repository by name : ", err.message);
    res.status(500).json({ error: "Server error fetching repository by name." });
  }
}

async function fetchRepositoriesForCurrentUser(req, res) {
  const { userID } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(userID)) { return res.status(400).json({ error: "Invalid User ID format." }); }
    const repositories = await Repository.find({ owner: userID }).select('name description visibility createdAt').sort({ createdAt: -1 });
    res.status(200).json({ message: "Repositories fetched", repositories });
  } catch (err) {
    console.error("Error during fetching user repositories : ", err.message);
    res.status(500).json({ error: "Server error fetching user repositories." });
  }
}

async function updateRepositoryById(req, res) {
  const { id } = req.params;
  const { description } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ error: "Invalid Repository ID format." }); }
    const repository = await Repository.findById(id);
    if (!repository) { return res.status(404).json({ error: "Repository not found!" }); }

    // Check if the user is the owner
    if (repository.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Only the owner can update this repository." });
    }

    if (description !== undefined) { repository.description = description; }
    else { return res.status(400).json({ error: "No description provided for update." }); }

    let updatedRepository = await repository.save();

    // --- FIX: Repopulate owner info before sending back ---
    updatedRepository = await updatedRepository.populate("owner", "username _id");

    res.json({ message: "Repository updated successfully!", repository: updatedRepository });
  } catch (err) {
    console.error("Error during updating repository : ", err.message);
    res.status(500).json({ error: "Server error updating repository." });
  }
}

async function toggleVisibilityById(req, res) {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ error: "Invalid Repository ID format." }); }
    let repository = await Repository.findById(id);
    if (!repository) { return res.status(404).json({ error: "Repository not found!" }); }

    // Check if the user is the owner
    if (repository.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Only the owner can change visibility." });
    }

    repository.visibility = !repository.visibility;
    let updatedRepository = await repository.save();

    // --- FIX: Repopulate owner info before sending back ---
    updatedRepository = await updatedRepository.populate("owner", "username _id");

    res.json({ message: "Repository visibility toggled successfully!", repository: updatedRepository });
  } catch (err) {
    console.error("Error during toggling visibility : ", err.message);
    res.status(500).json({ error: "Server error toggling visibility." });
  }
}

async function deleteRepositoryById(req, res) {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.status(400).json({ error: "Invalid Repository ID format." }); }
    const repository = await Repository.findById(id).select('owner');
    if (!repository) { return res.status(404).json({ error: "Repository not found!" }); }
    const ownerId = repository.owner;

    // Check if the user is the owner
    if (ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Only the owner can delete this repository." });
    }

    const deleteResult = await Repository.findByIdAndDelete(id);
    if (!deleteResult) { return res.status(404).json({ error: "Repository not found during delete!" }); }
    await User.findByIdAndUpdate(ownerId, { $pull: { repositories: id } });
    console.log(`Repository ${id} deleted and removed from user ${ownerId}`);
    res.json({ message: "Repository deleted successfully!" });
  } catch (err) {
    console.error("Error during deleting repository : ", err.message);
    res.status(500).json({ error: "Server error deleting repository." });
  }
}

// --- GIT ACTIONS (PUSH & PULL) ---
async function pushToRemote(req, res) {
  const { repoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(repoId)) { return res.status(400).json({ error: "Invalid Repository ID format." }); }
  try {
    const repository = await Repository.findById(repoId);
    if (!repository) { return res.status(404).json({ error: "Repository not found in database." }); }

    if (repository.owner.toString() !== req.user.id) { return res.status(403).json({ error: "Forbidden." }); }

    const result = await pushRepo(repoId);
    res.status(200).json({ message: result.message });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function pullFromRemote(req, res) {
  const { repoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(repoId)) { return res.status(400).json({ error: "Invalid Repository ID format." }); }
  try {
    const repository = await Repository.findById(repoId);
    if (!repository) { return res.status(404).json({ error: "Repository not found in database." }); }

    if (repository.owner.toString() !== req.user.id) { return res.status(403).json({ error: "Forbidden." }); }

    const result = await pullRepo(repoId);
    res.status(200).json({ message: result.message });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// --- Function to get only PUBLIC repositories ---
async function getPublicRepositories(req, res) {
  try {
    const publicRepositories = await Repository.find({ visibility: true })
      .populate("owner", "username _id")
      .select('name description visibility owner createdAt')
      .sort({ createdAt: -1 });
    res.json(publicRepositories);
  } catch (err) {
    console.error("Error fetching public repositories: ", err.message);
    res.status(500).json({ error: "Server error fetching public repositories." });
  }
}

// --- Corrected Module Exports ---
module.exports = {
  createRepository,
  getAllRepositories,
  commitToRepository,
  fetchRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  pushToRemote,
  pullFromRemote,
  getPublicRepositories,
};