const express = require("express");
const Database = require("better-sqlite3");
const { nanoid } = require("nanoid");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// -------- Persistence (SQLite) ----------
const db = new Database("pastes.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS pastes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    ttl_seconds INTEGER,
    max_views INTEGER,
    created_at INTEGER,
    views INTEGER DEFAULT 0
  )
`);

// -------- Helpers ----------
function getNow(req) {
  if (process.env.TEST_MODE === "1" && req.headers["x-test-now-ms"]) {
    return parseInt(req.headers["x-test-now-ms"]);
  }
  return Date.now();
}

function isExpired(row, now) {
  if (!row.ttl_seconds) return false;
  const expiresAt = row.created_at + row.ttl_seconds * 1000;
  return now >= expiresAt;
}

// -------- Health Check ----------
app.get("/api/healthz", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// -------- Create Paste ----------
app.post("/api/pastes", (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;

  if (!content || typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "content is required" });
  }
  if (ttl_seconds !== undefined && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
    return res.status(400).json({ error: "ttl_seconds must be integer >= 1" });
  }
  if (max_views !== undefined && (!Number.isInteger(max_views) || max_views < 1)) {
    return res.status(400).json({ error: "max_views must be integer >= 1" });
  }

  const id = nanoid(12);
  const now = Date.now();

  db.prepare(`
    INSERT INTO pastes (id, content, ttl_seconds, max_views, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, content, ttl_seconds ?? null, max_views ?? null, now);

  res.json({
    id,
    url: `${req.protocol}://${req.get("host")}/p/${id}`,
  });
});

// -------- Fetch Paste (API) ----------
app.get("/api/pastes/:id", (req, res) => {
  const now = getNow(req);
  const row = db.prepare("SELECT * FROM pastes WHERE id = ?").get(req.params.id);

  if (!row) return res.status(404).json({ error: "Not found" });
  if (isExpired(row, now)) return res.status(404).json({ error: "Expired" });
  if (row.max_views !== null && row.views >= row.max_views) {
    return res.status(404).json({ error: "View limit exceeded" });
  }

  db.prepare("UPDATE pastes SET views = views + 1 WHERE id = ?").run(req.params.id);

  const expiresAt =
    row.ttl_seconds ? new Date(row.created_at + row.ttl_seconds * 1000).toISOString() : null;

  res.json({
    content: row.content,
    remaining_views:
      row.max_views === null ? null : Math.max(0, row.max_views - (row.views + 1)),
    expires_at: expiresAt,
  });
});

// -------- View Paste (HTML) ----------
app.get("/p/:id", (req, res) => {
  const now = getNow(req);
  const row = db.prepare("SELECT * FROM pastes WHERE id = ?").get(req.params.id);

  if (!row || isExpired(row, now) || (row.max_views !== null && row.views >= row.max_views)) {
    return res.status(404).send("Paste not found or unavailable");
  }

  db.prepare("UPDATE pastes SET views = views + 1 WHERE id = ?").run(req.params.id);

  const safe = row.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  res.send(`
    <html>
      <body>
        <pre>${safe}</pre>
      </body>
    </html>
  `);
});

// -------- Start Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
