import { chromium } from 'playwright';
import fs from 'fs';

// Uso: node generar.mjs <serie> <formato: feed|cuadrado|story> [modo: carrusel|post]
//   carrusel (defecto): usa "slides" del JSON → salida/<serie>-<formato>/lamina-XX.png
//   post:               usa "posts"  del JSON → salida/<serie>-<formato>/posts/post-XX.png
const [serie, formato = 'feed', modo = 'carrusel'] = process.argv.slice(2);

const MAX_CARRUSEL = 4; // máximo de láminas por carrusel (se puede subir por serie con meta.maxLaminas)

const fallar = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

// "top" y "bottom" son márgenes de seguridad (en story, la interfaz de Instagram tapa arriba y abajo)
const FORMATOS = {
  feed:     { w: 1080, h: 1350, top: 90,  bottom: 50  },
  cuadrado: { w: 1080, h: 1080, top: 70,  bottom: 40  },
  story:    { w: 1080, h: 1920, top: 250, bottom: 340 },
};
const F = FORMATOS[formato];
if (!serie) fallar('Uso: node generar.mjs <serie> <feed|cuadrado|story> [carrusel|post]');
if (!F) fallar('Formato inválido: usá feed, cuadrado o story');
if (!['carrusel', 'post'].includes(modo)) fallar('Modo inválido: usá carrusel o post');

const archivoJson = `series/${serie}.json`;
if (!fs.existsSync(archivoJson)) fallar(`No existe ${archivoJson}`);

const data = JSON.parse(fs.readFileSync(archivoJson, 'utf8'));
const meta = data.meta ?? {};
const esPost = modo === 'post';
const slides = esPost ? data.posts : data.slides;

if (!Array.isArray(slides) || slides.length === 0) {
  fallar(`${archivoJson} no tiene "${esPost ? 'posts' : 'slides'}" cargados.`);
}

const limite = meta.maxLaminas ?? MAX_CARRUSEL;
if (!esPost && slides.length > limite) {
  fallar(`${serie}: el carrusel tiene ${slides.length} láminas y el máximo es ${limite}. Sacá ${slides.length - limite} de series/${serie}.json.`);
}

const dirImg = `imagenes/${serie}`;
const dirOut = esPost ? `salida/${serie}-${formato}/posts` : `salida/${serie}-${formato}`;
const prefijo = esPost ? 'post' : 'lamina';
fs.mkdirSync(dirOut, { recursive: true });

// Resolver rutas y validar que existan todas las imágenes antes de abrir el navegador
const items = slides.map((s, i) => ({
  s,
  rutaImg: s.imagen.includes('/') ? `imagenes/${s.imagen}` : `${dirImg}/${s.imagen}`,
  nombre: s.id ?? `${prefijo}-${String(i + 1).padStart(2, '0')}`,
}));
const faltan = items.filter((x) => !fs.existsSync(x.rutaImg));
if (faltan.length) fallar(`Faltan imágenes:\n  ${faltan.map((x) => x.rutaImg).join('\n  ')}`);

const b64 = (f) => fs.readFileSync(f).toString('base64');
const esc = (t = '') => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const logo = b64('logo.png');
const fuente = fs.existsSync('fuentes/Inter.ttf')
  ? `@font-face { font-family:'Inter'; src:url(data:font/ttf;base64,${b64('fuentes/Inter.ttf')}); font-weight:100 900; }`
  : '';

// Numeración y barra de progreso solo tienen sentido en carruseles
const conNumeracion = !esPost && meta.numeracion;
const conProgreso = !esPost && meta.progreso;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: F.w, height: F.h } });

const ctaHtml = (cta) => {
  if (!cta) return '';
  const [llamado, destino] = cta.includes('→')
    ? cta.split('→').map((p) => p.trim())
    : ['', cta];
  return `<div class="cta"><b>${esc(destino)}</b>${llamado ? `<span>${esc(llamado)}</span>` : ''}</div>`;
};

for (const [i, { s, rutaImg, nombre }] of items.entries()) {
  const t = esc(s.titulo);
  if (s.destacado && !t.includes(esc(s.destacado))) {
    console.warn(`⚠ ${nombre}: "destacado" no coincide con el título, no se va a resaltar.`);
  }
  const titulo = s.destacado ? t.replace(esc(s.destacado), `<span class="hl">${esc(s.destacado)}</span>`) : t;
  const tamTitulo = s.tamTitulo ?? meta.tamTitulo ?? 76;

  const puntos = conProgreso
    ? `<div class="prog">${slides.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`
    : '';

  const html = `<html><head><style>
    ${fuente}
    * { margin:0; box-sizing:border-box; }
    body { width:${F.w}px; height:${F.h}px; position:relative; overflow:hidden;
           background:#0A0E17; font-family:'Inter',Arial,sans-serif; }
    .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .fade { position:absolute; top:0; left:0; right:0; height:${F.top + 520}px;
            background:linear-gradient(#0A0E17 25%, transparent); }
    .fadeb { position:absolute; bottom:0; left:0; right:0; height:${F.bottom + 260}px;
             background:linear-gradient(transparent, #0A0E17 85%); }
    .txt { position:absolute; top:${F.top}px; left:70px; right:70px; }
    .eti { color:#06B6D4; font-size:34px; font-weight:700; letter-spacing:4px; margin-bottom:18px; }
    h1 { color:#F1F5F9; font-size:${tamTitulo}px; line-height:1.1; font-weight:800; }
    .hl { color:#06B6D4; }
    p { color:#CBD5E1; font-size:36px; font-weight:500; margin-top:28px; line-height:1.35;
        text-shadow:0 2px 14px rgba(10,14,23,.85); }
    .num { position:absolute; top:${Math.max(F.top - 50, 40)}px; right:60px; color:#64748B; font-size:28px; }
    .prog { position:absolute; top:${Math.max(F.top - 55, 30)}px; left:70px; display:flex; gap:10px; }
    .prog i { width:44px; height:8px; border-radius:4px; background:#64748B; }
    .prog i.on { background:#3B82F6; }
    .logo { position:absolute; bottom:${F.bottom}px; right:60px; height:70px; }
    .cta {
        position:absolute; bottom:${F.bottom}px; left:70px;
        padding:22px 40px; border-radius:22px; text-align:left; color:#fff;
        background:linear-gradient(135deg,#3B82F6,#06B6D4);
        border:1px solid rgba(255,255,255,.25);
        box-shadow:0 12px 36px rgba(59,130,246,.35);
    }
    .cta b { display:block; font-size:38px; font-weight:800; line-height:1.15; color:#000; }
    .cta span { display:block; font-size:28px; font-weight:500; opacity:.92; margin-top:4px; }
  </style></head><body>
    <img class="bg" src="data:image/png;base64,${b64(rutaImg)}">
    <div class="fade"></div><div class="fadeb"></div>
    ${conNumeracion ? `<div class="num">${i + 1}/${slides.length}</div>` : ''}
    ${puntos}
    <div class="txt">
      ${s.etiqueta ? `<div class="eti">${esc(s.etiqueta)}</div>` : ''}
      <h1>${titulo}</h1>
      ${s.subtexto ? `<p>${esc(s.subtexto)}</p>` : ''}
    </div>
    ${ctaHtml(s.cta)}
    <img class="logo" src="data:image/png;base64,${logo}">
  </body></html>`;

  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dirOut}/${nombre}.png` });
  console.log(`✔ ${dirOut}/${nombre}.png`);
}
await browser.close();