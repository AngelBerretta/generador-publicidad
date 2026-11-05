# Generador de publicidad · LinkInCode

Generador de piezas publicitarias para Instagram. Las **imágenes** las crea cada persona con IA y el **código** se encarga del resto:

- Pone título, subtexto, logo, numeración y botón sobre cada imagen.
- Exporta las láminas en el tamaño correcto de cada formato.
- Une las escenas del reel en un video MP4.

La publicación en Instagram se hace **a mano**, desde el celular.

## 🔄 Cómo funciona (en 1 minuto)

```
Imágenes de IA  +  Textos (JSON)  +  Logo
        │                │             │
        └────────────────┴─────────────┘
                         ▼
                  generar.mjs
                         ▼
        Láminas finales (PNG) con texto y logo
                         ▼
        ┌────────────────┴───────────────┐
   Carrusel (se sube tal cual)      reel.sh → reel.mp4
```

## 📁 Qué hay en cada carpeta

```
generador-publicidad/
├── imagenes/            ← LAS PONE CADA PERSONA (generadas con IA)
│   ├── a/               01.png ... 10.png  (carrusel A, proporción 4:5)
│   ├── b/               01.png ... 08.png  (carrusel B, 4:5)
│   └── reel/            01.png ... 07.png  (reel, 9:16)
├── series/              ← LOS TEXTOS
│   ├── a.json
│   ├── b.json
│   └── reel.json
├── fuentes/Inter.ttf    (opcional, ver más abajo)
├── logo.png             ← logo para fondo oscuro, PNG transparente
├── musica.mp3           (opcional)
├── generar.mjs          ← pone textos y logo sobre las imágenes
├── reel.sh              ← arma el video del reel
├── limpiar.sh           ← borra lo generado
└── salida/              ← RESULTADO (se crea solo, no se edita a mano)
```

**Regla simple:** se edita lo de `imagenes/`, `series/` y `logo.png`. Lo que está en `salida/` se genera y se puede borrar cuando se quiera.

### ⚠️ Las imágenes NO están en el repositorio

Las carpetas de `imagenes/` vienen vacías a propósito: las imágenes de IA pesan mucho y Git las ignora (`.gitignore`). Para trabajar necesitás las imágenes numeradas (`01.png`, `02.png`...).

**Pedirlas a:** ______________________ (completar con el nombre y dónde se comparten)

### Tipografía

Si existe `fuentes/Inter.ttf`, se usa Inter. Si no existe, las láminas usan Arial. **No es un error**, es el comportamiento por defecto. Para usar Inter, descargala (licencia OFL) y copiala en `fuentes/`.

## 🧰 Instalación (una sola vez por persona)

1. **Node.js 20 o superior** (nodejs.org, versión LTS). Verificá con `node -v`.
2. **Git** (git-scm.com). En Windows trae **Git Bash**, que se usa para correr `reel.sh`.
3. **FFmpeg** (solo para el reel):
   - Windows: `winget install Gyan.FFmpeg`
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

   Cerrá y abrí la terminal después de instalarlo y verificá con `ffmpeg -version`.
4. Clonar el repo e instalar dependencias:
```bash
git clone https://github.com/USUARIO/generador-publicidad.git
cd generador-publicidad
npm install
npx playwright install chromium
```

## ▶️ Cómo se usa

| Quiero... | Comando |
|---|---|
| Carrusel A (4:5) | `node generar.mjs a feed` |
| Carrusel B (4:5) | `node generar.mjs b feed` |
| Escenas del reel (9:16) | `node generar.mjs reel story` |
| Armar el video del reel | `bash reel.sh` |
| Reel con escenas de 2 s | `bash reel.sh 2` |
| Versión cuadrada (anuncios) | `node generar.mjs a cuadrado` |
| Versión 9:16 de un carrusel | `node generar.mjs a story` |
| Borrar lo generado | `bash limpiar.sh` |

También hay atajos con npm: `npm run a`, `npm run b`, `npm run reel:frames` y `npm run reel:video`. En Windows, corrélos desde **Git Bash**.

**Ciclo de trabajo típico:**
1. Poner las imágenes numeradas en su carpeta (`01.png`, `02.png`...).
2. Editar los textos en `series/*.json`.
3. Correr el comando y revisar `salida/`.
4. Si hay un error, corregir el JSON y volver a correr. Tarda segundos.
5. Pasar las imágenes al celular y publicar.

El reel se hace en dos pasos: primero `node generar.mjs reel story` (las escenas) y después `bash reel.sh` (el video, que queda en `salida/video/reel.mp4`).

## ✏️ Cómo editar los textos

Cada lámina es un bloque del JSON:

```json
{ "imagen": "03.png",
  "titulo": "Ahora imaginá tu negocio en una sola pantalla",
  "destacado": "una sola pantalla",
  "subtexto": "Ventas, pedidos, stock y consultas.",
  "cta": "Pedí tu demo → @usuario" }
```

| Campo | Qué hace |
|---|---|
| `imagen` | Archivo de fondo (debe existir en `imagenes/...`) |
| `titulo` | Título grande |
| `destacado` | Parte del título que se pinta en cian. **Tiene que estar escrita igual que en el título.** Vacío = sin resaltado. |
| `subtexto` | Texto chico debajo. Puede ir vacío. |
| `etiqueta` | Opcional, tipo "PASO 1" sobre el título |
| `cta` | Opcional, botón azul abajo a la izquierda |

Arriba de cada JSON hay un bloque `meta`: `numeracion` (muestra "3/10"), `progreso` (barra de puntos) y `tamTitulo` (tamaño del título).

**Sobre `@usuario`:** es el marcador de la cuenta de Instagram. Si todavía lo ves en los JSON, hay que reemplazarlo por la cuenta real.

## 🎨 Cómo adaptarlo a gusto

Todo el diseño está en el CSS dentro de `generar.mjs`:

| Quiero cambiar... | Buscar en `generar.mjs` |
|---|---|
| Color del título / subtexto / destacado | `#F1F5F9` / `#94A3B8` / `#06B6D4` |
| Color de fondo | `#0A0E17` |
| Color del botón | `.cta { background:#3B82F6` |
| Tamaño del título | `h1 { font-size:... }` o `tamTitulo` en el JSON |
| Tamaño del logo | `.logo { height:70px }` |
| Altura del degradé oscuro (legibilidad) | `.fade { height:... }` |
| Márgenes de seguridad | objeto `FORMATOS` al principio |
| Tipografía | Poner un `Inter.ttf` en `fuentes/` (o cambiar el `font-family`) |

Para otra marca o cliente: cambiar `logo.png` y los colores en `generar.mjs`.

## 🎬 Ajustes del reel (arriba de `reel.sh`)

`SEG` (segundos por escena), `ZOOM_MAX` (intensidad del zoom), `MUSICA`, `INICIO_MUSICA` y `FADE`.

Límites: el reel tiene zoom suave y cortes secos, sin animación de texto. Si se necesita algo más elaborado, usar CapCut.

## 📐 Tamaño de las imágenes de IA

| Carpeta | Proporción | Ideal | Mínimo |
|---|---|---|---|
| `a/`, `b/` | 4:5 | 2160×2700 | 1080×1350 |
| `reel/` | 9:16 | 2160×3840 | 1080×1920 |

- Si el generador de IA no ofrece 4:5, usar 3:4.
- Dejar el sujeto principal en la mitad central e inferior, porque arriba va el título.
- Pedir las imágenes **sin texto, sin letras y sin logos**: la IA escribe mal, el texto lo pone el código.
- Formato PNG. Si son JPG, cambiar la extensión en el JSON.
- Logo: PNG transparente, unos 210 px de alto.

## 🚦 Reglas de comunicación (según el manual de producto)

**No hacer:**
- No prometer asesoría de negocio, carga de años de datos sin costo, diseño de logo ni construcción del sistema de origen.
- No usar términos técnicos en las piezas (nada de Recharts, JWT, CRUD, etc.).
- No emojis en las láminas (van solo en los captions).

**Cuidar al hablar de planes:**
- Filtros, roles, exportación PDF/Excel y gestión son **Plan Premium**: hablar de "a medida".
- Los costos de terceros (hosting, dominio) los paga el cliente.

## 🎵 Música

Usar solo música con licencia comercial (biblioteca de Instagram, YouTube Audio Library, Pixabay Music) y guardar la licencia. Lo más simple es agregarla dentro de Instagram al publicar.

Si se usa `musica.mp3` en el reel, tiene que ser un MP3 válido. Ese archivo no se sube al repo.

## 🛟 Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `ffmpeg: command not found` | Cerrar y abrir la terminal; verificar con `ffmpeg -version` |
| `bash` no se reconoce (Windows) | Usar **Git Bash**, no PowerShell ni CMD |
| `$'\r': command not found` | `sed -i 's/\r$//' reel.sh` |
| `ENOENT ... 01.png` | Falta esa imagen o la extensión del JSON no coincide (.png vs .jpg) |
| El texto resaltado no se pinta | `destacado` no coincide exactamente con el título |
| Texto difícil de leer | Subir el valor `+ 520` en `.fade` |
| Imagen recortada | Proporción incorrecta (usar 4:5 o 9:16) |
| Música rechazada | Reconvertirla: `ffmpeg -i audio.m4a -vn -c:a libmp3lame -q:a 2 musica.mp3` |
| `No hay láminas en salida/reel-story` | Correr antes `node generar.mjs reel story` |

