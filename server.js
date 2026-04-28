const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Initialize SQLite Database
const db = new sqlite3.Database("database.sqlite", (err) => {
  if (err) {
    console.error("Error opening database " + err.message);
  } else {
    db.run(
      `CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        location TEXT,
        priority TEXT,
        status TEXT,
        time TEXT,
        phone TEXT,
        student_id TEXT,
        description TEXT
      )`,
      (err) => {
        if (err) console.error("Error creating table " + err.message);
      }
    );
  }
});

// --- AI Smart Triage (Rule-Based Triage Engine) ---
function analyzePriority(type, description) {
  const text = ((type || "") + " " + (description || "")).toLowerCase();
  
  const highKeywords = ["smoke", "fire", "gun", "weapon", "blood", "bleeding", "unconscious", "collapse", "heart", "breathe", "breathing", "fight", "attack", "critical", "severe"];
  const lowKeywords = ["lost", "found", "broken", "spill", "water", "light", "door", "cleaning", "noise", "loud", "minor"];
  
  if (highKeywords.some(keyword => text.includes(keyword))) {
    return "High";
  }
  
  if (lowKeywords.some(keyword => text.includes(keyword))) {
    return "Low";
  }
  
  return "Medium";
}

// GET incidents
app.get("/incidents", (req, res) => {
  db.all("SELECT * FROM incidents ORDER BY time DESC", [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// POST incident
app.post("/incident", (req, res) => {
  const calculatedPriority = analyzePriority(req.body.type, req.body.description);
  const timestamp = new Date();

  const newIncident = {
    type: req.body.type,
    location: req.body.location,
    priority: calculatedPriority,
    status: "Pending",
    time: timestamp.toISOString(),
    phone: req.body.phone || null,
    student_id: req.body.studentId || null,
    description: req.body.description || null
  };

  const sql = `INSERT INTO incidents (type, location, priority, status, time, phone, student_id, description) VALUES (?,?,?,?,?,?,?,?)`;
  const params = [
    newIncident.type, newIncident.location, newIncident.priority, newIncident.status, 
    newIncident.time, newIncident.phone, newIncident.student_id, newIncident.description
  ];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    // Add the generated ID to the object before broadcasting
    newIncident.id = this.lastID;
    
    io.emit("newIncident", newIncident); // 🔥 REAL-TIME PUSH
    res.json(newIncident);
  });
});

// MOCK SMS FUNCTION
function sendMockSMS(phone, type, location, status) {
  if (!phone) return;
  
  console.log("\n==============================================");
  console.log(`📱 [MOCK SMS DISPATCHED TO: ${phone}]`);
  
  if (status === 'Responding') {
    console.log(`💬 "Sapthagiri NPS Security: We have received your ${type} alert at ${location}. Help is immediately on the way. Please stay safe."`);
  } else if (status === 'Resolved') {
    console.log(`💬 "Sapthagiri NPS Security: Your ${type} alert at ${location} has been successfully resolved. Thank you for reporting."`);
  }
  
  console.log("==============================================\n");
}

// UPDATE status
app.put("/incident/:id", (req, res) => {
  const newStatus = req.body.status;
  const incidentId = req.params.id;

  const sql = `UPDATE incidents SET status = ? WHERE id = ?`;
  const params = [newStatus, incidentId];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    // Fetch the updated incident to trigger the SMS
    db.get("SELECT * FROM incidents WHERE id = ?", [incidentId], (err, row) => {
      if (!err && row && row.phone) {
        sendMockSMS(row.phone, row.type, row.location, newStatus);
      }
    });

    io.emit("updateIncident", { id: incidentId, status: newStatus });
    res.json({ message: "Updated" });
  });
});

server.listen(3000, () => console.log("🚀 Server running on port 3000 with SQLite"));