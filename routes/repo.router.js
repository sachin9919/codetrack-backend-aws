const express = require("express");
const repoController = require("../controllers/repoController");
const issueController = require("../controllers/issueController");
// Import the 'protect' middleware
const { protect } = require('../middleware/authMiddleware');

const repoRouter = express.Router();

// --- Public / General Repo Routes ---
repoRouter.get("/all", repoController.getAllRepositories); // Fetches ALL repos
repoRouter.get("/public", repoController.getPublicRepositories); // Fetches only PUBLIC repos
repoRouter.get("/user/:userID", repoController.fetchRepositoriesForCurrentUser); // Repos for a specific user

// This route MUST come before the 'protect' middleware for public repos
repoRouter.get("/:id", repoController.fetchRepositoryById); // Fetch single repo by ID

// --- Routes requiring Authentication (owner actions) ---
// All routes below this will now require a valid token
repoRouter.use(protect);

repoRouter.post("/create", repoController.createRepository);
repoRouter.put("/update/:id", repoController.updateRepositoryById);
repoRouter.patch("/toggle/:id", repoController.toggleVisibilityById);
repoRouter.delete("/delete/:id", repoController.deleteRepositoryById);

// --- Git Action Routes (likely require auth) ---
repoRouter.post("/:repoId/push", repoController.pushToRemote);
repoRouter.post("/:repoId/pull", repoController.pullFromRemote);
repoRouter.post("/:id/commit", repoController.commitToRepository);

// --- Issue Routes for a specific repo (likely require auth) ---
repoRouter.post("/:repoId/issues", issueController.createIssue);
repoRouter.get("/:repoId/issues", issueController.getAllIssues);

module.exports = repoRouter;