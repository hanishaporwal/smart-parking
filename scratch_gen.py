\"
import os
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np

orig_src = Image.open('/Users/pavan/.gemini/antigravity-ide/brain/3b39aff3-d600-426b-a01a-078e26220451/.user_uploaded/media_1792175990356.jpg').convert('RGB')
src_w, src_h = orig_src.size

scale = 2
# NEW TIGHT FIT DIMENSIONS: 1084 x 590 (2x = 2168 x 1180)
# ZERO dead space on any of the 4 sides!
canvas_w = 1084 * scale  # 2168
canvas_h = 590 * scale   # 1180

# Clean asphalt sample for isotropic tiling
clean_asphalt = orig_src.crop((280, 190, 485, 510))
clean_asphalt = ImageEnhance.Brightness(clean_asphalt).enhance(0.68)
clean_asphalt = ImageEnhance.Contrast(clean_asphalt).enhance(1.22)
pw, ph = clean_asphalt.size

# Tile across canvas
canvas = Image.new('RGB', (canvas_w, canvas_h))
for ty in range(0, canvas_h, ph):
    for tx in range(0, canvas_w, pw):
        p = clean_asphalt.copy()
        if (tx // pw) % 2 == 1:
            p = p.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if (ty // ph) % 2 == 1:
            p = p.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        canvas.paste(p, (tx, ty))

# Layout parameters at 1x
startX = 324
slotWidth = 190
upperRowY = 0
lane0LedY = 232  # Strip 1
aisleHeight = 126
lane1LedY = 358  # Strip 2 (232 + 126)
lowerRowBackY = 590  # Bottom (358 + 232)

line_w = 7 * scale  # 14px

# Add authentic bay details (oil drops, water sheen) inside each of the 8 bays
patch_bay1 = orig_src.crop((70, 220, 230, 480))
patch_bay1 = ImageEnhance.Brightness(patch_bay1).enhance(0.65)
patch_bay2 = orig_src.crop((550, 220, 710, 480))
patch_bay2 = ImageEnhance.Brightness(patch_bay2).enhance(0.65)

slot_w_px = slotWidth * scale
slot_h_px = 232 * scale

for i in range(4):
    x_slot = int((startX + i * slotWidth) * scale)
    p_src = patch_bay1 if i % 2 == 0 else patch_bay2
    
    # Upper slot
    p_up = p_src.resize((slot_w_px, slot_h_px), Image.Resampling.LANCZOS)
    canvas.paste(p_up, (x_slot, 0))
    
    # Lower slot
    p
<truncated 5362 bytes