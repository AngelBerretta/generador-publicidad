#!/bin/bash
# =====================================================
#  reel.sh — Convierte las láminas del reel en un video
#  Uso:  bash reel.sh            (3 segundos por escena)
#        bash reel.sh 2          (2 segundos por escena)
# =====================================================

# ---------- CONFIGURACIÓN (editá acá) ----------
SEG="${1:-3}"                    # segundos por escena
FPS=30
ZOOM_MAX="1.10"                  # zoom final (1.10 = 10 % más cerca)
MUSICA="musica.mp3"              # opcional
INICIO_MUSICA=0                  # segundo del tema desde donde arranca
FADE=2                           # segundos de fade-out de la música
ENTRADA="salida/reel-story"
DESTINO="salida/video"
SALIDA="$DESTINO/reel.mp4"
# -----------------------------------------------

fallar() { echo "✖ $1"; exit 1; }

# 1) Chequeos previos
command -v ffmpeg  >/dev/null 2>&1 || fallar "FFmpeg no está instalado o no está en el PATH."
command -v ffprobe >/dev/null 2>&1 || fallar "ffprobe no se encontró (viene con FFmpeg)."

shopt -s nullglob
FRAMES=("$ENTRADA"/lamina-*.png)
[ ${#FRAMES[@]} -gt 0 ] || fallar "No hay láminas en $ENTRADA. Corré antes: node generar.mjs reel story"

D=$((SEG * FPS))                                                   # frames por escena
INC=$(awk -v z="$ZOOM_MAX" -v d="$D" 'BEGIN{printf "%.5f",(z-1)/d}')  # zoom por frame
TOTAL=$((${#FRAMES[@]} * SEG))                                     # duración total

echo "→ ${#FRAMES[@]} escenas × ${SEG}s = ${TOTAL}s"

# 2) Limpieza de restos anteriores
rm -rf clips lista.txt
rm -f "$SALIDA"
mkdir -p clips "$DESTINO"

# 3) Un clip con zoom por cada lámina
for f in "${FRAMES[@]}"; do
  n=$(basename "$f" .png)
  echo "  · procesando $n"
  ffmpeg -hide_banner -loglevel error -y -i "$f" \
    -vf "scale=2160:3840,zoompan=z='min(zoom+$INC,$ZOOM_MAX)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$D:s=1080x1920:fps=$FPS,format=yuv420p" \
    -frames:v "$D" -c:v libx264 "clips/$n.mp4" || fallar "Falló el clip de $n."
  echo "file 'clips/$n.mp4'" >> lista.txt
done

# 4) ¿Hay música válida?
USAR_MUSICA=0
if [ -f "$MUSICA" ]; then
  DUR_M=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MUSICA" 2>/dev/null | head -n1)
  if [ -n "$DUR_M" ] && awk -v d="$DUR_M" 'BEGIN{exit !(d>0)}'; then
    USAR_MUSICA=1
    if awk -v d="$DUR_M" -v s="$INICIO_MUSICA" -v t="$TOTAL" 'BEGIN{exit !((d-s)<t)}'; then
      echo "⚠ La música dura menos que el video: el final quedará en silencio."
    fi
  else
    echo "⚠ $MUSICA no es un audio válido. Se genera el video SIN música."
  fi
else
  echo "ℹ No hay $MUSICA. Se genera sin música (podés agregarla en Instagram)."
fi

# 5) Unir todo
if [ "$USAR_MUSICA" -eq 1 ]; then
  FADE_INICIO=$(awk -v t="$TOTAL" -v f="$FADE" 'BEGIN{printf "%.2f", t-f}')
  ffmpeg -hide_banner -loglevel error -y \
    -f concat -safe 0 -i lista.txt \
    -ss "$INICIO_MUSICA" -i "$MUSICA" \
    -map 0:v -map 1:a -t "$TOTAL" \
    -af "afade=t=out:st=$FADE_INICIO:d=$FADE" \
    -c:v copy -c:a aac -b:a 192k "$SALIDA"
else
  ffmpeg -hide_banner -loglevel error -y \
    -f concat -safe 0 -i lista.txt -c:v copy "$SALIDA"
fi

# 6) Verificar y limpiar
if [ -s "$SALIDA" ]; then
  rm -rf clips lista.txt
  TAM=$(du -h "$SALIDA" | cut -f1)
  echo "✔ Listo: $SALIDA ($TAM, ${TOTAL}s)"
else
  fallar "No se pudo crear el video. Revisá los mensajes de arriba."
fi