const STORAGE_KEY = "pastel_todo_tasks_v1";
const DAILY_ITEMS_KEY = "pastel_daily_items_v1";
const DAILY_LOG_KEY = "pastel_daily_log_v1";
const DAILY_GOAL_KEY = "pastel_daily_goal_days_v1";

const els = {
  name: document.getElementById("greetingName"),
  form: document.getElementById("quickAddForm"),
  input: document.getElementById("quickAddInput"),
  priority: document.getElementById("priorityInput"),
  dueDate: document.getElementById("dueDateInput"),
  search: document.getElementById("searchInput"),
  filter: document.getElementById("viewFilter"),
  clearCompleted: document.getElementById("clearCompletedBtn"),
  board: document.getElementById("taskBoard"),
  empty: document.getElementById("emptyState"),
  template: document.getElementById("taskTemplate"),
  trackerDate: document.getElementById("trackerDate"),
  goalDaysInput: document.getElementById("goalDaysInput"),
  dailyForm: document.getElementById("dailyItemForm"),
  dailyInput: document.getElementById("dailyItemInput"),
  dailyBody: document.getElementById("dailyTableBody"),
  dailyTemplate: document.getElementById("dailyRowTemplate"),
  statTotal: document.getElementById("statTotal"),
  statCompleted: document.getElementById("statCompleted"),
  statPending: document.getElementById("statPending"),
  statRate: document.getElementById("statRate"),
  statDaysDone: document.getElementById("statDaysDone"),
  statGoalProgress: document.getElementById("statGoalProgress")
};

let tasks = loadTasks();
let dailyItems = loadDailyItems();
let dailyLog = loadDailyLog();
let goalDays = loadGoalDays();

init();

function init() {
  setGreetingName();
  setTrackerDate();
  els.goalDaysInput.value = String(goalDays);
  wireEvents();
  ensureTodayLogShape();
  renderDailyTracker();
  renderTasks();
}

function setGreetingName() {
  const savedName = localStorage.getItem("todo_display_name");
  if (savedName) {
    els.name.textContent = savedName;
    return;
  }

  const promptName = prompt("What should I call you?", "John");
  const cleanName = (promptName || "John").trim().slice(0, 30) || "John";
  els.name.textContent = cleanName;
  localStorage.setItem("todo_display_name", cleanName);
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
  els.form.addEventListener("submit", onCreateTask);
  els.search.addEventListener("input", renderTasks);
  els.filter.addEventListener("change", renderTasks);
  els.clearCompleted.addEventListener("click", clearCompletedTasks);

  els.board.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest(".task-card");
    if (!card) return;

    const taskId = card.dataset.id;
    const action = button.dataset.action;

    if (action === "toggle") {
      toggleTask(taskId);
    }

    if (action === "edit") {
      editTask(taskId);
    }

    if (action === "delete") {
      deleteTask(taskId);
    }
  });

  els.goalDaysInput.addEventListener("change", onGoalDaysChange);

  els.dailyForm.addEventListener("submit", onCreateDailyItem);

  els.dailyBody.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-action='toggle-daily']");
    if (!checkbox) return;

    const row = checkbox.closest(".daily-row");
    if (!row) return;

    toggleDailyItem(row.dataset.id, checkbox.checked);
  });

  els.dailyBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='delete-daily']");
    if (!button) return;

    const row = button.closest(".daily-row");
    if (!row) return;

    deleteDailyItem(row.dataset.id);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
      event.preventDefault();
      els.input.focus();
    }
  });
}

function onCreateTask(event) {
  event.preventDefault();

  const title = els.input.value.trim();
  if (!title) return;

  const task = {
    id: crypto.randomUUID(),
    title,
    priority: els.priority.value,
    dueDate: els.dueDate.value || null,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  saveTasks();
  els.form.reset();
  els.priority.value = "medium";
  renderTasks();
}

function toggleTask(taskId) {
  tasks = tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task);
  saveTasks();
  renderTasks();
}

function editTask(taskId) {
  const task = tasks.find((entry) => entry.id === taskId);
  if (!task) return;

  const newTitle = prompt("Edit task", task.title);
  if (newTitle === null) return;

  const cleanTitle = newTitle.trim();
  if (!cleanTitle) return;

  tasks = tasks.map((entry) => entry.id === taskId ? { ...entry, title: cleanTitle } : entry);
  saveTasks();
  renderTasks();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

function clearCompletedTasks() {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
}

function onGoalDaysChange() {
  const parsed = Number.parseInt(els.goalDaysInput.value, 10);
  goalDays = sanitizeGoalDays(parsed);
  els.goalDaysInput.value = String(goalDays);
  saveGoalDays();
  renderDailyTracker();
}

function onCreateDailyItem(event) {
  event.preventDefault();

  const label = els.dailyInput.value.trim();
  if (!label) return;

  dailyItems.push({
    id: crypto.randomUUID(),
    label,
    createdAt: new Date().toISOString()
  });

  ensureTodayLogShape();
  saveDailyItems();
  saveDailyLog();
  els.dailyForm.reset();
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
  const daysDone = calculateCompletedDays();

  els.statTotal.textContent = String(total);
  els.statCompleted.textContent = String(completed);
  els.statPending.textContent = String(pending);
  els.statRate.textContent = `${rate}%`;
  els.statDaysDone.textContent = String(daysDone);
  els.statGoalProgress.textContent = `${Math.min(daysDone, goalDays)} / ${goalDays}`;

  els.dailyBody.innerHTML = "";

  if (dailyItems.length === 0) {
    els.dailyBody.innerHTML = '<tr><td class="daily-empty" colspan="3">No checkpoints yet. Add one above.</td></tr>';
    return;
  }

  dailyItems.forEach((item) => {
    const row = els.dailyTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = item.id;
    row.querySelector(".daily-label").textContent = item.label;

    const checkbox = row.querySelector("input[data-action='toggle-daily']");
    const isChecked = Boolean(todayState[item.id]);
    checkbox.checked = isChecked;

    if (isChecked) {
      row.classList.add("is-complete");
    }

    els.dailyBody.appendChild(row);
  });
}

function calculateCompletedDays() {
  return Object.values(dailyLog).reduce((count, entry) => {
    if (!entry || typeof entry !== "object") return count;

    const values = Object.values(entry);
    if (values.length === 0) return count;

    const isCompleteDay = values.every((value) => value === true);
    return isCompleteDay ? count + 1 : count;
  }, 0);
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTasks();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedTasks();
    return parsed;
  } catch {
    return seedTasks();
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
  const filtered = applyFilters(tasks);
  els.board.innerHTML = "";

  filtered.forEach((task) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.add(task.priority);
    if (task.completed) node.classList.add("completed");

    const isOverdue = Boolean(task.dueDate && !task.completed && new Date(task.dueDate) < todayMidnight());

    node.querySelector(".task-title").textContent = task.title;
    node.querySelector(".task-priority").textContent = task.priority;
    node.querySelector(".task-date").textContent = task.dueDate
      ? `Due: ${new Date(task.dueDate).toLocaleDateString()}`
      : "No due date";

    const statusEl = node.querySelector(".task-status");
    statusEl.textContent = task.completed ? "Completed" : (isOverdue ? "Overdue" : "Active");
    if (isOverdue) statusEl.classList.add("overdue");

    const toggleButton = node.querySelector("button[data-action='toggle']");
    toggleButton.textContent = task.completed ? "Mark active" : "Mark done";

    els.board.appendChild(node);
  });

  els.empty.hidden = filtered.length !== 0;
}

function applyFilters(data) {
  const searchQuery = els.search.value.trim().toLowerCase();
  const view = els.filter.value;

  return data.filter((task) => {
    const titleMatch = task.title.toLowerCase().includes(searchQuery);
    if (!titleMatch) return false;

    if (view === "active") return !task.completed;
    if (view === "completed") return task.completed;
    if (view === "today") return isToday(task.dueDate);
    if (view === "overdue") return isOverdue(task);

    return true;
  });
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < todayMidnight();
}

function todayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    if (!Array.isArray(parsed)) return seedDailyItems();
    return parsed;
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
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveDailyLog() {
  localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(dailyLog));
}

function loadGoalDays() {
  const raw = localStorage.getItem(DAILY_GOAL_KEY);
  const parsed = Number.parseInt(raw || "7", 10);
  return sanitizeGoalDays(parsed);
}

function saveGoalDays() {
  localStorage.setItem(DAILY_GOAL_KEY, String(goalDays));
}

function sanitizeGoalDays(value) {
  if (!Number.isFinite(value)) return 7;
  if (value < 1) return 1;
  if (value > 365) return 365;
  return Math.floor(value);
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

function seedTasks() {
  const defaults = [
    {
      id: crypto.randomUUID(),
      title: "Fill up gas",
      priority: "low",
      dueDate: null,
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "Catch 50x fish by Monday!",
      priority: "medium",
      dueDate: null,
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      title: "Schedule a sync with design team",
      priority: "high",
      dueDate: null,
      completed: false,
      createdAt: new Date().toISOString()
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function seedDailyItems() {
  const defaults = [
    { id: crypto.randomUUID(), label: "Morning workout", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), label: "Read 20 pages", createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), label: "Plan tomorrow", createdAt: new Date().toISOString() }
  ];

  localStorage.setItem(DAILY_ITEMS_KEY, JSON.stringify(defaults));
  return defaults;
}
