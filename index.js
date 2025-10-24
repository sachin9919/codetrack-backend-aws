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

  // 1. BODY PARSERS FIRST (CRITICAL: Runs before CORS)
  app.use(bodyParser.json());
  app.use(express.json());

  // --- ULTIMATE CORS FIX START ---
  // This setting forces Express to allow all origins, bypassing conflicts with Render's internal proxy.
  app.use(cors({
    origin: "*", // Allow ALL domains 
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204 // Use 204 for a clean OPTIONS preflight success
  }));

  // Define a list for Socket.IO that includes the explicit Amplify domain, 
  // as Socket.IO sometimes needs a defined list even when Express is permissive.
  const socketIoOrigins = [
    "http://localhost:5173",
    process.env.CORS_ORIGIN, // https://main.d2amjrt77shbml.amplifyapp.com
    "https://codetrack-backend-aws.onrender.com"
  ].filter(Boolean);
  // --- ULTIMATE CORS FIX END ---

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
      // Use the defined list for Socket.IO
      origin: socketIoOrigins,
      methods: ["GET", "POST"],
      credentials: true
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