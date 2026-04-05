// ── Toast notification ────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Check if logged in, redirect if not ──────────────────────
async function requireAuth() {
  const res  = await fetch('/api/auth/session');
  const data = await res.json();
  if (!data.loggedIn) {
    window.location.href = '/';
    return null;
  }
  return data.student;
}

// ── Render nav student name ───────────────────────────────────
function setNavUser(student) {
  const el = document.getElementById('nav-username');
  if (el) el.textContent = `${student.firstName} ${student.lastName}`;
}

// ── Logout ────────────────────────────────────────────────────
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}
