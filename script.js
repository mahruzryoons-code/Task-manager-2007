// ============================================
//  Daily Task Manager - JavaScript
// ============================================

// ---------- 1. Grab elements from the HTML ----------
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const prioritySelect = document.getElementById("priority-select");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const itemsLeft = document.getElementById("items-left");
const clearBtn = document.getElementById("clear-completed");
const filterButtons = document.querySelectorAll(".filter-btn");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const progressPercent = document.getElementById("progress-percent");
const dateEl = document.getElementById("today-date");

// ---------- 2. App data ----------
// Load saved tasks from the browser (localStorage), or start with an empty list
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";

// Small flags that decide which animations should play
let animateAll = true;      // true on first load and when the filter changes
let lastAddedId = null;     // the task that was just added
let justToggledId = null;   // the task that was just ticked

// ---------- 3. Helpers ----------
// Show today's date at the top
dateEl.textContent = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

// Today's date as "YYYY-MM-DD" (the format a date input understands)
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// ---------- 4. Add a new task ----------
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from refreshing

  const text = input.value.trim();

  // If the box is empty, shake the form and stop
  if (text === "") {
    form.classList.add("shake");
    setTimeout(() => form.classList.remove("shake"), 300);
    return;
  }

  const newTask = {
    id: Date.now(), // unique id based on the current time
    text: text,
    priority: prioritySelect.value,
    completed: false,
    completedOn: "", // the date the task was finished
  };

  tasks.unshift(newTask); // add to the top of the list
  lastAddedId = newTask.id;
  saveTasks();
  render();

  input.value = "";
  input.focus();
});

// ---------- 5. Tick / untick a task ----------
function toggleTask(id) {
  justToggledId = id;
  tasks = tasks.map((task) => {
    if (task.id !== id) return task;
    const nowDone = !task.completed;
    return {
      ...task,
      completed: nowDone,
      // Auto-fill today's date when ticked, clear it when unticked
      completedOn: nowDone ? todayString() : "",
    };
  });
  saveTasks();
  render();
}

// ---------- 6. Change the "Done on" date by hand ----------
function setCompletedDate(id, date) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completedOn = date;
    saveTasks();
  }
}

// ---------- 7. Delete a task (with exit animation) ----------
function deleteTask(id, element) {
  element.style.animationDelay = "0s";
  element.classList.add("removing"); // plays the taskOut animation

  // Wait for the animation to finish, then remove the data
  setTimeout(() => {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    render();
  }, 300);
}

// ---------- 8. Clear all completed tasks ----------
clearBtn.addEventListener("click", function () {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

// ---------- 9. Filter tabs ----------
filterButtons.forEach((button) => {
  button.addEventListener("click", function () {
    filterButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter; // "all", "active" or "completed"
    animateAll = true; // replay the staggered entrance for the new view
    render();
  });
});

// ---------- 10. Draw everything on the screen ----------
function render() {
  // Decide which tasks to show based on the filter
  let visibleTasks = tasks;
  if (currentFilter === "active") {
    visibleTasks = tasks.filter((t) => !t.completed);
  } else if (currentFilter === "completed") {
    visibleTasks = tasks.filter((t) => t.completed);
  }

  // Clear the list, then rebuild it
  taskList.innerHTML = "";

  visibleTasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = `task ${task.priority}` + (task.completed ? " done" : "");

    // Only animate when needed: first load, filter change, or a brand-new task
    if (animateAll) {
      li.classList.add("enter");
      li.style.animationDelay = index * 0.05 + "s"; // staggered entrance
    } else if (task.id === lastAddedId) {
      li.classList.add("enter");
    }

    // Pop the checkbox only for the task that was just ticked
    if (task.id === justToggledId && task.completed) {
      li.classList.add("just-done");
    }

    // Checkbox circle
    const check = document.createElement("div");
    check.className = "check";
    check.textContent = "✓";
    check.addEventListener("click", () => toggleTask(task.id));

    // Task text
    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text; // textContent is safe from HTML injection

    // "Done on" date space
    const dateWrap = document.createElement("label");
    dateWrap.className = "done-date";

    const dateLabel = document.createElement("span");
    dateLabel.textContent = "Done on";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = task.completedOn || "";
    dateInput.disabled = !task.completed; // locked until the task is ticked
    dateInput.addEventListener("change", () =>
      setCompletedDate(task.id, dateInput.value)
    );

    dateWrap.append(dateLabel, dateInput);

    // Delete button
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "×";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", () => deleteTask(task.id, li));

    li.append(check, span, dateWrap, del);
    taskList.appendChild(li);
  });

  // Reset the flags so the next render doesn't replay old animations
  animateAll = false;
  lastAddedId = null;
  justToggledId = null;

  // Show or hide the "empty" message
  emptyMessage.classList.toggle("show", visibleTasks.length === 0);

  updateStats();
}

// ---------- 11. Update progress bar + counters ----------
function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const left = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = total > 0 && left === 0;

  progressBar.style.width = percent + "%";
  setTextWithBump(
    progressText,
    allDone ? "All done for today ✓" : `${done} of ${total} done`
  );
  setTextWithBump(progressPercent, percent + "%");
  setTextWithBump(itemsLeft, `${left} task${left === 1 ? "" : "s"} left`);
}

// Change an element's text and give it a little "bump" animation
function setTextWithBump(element, newText) {
  if (element.textContent === newText) return; // nothing changed
  element.textContent = newText;
  element.classList.remove("bump");
  void element.offsetWidth; // restarts the animation
  element.classList.add("bump");
}

// ---------- 12. Run once when the page loads ----------
render();
