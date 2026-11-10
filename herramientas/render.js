// Render fotográfico sin pantalla, con el mismo punto de vista, luz y materiales que una petición de la pestaña Render
// (para que Claude conteste en el Chat con un render nuevo tras cambiar datos/<proyecto>/render/ajustes.json).
// Uso (desde la raíz de este repositorio):
//   npm i --no-save playwright-core@1.47.2   (una vez)
//   node herramientas/render.js --captura <id de la captura> --salida /tmp/r.jpg [--muestras 400] [--ancho 2400] [--publicado] [--pases]
//   node herramientas/render.js --estado '<json de capturas.camara.render>' --salida /tmp/r.jpg
// --publicado: con los materiales de ajustes.json tal cual (sin los cambios locales que traía la petición; úsalo cuando ya
// los hayas pasado a ajustes.json). Sirve este repositorio en local: no hace falta haber publicado.
// En el Mac usa la GPU (Chrome o Chromium con Metal). Escribe el JPEG y, en la última línea, {"ancho":…,"alto":…,"archivo":…}.
const http = require("http"), fs = require("fs"), path = require("path");
const A = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ""), v = process.argv[i + 1]; if (v === undefined || v.startsWith("--")) A[k] = true; else { A[k] = v; i++; } }
const RAIZ = path.resolve(A.raiz || path.join(__dirname, ".."));
const SUPA = "https://ehzfnxqmvaejuxzqkofd.supabase.co/rest/v1", CLAVE = "sb_publishable_TVb184-vZ9594nBMSyynyw_GG5j_1zt";
const TIPOS = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".css": "text/css"};
function navegador() {
  const L = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome"];
  for (const p of L) if (p && fs.existsSync(p)) return p;
  if (fs.existsSync("/opt/pw-browsers")) for (const d of fs.readdirSync("/opt/pw-browsers").sort().reverse())
    for (const f of ["chrome-linux/chrome", "chrome-linux64/chrome"]) { const r = path.join("/opt/pw-browsers", d, f); if (fs.existsSync(r)) return r; }
  return undefined;     // el Chromium de playwright, si está instalado
}
(async () => {
  let E = A.estado ? JSON.parse(A.estado) : null;
  if (A.captura) {
    const r = await fetch(SUPA + "/capturas?select=camara&id=eq." + A.captura, {headers: {apikey: CLAVE}});
    const f = (await r.json())[0];
    if (!f || !f.camara || !f.camara.render) throw new Error("Esa captura no es una petición de la pestaña Render (no trae camara.render)");
    E = f.camara.render;
  }
  if (!E) throw new Error("Falta --captura o --estado");
  const proyecto = E.proyecto || A.proyecto || "lodosa";
  const srv = http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split("?")[0]); if (u.endsWith("/")) u += "index.html";
    const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { s.writeHead(404); s.end(); return; }
    s.writeHead(200, {"Content-Type": TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream"}); fs.createReadStream(f).pipe(s);
  });
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const {chromium} = require("playwright-core");
  const mac = process.platform === "darwin";
  const b = await chromium.launch({executablePath: navegador(), args: mac ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]});
  const p = await b.newPage({viewport: {width: 1200, height: 800}});
  p.on("pageerror", e => console.error("página:", e.message));
  const enc = Buffer.from(JSON.stringify(E)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
  const ancho = +A.ancho || 2400, muestras = +A.muestras || 400;
  await p.goto("http://127.0.0.1:" + srv.address().port + "/render.html?p=" + encodeURIComponent(proyecto) + "&auto=1&muestras=" + muestras + "&ancho=" + ancho + "&e=" + enc + (A.publicado ? "&publicado=1" : ""));
  await p.waitForFunction(() => document.body.dataset.listo === "1", null, {timeout: +(A.espera || 900) * 1000, polling: 1000});
  const d = await p.evaluate(() => window.__resultado);
  const salida = A.salida || "/tmp/render.jpg";
  fs.writeFileSync(salida, Buffer.from(d.split(",")[1], "base64"));
  // --pases: además mapa de materiales, profundidad y normales junto a la salida (<salida>_mapa.png…), para el paso de IA
  if (A.pases) { const t = await p.evaluate(() => window.__tam), P = await p.evaluate(([w, h]) => window.__render.pases(w, h), [t.w, t.h]);
    for (const [k, v] of Object.entries(P)) fs.writeFileSync(salida.replace(/\.[a-z]+$/i, "") + "_" + k + ".png", Buffer.from(v.split(",")[1], "base64")); }
  const tam = await p.evaluate(() => window.__tam);
  await b.close(); srv.close();
  console.log(JSON.stringify({ancho: tam.w, alto: tam.h, archivo: salida}));
})().catch(e => { console.error(e.message || e); process.exit(1); });
