import { chromium } from 'playwright';
import fs from 'fs';

// Uso: node generar.mjs <serie: a|b|reel> <formato: feed|cuadrado|story>
const [serie = 'a', formato = 'feed'] = process.argv.slice(2);

// "top" y "bottom" son márgenes de seguridad (en story, la interfaz de Instagram tapa arriba y abajo)
const FORMATOS = {
  feed:     { w: 1080, h: 1350, top: 90,  bottom: 50  },
  cuadrado: { w: 1080, h: 1080, top: 70,  bottom: 40  },
  story:    { w: 1080, h: 1920, top: 250, bottom: 340 },
};
const F = FORMATOS[formato];
if (!F) throw new Error('Formato inválido: usá feed, cuadrado o story');

const { meta, slides } = JSON.parse(fs.readFileSync(`series/${serie}.json`, 'utf8'));
const dirImg = `imagenes/${serie}`;
const dirOut = `salida/${serie}-${formato}`;
fs.mkdirSync(dirOut, { recursive: true });

const b64 = (f) => fs.readFileSync(f).toString('base64');
const esc = (t = '') => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const logo = b64('logo.png');
const fuente = fs.existsSync('fuentes/Inter.ttf')
  ? `@font-face { font-family:'Inter'; src:url(data:font/ttf;base64,${b64('fuentes/Inter.ttf')}); font-weight:100 900; }`
  : '';
const tamTitulo = meta.tamTitulo ?? 76;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: F.w, height: F.h } });

for (const [i, s] of slides.entries()) {
  const t = esc(s.titulo);
  const titulo = s.destacado ? t.replace(esc(s.destacado), `<span class="hl">${esc(s.destacado)}</span>`) : t;

  const puntos = meta.progreso
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
    p { color:#94A3B8; font-size:36px; margin-top:28px; line-height:1.35; }
    .num { position:absolute; top:${Math.max(F.top - 50, 40)}px; right:60px; color:#64748B; font-size:28px; }
    .prog { position:absolute; top:${Math.max(F.top - 55, 30)}px; left:70px; display:flex; gap:10px; }
    .prog i { width:44px; height:8px; border-radius:4px; background:#64748B; }
    .prog i.on { background:#3B82F6; }
    .logo { position:absolute; bottom:${F.bottom}px; right:60px; height:70px; }
    .cta { position:absolute; bottom:${F.bottom}px; left:70px; background:#3B82F6; color:#fff;
           font-size:36px; font-weight:800; padding:22px 40px; border-radius:20px; }
  </style></head><body>
    <img class="bg" src="data:image/png;base64,${b64(`${dirImg}/${s.imagen}`)}">
    <div class="fade"></div><div class="fadeb"></div>
    ${meta.numeracion ? `<div class="num">${i + 1}/${slides.length}</div>` : ''}
    ${puntos}
    <div class="txt">
      ${s.etiqueta ? `<div class="eti">${esc(s.etiqueta)}</div>` : ''}
      <h1>${titulo}</h1>
      ${s.subtexto ? `<p>${esc(s.subtexto)}</p>` : ''}
    </div>
    ${s.cta ? `<div class="cta">${esc(s.cta)}</div>` : ''}
    <img class="logo" src="data:image/png;base64,${logo}">
  </body></html>`;

  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${dirOut}/lamina-${String(i + 1).padStart(2, '0')}.png` });
  console.log(`✔ ${dirOut}/lamina-${String(i + 1).padStart(2, '0')}.png`);
}
await browser.close();