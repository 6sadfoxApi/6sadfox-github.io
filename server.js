 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server.js b/server.js
index 04965ac2e275e4f577ff78833a3cf1ad6d644280..f2353d315a8eb6d0c70f062471e69d375a78298b 100644
--- a/server.js
+++ b/server.js
@@ -1,85 +1,230 @@
- (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
-diff --git a/server.js b/server.js
-index 1659d3b0c55994b6dd343a2d2f20b44472803196..272f1248e77fa896c5bcab3944447687a05a4cdd 100644
---- a/server.js
-+++ b/server.js
-@@ -1,34 +1,42 @@
-- (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
--diff --git a/server.js b/server.js
--new file mode 100644
--index 0000000000000000000000000000000000000000..9952a4375629a4450f18aa33374ee205a36f47b5
----- /dev/null
--+++ b/server.js
--@@ -0,0 +1,24 @@
--+const http = require('http');
--+
--+const port = Number(process.env.PORT || 3000);
--+
--+const server = http.createServer((req, res) => {
--+  if (req.url === '/' || req.url === '/health') {
--+    if (req.url === '/') {
--+      res.writeHead(200, { 'Content-Type': 'application/json' });
--+      res.end(JSON.stringify({ status: 'ok', message: 'Server is live' }));
--+      return;
--+    }
--+
--+    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
--+    res.end('Server is live');
--+    return;
--+  }
--+
--+  res.writeHead(404, { 'Content-Type': 'application/json' });
--+  res.end(JSON.stringify({ status: 'error', message: 'Not Found' }));
--+});
--+
--+server.listen(port, () => {
--+  console.log(`Server is live on port ${port}`);
--+});
-- 
--EOF
--)
-+const http = require('http');
-+const fs = require('fs');
-+const path = require('path');
-+
-+const port = Number(process.env.PORT || 3000);
-+const root = __dirname;
-+
-+const contentTypeByExt = {
-+  '.html': 'text/html; charset=utf-8',
-+  '.css': 'text/css; charset=utf-8',
-+  '.js': 'text/javascript; charset=utf-8',
-+  '.json': 'application/json; charset=utf-8',
-+  '.png': 'image/png',
-+  '.jpg': 'image/jpeg',
-+  '.jpeg': 'image/jpeg',
-+  '.svg': 'image/svg+xml',
-+  '.ico': 'image/x-icon',
-+};
-+
-+const server = http.createServer((req, res) => {
-+  const urlPath = req.url === '/' ? '/index.html' : req.url;
-+  const filePath = path.join(root, decodeURIComponent(urlPath));
-+
-+  fs.readFile(filePath, (error, data) => {
-+    if (error) {
-+      fs.readFile(path.join(root, '404.html'), (notFoundErr, notFoundData) => {
-+        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
-+        res.end(notFoundErr ? '404 Not Found' : notFoundData);
-+      });
-+      return;
-+    }
-+
-+    const ext = path.extname(filePath).toLowerCase();
-+    const contentType = contentTypeByExt[ext] || 'application/octet-stream';
-+    res.writeHead(200, { 'Content-Type': contentType });
-+    res.end(data);
-+  });
-+});
-+
-+server.listen(port, () => {
-+  console.log(`Server is live on http://localhost:${port}`);
-+});
- 
-EOF
-)
+const http = require('http');
+const fs = require('fs');
+const path = require('path');
+
+const port = Number(process.env.PORT || 3000);
+const root = __dirname;
+const dataDir = path.join(root, 'data');
+const storageFile = path.join(dataDir, 'scrapes.json');
+
+const contentTypeByExt = {
+  '.html': 'text/html; charset=utf-8',
+  '.css': 'text/css; charset=utf-8',
+  '.js': 'text/javascript; charset=utf-8',
+  '.json': 'application/json; charset=utf-8',
+  '.png': 'image/png',
+  '.jpg': 'image/jpeg',
+  '.jpeg': 'image/jpeg',
+  '.svg': 'image/svg+xml',
+  '.ico': 'image/x-icon',
+};
+
+function sendJson(res, statusCode, body) {
+  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
+  res.end(JSON.stringify(body));
+}
+
+async function ensureStorage() {
+  await fs.promises.mkdir(dataDir, { recursive: true });
+  try {
+    await fs.promises.access(storageFile);
+  } catch {
+    await fs.promises.writeFile(storageFile, '[]', 'utf8');
+  }
+}
+
+async function readStorage() {
+  await ensureStorage();
+  const raw = await fs.promises.readFile(storageFile, 'utf8');
+  try {
+    const parsed = JSON.parse(raw);
+    return Array.isArray(parsed) ? parsed : [];
+  } catch {
+    return [];
+  }
+}
+
+async function writeStorage(entries) {
+  await ensureStorage();
+  await fs.promises.writeFile(storageFile, JSON.stringify(entries, null, 2), 'utf8');
+}
+
+function readRequestBody(req) {
+  return new Promise((resolve, reject) => {
+    let raw = '';
+    req.on('data', (chunk) => {
+      raw += chunk;
+      if (raw.length > 1_000_000) {
+        reject(new Error('Request body too large'));
+        req.destroy();
+      }
+    });
+    req.on('end', () => resolve(raw));
+    req.on('error', reject);
+  });
+}
+
+function extractMeta(html, url) {
+  const safeText = (value) => (value || '').replace(/\s+/g, ' ').trim();
+
+  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
+  const descriptionMatch = html.match(
+    /<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([\s\S]*?)["'][^>]*>/i,
+  );
+  const imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);
+
+  return {
+    title: safeText(titleMatch && titleMatch[1]) || 'Untitled',
+    description: safeText(descriptionMatch && descriptionMatch[1]),
+    image: safeText(imageMatch && imageMatch[1]),
+    source: url,
+  };
+}
+
+async function fetchPage(url) {
+  const controller = new AbortController();
+  const timeout = setTimeout(() => controller.abort(), 10000);
+
+  try {
+    const response = await fetch(url, {
+      headers: {
+        'User-Agent': '6sadfox-scraper/1.0',
+        Accept: 'text/html,application/xhtml+xml',
+      },
+      signal: controller.signal,
+    });
+
+    if (!response.ok) {
+      throw new Error(`Failed to fetch URL (status ${response.status})`);
+    }
+
+    const html = await response.text();
+    return extractMeta(html, url);
+  } finally {
+    clearTimeout(timeout);
+  }
+}
+
+async function askOpenAiForSummary(meta) {
+  const apiKey = process.env.OPENAI_API_KEY;
+  if (!apiKey) {
+    return { summary: null, note: 'OPENAI_API_KEY not configured.' };
+  }
+
+  const prompt = [
+    'Summarize this webpage metadata in 3 concise bullet points.',
+    `Title: ${meta.title}`,
+    `Description: ${meta.description || 'N/A'}`,
+    `Source: ${meta.source}`,
+  ].join('\n');
+
+  const response = await fetch('https://api.openai.com/v1/responses', {
+    method: 'POST',
+    headers: {
+      Authorization: `Bearer ${apiKey}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify({
+      model: 'gpt-4.1-mini',
+      input: prompt,
+      temperature: 0.2,
+    }),
+  });
+
+  if (!response.ok) {
+    return { summary: null, note: `OpenAI request failed (${response.status}).` };
+  }
+
+  const data = await response.json();
+  return {
+    summary: data.output_text || null,
+    note: null,
+  };
+}
+
+async function handleScrapeRequest(req, res) {
+  try {
+    const rawBody = await readRequestBody(req);
+    const body = JSON.parse(rawBody || '{}');
+
+    if (!body.url) {
+      sendJson(res, 400, { error: 'url is required' });
+      return;
+    }
+
+    let normalizedUrl;
+    try {
+      normalizedUrl = new URL(body.url);
+      if (!['http:', 'https:'].includes(normalizedUrl.protocol)) {
+        throw new Error('Invalid protocol');
+      }
+    } catch {
+      sendJson(res, 400, { error: 'Please provide a valid http/https URL.' });
+      return;
+    }
+
+    const meta = await fetchPage(normalizedUrl.toString());
+    const ai = await askOpenAiForSummary(meta);
+
+    const entry = {
+      id: Date.now(),
+      createdAt: new Date().toISOString(),
+      ...meta,
+      aiSummary: ai.summary,
+      aiNote: ai.note,
+    };
+
+    const existing = await readStorage();
+    existing.unshift(entry);
+    await writeStorage(existing.slice(0, 100));
+
+    sendJson(res, 200, { entry });
+  } catch (error) {
+    sendJson(res, 500, { error: error.message || 'Unknown error' });
+  }
+}
+
+async function handleHistoryRequest(res) {
+  try {
+    const entries = await readStorage();
+    sendJson(res, 200, { entries });
+  } catch (error) {
+    sendJson(res, 500, { error: error.message || 'Unknown error' });
+  }
+}
+
+const server = http.createServer((req, res) => {
+  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
+
+  if (req.method === 'POST' && parsedUrl.pathname === '/api/scrape') {
+    handleScrapeRequest(req, res);
+    return;
+  }
+
+  if (req.method === 'GET' && parsedUrl.pathname === '/api/scrapes') {
+    handleHistoryRequest(res);
+    return;
+  }
+
+  const urlPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
+  const filePath = path.join(root, decodeURIComponent(urlPath));
+
+  fs.readFile(filePath, (error, data) => {
+    if (error) {
+      fs.readFile(path.join(root, '404.html'), (notFoundErr, notFoundData) => {
+        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
+        res.end(notFoundErr ? '404 Not Found' : notFoundData);
+      });
+      return;
+    }
+
+    const ext = path.extname(filePath).toLowerCase();
+    const contentType = contentTypeByExt[ext] || 'application/octet-stream';
+    res.writeHead(200, { 'Content-Type': contentType });
+    res.end(data);
+  });
+});
+
+server.listen(port, () => {
+  console.log(`Server is live on http://localhost:${port}`);
+});
 
EOF
)
