"""Generate clean water droplet favicon.svg and favicon.ico to replace Lovable logo."""

import os
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(ROOT, "pixel-perfect-match", "public")

out_ico = os.path.join(PUBLIC_DIR, "favicon.ico")
out_svg = os.path.join(PUBLIC_DIR, "favicon.svg")

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="waveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="32" cy="32" r="30" fill="#0b1728" stroke="#38bdf8" stroke-width="2" />
  <!-- Water Droplet -->
  <path d="M32 10 C32 10, 48 30, 48 40 C48 48.8 40.8 56 32 56 C23.2 56, 16 48.8, 16 40 C16 30, 32 10, 32 10 Z" fill="url(#waterGrad)" />
  <!-- Inner Highlight Wave -->
  <path d="M24 38 C28 42, 36 34, 40 38 C40 44, 36 48, 32 48 C28 48, 24 44, 24 38 Z" fill="url(#waveGrad)" />
  <circle cx="27" cy="28" r="3" fill="#ffffff" opacity="0.8" />
</svg>
"""

with open(out_svg, "w", encoding="utf-8") as f:
    f.write(svg_content)

sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
images = []

for w, h in sizes:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = max(1, w // 16)
    draw.ellipse([margin, margin, w - margin, h - margin], fill=(11, 23, 40, 255), outline=(56, 189, 248, 255), width=max(1, w // 24))
    
    cx, cy = w // 2, int(h * 0.62)
    rx, ry = int(w * 0.28), int(h * 0.28)
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(2, 132, 199, 255))
    tip_y = int(h * 0.18)
    draw.polygon([(cx, tip_y), (cx - rx, cy), (cx + rx, cy)], fill=(56, 189, 248, 255))
    
    shine_r = max(1, w // 10)
    draw.ellipse([cx - rx // 2, cy - ry // 2, cx - rx // 2 + shine_r, cy - ry // 2 + shine_r], fill=(255, 255, 255, 220))
    images.append(img)

images[0].save(out_ico, format="ICO", sizes=[(img.width, img.height) for img in images], append_images=images[1:])
print("Successfully generated AquaSense water favicon.ico and favicon.svg!")
