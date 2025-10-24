const express = require("express");
const userRouter = require("./user.router");
const repoRouter = require("./repo.router");
const searchRouter = require("./search.router");
const eventRouter = require("./event.router"); // --- ADDED THIS ---

const mainRouter = express.Router();

// Prefix all routes
// /api/user -> userRouter
mainRouter.use("/user", userRouter);
// /api/repo -> repoRouter
mainRouter.use("/repo", repoRouter);
// /api/search -> searchRouter
mainRouter.use("/search", searchRouter);
// /api/events -> eventRouter      // --- ADDED THIS ---
mainRouter.use("/events", eventRouter);


mainRouter.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

module.exports = mainRouter;