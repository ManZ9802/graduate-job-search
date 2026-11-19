const jobsEl = document.querySelector("#jobs");
const loadingEl = document.querySelector("#loading");
const emptyEl = document.querySelector("#empty");
const errorEl = document.querySelector("#error");
const statusEl = document.querySelector("#status");
const resultCountEl = document.querySelector("#result-count");
const heroTotalEl = document.querySelector("#hero-total");
const trackerEl = document.querySelector("#tracker-list");
const queryEl = document.querySelector("#query");
const searchButton = document.querySelector("#search-button");
const trackButtons = [...document.querySelectorAll(".track")];
const clearButton = document.querySelector("#clear-tracker");

let activeTrack = "all";
let latestJobs = [];
const storageKey = "graduate-job-search-tracker-v1";
const uolSeedKey = "graduate-job-search-uol-digital-technology-intern-v1";
const uolIntern = {
  id: "uol-group-digital-technology-intern-jan-jun-2027",
  title: "Digital & Technology Intern (Jan–Jun 2027)",
  company: "UOL Group",
  location: "Singapore",
  category: "Internship",
  seniority: "Internship",
  source: "NUS School of Computing Internships email",
  postedAt: "2026-11-18T10:00:00+00:00",
  skills: ["AI", "Data & analytics", "Microsoft Fabric", "Power BI", "Azure", "Cybersecurity"],
  url: "mailto:hr@uol.com.sg",
  status: "interested",
  savedAt: "2026-11-18T10:00:00+00:00"
};

function getTracker() {
  let tracker;
  try { tracker = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { tracker = {}; }
  if (!localStorage.getItem(uolSeedKey)) {
    tracker[uolIntern.id] = uolIntern;
    localStorage.setItem(storageKey, JSON.stringify(tracker));
    localStorage.setItem(uolSeedKey, "true");
  }
  return tracker;
}
function saveTracker(value) { localStorage.setItem(storageKey, JSON.stringify(value)); }
function escapeHtml(value) { return String(value || "").replace(/[&<>'\"]/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]); }
function dateLabel(value) {
  if (!value) return "Posting date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Posting date unavailable";
  return `Posted ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
function statusLabel(item) {
  if (item.status === "applied") return "Applied";
  if (item.status === "interested") return "Interested";
  return "Saved";
}
function rolesLabel(total) { return Number(total || 0).toLocaleString(); }

function renderTracker() {
  const tracker = Object.values(getTracker()).sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  if (!tracker.length) {
    trackerEl.innerHTML = '<p class="tracker-empty">Save a role when the fit is credible. Mark it applied only after submitting on the employer site.</p>';
    return;
  }
  trackerEl.innerHTML = tracker.map((job) => `
    <article class="tracked">
      <a class="tracked-title" href="${escapeHtml(job.url)}" target="_blank" rel="noreferrer">${escapeHtml(job.title)}</a>
      <p class="tracked-company">${escapeHtml(job.company)}, ${escapeHtml(job.location)}</p>
      <div class="tracked-actions">
        <button class="status-button ${job.status === "applied" ? "applied" : ""}" data-action="toggle" data-id="${escapeHtml(job.id)}" type="button">${statusLabel(job)}</button>
        <button class="status-button" data-action="remove" data-id="${escapeHtml(job.id)}" type="button">Remove</button>
      </div>
    </article>
  `).join("");
}

function renderJobs(jobs) {
  const tracker = getTracker();
  latestJobs = jobs;
  if (!jobs.length) {
    jobsEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  jobsEl.innerHTML = jobs.map((job) => {
    const tracked = tracker[job.id];
    const tags = [job.category, job.seniority, job.workMode, ...(job.skills || []).slice(0, 4)].filter(Boolean);
    const meta = [dateLabel(job.postedAt), job.source || "Source not shown", job.reality || ""].filter(Boolean);
    return `
      <article class="job">
        <div>
          <h3>${escapeHtml(job.title)}</h3>
          <p class="company">${escapeHtml(job.company)}, ${escapeHtml(job.location)}</p>
          <div class="meta">${meta.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</div>
          ${tags.length ? `<div class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </div>
        <div class="job-actions">
          <a href="${escapeHtml(job.url)}" target="_blank" rel="noreferrer">Employer posting</a>
          <button class="save ${tracked ? "saved" : ""}" data-save="${escapeHtml(job.id)}" type="button">${tracked ? statusLabel(tracked) : "Save"}</button>
        </div>
      </article>
    `;
  }).join("");
}

function setLoading(loading) {
  loadingEl.classList.toggle("hidden", !loading);
  if (loading) { jobsEl.innerHTML = ""; emptyEl.classList.add("hidden"); }
}

async function fetchJobs() {
  setLoading(true);
  errorEl.classList.add("hidden");
  statusEl.textContent = "Checking current Singapore postings.";
  const params = new URLSearchParams({ track: activeTrack });
  if (queryEl.value.trim()) params.set("q", queryEl.value.trim());
  try {
    const response = await fetch(`/api/jobs?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Search failed");
    renderJobs(payload.jobs);
    heroTotalEl.textContent = rolesLabel(payload.total);
    const time = new Date(payload.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    resultCountEl.textContent = `${payload.jobs.length} shown`;
    statusEl.textContent = `${rolesLabel(payload.total)} matching roles in FreeHire. Updated ${time}${payload.cached ? " from local cache" : ""}.`;
  } catch (error) {
    errorEl.textContent = `${error.message}. Try again shortly.`;
    errorEl.classList.remove("hidden");
    resultCountEl.textContent = "";
    heroTotalEl.textContent = "Unavailable";
    statusEl.textContent = "Live data could not load.";
    renderJobs([]);
  } finally {
    setLoading(false);
  }
}

trackButtons.forEach((button) => button.addEventListener("click", () => {
  activeTrack = button.dataset.track;
  trackButtons.forEach((item) => item.classList.toggle("active", item === button));
  queryEl.value = "";
  fetchJobs();
}));

searchButton.addEventListener("click", fetchJobs);
queryEl.addEventListener("keydown", (event) => { if (event.key === "Enter") fetchJobs(); });

jobsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;
  const job = latestJobs.find((item) => item.id === button.dataset.save);
  if (!job) return;
  const tracker = getTracker();
  if (tracker[job.id]) delete tracker[job.id];
  else tracker[job.id] = { ...job, status: "saved", savedAt: new Date().toISOString() };
  saveTracker(tracker);
  renderJobs(latestJobs);
  renderTracker();
});

trackerEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const tracker = getTracker();
  const id = button.dataset.id;
  if (!tracker[id]) return;
  if (button.dataset.action === "remove") delete tracker[id];
  if (button.dataset.action === "toggle") {
    if (tracker[id].status === "applied") tracker[id].status = tracker[id].statusBeforeApplied || "saved";
    else {
      tracker[id].statusBeforeApplied = tracker[id].status;
      tracker[id].status = "applied";
    }
  }
  saveTracker(tracker);
  renderTracker();
  renderJobs(latestJobs);
});

clearButton.addEventListener("click", () => { localStorage.removeItem(storageKey); renderTracker(); renderJobs(latestJobs); });

renderTracker();
fetchJobs();
