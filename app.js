/* ============================================================
   ModernDo To-Do List – app.js
   Pure Vanilla JavaScript | No External Libraries
   ============================================================ */

'use strict';

/* ── 1. State & Storage ─────────────────────────────────────── */

/** @type {Array<Object>} */
let tasks = [];
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';
let editingId = null;

const STORAGE_KEY = 'moderno_tasks';
const THEME_KEY   = 'moderno_theme';

/** Load tasks from localStorage */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch {
    tasks = [];
  }
}

/** Save tasks to localStorage */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/** Generate unique ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── 2. Task CRUD ───────────────────────────────────────────── */

/**
 * Add a new task
 * @param {string} title
 * @param {string} priority
 * @param {string} deadline  – ISO string or ''
 * @param {string} note
 */
function addTask(title, priority, deadline, note) {
  const task = {
    id:        genId(),
    title:     title.trim(),
    priority:  priority,
    deadline:  deadline,
    note:      note.trim(),
    done:      false,
    createdAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  saveTasks();
  renderAll();
  showToast('✅ Tugas berhasil ditambahkan!', 'success');
}

/**
 * Toggle done state
 * @param {string} id
 */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  renderAll();
  showToast(task.done ? '🎉 Tugas ditandai selesai!' : '🔄 Tugas diaktifkan kembali', 'info');
}

/**
 * Delete a task with animation
 * @param {string} id
 */
function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
    }, 300);
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderAll();
  }
  showToast('🗑️ Tugas dihapus', 'info');
}

/**
 * Open edit modal
 * @param {string} id
 */
function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;

  // Populate modal fields
  editTaskInput.value      = task.title;
  editPrioritySelect.value = task.priority;
  editNoteInput.value      = task.note || '';
  editDeadlineInput.value  = task.deadline
    ? task.deadline.slice(0, 16)   // datetime-local format
    : '';

  modalOverlay.classList.add('open');
  editTaskInput.focus();
}

/** Save edited task */
function saveEdit() {
  if (!editingId) return;
  const title = editTaskInput.value.trim();
  if (!title) { showToast('⚠️ Nama tugas tidak boleh kosong!', 'error'); return; }

  const task = tasks.find(t => t.id === editingId);
  if (!task) return;

  task.title    = title;
  task.priority = editPrioritySelect.value;
  task.deadline = editDeadlineInput.value
    ? new Date(editDeadlineInput.value).toISOString()
    : '';
  task.note     = editNoteInput.value.trim();

  saveTasks();
  renderAll();
  closeModal();
  showToast('✏️ Tugas berhasil diperbarui!', 'success');
}

/** Close edit modal */
function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

/** Delete all done tasks */
function clearDoneTasks() {
  const count = tasks.filter(t => t.done).length;
  if (count === 0) { showToast('ℹ️ Tidak ada tugas selesai untuk dihapus', 'info'); return; }
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderAll();
  showToast(`🗑️ ${count} tugas selesai dihapus`, 'success');
}

/* ── 3. Filtering, Searching & Sorting ─────────────────────── */

/**
 * Check if a task is overdue
 * @param {Object} task
 * @returns {boolean}
 */
function isOverdue(task) {
  if (!task.deadline || task.done) return false;
  return new Date(task.deadline) < new Date();
}

/** Filter, search, and sort the task list */
function getFilteredTasks() {
  let result = [...tasks];

  // Filter
  if (currentFilter === 'active')  result = result.filter(t => !t.done);
  if (currentFilter === 'done')    result = result.filter(t => t.done);
  if (currentFilter === 'overdue') result = result.filter(t => isOverdue(t));

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q)
    );
  }

  // Sort
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  result.sort((a, b) => {
    switch (currentSort) {
      case 'oldest':   return new Date(a.createdAt) - new Date(b.createdAt);
      case 'priority': return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'deadline': {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      case 'alpha':    return a.title.localeCompare(b.title, 'id');
      default:         return new Date(b.createdAt) - new Date(a.createdAt); // newest
    }
  });

  return result;
}

/* ── 4. Rendering ───────────────────────────────────────────── */

/** Format date-time nicely */
function formatDeadline(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const opts = {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  };
  return d.toLocaleString('id-ID', opts);
}

/** Format created-at date */
function formatCreated(iso) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/** Priority label map */
const priorityLabel = { high: '🔴 Tinggi', medium: '🟡 Sedang', low: '🟢 Rendah' };

/** Build a task card element */
function createTaskCard(task) {
  const overdue = isOverdue(task);
  const card = document.createElement('div');
  card.className = [
    'task-card',
    `priority-${task.priority}`,
    task.done   ? 'done'    : '',
    overdue     ? 'overdue' : '',
  ].join(' ').trim();
  card.dataset.id = task.id;

  /* Checkbox */
  const check = document.createElement('button');
  check.className = `task-check ${task.done ? 'checked' : ''}`;
  check.title = task.done ? 'Tandai belum selesai' : 'Tandai selesai';
  check.innerHTML = task.done ? '✓' : '';
  check.addEventListener('click', () => toggleTask(task.id));

  /* Body */
  const body = document.createElement('div');
  body.className = 'task-body';

  const titleEl = document.createElement('p');
  titleEl.className = 'task-title';
  titleEl.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  // Priority badge
  const badge = document.createElement('span');
  badge.className = `priority-badge ${task.priority}`;
  badge.textContent = priorityLabel[task.priority];
  meta.appendChild(badge);

  // Deadline
  if (task.deadline) {
    const dl = document.createElement('span');
    dl.className = `task-deadline ${overdue ? 'overdue' : ''}`;
    dl.innerHTML = `⏰ ${formatDeadline(task.deadline)}${overdue ? ' <strong>(Terlambat!)</strong>' : ''}`;
    meta.appendChild(dl);
  }

  body.appendChild(titleEl);
  body.appendChild(meta);

  // Note
  if (task.note) {
    const note = document.createElement('p');
    note.className = 'task-note';
    note.textContent = `📝 ${task.note}`;
    body.appendChild(note);
  }

  // Created at
  const created = document.createElement('p');
  created.className = 'task-created';
  created.textContent = `Dibuat: ${formatCreated(task.createdAt)}`;
  body.appendChild(created);

  /* Actions */
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'task-btn edit-btn';
  editBtn.title = 'Edit tugas';
  editBtn.innerHTML = '✏️';
  editBtn.addEventListener('click', () => openEdit(task.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'task-btn delete-btn';
  delBtn.title = 'Hapus tugas';
  delBtn.innerHTML = '🗑️';
  delBtn.addEventListener('click', () => deleteTask(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  card.appendChild(check);
  card.appendChild(body);
  card.appendChild(actions);

  return card;
}

/** Render task list */
function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
    const fragment = document.createDocumentFragment();
    filtered.forEach(t => fragment.appendChild(createTaskCard(t)));
    taskList.appendChild(fragment);
  }
}

/** Render stats & progress */
function renderStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const active  = tasks.filter(t => !t.done).length;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const pct     = total === 0 ? 0 : Math.round((done / total) * 100);

  totalCount.textContent    = total;
  activeCount.textContent   = active;
  doneCount.textContent     = done;
  overdueCount.textContent  = overdue;
  progressFill.style.width  = pct + '%';
  progressPercent.textContent = pct + '%';
}

/** Full re-render */
function renderAll() {
  renderTasks();
  renderStats();
}

/* ── 5. Header Date ─────────────────────────────────────────── */
function setHeaderDate() {
  const now = new Date();
  const opts = {
    weekday: 'long', day: 'numeric',
    month: 'long', year: 'numeric'
  };
  headerDate.textContent = now.toLocaleDateString('id-ID', opts);
}

/* ── 6. Theme ───────────────────────────────────────────────── */
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeIcon.textContent  = dark ? '☀️' : '🌙';
  themeLabel.textContent = dark ? 'Light Mode' : 'Dark Mode';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ? saved === 'dark' : prefersDark);
}

/* ── 7. Toast Notifications ─────────────────────────────────── */

/**
 * Show a toast message
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration  ms
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ── 8. Export / Import ─────────────────────────────────────── */

/** Export tasks to a TXT file */
function exportToTxt() {
  if (tasks.length === 0) { showToast('⚠️ Tidak ada tugas untuk diekspor', 'warning'); return; }

  const lines = [
    '============================================================',
    '  ModernDo – To-Do List Export',
    `  Tanggal: ${new Date().toLocaleString('id-ID')}`,
    `  Total Tugas: ${tasks.length}`,
    '============================================================',
    '',
  ];

  tasks.forEach((t, i) => {
    lines.push(`[${i + 1}] ${t.done ? '✓' : '○'} ${t.title}`);
    lines.push(`    Prioritas : ${priorityLabel[t.priority]}`);
    if (t.deadline) lines.push(`    Deadline  : ${formatDeadline(t.deadline)}`);
    if (t.note)     lines.push(`    Catatan   : ${t.note}`);
    lines.push(`    Dibuat    : ${formatCreated(t.createdAt)}`);
    lines.push(`    Status    : ${t.done ? 'Selesai' : isOverdue(t) ? 'Terlambat' : 'Aktif'}`);
    lines.push('');
  });

  lines.push('============================================================');
  lines.push('  Diekspor dari ModernDo v2.0.0');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `moderno-tasks-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Tugas berhasil diekspor!', 'success');
}

/** Import tasks from a ModernDo TXT file */
function importFromTxt(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text  = e.target.result;
      const lines = text.split('\n');
      let imported = 0;

      for (let i = 0; i < lines.length; i++) {
        // Match lines like: [1] ✓ Task title  OR  [2] ○ Task title
        const match = lines[i].match(/^\[(\d+)\]\s+[✓○]\s+(.+)$/);
        if (!match) continue;

        const title = match[2].trim();
        const done  = lines[i].includes('✓');

        let priority = 'medium';
        let deadline = '';
        let note     = '';

        // Look ahead for metadata
        for (let j = i + 1; j <= i + 5 && j < lines.length; j++) {
          const ln = lines[j].trim();
          if (ln.startsWith('Prioritas :')) {
            if (ln.includes('Tinggi'))  priority = 'high';
            else if (ln.includes('Rendah')) priority = 'low';
            else priority = 'medium';
          }
          if (ln.startsWith('Catatan   :')) note = ln.replace('Catatan   :', '').trim();
        }

        const task = {
          id: genId(),
          title, priority, deadline, note,
          done,
          createdAt: new Date().toISOString(),
        };
        tasks.push(task);
        imported++;
      }

      if (imported === 0) throw new Error('Tidak ada tugas yang dikenali');
      saveTasks();
      renderAll();
      showToast(`📥 ${imported} tugas berhasil diimpor!`, 'success');
    } catch (err) {
      showToast(`❌ Gagal mengimpor: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

/* ── 9. DOM References ──────────────────────────────────────── */
const taskList          = document.getElementById('taskList');
const emptyState        = document.getElementById('emptyState');
const taskInput         = document.getElementById('taskInput');
const prioritySelect    = document.getElementById('prioritySelect');
const deadlineInput     = document.getElementById('deadlineInput');
const noteInput         = document.getElementById('noteInput');
const addBtn            = document.getElementById('addBtn');
const clearFormBtn      = document.getElementById('clearFormBtn');
const searchInput       = document.getElementById('searchInput');
const clearSearch       = document.getElementById('clearSearch');
const filterBtns        = document.querySelectorAll('.filter-btn');
const sortSelect        = document.getElementById('sortSelect');
const clearDoneBtn      = document.getElementById('clearDoneBtn');
const exportBtn         = document.getElementById('exportBtn');
const importFile        = document.getElementById('importFile');
const themeToggle       = document.getElementById('themeToggle');
const themeIcon         = document.getElementById('themeIcon');
const themeLabel        = document.getElementById('themeLabel');
const headerDate        = document.getElementById('headerDate');
const totalCount        = document.getElementById('totalCount');
const activeCount       = document.getElementById('activeCount');
const doneCount         = document.getElementById('doneCount');
const overdueCount      = document.getElementById('overdueCount');
const progressFill      = document.getElementById('progressFill');
const progressPercent   = document.getElementById('progressPercent');
const modalOverlay      = document.getElementById('modalOverlay');
const modalClose        = document.getElementById('modalClose');
const saveEditBtn       = document.getElementById('saveEditBtn');
const cancelEditBtn     = document.getElementById('cancelEditBtn');
const editTaskInput     = document.getElementById('editTaskInput');
const editPrioritySelect= document.getElementById('editPrioritySelect');
const editDeadlineInput = document.getElementById('editDeadlineInput');
const editNoteInput     = document.getElementById('editNoteInput');
const toastContainer    = document.getElementById('toastContainer');

/* ── 10. Event Listeners ────────────────────────────────────── */

/** Add Task */
addBtn.addEventListener('click', () => {
  const title = taskInput.value.trim();
  if (!title) {
    showToast('⚠️ Nama tugas tidak boleh kosong!', 'error');
    taskInput.focus();
    return;
  }
  const deadline = deadlineInput.value
    ? new Date(deadlineInput.value).toISOString()
    : '';
  addTask(title, prioritySelect.value, deadline, noteInput.value);
  taskInput.value    = '';
  noteInput.value    = '';
  deadlineInput.value= '';
  prioritySelect.value = 'medium';
  taskInput.focus();
});

/** Enter key on task input */
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addBtn.click();
});

/** Clear form */
clearFormBtn.addEventListener('click', () => {
  taskInput.value     = '';
  noteInput.value     = '';
  deadlineInput.value = '';
  prioritySelect.value = 'medium';
  taskInput.focus();
});

/** Search – real-time */
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  clearSearch.classList.toggle('visible', searchQuery.length > 0);
  renderAll();
});

/** Clear search */
clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearch.classList.remove('visible');
  renderAll();
  searchInput.focus();
});

/** Filter tabs */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderAll();
  });
});

/** Sort */
sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderAll();
});

/** Clear done tasks */
clearDoneBtn.addEventListener('click', clearDoneTasks);

/** Export */
exportBtn.addEventListener('click', exportToTxt);

/** Import */
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (file) {
    importFromTxt(file);
    importFile.value = ''; // reset so same file can be re-imported
  }
});

/** Theme toggle */
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});

/** Modal controls */
modalClose.addEventListener('click',    closeModal);
cancelEditBtn.addEventListener('click', closeModal);
saveEditBtn.addEventListener('click',   saveEdit);

/** Close modal on overlay click */
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

/** Save on Enter in modal */
editTaskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveEditBtn.click();
});

/** Escape closes modal */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

/* ── 11. Overdue Notification Checker ───────────────────────── */
function checkOverdueNotifications() {
  const overdue = tasks.filter(t => isOverdue(t));
  if (overdue.length > 0) {
    showToast(
      `⚠️ ${overdue.length} tugas melewati deadline!`,
      'warning',
      5000
    );
  }
}

/* ── 12. Auto-Refresh Overdue (every 60s) ───────────────────── */
setInterval(() => {
  renderAll(); // re-check overdue statuses
}, 60000);

/* ── 13. Initialization ─────────────────────────────────────── */
function init() {
  loadTasks();
  initTheme();
  setHeaderDate();
  renderAll();

  // Notify overdue tasks on load (after short delay)
  setTimeout(checkOverdueNotifications, 1000);
}

init();
