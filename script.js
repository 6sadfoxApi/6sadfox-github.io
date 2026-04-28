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

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  async function loadNotes() {
    if (!notesList) return;

    try {
      const response = await fetch('/api/notes');
      const notes = await response.json();

      notesList.innerHTML = '';

      if (!notes.length) {
        notesList.innerHTML = '<p class="status-line">No notes saved yet.</p>';
        return;
      }

      notes.forEach((note) => {
        const card = document.createElement('div');
        card.className = 'note-card saved-pop';

        card.innerHTML = `
          <small>${new Date(note.createdAt).toLocaleString()}</small>
          <p>${escapeHtml(note.text)}</p>
          <div class="note-meta">
            <span>IP: ${escapeHtml(note.ipAddress || 'unknown')}</span>
            <span>Source: ${escapeHtml(note.source || 'homepage-notes')}</span>
          </div>
          <div class="note-meta">
            <span>Agent: ${escapeHtml((note.userAgent || 'unknown').slice(0, 90))}</span>
          </div>
        `;

        notesList.appendChild(card);
      });
    } catch {
      notesList.innerHTML = '<p class="status-line">Notes API offline. Start server with npm start.</p>';
    }
  }

  async function saveNote() {
    if (!noteInput) return;

    const text = noteInput.value.trim();
    if (!text) return;

    if (saveNoteButton) {
      saveNoteButton.disabled = true;
      saveNoteButton.textContent = 'Saving...';
    }

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
      await loadNotes();
    } catch {
      alert('Note could not save. Make sure server is running.');
    } finally {
      if (saveNoteButton) {
        saveNoteButton.disabled = false;
        saveNoteButton.textContent = 'Save';
      }
    }
  }

  async function clearNotes() {
    try {
      await fetch('/api/notes', { method: 'DELETE' });
      await loadNotes();
    } catch {
      alert('Could not clear notes.');
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

  let leftScore = 0;
  let rightScore = 0;

  const leftPaddle = { x: 28, y: canvas.height / 2 - paddleHeight / 2, speed: 4.6 };
  const rightPaddle = { x: canvas.width - 40, y: canvas.height / 2 - paddleHeight / 2, speed: 4.6 };
  const ball = { x: canvas.width / 2, y: canvas.height / 2, size: 10, vx: 4, vy: 3 };

  function resetBall(direction) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 4 * direction;
    ball.vy = (Math.random() > 0.5 ? 1 : -1) * 3;
  }

  function moveAiPaddle(paddle) {
    const paddleCenter = paddle.y + paddleHeight / 2;
    const prediction = ball.y + ball.vy * 8;

    if (paddleCenter < prediction - 10) paddle.y += paddle.speed;
    if (paddleCenter > prediction + 10) paddle.y -= paddle.speed;

    paddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, paddle.y));
  }

  function update() {
    moveAiPaddle(leftPaddle);
    moveAiPaddle(rightPaddle);

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0 || ball.y + ball.size >= canvas.height) ball.vy *= -1;

    const hitLeft =
      ball.x <= leftPaddle.x + paddleWidth &&
      ball.y + ball.size >= leftPaddle.y &&
      ball.y <= leftPaddle.y + paddleHeight;

    const hitRight =
      ball.x + ball.size >= rightPaddle.x &&
      ball.y + ball.size >= rightPaddle.y &&
      ball.y <= rightPaddle.y + paddleHeight;

    if (hitLeft) ball.vx = Math.abs(ball.vx) + 0.05;
    if (hitRight) ball.vx = -Math.abs(ball.vx) - 0.05;

    if (ball.x < 0) {
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
    context.fillRect(leftPaddle.x, leftPaddle.y, paddleWidth, paddleHeight);
    context.fillRect(rightPaddle.x, rightPaddle.y, paddleWidth, paddleHeight);

    context.fillStyle = '#9cffb9';
    context.fillRect(ball.x, ball.y, ball.size, ball.size);
  }

  function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
  }

  loop();
})();
EOF
