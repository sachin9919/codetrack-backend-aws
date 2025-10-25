const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

// Import the main router
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

  // Middleware setup
  app.use(bodyParser.json());
  app.use(express.json());

  // ✅ --- FIXED CORS CONFIGURATION ---
  const allowedOrigins = [
    "http://localhost:5173",
    "https://main.d2amjrt77shbml.amplifyapp.com",
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log("❌ CORS blocked for origin:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  // ✅ --- END CORS CONFIGURATION ---

  // Connect to MongoDB
  const mongoURI = process.env.MONGODB_URI;
  mongoose
    .connect(mongoURI)
    .then(() => console.log("✅ MongoDB connected!"))
    .catch((err) => console.error("❌ Unable to connect:", err));

  // Use main router for all APIs
  app.use("/api", mainRouter);

  // Setup HTTP + Socket.IO server
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
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
