const express = require("express");
const searchController = require("../controllers/searchController");

const searchRouter = express.Router();

// GET /api/search?q=searchTerm
searchRouter.get("/", searchController.searchAll);

module.exports = searchRouter;