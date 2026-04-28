function setType(val) {
  document.getElementById("type").value = val;
  
  // Update active state of quick buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const btn = document.querySelector(`.quick-btn.${val.toLowerCase()}`);
  if (btn) btn.classList.add('active');
}

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
  
  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Hold-to-Panic Logic
let panicTimer = null;
let panicStartTime = 0;
const PANIC_DURATION = 2000; // 2 seconds

function startPanic() {
  const btn = document.getElementById("panic-btn");
  const progress = document.getElementById("panic-progress");
  if (btn.disabled) return;
  
  panicStartTime = Date.now();
  progress.style.transition = 'none';
  progress.style.opacity = '1';
  
  panicTimer = setInterval(() => {
    const elapsed = Date.now() - panicStartTime;
    const percent = Math.min(elapsed / PANIC_DURATION, 1);
    const degrees = percent * 360 - 90;
    
    // Create a circular progress using conic-gradient
    progress.style.background = `conic-gradient(var(--accent-red) ${percent * 100}%, transparent 0)`;
    
    if (elapsed >= PANIC_DURATION) {
      clearInterval(panicTimer);
      progress.style.opacity = '0';
      reportIncident();
    }
  }, 50);
}

function stopPanic() {
  if (panicTimer) {
    clearInterval(panicTimer);
    const progress = document.getElementById("panic-progress");
    progress.style.background = 'transparent';
    progress.style.opacity = '0';
  }
}

function autoFill() {
  const rooms = ["Main Library", "CS Lab 1", "Hostel Block A", "Main Auditorium", "Administrative Office", "Cafeteria", "Chemistry Lab"];
  const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
  const roomNumber = Math.floor(Math.random() * 500) + 100;
  document.getElementById("location").value = `${randomRoom} (Room ${roomNumber})`;
}

async function reportIncident() {
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value;
  const phone = document.getElementById("phone").value;
  const studentId = document.getElementById("studentId").value.trim().toUpperCase();
  const description = document.getElementById("description").value;
  
  if (!location) {
    showToast("Please enter a location or use Auto Detect.", "error");
    return;
  }

  // Basic Validation for Sapthagiri Student ID (starts with 24SUUBE + branch + digits)
  const idRegex = /^24SUUBE[a-zA-Z]+\d+$/i;
  if (!studentId || !idRegex.test(studentId)) {
    showToast("Please enter a valid Sapthagiri University ID (e.g. 24SUUBECS0000).", "error");
    return;
  }

  const btn = document.getElementById('panic-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ SENDING...';
  btn.disabled = true;

  try {
    const payload = {
      type,
      location,
      phone,
      studentId,
      description
    };

    await fetch("/incident", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showToast("Alert Sent Successfully. Help is on the way.", "success");
    
    // Clear form
    document.getElementById("location").value = '';
    document.getElementById("phone").value = '';
    document.getElementById("studentId").value = '';
    document.getElementById("description").value = '';
    
  } catch (error) {
    console.error("Error reporting incident:", error);
    showToast("Failed to send alert. Please check your connection.", "error");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

