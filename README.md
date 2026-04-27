 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/README.md b/README.md
index 5fbd2e33d052faecf0ad11d359694aeb8e21214c..59423d6c9bed270275c9b6f2e16cd73c53cc1af4 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,41 @@
-# 6sadfox-github.io
\ No newline at end of file
+# GitHub Pages custom domain setup
+
+This repository is configured to serve GitHub Pages from the custom domain:
+
+- **`www.foxcorp.com`**
+
+## What was configured
+
+- Added a `CNAME` file in the repository root so GitHub Pages maps this site to `www.foxcorp.com`.
+- Documented DNS and HTTPS requirements below.
+
+## DNS configuration (at your DNS provider)
+
+Create these records:
+
+1. **CNAME record for `www`**
+   - **Type:** `CNAME`
+   - **Host/Name:** `www`
+   - **Value/Target:** `6sadfoxapi.github.io`
+   - **TTL:** default/automatic is fine
+
+2. **Apex redirect (recommended)**
+   - Redirect `foxcorp.com` to `https://www.foxcorp.com` using your DNS provider's URL forwarding (or equivalent web redirect service).
+
+> If you prefer to serve from the apex (`foxcorp.com`) directly, use GitHub Pages apex A/AAAA records instead of a `www` CNAME setup.
+
+## HTTP/HTTPS configuration (in GitHub)
+
+In **GitHub → Repository → Settings → Pages**:
+
+1. Set **Custom domain** to `www.foxcorp.com`.
+2. Confirm **Enforce HTTPS** is enabled (it may become available after DNS propagates).
+3. Wait for certificate issuance and DNS propagation (can take from minutes to 24h).
+
+## Validation checklist
+
+After DNS propagation:
+
+- `https://www.foxcorp.com` loads your Pages site.
+- `https://6sadfoxapi.github.io` redirects to `https://www.foxcorp.com` (expected once custom domain is active).
+- HTTPS certificate is valid for `www.foxcorp.com`.
 
EOF
)
