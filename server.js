const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());

let latestHeartRate = 0;

wss.on("connection", (ws) => {
  console.log("ESP8266 connected");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.heartRate) {
        latestHeartRate = data.heartRate;
        console.log("Received heart rate:", latestHeartRate);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("ESP8266 disconnected");
  });
});

app.get("/heart-rate", (req, res) => {
  res.json({ heartRate: latestHeartRate });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
