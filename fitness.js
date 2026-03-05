const FITNESS_EXERCISES_KEY = "pastel_fitness_exercises_v1";
const FITNESS_LOG_KEY = "pastel_fitness_log_v1";

const els = {
  dateLabel: document.getElementById("fitnessDateLabel"),
  exerciseForm: document.getElementById("exerciseForm"),
  exerciseName: document.getElementById("exerciseNameInput"),
  exerciseGoal: document.getElementById("exerciseGoalInput"),
  exerciseUnit: document.getElementById("exerciseUnitInput"),
  progressForm: document.getElementById("progressForm"),
  progressDate: document.getElementById("progressDateInput"),
  progressExercise: document.getElementById("progressExerciseInput"),
  progressReached: document.getElementById("progressReachedInput"),
  progressNote: document.getElementById("progressNoteInput"),
  tableBody: document.getElementById("exerciseTableBody"),
  rowTemplate: document.getElementById("exerciseRowTemplate"),
  statTotal: document.getElementById("fitStatTotal"),
  statHit: document.getElementById("fitStatHit"),
  statRate: document.getElementById("fitStatRate"),
  statStreak: document.getElementById("fitStatStreak"),
  statBest: document.getElementById("fitStatBest"),
  chart: document.getElementById("completionChart")
};

let exercises = loadExercises();
let logByDate = loadLogs();

init();

function init() {
  setYesterdayLabel();
  els.progressDate.value = yesterdayKey();
  wireEvents();
  renderAll();
}

function wireEvents() {
  els.exerciseForm.addEventListener("submit", onAddExercise);
  els.progressForm.addEventListener("submit", onSaveProgress);

  els.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest(".fitness-row");
    if (!row) return;

    const id = row.dataset.id;
    const action = button.dataset.action;

    if (action === "delete") {
      deleteExercise(id);
    }

    if (action === "edit") {
      editExercise(id);
    }
  });

  window.addEventListener("resize", () => renderChart());
}

function onAddExercise(event) {
  event.preventDefault();

  const name = els.exerciseName.value.trim();
  const goal = sanitizeMetric(els.exerciseGoal.value);
  const unit = els.exerciseUnit.value;
  if (!name || goal < 1) return;

  exercises.push({
    id: crypto.randomUUID(),
    name,
    goal,
    unit,
    createdAt: new Date().toISOString()
  });

  saveExercises();
  els.exerciseForm.reset();
  els.exerciseGoal.value = "30";
  els.exerciseUnit.value = "reps";
  renderAll();
}

function onSaveProgress(event) {
  event.preventDefault();

  const dateKey = normalizeDateInput(els.progressDate.value);
  const exerciseId = els.progressExercise.value;
  const reached = sanitizeMetric(els.progressReached.value);
  const note = els.progressNote.value.trim();

  if (!dateKey || !exerciseId) return;

  if (!logByDate[dateKey] || typeof logByDate[dateKey] !== "object") {
    logByDate[dateKey] = {};
  }

  logByDate[dateKey][exerciseId] = {
    reached,
    note,
    loggedAt: new Date().toISOString()
  };

  saveLogs();
  els.progressForm.reset();
  els.progressDate.value = yesterdayKey();
  renderAll();
}

function editExercise(id) {
  const exercise = exercises.find((entry) => entry.id === id);
  if (!exercise) return;

  const nextName = prompt("Edit exercise name", exercise.name);
  if (nextName === null) return;

  const cleanName = nextName.trim();
  if (!cleanName) return;

  const nextGoal = prompt("Edit goal number", String(exercise.goal));
  if (nextGoal === null) return;

  const cleanGoal = sanitizeMetric(nextGoal);
  if (cleanGoal < 1) return;

  exercises = exercises.map((entry) =>
    entry.id === id ? { ...entry, name: cleanName, goal: cleanGoal } : entry
  );

  saveExercises();
  renderAll();
}

function deleteExercise(id) {
  exercises = exercises.filter((entry) => entry.id !== id);

  Object.keys(logByDate).forEach((date) => {
    if (logByDate[date] && logByDate[date][id] !== undefined) {
      delete logByDate[date][id];
    }
  });

  saveExercises();
  saveLogs();
  renderAll();
}

function renderAll() {
  renderExerciseSelect();
  renderStats();
  renderTable();
  renderChart();
}

function renderExerciseSelect() {
  const previous = els.progressExercise.value;
  els.progressExercise.innerHTML = "";

  if (exercises.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No exercises yet";
    els.progressExercise.appendChild(opt);
    return;
  }

  exercises.forEach((exercise) => {
    const opt = document.createElement("option");
    opt.value = exercise.id;
    opt.textContent = `${exercise.name} (${exercise.goal} ${exercise.unit})`;
    els.progressExercise.appendChild(opt);
  });

  if (previous && exercises.some((entry) => entry.id === previous)) {
    els.progressExercise.value = previous;
  }
}

function renderStats() {
  const yKey = yesterdayKey();
  const yLog = logByDate[yKey] || {};
  const total = exercises.length;

  const hit = exercises.filter((exercise) => {
    const log = yLog[exercise.id];
    return log && sanitizeMetric(log.reached) >= exercise.goal;
  }).length;

  const rate = total === 0 ? 0 : Math.round((hit / total) * 100);
  const streak = calculateFullGoalStreak();
  const best = calculateBestRateLast7Days();

  els.statTotal.textContent = String(total);
  els.statHit.textContent = String(hit);
  els.statRate.textContent = `${rate}%`;
  els.statStreak.textContent = `${streak} days`;
  els.statBest.textContent = `${best}%`;
}

function renderTable() {
  const yKey = yesterdayKey();
  const yLog = logByDate[yKey] || {};

  els.tableBody.innerHTML = "";

  if (exercises.length === 0) {
    els.tableBody.innerHTML = '<tr><td class="daily-empty" colspan="6">No exercises yet. Add one above.</td></tr>';
    return;
  }

  exercises.forEach((exercise) => {
    const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = exercise.id;

    const log = yLog[exercise.id] || null;
    const reached = log ? sanitizeMetric(log.reached) : 0;
    const met = reached >= exercise.goal;

    row.querySelector(".fitness-name").textContent = exercise.name;
    row.querySelector(".fitness-goal").textContent = `${exercise.goal} ${exercise.unit}`;
    row.querySelector(".fitness-reached").textContent = log ? `${reached} ${exercise.unit}` : "-";
    row.querySelector(".fitness-note").textContent = log && log.note ? log.note : "-";

    const statusEl = row.querySelector(".fitness-status");
    statusEl.textContent = met ? "Goal hit" : "Pending";
    statusEl.classList.add("progress-pill");
    if (met) statusEl.classList.add("is-complete");

    els.tableBody.appendChild(row);
  });
}

function renderChart() {
  const canvas = els.chart;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const cssWidth = canvas.clientWidth || 800;
  const cssHeight = 220;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const points = getCompletionPoints(7);
  const total = exercises.length;

  if (total === 0) {
    ctx.fillStyle = "#586170";
    ctx.font = "14px DM Sans";
    ctx.fillText("Add exercises to see chart data.", 16, 30);
    return;
  }

  const padding = { left: 30, right: 12, top: 16, bottom: 34 };
  const chartW = cssWidth - padding.left - padding.right;
  const chartH = cssHeight - padding.top - padding.bottom;
  const barGap = 10;
  const barWidth = Math.max((chartW - barGap * (points.length - 1)) / points.length, 8);

  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(padding.left + chartW, padding.top + chartH);
  ctx.stroke();

  points.forEach((point, i) => {
    const x = padding.left + i * (barWidth + barGap);
    const barH = Math.round((point.rate / 100) * chartH);
    const y = padding.top + chartH - barH;

    ctx.fillStyle = point.rate >= 100 ? "#65b179" : "#6aa6ff";
    ctx.fillRect(x, y, barWidth, barH);

    ctx.fillStyle = "#4a4f57";
    ctx.font = "11px DM Sans";
    ctx.fillText(`${point.rate}%`, x, y - 4);

    ctx.fillStyle = "#5a606b";
    ctx.fillText(point.label, x, padding.top + chartH + 16);
  });
}

function getCompletionPoints(days) {
  const keys = getPastDateKeys(days);
  return keys.map((key) => {
    const rate = completionRateForDate(key);
    return {
      key,
      rate,
      label: key.slice(5)
    };
  });
}

function completionRateForDate(dateKey) {
  if (exercises.length === 0) return 0;
  const entry = logByDate[dateKey] || {};

  const hit = exercises.filter((exercise) => {
    const log = entry[exercise.id];
    return log && sanitizeMetric(log.reached) >= exercise.goal;
  }).length;

  return Math.round((hit / exercises.length) * 100);
}

function calculateBestRateLast7Days() {
  const points = getCompletionPoints(7);
  return points.reduce((best, p) => Math.max(best, p.rate), 0);
}

function calculateFullGoalStreak() {
  let streak = 0;
  const today = new Date();

  for (let i = 1; i <= 365; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateToKey(d);

    if (completionRateForDate(key) === 100 && exercises.length > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateToKey(d);
}

function getPastDateKeys(days) {
  const today = new Date();
  const keys = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(dateToKey(d));
  }

  return keys;
}

function normalizeDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return dateToKey(d);
}

function dateToKey(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setYesterdayLabel() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  els.dateLabel.textContent = `Tracking reference: ${y.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric"
  })}`;
}

function sanitizeMetric(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (parsed > 5000) return 5000;
  return parsed;
}

function loadExercises() {
  try {
    const raw = localStorage.getItem(FITNESS_EXERCISES_KEY);
    if (!raw) return seedExercises();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedExercises();
  } catch {
    return seedExercises();
  }
}

function saveExercises() {
  localStorage.setItem(FITNESS_EXERCISES_KEY, JSON.stringify(exercises));
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(FITNESS_LOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLogs() {
  localStorage.setItem(FITNESS_LOG_KEY, JSON.stringify(logByDate));
}

function seedExercises() {
  const defaults = [
    { id: crypto.randomUUID(), name: "Pushups", goal: 30, unit: "reps", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), name: "Plank", goal: 2, unit: "minutes", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), name: "Running", goal: 3, unit: "km", createdAt: new Date().toISOString() }
  ];

  localStorage.setItem(FITNESS_EXERCISES_KEY, JSON.stringify(defaults));
  return defaults;
}
