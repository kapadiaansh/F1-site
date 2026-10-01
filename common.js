const OPENF1 = "https://api.openf1.org/v1";
const CURRENT_YEAR = new Date().getFullYear();

const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];

async function api(path) {
  const response = await fetch(`${OPENF1}${path}`);
  if (!response.ok) throw new Error(`OpenF1 request failed: ${response.status}`);
  return response.json();
}

function fmtDate(iso, opts = {}) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts
  }).format(new Date(iso));
}

function fmtDateTime(iso) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(iso));
}

function teamColor(value) {
  if (!value) return "#ff3b30";
  return value.startsWith("#") ? value : `#${value}`;
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function statusForMeeting(meeting) {
  const now = new Date();
  const start = new Date(meeting.date_start);
  const end = new Date(meeting.date_end);
  if (now < start) return "UPCOMING";
  if (now > end) return "COMPLETE";
  return "RACE WEEK";
}

function setupGlobalMenu() {
  const btn = qs("#menuButton");
  const nav = qs("#mobileNav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }));
}

document.addEventListener("DOMContentLoaded", setupGlobalMenu);
