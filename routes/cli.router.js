const express = require("express");
const cliController = require("../controllers/cliController");

const cliRouter = express.Router();

// Route: POST /cli/config/set-repoid
// Purpose: Receives the MongoDB ID from the frontend and writes it to the local config.json file.
cliRouter.post("/config/set-repoid", cliController.setRepositoryId);

module.exports = cliRouter;