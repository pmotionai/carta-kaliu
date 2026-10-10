// Servidor de la carta Kaliu: sirve la carta y guarda pedidos/avisos/agotados/precios/productos.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 10001;
const PUB = path.join(__dirname, "public");
const DATA = process.env.DATA_FILE || path.join(__dirname, "data.json");
const COLS = ["orders", "calls", "soldout", "products", "prices"];
let db = {};
try { db = JSON.parse(fs.readFileSync(DATA, "utf8")); } catch (e) {}
COLS.forEach(c => { if (!db[c]) db[c] = {}; });
let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(DATA, JSON.stringify(db), () => {}), 300); };
const TYPES = { ".html": "text/html; charset=utf-8", ".webp": "image/webp", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" }); res.end((typeof body === "string" || Buffer.isBuffer(body)) ? body : JSON.stringify(body)); };
const readBody = req => new Promise(r => { let b = ""; req.on("data", c => { b += c; if (b.length > 5e6) req.destroy(); }); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch (e) { r({}); } }); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "api") {
    const col = parts[1], id = parts[2];
    if (!COLS.includes(col)) return send(res, 404, { error: "col" });
    if (req.method === "GET") return send(res, 200, Object.entries(db[col]).map(([k, v]) => ({ id: k, data: v })));
    if (req.method === "POST" && !id) { const nid = crypto.randomBytes(8).toString("hex"); db[col][nid] = await readBody(req); save(); return send(res, 200, { id: nid }); }
    if (req.method === "PATCH" && id && db[col][id]) { Object.assign(db[col][id], await readBody(req)); save(); return send(res, 200, { ok: true }); }
    if (req.method === "DELETE" && id) { delete db[col][id]; save(); return send(res, 200, { ok: true }); }
    return send(res, 400, { error: "bad" });
  }
  let p = decodeURIComponent(url.pathname);
  if (p === "/" || p === "/sala" || p === "/sala/") p = "/index.html";
  const file = path.join(PUB, path.normalize(p));
  if (!file.startsWith(PUB)) return send(res, 403, "no", "text/plain");
  fs.readFile(file, (e, d) => e ? send(res, 404, "No trobat", "text/plain") : send(res, 200, d, TYPES[path.extname(file)] || "application/octet-stream"));
}).listen(PORT, () => console.log("Carta Kaliu a :" + PORT));
