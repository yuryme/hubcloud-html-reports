const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 8000);
const rootDir = process.cwd();
const clientErrorLogPath = path.join(rootDir, "dev-server.client-errors.log");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function logRequest(req, statusCode) {
  const now = new Date().toISOString();
  console.log(`[${now}] ${statusCode} ${req.method} ${req.url}`);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function safeResolvePath(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const normalized = clean === "/" ? "/sandbox.html" : clean;
  const fullPath = path.resolve(rootDir, "." + normalized);
  if (!fullPath.startsWith(path.resolve(rootDir))) {
    return null;
  }
  return fullPath;
}

function formatClientError(payload) {
  const kind = payload.kind || "error";
  const message = payload.message || payload.reason || "Unknown client error";
  const source = payload.source || "";
  const line = payload.line || "";
  const col = payload.col || "";
  const stack = payload.stack || "";
  return { kind, message, source, line, col, stack };
}

function appendClientErrorToFile(info) {
  const now = new Date().toISOString();
  const header = `[${now}] ${info.kind.toUpperCase()} ${info.message} ${info.source}:${info.line}:${info.col}`;
  const text = info.stack ? `${header}\n${info.stack}\n\n` : `${header}\n\n`;
  try {
    fs.appendFileSync(clientErrorLogPath, text, "utf8");
  } catch (e) {
    console.error("Failed to write client error log file:", e.message);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/__client_error") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 128 * 1024) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const info = formatClientError(payload);
        const now = new Date().toISOString();
        console.error(
          `[${now}] CLIENT_${info.kind.toUpperCase()} ${info.message} ` +
          `${info.source}:${info.line}:${info.col}`
        );
        if (info.stack) {
          console.error(info.stack);
        }
        appendClientErrorToFile(info);
      } catch (e) {
        console.error("Failed to parse /__client_error payload:", e.message);
      }
      sendJson(res, 200, { ok: true });
      logRequest(req, 200);
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    logRequest(req, 405);
    return;
  }

  const fullPath = safeResolvePath(req.url || "/");
  if (!fullPath) {
    sendJson(res, 403, { error: "Forbidden" });
    logRequest(req, 403);
    return;
  }

  fs.stat(fullPath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      sendJson(res, 404, { error: "Not Found" });
      logRequest(req, 404);
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "HEAD") {
      res.end();
      logRequest(req, 200);
      return;
    }

    const stream = fs.createReadStream(fullPath);
    stream.on("open", () => logRequest(req, 200));
    stream.on("error", () => {
      sendJson(res, 500, { error: "Read Error" });
      logRequest(req, 500);
    });
    stream.pipe(res);
  });
});

server.listen(port, host, () => {
  console.log(`Dev server is running: http://${host}:${port}/sandbox.html?mode=mock&date=2026-03-30`);
  console.log("Client JS errors will be printed from /__client_error");
  console.log(`Client error file: ${clientErrorLogPath}`);
});
