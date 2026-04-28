const API = "http://localhost:3000";
const socket = io(API);

// 🔔 SOUND ALERT
const audio = new Audio("https://www.soundjay.com/buttons/beep-01a.mp3");

let incidentsData = [];

// Chart Instances
let statusChartInstance = null;
let typeChartInstance = null;

// DOM Elements
const listEl = document.getElementById("list");
const totalEl = document.getElementById("total");
const activeEl = document.getElementById("active");
const resolvedEl = document.getElementById("resolved");
const searchInput = document.getElementById("search");
const radarBlip = document.getElementById("radar-blip");
let currentFilter = "";

// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// --- LOGIN LOGIC ---
function checkLogin() {
  const pwd = document.getElementById("admin-password").value;
  if (pwd === "SAPTHAGIRI_ADMIN") {
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("dashboard-content").style.display = "block";
    loadIncidents();
  } else {
    document.getElementById("login-error").style.display = "block";
  }
}


// --- DATA LOGIC ---
async function loadIncidents() {
  try {
    const res = await fetch(`${API}/incidents`);
    incidentsData = await res.json();
    
    updateStats();
    renderList();
  } catch (error) {
    console.error("Failed to load incidents:", error);
  }
}

function updateStats() {
  const total = incidentsData.length;
  const resolved = incidentsData.filter(i => i.status === 'Resolved').length;
  const active = total - resolved;

  totalEl.textContent = total;
  activeEl.textContent = active;
  resolvedEl.textContent = resolved;

  // Radar logic
  if (radarBlip) {
    if (active > 0) {
      radarBlip.style.animation = "blipFlash 1.5s infinite";
    } else {
      radarBlip.style.animation = "none";
      radarBlip.style.opacity = "0";
    }
  }

  updateAnalytics();
}

// --- PREDICTIVE ANALYTICS ---
function updateAnalytics() {
  const pendingCount = incidentsData.filter(i => i.status === 'Pending').length;
  const respondingCount = incidentsData.filter(i => i.status === 'Responding').length;
  const resolvedCount = incidentsData.filter(i => i.status === 'Resolved').length;

  const fireCount = incidentsData.filter(i => i.type === 'Fire').length;
  const medCount = incidentsData.filter(i => i.type === 'Medical').length;
  const secCount = incidentsData.filter(i => i.type === 'Security').length;

  // 1. Status Doughnut Chart
  const ctxStatus = document.getElementById('statusChart');
  if (ctxStatus) {
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Responding', 'Resolved'],
        datasets: [{
          data: [pendingCount, respondingCount, resolvedCount],
          backgroundColor: ['#f97316', '#3b82f6', '#22c55e'],
          borderColor: 'rgba(15, 23, 42, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
        }
      }
    });
  }

  // 2. Incident Type Bar Chart
  const ctxType = document.getElementById('typeChart');
  if (ctxType) {
    if (typeChartInstance) typeChartInstance.destroy();
    typeChartInstance = new Chart(ctxType, {
      type: 'bar',
      data: {
        labels: ['Fire', 'Medical', 'Security'],
        datasets: [{
          label: 'Incidents',
          data: [fireCount, medCount, secCount],
          backgroundColor: ['#ef4444', '#3b82f6', '#22c55e'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            ticks: { stepSize: 1, color: '#cbd5e1' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          x: { 
            ticks: { color: '#cbd5e1' },
            grid: { display: false }
          }
        }
      }
    });
  }
}


function renderList() {
  if (!listEl) return;

  const searchTerm = searchInput.value.toLowerCase();

  const filtered = incidentsData.filter(i => {
    const matchesSearch = i.location.toLowerCase().includes(searchTerm) || i.type.toLowerCase().includes(searchTerm) || (i.student_id && i.student_id.toLowerCase().includes(searchTerm));
    const matchesStatus = currentFilter === "" || i.status === currentFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛡️</div>
        <h3>Campus is Secure</h3>
        <p>There are no active emergencies matching your criteria.</p>
      </div>
    `;
    return;
  }

  // Relative Time Helper
  const timeAgo = (dateStr) => {
    try {
      const past = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch(e) {
      return dateStr;
    }
  };

  listEl.innerHTML = filtered.map((i, index) => {
    const priorityClass = i.priority ? `priority-${i.priority.toLowerCase()}` : 'priority-low';
    const statusClass = `status-${i.status.toLowerCase()}`;
    const badgeClass = `badge-${i.status.toLowerCase()}`;
    
    let timeFormatted = timeAgo(i.time);

    // Staggered animation delay based on index
    const delay = index * 0.1;


    return `
      <div class="incident-card glass-card ${priorityClass} ${statusClass} animate-flip" style="animation-delay: ${delay}s">
        <div class="incident-header">
          <h3 class="incident-type">
            ${i.type === 'Fire' ? '🔥' : i.type === 'Medical' ? '🚑' : '🚔'} ${i.type}
          </h3>
          <span class="incident-badge ${badgeClass}">${i.status}</span>
        </div>
        
        <div class="incident-details">
          <p>📍 <strong>Location:</strong> ${i.location}</p>
          <p>⚡ <strong>Priority:</strong> ${i.priority || 'N/A'}</p>
          <p>🕒 <strong>Time:</strong> ${timeFormatted}</p>
          ${i.student_id ? `<p>🎓 <strong>Student ID:</strong> ${i.student_id}</p>` : ''}
          ${i.phone ? `<p>📞 <strong>Phone:</strong> ${i.phone}</p>` : ''}
          ${i.description ? `<p style="margin-top: 12px; font-style: italic; color: var(--text-main); background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">"${i.description}"</p>` : ''}
        </div>

        <div class="incident-actions">
          ${i.status !== 'Responding' && i.status !== 'Resolved' ? 
            `<button class="btn-respond" onclick="updateStatus(${i.id}, 'Responding')">Respond</button>` : 
            `<button class="btn-respond btn-disabled" disabled>Respond</button>`
          }
          ${i.status !== 'Resolved' ? 
            `<button class="btn-resolve" onclick="updateStatus(${i.id}, 'Resolved')">Resolve</button>` : 
            `<button class="btn-resolve btn-disabled" disabled>Resolve</button>`
          }
        </div>
      </div>
    `;
  }).join("");
}

// UPDATE STATUS
async function updateStatus(id, status) {
  try {
    await fetch(`${API}/incident/${id}`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ status })
    });
  } catch (error) {
    console.error("Failed to update status:", error);
  }
}

// Event Listeners for Search/Filter
searchInput.addEventListener('input', renderList);

document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    // Remove active class from all pills
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    // Add active class to clicked pill
    e.target.classList.add('active');
    
    currentFilter = e.target.getAttribute('data-filter');
    renderList();
  });
});

// Auto-update relative times every minute
setInterval(() => {
  if (incidentsData.length > 0 && document.getElementById("dashboard-content").style.display === "block") {
    renderList();
  }
}, 60000);

// 🔥 REAL-TIME EVENTS
socket.on("newIncident", (data) => {
  audio.play().catch(e => console.log("Audio play blocked:", e)); // 🔔 sound
  showToast(`New Emergency: ${data.type} at ${data.location}!`, "error");
  loadIncidents();
});

socket.on("updateIncident", (data) => {
  showToast(`Incident #${data.id} is now ${data.status}`, "success");
  loadIncidents();
});
