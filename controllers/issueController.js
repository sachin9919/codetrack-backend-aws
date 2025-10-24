const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

async function createIssue(req, res) {
  const { content } = req.body;
  const { repoId } = req.params;

  try {
    // FIX 1: Map the incoming 'content' to the 'title' and 'description'
    // fields required by your issueModel.js
    const issue = new Issue({
      title: content.substring(0, 50), // Use first 50 chars as title
      description: content,
      repository: repoId,
    });

    await issue.save();
    res.status(201).json(issue);
  } catch (err) {
    console.error("Error during issue creation: ", err.message);
    res.status(500).json({ error: "Server error during issue creation." });
  }
}

async function updateIssueById(req, res) {
  const { id } = req.params;
  const { content, status } = req.body;
  try {
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ error: "Issue not found!" });
    }

    // FIX 2: Update 'description' field, not 'content'
    issue.description = content || issue.description;
    issue.status = status || issue.status;

    await issue.save();
    res.json({ message: "Issue updated successfully", issue });
  } catch (err) {
    console.error("Error during issue update: ", err.message);
    res.status(500).json({ error: "Server error during issue update." });
  }
}

async function deleteIssueById(req, res) {
  const { id } = req.params;
  try {
    const issue = await Issue.findByIdAndDelete(id);

    if (!issue) {
      return res.status(404).json({ error: "Issue not found!" });
    }
    res.json({ message: "Issue deleted successfully" });
  } catch (err) {
    console.error("Error during issue deletion: ", err.message);
    res.status(500).json({ error: "Server error during issue deletion." });
  }
}

async function getAllIssues(req, res) {
  const { repoId } = req.params;
  try {
    const issues = await Issue.find({ repository: repoId }).sort({ createdAt: -1 });
    res.status(200).json(issues);
  } catch (err) {
    console.error("Error fetching issues: ", err.message);
    res.status(500).json({ error: "Server error while fetching issues." });
  }
}

async function getIssueById(req, res) {
  const { id } = req.params;
  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: "Issue not found!" });
    }
    res.json(issue);
  } catch (err) {
    console.error("Error fetching issue by ID: ", err.message);
    res.status(500).json({ error: "Server error fetching issue by ID." });
  }
}

module.exports = {
  createIssue,
  updateIssueById,
  deleteIssueById,
  getAllIssues,
  getIssueById,
};