const express = require("express");
const fs = require("fs");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const FILE = "incidents.json";

// 🔥 PRIORITY LOGIC
function getPriority(type) {
  if (type.includes("Fire")) return "High";
  if (type.includes("Medical")) return "Medium";
  return "Low";
}

// GET incidents
app.get("/incidents", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  res.json(data);
});

// POST incident
app.post("/incident", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));

  const newIncident = {
    id: Date.now(),
    type: req.body.type,
    location: req.body.location,
    priority: getPriority(req.body.type),
    status: "Pending",
    time: new Date()
  };

  data.push(newIncident);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  io.emit("newIncident", newIncident); // 🔥 REAL-TIME PUSH

  res.json(newIncident);
});

// UPDATE status
app.put("/incident/:id", (req, res) => {
  let data = JSON.parse(fs.readFileSync(FILE));

  data = data.map(i =>
    i.id == req.params.id ? { ...i, status: req.body.status } : i
  );

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

  io.emit("updateIncident", { id: req.params.id, status: req.body.status });

  res.json({ message: "Updated" });
});

server.listen(3000, () => console.log("🚀 Server running on port 3000"));