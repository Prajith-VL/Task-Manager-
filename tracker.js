const DAILY_ITEMS_KEY = "pastel_daily_items_v1";
const DAILY_LOG_KEY = "pastel_daily_log_v1";
const DEFAULT_GOAL_KEY = "pastel_daily_goal_days_v1";

const els = {
  trackerDate: document.getElementById("trackerDate"),
  defaultGoalDaysInput: document.getElementById("defaultGoalDaysInput"),
  dailyForm: document.getElementById("dailyItemForm"),
  dailyInput: document.getElementById("dailyItemInput"),
  dailyGoalInput: document.getElementById("dailyItemGoalInput"),
  dailyBody: document.getElementById("dailyTableBody"),
  dailyTemplate: document.getElementById("dailyRowTemplate"),
  statTotal: document.getElementById("statTotal"),
  statCompleted: document.getElementById("statCompleted"),
  statPending: document.getElementById("statPending"),
  statRate: document.getElementById("statRate"),
  statDaysDone: document.getElementById("statDaysDone"),
  statGoalProgress: document.getElementById("statGoalProgress")
};

let dailyItems = loadDailyItems();
let dailyLog = loadDailyLog();
let defaultGoalDays = loadDefaultGoalDays();

init();

function init() {
  setTrackerDate();
  normalizeDailyItems();
  els.defaultGoalDaysInput.value = String(defaultGoalDays);
  els.dailyGoalInput.value = String(defaultGoalDays);
  wireEvents();
  ensureTodayLogShape();
  renderDailyTracker();
}

function setTrackerDate() {
  const now = new Date();
  els.trackerDate.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function wireEvents() {
  els.defaultGoalDaysInput.addEventListener("change", onDefaultGoalDaysChange);
  els.dailyForm.addEventListener("submit", onCreateDailyItem);

  els.dailyBody.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-action='toggle-daily']");
    if (checkbox) {
      const row = checkbox.closest(".daily-row");
      if (!row) return;
      toggleDailyItem(row.dataset.id, checkbox.checked);
      return;
    }

    const goalInput = event.target.closest("input[data-action='edit-goal']");
    if (!goalInput) return;

    const row = goalInput.closest(".daily-row");
    if (!row) return;

    updateItemGoal(row.dataset.id, goalInput.value);
  });

  els.dailyBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='delete-daily']");
    if (!button) return;
    const row = button.closest(".daily-row");
    if (!row) return;
    deleteDailyItem(row.dataset.id);
  });
}

function onDefaultGoalDaysChange() {
  const parsed = Number.parseInt(els.defaultGoalDaysInput.value, 10);
  defaultGoalDays = sanitizeGoalDays(parsed);
  els.defaultGoalDaysInput.value = String(defaultGoalDays);
  els.dailyGoalInput.value = String(defaultGoalDays);
  saveDefaultGoalDays();
}

function onCreateDailyItem(event) {
  event.preventDefault();
  const label = els.dailyInput.value.trim();
  if (!label) return;

  const goalDays = sanitizeGoalDays(Number.parseInt(els.dailyGoalInput.value, 10));

  dailyItems.push({
    id: crypto.randomUUID(),
    label,
    goalDays,
    createdAt: new Date().toISOString()
  });

  ensureTodayLogShape();
  saveDailyItems();
  saveDailyLog();

  els.dailyForm.reset();
  els.dailyGoalInput.value = String(defaultGoalDays);
  renderDailyTracker();
}

function updateItemGoal(itemId, rawValue) {
  const goalDays = sanitizeGoalDays(Number.parseInt(rawValue, 10));
  dailyItems = dailyItems.map((item) => item.id === itemId ? { ...item, goalDays } : item);
  saveDailyItems();
  renderDailyTracker();
}

function toggleDailyItem(itemId, checked) {
  ensureTodayLogShape();
  dailyLog[todayKey()][itemId] = checked;
  saveDailyLog();
  renderDailyTracker();
}

function deleteDailyItem(itemId) {
  dailyItems = dailyItems.filter((item) => item.id !== itemId);

  Object.keys(dailyLog).forEach((date) => {
    if (dailyLog[date][itemId] !== undefined) {
      delete dailyLog[date][itemId];
    }
  });

  saveDailyItems();
  saveDailyLog();
  renderDailyTracker();
}

function renderDailyTracker() {
  ensureTodayLogShape();

  const todayState = dailyLog[todayKey()] || {};
  const total = dailyItems.length;
  const completed = dailyItems.filter((item) => todayState[item.id]).length;
  const pending = Math.max(total - completed, 0);
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const goalsReached = dailyItems.filter((item) => calculateItemCompletedDays(item.id) >= item.goalDays).length;

  const requiredTotal = dailyItems.reduce((sum, item) => sum + item.goalDays, 0);
  const achievedTotal = dailyItems.reduce((sum, item) => sum + Math.min(calculateItemCompletedDays(item.id), item.goalDays), 0);

  els.statTotal.textContent = String(total);
  els.statCompleted.textContent = String(completed);
  els.statPending.textContent = String(pending);
  els.statRate.textContent = `${rate}%`;
  els.statDaysDone.textContent = String(goalsReached);
  els.statGoalProgress.textContent = `${achievedTotal} / ${requiredTotal}`;

  els.dailyBody.innerHTML = "";

  if (dailyItems.length === 0) {
    els.dailyBody.innerHTML = '<tr><td class="daily-empty" colspan="5">No checkpoints yet. Add one above.</td></tr>';
    return;
  }

  dailyItems.forEach((item) => {
    const row = els.dailyTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = item.id;
    row.querySelector(".daily-label").textContent = item.label;

    const goalInput = row.querySelector("input[data-action='edit-goal']");
    goalInput.value = String(item.goalDays);

    const completedDays = calculateItemCompletedDays(item.id);
    const progressEl = row.querySelector(".daily-progress");
    const clamped = Math.min(completedDays, item.goalDays);
    const goalReached = completedDays >= item.goalDays;
    progressEl.textContent = `${clamped} / ${item.goalDays}`;
    progressEl.classList.add("progress-pill");
    progressEl.classList.toggle("is-complete", goalReached);

    const checkbox = row.querySelector("input[data-action='toggle-daily']");
    const isChecked = Boolean(todayState[item.id]);
    checkbox.checked = isChecked;
    if (isChecked) row.classList.add("is-complete");

    els.dailyBody.appendChild(row);
  });
}

function calculateItemCompletedDays(itemId) {
  return Object.values(dailyLog).reduce((count, entry) => {
    if (!entry || typeof entry !== "object") return count;
    return entry[itemId] === true ? count + 1 : count;
  }, 0);
}

function todayKey() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadDailyItems() {
  try {
    const raw = localStorage.getItem(DAILY_ITEMS_KEY);
    if (!raw) return seedDailyItems();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedDailyItems();
  } catch {
    return seedDailyItems();
  }
}

function saveDailyItems() {
  localStorage.setItem(DAILY_ITEMS_KEY, JSON.stringify(dailyItems));
}

function loadDailyLog() {
  try {
    const raw = localStorage.getItem(DAILY_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDailyLog() {
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(dailyLog));
}

function loadDefaultGoalDays() {
  const raw = localStorage.getItem(DEFAULT_GOAL_KEY);
  const parsed = Number.parseInt(raw || "7", 10);
  return sanitizeGoalDays(parsed);
}

function saveDefaultGoalDays() {
  localStorage.setItem(DEFAULT_GOAL_KEY, String(defaultGoalDays));
}

function sanitizeGoalDays(value) {
  if (!Number.isFinite(value)) return 7;
  if (value < 1) return 1;
  if (value > 365) return 365;
  return Math.floor(value);
}

function normalizeDailyItems() {
  let changed = false;

  dailyItems = dailyItems.map((item) => {
    if (Number.isFinite(item.goalDays) && item.goalDays >= 1) {
      return { ...item, goalDays: sanitizeGoalDays(item.goalDays) };
    }

    changed = true;
    return { ...item, goalDays: defaultGoalDays };
  });

  if (changed) {
    saveDailyItems();
  }
}

function ensureTodayLogShape() {
  const key = todayKey();
  if (!dailyLog[key] || typeof dailyLog[key] !== "object") {
    dailyLog[key] = {};
  }

  dailyItems.forEach((item) => {
    if (dailyLog[key][item.id] === undefined) {
      dailyLog[key][item.id] = false;
    }
  });
}

function seedDailyItems() {
  const defaults = [
    { id: crypto.randomUUID(), label: "Morning workout", goalDays: 7, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), label: "Read 20 pages", goalDays: 14, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), label: "Plan tomorrow", goalDays: 10, createdAt: new Date().toISOString() }
  ];

  localStorage.setItem(DAILY_ITEMS_KEY, JSON.stringify(defaults));
  return defaults;
}
