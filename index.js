const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

// FIX 1: Import the main router instead of individual routers
const mainRouter = require("./routes/main.router");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const { commitRepo } = require("./controllers/commit");
const { pushRepo } = require("./controllers/push");
const { pullRepo } = require("./controllers/pull");
const { revertRepo } = require("./controllers/revert");
const { removeRepo } = require("./controllers/remove");
const { logRepo } = require("./controllers/log");
const { statusRepo } = require("./controllers/status");

dotenv.config();

yargs(hideBin(process.argv))
  .command("start", "Starts a new server", {}, startServer)
  .command("init", "Initialise a new repository", {}, initRepo)
  .command(
    "add <files...>",
    "Add files to the repository staging area",
    (yargs) => {
      yargs.positional("files", {
        describe: "Files to add to the staging area (space separated)",
        type: "array",
      });
    },
    (argv) => {
      const filesToStage = argv.files;
      addRepo(filesToStage);
    }
  )
  .command(
    "rm <files...>",
    "Remove file from the staging area",
    (yargs) => {
      yargs.positional("files", {
        describe: "Files to remove from staging (space separated)",
        type: "array",
      });
    },
    (argv) => {
      const filesToRemove = argv.files;
      removeRepo(filesToRemove);
    }
  )
  .command(
    "commit <message>",
    "Commit the staged files",
    (yargs) => {
      yargs.positional("message", {
        describe: "Commit message",
        type: "string",
      });
    },
    (argv) => {
      commitRepo(argv.message);
    }
  )
  .command("push", "Push commits to S3", {}, () => pushRepo())
  .command("pull", "Pull commits from S3", {}, () => pullRepo())
  .command("log", "Show commit history", {}, logRepo)
  .command("status", "Show working tree status", {}, statusRepo)
  .command(
    "revert <commitID>",
    "Revert to a specific commit",
    (yargs) => {
      yargs.positional("commitID", {
        describe: "Commit ID to revert to",
        type: "string",
      });
    },
    (argv) => {
      revertRepo(argv.commitID);
    }
  )
  .demandCommand(1, "You need at least one command")
  .help().argv;

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // --- CORRECTION START: Dynamic CORS for Production/Render ---
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.CORS_ORIGIN, // This is your Amplify domain on Render
    "https://codetrack-backend-aws.onrender.com" // Allows direct testing of the API
  ].filter(Boolean); // Filters out any undefined or empty strings

  app.use(cors({
    // CORRECTION: Use the dynamic list to allow the deployed frontend domain
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200 // Ensures preflight requests pass
  }));
  // --- CORRECTION END ---

  app.use(bodyParser.json());
  app.use(express.json());

  const mongoURI = process.env.MONGODB_URI;

  mongoose
    .connect(mongoURI)
    .then(() => console.log("✅ MongoDB connected!"))
    .catch((err) => console.error("❌ Unable to connect : ", err));

  // FIX 2: Use the main router for all API routes
  // This will automatically handle /api/repo, /api/user, and /api/search
  app.use("/api", mainRouter);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      // CORRECTION: Socket.IO also needs to allow the Amplify origin
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("joinRoom", (userID) => {
      console.log(`User ${socket.id} joined room: ${userID}`);
      socket.join(userID);
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Server is running on PORT ${port}`);
  });
}