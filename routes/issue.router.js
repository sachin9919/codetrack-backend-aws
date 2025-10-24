const express = require("express");
const issueController = require("../controllers/issueController");

const issueRouter = express.Router();

// ##########################################################################
// ##  IMPORTANT INSTRUCTION FOR YOU                                       ##
// ## -------------------------------------------------------------------- ##
// ##  This file is causing a routing conflict with 'repo.router.js'.      ##
// ##  The routes for creating/getting issues for a specific repository    ##
// ##  have been moved into 'repo.router.js' for better organization.      ##
// ##                                                                      ##
// ##  YOU MUST GO TO YOUR MAIN `index.js` or `app.js` file and REMOVE      ##
// ##  the line that uses this router, for example:                        ##
// ##                                                                      ##
// ##  // DELETE THIS LINE: app.use('/api/issue', issueRouter);             ##
// ##                                                                      ##
// ##  This will fix the "Unexpected token '<'" error.                     ##
// ##########################################################################


// These routes for managing a single issue by its own ID can remain if needed elsewhere
issueRouter.get("/issues/:id", issueController.getIssueById);
issueRouter.put("/issues/:id", issueController.updateIssueById);
issueRouter.delete("/issues/:id", issueController.deleteIssueById);

module.exports = issueRouter;