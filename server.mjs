import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(".");
const port = Number(process.env.PORT || 5178);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const requested = normalize(pathname === "/" ? "/index.html" : pathname).replace(/^([/\\])+/, "");
  const filePath = resolve(join(root, requested));

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    send(res, 404, "Not found");
    return;
  }

  const isAsset = filePath.includes(`${root}\\assets\\`) || filePath.includes(`${root}/assets/`);

  res.writeHead(200, {
    "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
}).listen(port, "0.0.0.0", () => {
  console.log(`Pulao game running at http://localhost:${port}`);
});
