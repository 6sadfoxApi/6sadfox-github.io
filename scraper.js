 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/scraper.js b/scraper.js
new file mode 100644
index 0000000000000000000000000000000000000000..68290d75bdbe6ccebc01e7fc783e72c60f049baf
--- /dev/null
+++ b/scraper.js
@@ -0,0 +1,101 @@
+(function initScraper() {
+  const urlInput = document.getElementById('urlInput');
+  const scrapeButton = document.getElementById('scrapeButton');
+  const scraperStatus = document.getElementById('scraperStatus');
+  const resultCard = document.getElementById('resultCard');
+  const historyList = document.getElementById('historyList');
+
+  if (!urlInput || !scrapeButton || !scraperStatus || !resultCard || !historyList) {
+    return;
+  }
+
+  function escapeHtml(value) {
+    return String(value)
+      .replaceAll('&', '&amp;')
+      .replaceAll('<', '&lt;')
+      .replaceAll('>', '&gt;')
+      .replaceAll('"', '&quot;')
+      .replaceAll("'", '&#39;');
+  }
+
+  function renderResult(entry) {
+    const aiBlock = entry.aiSummary
+      ? `<h3>AI Summary</h3><pre>${escapeHtml(entry.aiSummary)}</pre>`
+      : `<p>${escapeHtml(entry.aiNote || 'AI summary unavailable.')}</p>`;
+
+    resultCard.classList.remove('hidden');
+    resultCard.innerHTML = `
+      <h3>${escapeHtml(entry.title)}</h3>
+      <p><strong>URL:</strong> <a href="${escapeHtml(entry.source)}" target="_blank" rel="noreferrer">${escapeHtml(entry.source)}</a></p>
+      <p><strong>Description:</strong> ${escapeHtml(entry.description || 'No description found.')}</p>
+      ${entry.image ? `<p><strong>OG Image:</strong> ${escapeHtml(entry.image)}</p>` : ''}
+      ${aiBlock}
+    `;
+  }
+
+  function renderHistory(entries) {
+    historyList.innerHTML = '';
+
+    if (!entries.length) {
+      historyList.innerHTML = '<li>No scrapes yet.</li>';
+      return;
+    }
+
+    entries.slice(0, 10).forEach((entry) => {
+      const li = document.createElement('li');
+      li.innerHTML = `
+        <strong>${escapeHtml(entry.title)}</strong>
+        <span class="muted">${new Date(entry.createdAt).toLocaleString()}</span>
+      `;
+      historyList.appendChild(li);
+    });
+  }
+
+  async function loadHistory() {
+    const response = await fetch('/api/scrapes');
+    if (!response.ok) {
+      throw new Error('Failed to load scrape history.');
+    }
+
+    const payload = await response.json();
+    renderHistory(payload.entries || []);
+  }
+
+  async function scrape() {
+    const url = urlInput.value.trim();
+
+    if (!url) {
+      scraperStatus.textContent = 'Enter a URL first.';
+      return;
+    }
+
+    scraperStatus.textContent = 'Scraping...';
+    scrapeButton.disabled = true;
+
+    try {
+      const response = await fetch('/api/scrape', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ url }),
+      });
+
+      const payload = await response.json();
+      if (!response.ok) {
+        throw new Error(payload.error || 'Scrape failed.');
+      }
+
+      renderResult(payload.entry);
+      await loadHistory();
+      scraperStatus.textContent = 'Scrape complete.';
+    } catch (error) {
+      scraperStatus.textContent = error.message;
+    } finally {
+      scrapeButton.disabled = false;
+    }
+  }
+
+  scrapeButton.addEventListener('click', scrape);
+  loadHistory().catch((error) => {
+    scraperStatus.textContent = error.message;
+  });
+})();
 
EOF
)
