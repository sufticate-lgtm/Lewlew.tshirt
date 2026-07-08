#!/usr/bin/env python3
"""
extract_psd.py - Tach cac layer tu file PSD/TIFF cua Photoshop
Su dung: python3 extract_psd.py <psd_path> <output_dir> [max_canvas_px]

Output: JSON to stdout
{
  "ok": true,
  "canvas": {"w": 1400, "h": 2100},
  "layers": [
    {"index": 0, "name": "Layer name", "file": "/path/to/layer_0.png", "inkPx": 123456}
  ]
}
"""
import sys, json, os, traceback
from pathlib import Path

def main():
    psd_path   = sys.argv[1]
    output_dir = sys.argv[2]
    max_canvas = int(sys.argv[3]) if len(sys.argv) > 3 else 2000

    from psd_tools import PSDImage
    import numpy as np
    from PIL import Image

    psd = PSDImage.open(psd_path)
    W, H = psd.width, psd.height

    # Tinh scale: giu anh nho hon max_canvas tren chieu dai nhat
    scale = min(max_canvas / W, max_canvas / H, 1.0)
    new_W = max(1, int(W * scale))
    new_H = max(1, int(H * scale))

    os.makedirs(output_dir, exist_ok=True)

    layers_out = []

    def process_layer(layer, index):
        try:
            img = layer.topil()
            if img is None:
                return None
            img = img.convert('RGBA')

            # Scale layer
            sw = max(1, int(img.width  * scale))
            sh = max(1, int(img.height * scale))
            img_small = img.resize((sw, sh), Image.LANCZOS)

            # Toa do: bbox = (left, top, right, bottom) theo psd-tools
            left, top, right, bottom = layer.bbox
            paste_x = int(left * scale)
            paste_y = int(top  * scale)

            # Dat layer vao canvas full size
            full = Image.new('RGBA', (new_W, new_H), (0, 0, 0, 0))
            full.paste(img_small, (paste_x, paste_y), img_small)

            # Ten file an toan
            safe_name = layer.name.replace(' ', '_').replace('.', '_') \
                                  .replace('/', '_').replace('\\', '_')
            filename  = f"psd_layer_{index}_{safe_name}.png"
            out_path  = os.path.join(output_dir, filename)
            full.save(out_path, 'PNG', optimize=True)

            ink_px = int((np.array(full)[:, :, 3] > 10).sum())

            return {
                "index": index,
                "name":  layer.name,
                "file":  out_path,
                "inkPx": ink_px,
            }
        except Exception as e:
            return {"index": index, "name": getattr(layer, 'name', f'Layer {index}'),
                    "error": str(e)}

    # Lap qua tat ca layers
    for i, layer in enumerate(psd):
        result = process_layer(layer, i)
        if result:
            layers_out.append(result)

    # Loc bo layer loi hoac khong co ink
    good_layers = [l for l in layers_out if l.get('inkPx', 0) > 100 and 'error' not in l]

    print(json.dumps({
        "ok":     True,
        "canvas": {"w": new_W, "h": new_H},
        "psd":    {"w": W,     "h": H},
        "scale":  scale,
        "layers": good_layers,
        "all":    layers_out,
    }))

try:
    main()
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e), "trace": traceback.format_exc()}))
    sys.exit(1)
