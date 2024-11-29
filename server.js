const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;

const app = express();

app.use(cors());
app.use(express.json());

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

// POST endpoint for receiving heart rate data
app.post("/heart-rate", async (req, res) => {
  try {
    const { heartRate } = req.body;
    if (typeof heartRate !== "number") {
      return res.status(400).json({ error: "Invalid heart rate data" });
    }
    await saveHeartRate(heartRate);
    console.log("Received heart rate:", heartRate);
    res.status(200).json({ message: "Heart rate saved successfully" });
  } catch (error) {
    console.error("Error saving heart rate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET endpoint for retrieving the latest heart rate
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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
