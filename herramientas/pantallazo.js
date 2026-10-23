// Pantallazo del visor desde el mismo punto de vista que una captura (para que Claude conteste con la corrección a la vista).
// Uso (desde la raíz de este repositorio, ya publicado):
//   npm i --no-save playwright-core@1.47.2   (una vez)
//   node herramientas/pantallazo.js --captura <id de la captura> --salida /tmp/p.jpg
//   node herramientas/pantallazo.js --camara '<json>' --ancho 2100 --salida /tmp/p.jpg
// Escribe la imagen JPEG y, en la última línea, {"ancho":…,"alto":…}.
const http = require("http"), fs = require("fs"), path = require("path"), {execSync} = require("child_process");
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const RAIZ = path.resolve(A.raiz || path.join(__dirname, ".."));
const SUPA = "https://ehzfnxqmvaejuxzqkofd.supabase.co/rest/v1", CLAVE = "sb_publishable_TVb184-vZ9594nBMSyynyw_GG5j_1zt";
const TIPOS = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/json", ".mjs": "text/javascript", ".css": "text/css"};
function navegador() {
  for (const p of ["/opt/pw-browsers"]) {
    if (!fs.existsSync(p)) continue;
    for (const d of fs.readdirSync(p).sort().reverse()) {
      for (const f of ["chrome-linux/headless_shell", "chrome-linux/chrome", "chrome-linux64/chrome"]) { const r = path.join(p, d, f); if (fs.existsSync(r)) return r; }
    }
  }
  return undefined;
}
(async () => {
  let cam = A.camara ? JSON.parse(A.camara) : null, ancho = +A.ancho || 0;
  if (A.captura) {
    const r = await fetch(SUPA + "/capturas?select=camara,ancho,alto&id=eq." + A.captura, {headers: {apikey: CLAVE}});
    const f = (await r.json())[0]; if (!f || !f.camara) throw new Error("Esa captura no tiene el punto de vista guardado (es del 2D, importada o anterior al 23-oct)");
    cam = f.camara; ancho = ancho || f.ancho;
  }
  if (!cam) throw new Error("Falta --captura o --camara");
  const srv = http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split("?")[0]); if (u.endsWith("/")) u += "index.html";
    const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; }
    s.writeHead(200, {"Content-Type": TIPOS[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(s);
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const {chromium} = require("playwright-core");
  const b = await chromium.launch({executablePath: navegador()});
  const w = cam.w || 1200, h = cam.h || 800, k = ancho ? Math.min(3, Math.max(1, ancho / w)) : 2;
  const p = await b.newPage({viewport: {width: w, height: h}, deviceScaleFactor: k});
  const enc = Buffer.from(JSON.stringify(cam)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
  await p.goto("http://127.0.0.1:" + srv.address().port + "/?camara=" + enc + "#3d");
  await p.waitForFunction(() => document.body.dataset.listo === "1", null, {timeout: 90000});
  await p.waitForTimeout(2500);
  const salida = A.salida || "/tmp/pantallazo.jpg";
  await p.screenshot({path: salida, type: "jpeg", quality: 88});
  await b.close(); srv.close();
  console.log(JSON.stringify({ancho: Math.round(w * k), alto: Math.round(h * k), archivo: salida}));
})().catch(e => { console.error(e.message || e); process.exit(1); });
