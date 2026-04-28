cat > script.js <<'EOF'
(function initSite() {
  const randomNumberNode = document.getElementById('randomNumber');

  function generateNumber() {
    if (!randomNumberNode) return;
    randomNumberNode.textContent = String(Math.floor(Math.random() * 1000));
  }

  generateNumber();
  setInterval(generateNumber, 3000);

  const noteInput = document.getElementById('noteInput');
  const saveNoteButton = document.getElementById('saveNote');
  const clearNotesButton = document.getElementById('clearNotes');
  const notesList = document.getElementById('notesList');
  const noteStatus = document.getElementById('noteStatus');
  const thinkingTimeline = document.getElementById('thinkingTimeline');

  function setNoteStatus(message) {
    if (noteStatus) noteStatus.textContent = message;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  function renderTimeline(events = []) {
    if (!thinkingTimeline) return;

    thinkingTimeline.innerHTML = '';

    if (!events.length) {
      thinkingTimeline.innerHTML = '<div class="timeline-empty">Waiting for a note...</div>';
      return;
    }

    events.forEach((event, index) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.style.animationDelay = `${index * 90}ms`;

      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <strong>${escapeHtml(event.label)}</strong>
          <p>${escapeHtml(event.detail)}</p>
          <small>${new Date(event.at).toLocaleString()}</small>
        </div>
      `;

      thinkingTimeline.appendChild(item);
    });
  }

  function renderNotes(notes) {
    if (!notesList) return;

    notesList.innerHTML = '';

    if (!notes.length) {
      notesList.innerHTML = '<p class="status-line">No notes saved yet.</p>';
      renderTimeline([]);
      return;
    }

    renderTimeline(notes[0].thinkingTimeline || []);

    notes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'note-card saved-pop';

      card.innerHTML = `
        <small>${new Date(note.createdAt).toLocaleString()}</small>
        <p>${escapeHtml(note.text)}</p>

        <div class="note-meta">
          <span>ID: ${escapeHtml(note.id || 'unknown')}</span>
          <span>IP: ${escapeHtml(note.ipAddress || 'unknown')}</span>
          <span>Source: ${escapeHtml(note.source || 'homepage-notes')}</span>
        </div>

        <div class="note-meta">
          <span>Words: ${escapeHtml(note.metadata?.wordCount ?? '0')}</span>
          <span>Chars: ${escapeHtml(note.metadata?.length ?? '0')}</span>
          <span>Endpoint: ${escapeHtml(note.metadata?.endpoint || '/api/notes')}</span>
        </div>

        <div class="note-meta">
          <span>Agent: ${escapeHtml((note.userAgent || 'unknown').slice(0, 95))}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        renderTimeline(note.thinkingTimeline || []);
        setNoteStatus(`Viewing timeline for note ${note.id || ''}`);
      });

      notesList.appendChild(card);
    });
  }

  async function loadNotes() {
    if (!notesList) return;

    try {
      const response = await fetch('/api/notes');
      const notes = await response.json();

      if (!response.ok) throw new Error('Notes API failed.');

      renderNotes(Array.isArray(notes) ? notes : []);
      setNoteStatus('Notes loaded from data/notes.json.');
    } catch {
      notesList.innerHTML = '<p class="status-line">Notes API offline. Start server with npm start.</p>';
      renderTimeline([]);
      setNoteStatus('Notes API offline.');
    }
  }

  function playSavingAnimation() {
    renderTimeline([
      {
        label: 'Input detected',
        detail: 'Reading note field and preparing request.',
        at: new Date().toISOString()
      },
      {
        label: 'Sending to backend',
        detail: 'Posting note to /api/notes.',
        at: new Date().toISOString()
      },
      {
        label: 'Waiting for database',
        detail: 'Server is writing metadata into data/notes.json.',
        at: new Date().toISOString()
      }
    ]);
  }

  async function saveNote() {
    if (!noteInput) return;

    const text = noteInput.value.trim();
    if (!text) {
      setNoteStatus('Type a note first.');
      return;
    }

    if (saveNoteButton) {
      saveNoteButton.disabled = true;
      saveNoteButton.textContent = 'Saving...';
    }

    setNoteStatus('Saving note...');
    playSavingAnimation();

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Save failed.');
      }

      noteInput.value = '';
      renderTimeline(data.thinkingTimeline || []);
      await loadNotes();
      setNoteStatus('Note saved to data/notes.json.');
    } catch {
      setNoteStatus('Note could not save. Make sure server is running.');
    } finally {
      if (saveNoteButton) {
        saveNoteButton.disabled = false;
        saveNoteButton.textContent = 'Save Note';
      }
    }
  }

  async function clearNotes() {
    setNoteStatus('Clearing notes...');

    try {
      await fetch('/api/notes', { method: 'DELETE' });
      await loadNotes();
      setNoteStatus('Notes cleared.');
    } catch {
      setNoteStatus('Could not clear notes.');
    }
  }

  if (saveNoteButton) saveNoteButton.addEventListener('click', saveNote);
  if (clearNotesButton) clearNotesButton.addEventListener('click', clearNotes);

  if (noteInput) {
    noteInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) saveNote();
    });
  }

  loadNotes();

  const snakeCanvas = document.getElementById('snakeCanvas');

  if (snakeCanvas) {
    const context = snakeCanvas.getContext('2d');
    const cell = 16;
    const cols = Math.floor(snakeCanvas.width / cell);
    const rows = Math.floor(snakeCanvas.height / cell);

    let direction = { x: 1, y: 0 };
    let snake = [{ x: Math.floor(cols / 3), y: Math.floor(rows / 2) }];
    let targetLength = 22;
    let timer = 0;

    function randomTurn() {
      const turns = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ].filter((next) => !(next.x === -direction.x && next.y === -direction.y));

      direction = turns[Math.floor(Math.random() * turns.length)];
    }

    function drawGrid() {
      context.fillStyle = '#031008';
      context.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
      context.strokeStyle = 'rgba(57, 255, 136, 0.08)';
      context.lineWidth = 1;

      for (let x = 0; x <= snakeCanvas.width; x += cell) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, snakeCanvas.height);
        context.stroke();
      }

      for (let y = 0; y <= snakeCanvas.height; y += cell) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(snakeCanvas.width, y);
        context.stroke();
      }
    }

    function drawSnake() {
      snake.forEach((part, index) => {
        const isHead = index === 0;
        context.fillStyle = isHead ? '#9cffb9' : '#39ff88';
        context.shadowColor = '#39ff88';
        context.shadowBlur = isHead ? 18 : 10;
        context.fillRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4);
      });

      context.shadowBlur = 0;
    }

    function stepSnake() {
      timer += 1;
      if (timer % 10 === 0) randomTurn();

      const head = snake[0];
      const next = {
        x: (head.x + direction.x + cols) % cols,
        y: (head.y + direction.y + rows) % rows
      };

      snake.unshift(next);
      if (snake.length > targetLength) snake.pop();
      if (timer % 75 === 0) targetLength = 14 + Math.floor(Math.random() * 18);

      drawGrid();
      drawSnake();
      window.requestAnimationFrame(stepSnake);
    }

    stepSnake();
  }
})();

(function initPong() {
  const canvas = document.getElementById('pongCanvas');
  const leftScoreNode = document.getElementById('leftScore');
  const rightScoreNode = document.getElementById('rightScore');

  if (!canvas) return;

  const context = canvas.getContext('2d');

  const paddleWidth = 12;
  const paddleHeight = 78;
  const ballSize = 10;

  let leftScore = 0;
  let rightScore = 0;

  const leftPaddle = {
    x: 28,
    y: canvas.height / 2 - paddleHeight / 2,
    speed: 5.2
  };

  const rightPaddle = {
    x: canvas.width - 40,
    y: canvas.height / 2 - paddleHeight / 2,
    speed: 5.2
  };

  const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: ballSize,
    vx: 4,
    vy: 3,
    maxSpeed: 8
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resetBall(direction) {
    ball.x = canvas.width / 2 - ball.size / 2;
    ball.y = canvas.height / 2 - ball.size / 2;
    ball.vx = 4 * direction;
    ball.vy = (Math.random() * 4 - 2) || 2;
  }

  function moveAiPaddle(paddle, skill = 0.92) {
    const paddleCenter = paddle.y + paddleHeight / 2;
    const ballCenter = ball.y + ball.size / 2;

    const prediction =
      ballCenter +
      ball.vy * 12 +
      Math.sin(Date.now() / 280) * (1 - skill) * 80;

    const distance = prediction - paddleCenter;

    if (Math.abs(distance) > 6) {
      paddle.y += clamp(distance * 0.11, -paddle.speed, paddle.speed);
    }

    paddle.y = clamp(paddle.y, 0, canvas.height - paddleHeight);
  }

  function paddleCollision(paddle, isLeft) {
    const overlap =
      ball.x + ball.size >= paddle.x &&
      ball.x <= paddle.x + paddleWidth &&
      ball.y + ball.size >= paddle.y &&
      ball.y <= paddle.y + paddleHeight;

    if (!overlap) return;

    const paddleCenter = paddle.y + paddleHeight / 2;
    const ballCenter = ball.y + ball.size / 2;
    const impact = (ballCenter - paddleCenter) / (paddleHeight / 2);
    const speed = clamp(Math.abs(ball.vx) + 0.25, 4, ball.maxSpeed);

    ball.vx = isLeft ? speed : -speed;
    ball.vy = clamp(impact * 5.8, -6, 6);
    ball.x = isLeft ? paddle.x + paddleWidth + 1 : paddle.x - ball.size - 1;
  }

  function update() {
    moveAiPaddle(leftPaddle, 0.89);
    moveAiPaddle(rightPaddle, 0.92);

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    if (ball.y + ball.size >= canvas.height) {
      ball.y = canvas.height - ball.size;
      ball.vy = -Math.abs(ball.vy);
    }

    paddleCollision(leftPaddle, true);
    paddleCollision(rightPaddle, false);

    if (ball.x + ball.size < 0) {
      rightScore += 1;
      if (rightScoreNode) rightScoreNode.textContent = String(rightScore);
      resetBall(1);
    }

    if (ball.x > canvas.width) {
      leftScore += 1;
      if (leftScoreNode) leftScoreNode.textContent = String(leftScore);
      resetBall(-1);
    }
  }

  function draw() {
    context.fillStyle = '#031008';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = 'rgba(57, 255, 136, 0.18)';
    context.setLineDash([8, 10]);
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = '#39ff88';
    context.shadowColor = '#39ff88';
    context.shadowBlur = 12;
    context.fillRect(leftPaddle.x, leftPaddle.y, paddleWidth, paddleHeight);
    context.fillRect(rightPaddle.x, rightPaddle.y, paddleWidth, paddleHeight);

    context.fillStyle = '#9cffb9';
    context.shadowBlur = 18;
    context.fillRect(ball.x, ball.y, ball.size, ball.size);

    context.shadowBlur = 0;
  }

  function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
  }

  resetBall(Math.random() > 0.5 ? 1 : -1);
  loop();
})();
EOF
