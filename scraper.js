cat > scraper.js <<'EOF'
const urlInput = document.getElementById('urlInput');
const scrapeButton = document.getElementById('scrapeButton');
const scraperStatus = document.getElementById('scraperStatus');
const resultCard = document.getElementById('resultCard');
const resultTitle = document.getElementById('resultTitle');
const resultUrl = document.getElementById('resultUrl');
const resultDescription = document.getElementById('resultDescription');
const resultSummary = document.getElementById('resultSummary');
const historyList = document.getElementById('historyList');

function setStatus(message) {
  if (scraperStatus) {
    scraperStatus.textContent = message;
  }
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

function renderResult(scrape) {
  if (!resultCard) return;

  resultCard.classList.remove('hidden');

  if (resultTitle) resultTitle.textContent = scrape.title || 'Untitled';

  if (resultUrl) {
    resultUrl.textContent = scrape.url;
    resultUrl.href = scrape.url;
  }

  if (resultDescription) {
    resultDescription.textContent = scrape.description || 'No description found.';
  }

  if (resultSummary) {
    resultSummary.textContent =
      `Title: ${scrape.title}\n` +
      `URL: ${scrape.url}\n` +
      `Description: ${scrape.description}\n\n` +
      `AI-ready summary: This page appears to be about "${scrape.title}".`;
  }
}

function renderHistory(scrapes) {
  if (!historyList) return;

  historyList.innerHTML = '';

  if (!scrapes.length) {
    historyList.innerHTML = '<li>No scrape history yet.</li>';
    return;
  }

  scrapes.slice(0, 20).forEach((scrape) => {
    const li = document.createElement('li');

    li.innerHTML = `
      <div>
        <strong>${escapeHtml(scrape.title || 'Untitled')}</strong>
        <br />
        <a href="${escapeHtml(scrape.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(scrape.url)}
        </a>
        <br />
        <span class="muted">${escapeHtml(new Date(scrape.createdAt).toLocaleString())}</span>
      </div>
    `;

    historyList.appendChild(li);
  });
}

async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    const scrapes = await response.json();
    renderHistory(Array.isArray(scrapes) ? scrapes : []);
  } catch {
    renderHistory([]);
  }
}

async function scrapeUrl() {
  const url = urlInput.value.trim();

  if (!url) {
    setStatus('Enter a URL first.');
    return;
  }

  setStatus('Scraping...');
  scrapeButton.disabled = true;

  try {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Scrape failed.');
    }

    renderResult(data);
    await loadHistory();
    setStatus('Scrape saved to data/scrapes.json.');
  } catch (error) {
    setStatus(error.message || 'Something went wrong.');
  } finally {
    scrapeButton.disabled = false;
  }
}

if (scrapeButton) {
  scrapeButton.addEventListener('click', scrapeUrl);
}

if (urlInput) {
  urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      scrapeUrl();
    }
  });
}

loadHistory();
EOF
