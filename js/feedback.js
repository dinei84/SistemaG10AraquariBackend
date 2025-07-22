// feedback.js
export function showLoader(show = true) {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.toggle('active', show);
}

export function showToast(msg, duration = 3000) {
  const toast = document.getElementById('globalToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
} 