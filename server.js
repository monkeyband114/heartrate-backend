const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const fs = require("fs").promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

wss.on("connection", (ws) => {
  console.log("ESP8266 connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.heartRate) {
        console.log("Received heart rate:", data.heartRate);
        await saveHeartRate(data.heartRate);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("ESP8266 disconnected");
  });
});

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
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
