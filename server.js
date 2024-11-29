const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "db.json");

// Initialize db.json if it doesn't exist
async function initDB() {
  try {
    await fs.access(dbPath);
  } catch (error) {
    await fs.writeFile(dbPath, JSON.stringify({ sensorData: [] }));
  }
}

// Endpoint for ESP8266 to send data
app.post("/sensor-data", async (req, res) => {
  const sensorData = {
    ...req.body,
    timestamp: new Date().toISOString(),
  };

  try {
    const data = JSON.parse(await fs.readFile(dbPath, "utf-8"));
    data.sensorData.push(sensorData);
    // Keep only the last 100 readings
    if (data.sensorData.length > 100) {
      data.sensorData = data.sensorData.slice(-100);
    }
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
    res.status(200).send("Data received and saved");
  } catch (error) {
    console.error("Error writing to db.json:", error);
    res.status(500).send("Error saving data");
  }
});

// GET endpoint to retrieve the latest sensor data
app.get("/latest-data", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(dbPath, "utf-8"));
    const latestData = data.sensorData[data.sensorData.length - 1] || null;
    res.json(latestData);
  } catch (error) {
    console.error("Error reading from db.json:", error);
    res.status(500).send("Error retrieving data");
  }
});

// GET endpoint to retrieve historical data
app.get("/historical-data", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(dbPath, "utf-8"));
    res.json(data.sensorData);
  } catch (error) {
    console.error("Error reading from db.json:", error);
    res.status(500).send("Error retrieving historical data");
  }
});

// SSE endpoint for real-time updates
app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendData = async () => {
    try {
      const data = JSON.parse(await fs.readFile(dbPath, "utf-8"));
      const latestData = data.sensorData[data.sensorData.length - 1] || null;
      res.write(`data: ${JSON.stringify(latestData)}\n\n`);
    } catch (error) {
      console.error("Error reading from db.json:", error);
    }
  };

  // Send data immediately and then every 5 seconds
  sendData();
  const intervalId = setInterval(sendData, 5000);

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(intervalId);
  });
});

// Start the server
initDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
