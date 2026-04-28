cat > script.js <<'EOF'
const noteInput = document.getElementById('noteInput');
const saveBtn = document.getElementById('saveNote');
const clearBtn = document.getElementById('clearNotes');
const notesList = document.getElementById('notesList');
const timeline = document.getElementById('thinkingTimeline');
const status = document.getElementById('noteStatus');

const KEY = 'notes-local';

function getLocal() {
  return JSON.parse(localStorage.getItem(KEY)) || [];
}

function saveLocal(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function createTimeline(text) {
  const t = Date.now();
  return [
    { label: "Input received", detail: text, at: t },
    { label: "Analyzing", detail: "Breaking words + metadata", at: t + 200 },
    { label: "Processing", detail: "Building structured note object", at: t + 400 },
    { label: "Saving", detail: "Writing to storage", at: t + 600 },
    { label: "Done", detail: "Note stored + rendered", at: t + 800 }
  ];
}

function renderTimeline(data) {
  timeline.innerHTML = '';
  data.forEach(step => {
    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML = `<strong>${step.label}</strong><br>${step.detail}`;
    timeline.appendChild(div);
  });
}

function renderNotes(notes) {
  notesList.innerHTML = '';

  notes.slice().reverse().forEach(note => {
    const div = document.createElement('div');
    div.className = 'note-card';

    div.innerHTML = `
      <small>${new Date(note.createdAt).toLocaleString()}</small>
      <p>${note.text}</p>
      <small>${note.meta}</small>
    `;

    div.onclick = () => renderTimeline(note.timeline);

    notesList.appendChild(div);
  });
}

async function saveNote() {
  const text = noteInput.value.trim();
  if (!text) return;

  // ANIMATION START
  saveBtn.classList.add('is-saving');
  saveBtn.disabled = true;
  status.textContent = "Saving...";

  const timelineData = createTimeline(text);
  renderTimeline(timelineData);

  const note = {
    id: Date.now(),
    text,
    createdAt: new Date().toISOString(),
    meta: navigator.userAgent,
    timeline: timelineData
  };

  try {
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    status.textContent = "Saved to backend";
  } catch {
    const notes = getLocal();
    notes.push(note);
    saveLocal(notes);
    status.textContent = "Saved locally (no backend)";
  }

  noteInput.value = '';
  renderNotes(getLocal());

  // ANIMATION END
  saveBtn.classList.remove('is-saving');
  saveBtn.classList.add('saved-flash');

  setTimeout(() => {
    saveBtn.classList.remove('saved-flash');
    saveBtn.disabled = false;
  }, 400);
}

function clearNotes() {
  localStorage.removeItem(KEY);
  renderNotes([]);
  timeline.innerHTML = '';
  status.textContent = "Cleared";
}

saveBtn.onclick = saveNote;
clearBtn.onclick = clearNotes;

renderNotes(getLocal());
EOF
