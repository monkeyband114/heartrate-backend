const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs").promises;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const DB_FILE = "db.json";

// Initialize db.json if it doesn't exist
async function initDB() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ heartRates: [] }));
  }
}

async function saveHeartRate(heartRate) {
  const data = JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  data.heartRates.push({
    timestamp: new Date().toISOString(),
    value: heartRate,
  });
  // Keep only the last 1000 readings
  if (data.heartRates.length > 1000) {
    data.heartRates = data.heartRates.slice(-1000);
  }
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

async function getLatestHeartRate() {
  const data = JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  return data.heartRates[data.heartRates.length - 1] || { value: 0 };
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("heartRate", async (data) => {
    try {
      console.log("Received heart rate:", data.value);
      await saveHeartRate(data.value);
      // Broadcast the new heart rate to all connected clients
      io.emit("heartRateUpdate", { heartRate: data.value });
    } catch (error) {
      console.error("Error handling heart rate:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// REST endpoint for getting the latest heart rate
app.get("/heart-rate", async (req, res) => {
  try {
    const latestHeartRate = await getLatestHeartRate();
    res.json({ heartRate: latestHeartRate.value });
  } catch (error) {
    console.error("Error fetching heart rate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  await initDB();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
