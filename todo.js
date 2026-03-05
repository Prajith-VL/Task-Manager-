const STORAGE_KEY = "pastel_todo_tasks_v1";

const els = {
  form: document.getElementById("quickAddForm"),
  input: document.getElementById("quickAddInput"),
  priority: document.getElementById("priorityInput"),
  dueDate: document.getElementById("dueDateInput"),
  search: document.getElementById("searchInput"),
  filter: document.getElementById("viewFilter"),
  clearCompleted: document.getElementById("clearCompletedBtn"),
  board: document.getElementById("taskBoard"),
  empty: document.getElementById("emptyState"),
  template: document.getElementById("taskTemplate")
};

let tasks = loadTasks();

wireEvents();
renderTasks();

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

    if (action === "toggle") toggleTask(taskId);
    if (action === "edit") editTask(taskId);
    if (action === "delete") deleteTask(taskId);
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

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    priority: els.priority.value,
    dueDate: els.dueDate.value || null,
    completed: false,
    createdAt: new Date().toISOString()
  });

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

  const nextTitle = prompt("Edit task", task.title);
  if (nextTitle === null) return;

  const clean = nextTitle.trim();
  if (!clean) return;

  tasks = tasks.map((entry) => entry.id === taskId ? { ...entry, title: clean } : entry);
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

function renderTasks() {
  const filtered = applyFilters(tasks);
  els.board.innerHTML = "";

  filtered.forEach((task) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.add(task.priority);
    if (task.completed) node.classList.add("completed");

    const overdue = Boolean(task.dueDate && !task.completed && new Date(task.dueDate) < todayMidnight());
    node.querySelector(".task-title").textContent = task.title;
    node.querySelector(".task-priority").textContent = task.priority;
    node.querySelector(".task-date").textContent = task.dueDate
      ? `Due: ${new Date(task.dueDate).toLocaleDateString()}`
      : "No due date";

    const statusEl = node.querySelector(".task-status");
    statusEl.textContent = task.completed ? "Completed" : (overdue ? "Overdue" : "Active");
    if (overdue) statusEl.classList.add("overdue");

    node.querySelector("button[data-action='toggle']").textContent = task.completed ? "Mark active" : "Mark done";
    els.board.appendChild(node);
  });

  els.empty.hidden = filtered.length !== 0;
}

function applyFilters(data) {
  const query = els.search.value.trim().toLowerCase();
  const view = els.filter.value;

  return data.filter((task) => {
    if (!task.title.toLowerCase().includes(query)) return false;
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

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTasks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedTasks();
  } catch {
    return seedTasks();
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function seedTasks() {
  const defaults = [
    { id: crypto.randomUUID(), title: "Fill up gas", priority: "low", dueDate: null, completed: false, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: "Catch 50x fish by Monday!", priority: "medium", dueDate: null, completed: false, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: "Schedule a sync with design team", priority: "high", dueDate: null, completed: false, createdAt: new Date().toISOString() }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}
