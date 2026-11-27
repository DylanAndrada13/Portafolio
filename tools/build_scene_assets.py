"""
Genera los recursos derivados de la escena a partir de images/fondoanimado3.gif.
La imagen original NO se modifica: solo se leen sus frames.

Salida (public/assets/scene/):
  frame{0,1,2}.webp      frames originales (1920x1080) — conservan el "line boil" del GIF
  frame{0,1,2}-sm.webp   frames reducidos (1280x720) para móviles
  depth.png              mapa de profundidad aproximado (0 lejos -> 1 cerca) para el parallax
  mask.png               R = pantallas, G = ventana, B = brillo rojo del PC
  glow.png               máscaras difuminadas (bloom precalculado, más barato que un pase de post)
  regions.png            R = cuadro de la pared, G = lámpara (para resaltar al pasar el puntero)

Uso:  python tools/build_scene_assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "fondoanimado3.gif"
OUT = ROOT / "public" / "assets" / "scene"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080

# ---------- frames ----------
gif = Image.open(SRC)
frames = []
for i in range(gif.n_frames):
    gif.seek(i)
    f = gif.convert("RGB")
    frames.append(f)
    f.save(OUT / f"frame{i}.webp", quality=90, method=6)
    f.resize((1280, 720), Image.LANCZOS).save(OUT / f"frame{i}-sm.webp", quality=85, method=6)

base = np.asarray(frames[0]).astype(np.float32) / 255.0

# ---------- depth ----------
# Caja de la habitación: la pared del fondo es el plano más lejano; cada plano lateral
# (paredes, techo, piso) se acerca a medida que se aleja de ese rectángulo.
BX0, BY0, BX1, BY1 = 410, 255, 1520, 835
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
t = np.maximum.reduce([
    (BX0 - xs) / BX0,
    (xs - BX1) / (W - BX1),
    (BY0 - ys) / BY0,
    (ys - BY1) / (H - BY1),
    np.zeros_like(xs),
])
depth = 0.15 + 0.8 * np.clip(t, 0, 1)
depth_img = Image.fromarray((depth * 255).astype(np.uint8), "L")
d = ImageDraw.Draw(depth_img)

def poly(points, value):
    d.polygon(points, fill=int(value * 255))

poly([(700, 365), (1235, 365), (1235, 672), (700, 672)], 0.10)            # ventana (exterior)
poly([(940, 0), (990, 0), (990, 300), (940, 300)], 0.42)                  # barra de la lámpara
poly([(865, 295), (1065, 295), (1070, 412), (860, 412)], 0.46)            # pantalla de la lámpara
poly([(215, 285), (480, 345), (455, 725), (215, 725)], 0.52)              # monitores
poly([(0, 700), (745, 685), (745, 790), (330, 800), (0, 830)], 0.62)      # escritorio
poly([(620, 745), (712, 745), (712, 900), (620, 900)], 0.56)              # gabinete PC
poly([(430, 570), (670, 560), (690, 1010), (425, 1010)], 0.64)            # silla + persona
# cama: rampa de profundidad hacia el frente
bed = np.zeros((H, W), np.float32)
bed_mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(bed_mask).polygon([(1160, 640), (1920, 600), (1920, 1080), (1160, 1080)], fill=255)
ramp = 0.55 + 0.4 * np.clip((ys - 640) / 440, 0, 1)
dep = np.asarray(depth_img).astype(np.float32) / 255
bm = np.asarray(bed_mask) > 0
dep[bm] = np.maximum(dep[bm], ramp[bm])
depth_img = Image.fromarray((dep * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(14))
depth_img.resize((960, 540), Image.LANCZOS).save(OUT / "depth.png")

# ---------- masks ----------
lum = base @ np.array([0.2126, 0.7152, 0.0722], np.float32)
screens = np.clip((lum - 0.62) / 0.2, 0, 1)
red = np.clip(((base[..., 0] - np.maximum(base[..., 1], base[..., 2])) - 0.12) / 0.2, 0, 1)
win = Image.new("L", (W, H), 0)
ImageDraw.Draw(win).polygon([(706, 372), (1232, 372), (1232, 668), (706, 668)], fill=255)
win = np.asarray(win).astype(np.float32) / 255

def to8(a):
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)

mask = Image.merge("RGB", [Image.fromarray(to8(screens)), Image.fromarray(to8(win)), Image.fromarray(to8(red))])
mask.save(OUT / "mask.png")

def glow(a, radius, gain):
    im = Image.fromarray(to8(a)).resize((960, 540), Image.LANCZOS)
    g = np.asarray(im.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255
    g2 = np.asarray(im.filter(ImageFilter.GaussianBlur(radius * 3))).astype(np.float32) / 255
    out = g * 0.6 + g2 * 0.4
    return to8(out / max(out.max(), 1e-5) * gain)

Image.merge("RGB", [
    Image.fromarray(glow(screens, 18, 1.0)),
    Image.fromarray(glow(win, 30, 1.0)),
    Image.fromarray(glow(red, 14, 1.0)),
]).save(OUT / "glow.png")

# ---------- regiones interactivas (las mismas formas que src/scene/regions.js) ----------
reg_r = Image.new("L", (W, H), 0)
ImageDraw.Draw(reg_r).polygon([(1600, 395), (1838, 343), (1838, 652), (1600, 622)], fill=255)
reg_g = Image.new("L", (W, H), 0)
dg = ImageDraw.Draw(reg_g)
dg.polygon([(865, 295), (1065, 295), (1072, 412), (858, 412)], fill=255)
dg.rectangle([(948, 150), (982, 300)], fill=255)
Image.merge("RGB", [reg_r.filter(ImageFilter.GaussianBlur(2)), reg_g.filter(ImageFilter.GaussianBlur(2)), Image.new("L", (W, H), 0)])     .resize((960, 540), Image.LANCZOS).save(OUT / "regions.png")

print("OK ->", OUT)
for p in sorted(OUT.iterdir()):
    print(f"  {p.name:18s} {p.stat().st_size/1024:8.1f} KB")
