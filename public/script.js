const API = "http://localhost:3000";
const socket = io(API);

// 🔔 SOUND ALERT
const audio = new Audio("https://www.soundjay.com/buttons/beep-01a.mp3");

// LOAD incidents
async function loadIncidents() {
  const res = await fetch(`${API}/incidents`);
  const data = await res.json();

  const list = document.getElementById("list");
  if (!list) return;

  list.innerHTML = data.map(i => `
    <div class="card">
      <h3>${i.type}</h3>
      <p>📍 ${i.location}</p>
      <p>⚡ Priority: ${i.priority}</p>
      <p>Status: ${i.status}</p>

      <button onclick="updateStatus(${i.id}, 'Responding')">Respond</button>
      <button onclick="updateStatus(${i.id}, 'Resolved')">Resolve</button>
    </div>
  `).join("");
}

// UPDATE STATUS
async function updateStatus(id, status) {
  await fetch(`${API}/incident/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ status })
  });
}

// 🔥 REAL-TIME EVENTS
socket.on("newIncident", (data) => {
  audio.play(); // 🔔 sound
  loadIncidents();
});

socket.on("updateIncident", () => {
  loadIncidents();
});

loadIncidents();