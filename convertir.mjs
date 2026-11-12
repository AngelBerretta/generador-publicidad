import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Uso: node convertir.mjs <archivo|carpeta> <serie> [--numerar] [--prefijo=post-] [--tam=ANCHOxALTO]
//   Convierte a PNG, redimensiona (recorte centrado) y guarda en imagenes/<serie>/
//   --numerar        renombra 01.png, 02.png... (orden alfabético)
//   --prefijo=post-  numera con prefijo: post-01.png, post-02.png...
//   --tam=2160x3840  tamaño distinto al de por defecto
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v = true] = a.slice(2).split('=');
    return [k, v];
  })
);
const [origen, serie] = pos;

const fallar = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };
if (!origen || !serie) {
  fallar('Uso: node convertir.mjs <archivo|carpeta> <serie> [--numerar] [--prefijo=post-] [--tam=ANCHOxALTO]');
}
if (!fs.existsSync(origen)) fallar(`No existe: ${origen}`);

// Tamaño: 2160x2700 (4:5) por defecto; el reel necesita 9:16
const TAM_DEFECTO = [2160, 2700];
const TAM_POR_SERIE = { reel: [2160, 3840] };
const [W, H] = flags.tam
  ? String(flags.tam).split('x').map(Number)
  : (TAM_POR_SERIE[serie] ?? TAM_DEFECTO);
if (![W, H].every((n) => Number.isInteger(n) && n > 0)) fallar('--tam debe ser ANCHOxALTO, por ejemplo 2160x2700');

const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff', '.svg']);
const archivos = fs.statSync(origen).isDirectory()
  ? fs.readdirSync(origen)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => path.join(origen, f))
  : [origen];
const validos = archivos.filter((f) => fs.statSync(f).isFile() && EXT.has(path.extname(f).toLowerCase()));
if (!validos.length) fallar(`No encontré imágenes compatibles (${[...EXT].join(' ')}). Los HEIC de iPhone hay que exportarlos a JPG antes.`);

const destDir = `imagenes/${serie}`;
fs.mkdirSync(destDir, { recursive: true });

const numerar = Boolean(flags.numerar) || typeof flags.prefijo === 'string';
const prefijo = typeof flags.prefijo === 'string' ? flags.prefijo : '';

let ok = 0;
for (const [i, f] of validos.entries()) {
  const nombre = numerar ? `${prefijo}${String(i + 1).padStart(2, '0')}` : path.parse(f).name;
  const destino = `${destDir}/${nombre}.png`;
  try {
    const buf = fs.readFileSync(f); // en memoria: permite convertir un PNG sobre sí mismo
    const m = await sharp(buf).metadata();
    const [ow, oh] = (m.orientation ?? 1) >= 5 ? [m.height, m.width] : [m.width, m.height];

    await sharp(buf, { density: 300 })
      .rotate() // respeta la orientación EXIF (fotos de celular)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .flatten({ background: '#0A0E17' }) // transparencias → color de fondo de las piezas
      .png({ compressionLevel: 9 })
      .toFile(destino);

    const avisos = [];
    if (ow < W || oh < H) avisos.push('origen más chico, se amplió');
    if (Math.abs(ow / oh - W / H) > 0.02) avisos.push('proporción distinta, se recortó');
    console.log(`✔ ${destino}  (${ow}x${oh} → ${W}x${H})${avisos.length ? ' ⚠ ' + avisos.join(', ') : ''}`);
    ok++;
  } catch (e) {
    console.error(`✖ ${f}: ${e.message}`);
  }
}
console.log(`\n${ok}/${validos.length} imágenes convertidas en ${destDir}/`);