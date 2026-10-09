const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "nexus_student_tasks_v1";
const XP_KEY = "nexus_student_xp_v1";

let tasks = loadTasks();
let xp = Number(localStorage.getItem(XP_KEY)) || 0;
let editingId = null;
let activeView = "dashboard";

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(XP_KEY, String(xp));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function todayString() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function prettyDate(date) {
  if (!date) return "No due date";
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    day: "numeric", month: "short"
  });
}

function daysBetween(date) {
  return Math.round(
    (new Date(date + "T12:00:00") - new Date(todayString() + "T12:00:00")) / 86400000
  );
}

function priorityScore(priority) {
  return ({ high: 3, medium: 2, low: 1 })[priority] || 0;
}

function priorityLabel(priority) {
  return ({ high: "High", medium: "Medium", low: "Low" })[priority] || "Medium";
}

function statusLabel(status) {
  return ({ todo: "To Do", doing: "In Progress", done: "Completed" })[status] || "To Do";
}

function getVisibleTasks() {
  const query = $("searchInput").value.trim().toLowerCase();
  let visible = tasks.filter(task => {
    const matches = [task.title, task.description, task.subject]
      .some(value => String(value || "").toLowerCase().includes(query));
    if (!matches) return false;
    if (activeView === "tasks") return task.status !== "done";
    if (activeView === "subjects") return true;
    return true;
  });

  const sort = $("sortSelect").value;
  visible.sort((a, b) => {
    if (sort === "due") return (a.due || "9999").localeCompare(b.due || "9999");
    if (sort === "created") return b.created - a.created;
    if (sort === "title") return a.title.localeCompare(b.title);
    return priorityScore(b.priority) - priorityScore(a.priority) ||
      (a.due || "9999").localeCompare(b.due || "9999");
  });
  return visible;
}

function renderTask(task) {
  const dueDays = task.due ? daysBetween(task.due) : null;
  const dueText = !task.due ? "No due date" :
    dueDays < 0 ? `${Math.abs(dueDays)}d overdue` :
    dueDays === 0 ? "Due today" :
    dueDays === 1 ? "Due tomorrow" : prettyDate(task.due);

  const color = task.priority === "high" ? "#ff5379" :
    task.priority === "medium" ? "#ffb347" : "#2bd5a0";

  return `
    <article class="task-card" style="--task-color:${color}">
      <button class="task-menu" data-action="edit" data-id="${task.id}" aria-label="Edit task">···</button>
      <h4 class="task-title">${escapeHTML(task.title)}</h4>
      <div class="task-tags">
        <span class="tag">${escapeHTML(task.subject)}</span>
        <span class="priority ${task.priority}">${priorityLabel(task.priority)}</span>
      </div>
      ${task.description ? `<p>${escapeHTML(task.description)}</p>` : ""}
      <div class="task-meta">
        <span class="task-date ${dueDays !== null && dueDays < 0 && task.status !== "done" ? "overdue" : ""}">${escapeHTML(dueText)}</span>
        <div class="task-actions">
          ${task.status !== "done" ? `<button data-action="next" data-id="${task.id}">${task.status === "todo" ? "Start" : "Finish"}</button>` : ""}
          <button data-action="edit" data-id="${task.id}">Edit</button>
          <button data-action="delete" data-id="${task.id}">×</button>
        </div>
      </div>
    </article>`;
}

function renderTasks() {
  const visible = getVisibleTasks();
  const groups = {
    todo: visible.filter(t => t.status === "todo"),
    doing: visible.filter(t => t.status === "doing"),
    done: visible.filter(t => t.status === "done")
  };

  [["todo", "todoList"], ["doing", "doingList"], ["done", "doneList"]].forEach(([status, elementId]) => {
    $(elementId).innerHTML = groups[status].map(renderTask).join("") ||
      `<div class="empty-column">${$("searchInput").value ? "No matching tasks" : "Nothing here yet"}<br>You're on track ✦</div>`;
  });

  $("todoBadge").textContent = groups.todo.length;
  $("doingBadge").textContent = groups.doing.length;
  $("doneBadge").textContent = groups.done.length;
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const doing = tasks.filter(t => t.status === "doing").length;
  const overdue = tasks.filter(t => t.status !== "done" && t.due && daysBetween(t.due) < 0).length;

  $("totalCount").textContent = total;
  $("completedCount").textContent = done;
  $("progressCount").textContent = doing;
  $("overdueCount").textContent = overdue;
  $("completionRate").textContent = `${total ? Math.round(done / total * 100) : 0}% complete`;

  const level = Math.floor(xp / 200) + 1;
  $("levelLabel").textContent = `Level ${level}`;
  $("xpLabel").textContent = `${xp} XP earned · ${200 - xp % 200} XP to next level`;
}

function renderDeadlines() {
  const upcoming = tasks
    .filter(t => t.status !== "done" && t.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  $("deadlineList").innerHTML = upcoming.map(task => `
    <div class="deadline-item" data-edit="${task.id}">
      <span class="deadline-dot ${task.priority}"></span>
      <div><b>${escapeHTML(task.title)}</b>
      <small>${escapeHTML(task.subject)} · ${escapeHTML(prettyDate(task.due))}</small></div>
    </div>`).join("") || `<p class="empty-hint">No upcoming deadlines. Add a task to get started.</p>`;
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  $("calendarMonth").textContent = now.toLocaleDateString(undefined, { month: "short", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  let html = weekdays.map(d => `<span class="weekday">${d}</span>`).join("");

  for (let i = 0; i < firstDay; i++) html += `<span class="muted-day"></span>`;
  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const classes = [
      date === todayString() ? "today" : "",
      tasks.some(t => t.due === date && t.status !== "done") ? "has-task" : ""
    ].filter(Boolean).join(" ");
    html += `<span class="${classes}" title="${tasks.filter(t => t.due === date).length} tasks">${day}</span>`;
  }
  $("calendarGrid").innerHTML = html;
}

function renderSubjects() {
  const totals = {};
  tasks.forEach(t => {
    const name = t.subject.trim() || "Other";
    if (!totals[name]) totals[name] = { total: 0, done: 0 };
    totals[name].total++;
    if (t.status === "done") totals[name].done++;
  });

  const colors = ["", "purple", "blue", "orange"];
  const entries = Object.entries(totals).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  $("subjectList").innerHTML = entries.map(([name, data], i) => `
    <div>
      <span class="subject-icon ${colors[i % colors.length]}">◇</span>
      <span>${escapeHTML(name)}<br><small class="muted">${data.done}/${data.total} completed</small></span>
      <b>${Math.round(data.done / data.total * 100)}%</b>
      <i><u style="width:${data.done / data.total * 100}%"></u></i>
    </div>`).join("") || `<p class="empty-hint">Your subjects will appear here.</p>`;
}

function renderActivity() {
  const recent = [...tasks].sort((a, b) => b.updated - a.updated).slice(0, 4);
  $("activityList").innerHTML = recent.map(t => `
    <div class="activity-item">
      <span class="activity-check">${t.status === "done" ? "✓" : "•"}</span>
      <div><p>${t.status === "done" ? "Completed" : "Updated"}: ${escapeHTML(t.title)}</p>
      <small>${escapeHTML(t.subject)} · ${statusLabel(t.status)}</small></div>
    </div>`).join("") || `<p class="empty-hint">Your recent study activity will show here.</p>`;
}

function renderWeeklyChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }) });
  }

  const counts = days.map(d => tasks.filter(t => t.status === "done" && t.completedDate === d.key).length);
  const max = Math.max(1, ...counts);

  $("weeklyChart").innerHTML = days.map((d, i) => `
    <div class="chart-day">
      <div class="bars"><span class="bar" style="height:${Math.max(4, counts[i] / max * 75)}px"></span></div>
      <span>${d.label}</span>
    </div>`).join("");
}

function renderAll() {
  renderStats();
  renderTasks();
  renderDeadlines();
  renderCalendar();
  renderSubjects();
  renderActivity();
  renderWeeklyChart();
}

function openTaskDialog(task = null) {
  editingId = task ? task.id : null;
  $("dialogTitle").textContent = task ? "Edit Task" : "Create New Task";
  $("taskTitle").value = task?.title || "";
  $("taskDescription").value = task?.description || "";
  $("taskSubject").value = task?.subject || "";
  $("taskDue").value = task?.due || todayString();
  $("taskPriority").value = task?.priority || "medium";
  $("taskStatus").value = task?.status || "todo";
  $("taskDialog").showModal();
  $("taskTitle").focus();
}

function closeTaskDialog() {
  $("taskDialog").close();
  editingId = null;
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const subject = $("taskSubject").value.trim();
  if (!title || !subject) return;

  const oldTask = tasks.find(t => t.id === editingId);
  const status = $("taskStatus").value;
  const task = {
    id: editingId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title,
    description: $("taskDescription").value.trim(),
    subject,
    due: $("taskDue").value,
    priority: $("taskPriority").value,
    status,
    created: oldTask?.created || Date.now(),
    updated: Date.now(),
    completedDate: status === "done"
      ? (oldTask?.status === "done" ? oldTask.completedDate : todayString())
      : ""
  };

  if (oldTask) {
    if (oldTask.status !== "done" && status === "done") xp += 20;
    if (oldTask.status === "done" && status !== "done") xp = Math.max(0, xp - 20);
    tasks = tasks.map(t => t.id === editingId ? task : t);
  } else {
    tasks.push(task);
    if (status === "done") xp += 20;
  }

  saveTasks();
  closeTaskDialog();
  renderAll();
}

function handleTaskAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const task = tasks.find(t => t.id === button.dataset.id);
  if (!task) return;

  const action = button.dataset.action;

  if (action === "edit") {
    openTaskDialog(task);
  } else if (action === "delete") {
    if (!confirm(`Delete "${task.title}"?`)) return;
    if (task.status === "done") xp = Math.max(0, xp - 20);
    tasks = tasks.filter(t => t.id !== task.id);
    saveTasks();
    renderAll();
  } else if (action === "next") {
    if (task.status === "todo") {
      task.status = "doing";
    } else {
      task.status = "done";
      task.completedDate = todayString();
      xp += 20;
    }
    task.updated = Date.now();
    saveTasks();
    renderAll();
  }
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".nav-item[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = {
    dashboard: "My Tasks",
    tasks: "My Tasks",
    calendar: "Calendar — All Tasks",
    analytics: "Analytics — All Tasks",
    subjects: "Tasks by Subject",
    settings: "Settings — All Tasks"
  };
  $("taskSectionTitle").textContent = titles[view] || "My Tasks";

  if (view === "calendar") $("calendarGrid").scrollIntoView({ behavior: "smooth", block: "center" });
  else if (view === "analytics") $("weeklyChart").scrollIntoView({ behavior: "smooth", block: "center" });
  else if (view === "subjects") $("subjectList").scrollIntoView({ behavior: "smooth", block: "center" });
  else if (view === "settings") alert("Your tasks are saved in this browser. Use the search and sort controls to manage them.");
  else $("taskSectionTitle").scrollIntoView({ behavior: "smooth", block: "center" });

  renderTasks();
}

$("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long", day: "numeric", month: "long"
}).toUpperCase();

const hour = new Date().getHours();
$("greeting").textContent = (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening") + " 👋";

$("addTaskButton").addEventListener("click", () => openTaskDialog());
$("closeDialog").addEventListener("click", closeTaskDialog);
$("cancelDialog").addEventListener("click", closeTaskDialog);
$("taskForm").addEventListener("submit", handleTaskSubmit);
$("searchInput").addEventListener("input", renderTasks);
$("sortSelect").addEventListener("change", renderTasks);

document.querySelectorAll(".task-list").forEach(list => list.addEventListener("click", handleTaskAction));

$("deadlineList").addEventListener("click", event => {
  const item = event.target.closest("[data-edit]");
  if (!item) return;
  const task = tasks.find(t => t.id === item.dataset.edit);
  if (task) openTaskDialog(task);
});

document.querySelectorAll(".nav-item[data-view]").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("themeButton").addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  localStorage.setItem("nexus_theme", document.body.classList.contains("light-theme") ? "light" : "dark");
});

if (localStorage.getItem("nexus_theme") === "light") {
  document.body.classList.add("light-theme");
}

let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  $("timerDisplay").textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  $("timerStart").textContent = timerRunning ? "Ⅱ Pause" : "▶ Start";
}

$("timerStart").addEventListener("click", () => {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    updateTimerDisplay();
    return;
  }

  timerRunning = true;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerSeconds = 0;
      updateTimerDisplay();
      alert("Session complete! Take a short break. ✦");
      return;
    }
    updateTimerDisplay();
  }, 1000);
});

$("timerReset").addEventListener("click", () => {
  clearInterval(timerInterval);
  timerRunning = false;
  const selected = document.querySelector(".timer-presets button.selected");
  timerSeconds = Number(selected?.dataset.minutes || 25) * 60;
  updateTimerDisplay();
});

document.querySelectorAll(".timer-presets button").forEach(button => {
  button.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerRunning = false;
    document.querySelectorAll(".timer-presets button").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    timerSeconds = Number(button.dataset.minutes) * 60;
    $("timerMode").textContent = button.dataset.minutes === "25" ? "Focus session" :
      button.dataset.minutes === "5" ? "Short break" : "Long break";
    updateTimerDisplay();
  });
});

const themeStyles = document.createElement("style");
themeStyles.textContent = `
body.light-theme {
  --bg:#f0f4fb; --panel:#ffffff; --panel-light:#edf2fc;
  --border:#d8e1ef; --text:#18243a; --muted:#61718b;
  background:linear-gradient(135deg,#f6f8ff,#e9effb);
}
body.light-theme .sidebar, body.light-theme .topbar { background:#fff; }
body.light-theme .panel, body.light-theme .stat-card { background:#fff; }
body.light-theme .task-column { background:#f5f7fc; }
body.light-theme .task-card { background:#fff; }
body.light-theme .search, body.light-theme .heading-actions select,
body.light-theme .form-row select { background:#f3f6fc; color:#18243a; }
body.light-theme .search input { color:#18243a; }
body.light-theme .timer-ring { background:radial-gradient(circle,#fff 62%,transparent 64%),conic-gradient(#7662ff 0 78%,#dce3f0 78% 100%); }
body.light-theme .timer-ring strong { color:#18243a; }
body.light-theme .timer-presets button { background:#edf1fa; color:#33435f; }
body.light-theme .task-actions button { background:#edf1fa; color:#33435f; }
`;
document.head.appendChild(themeStyles);

renderAll();
updateTimerDisplay();
