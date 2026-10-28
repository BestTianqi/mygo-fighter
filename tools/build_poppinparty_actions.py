"""Analyze unchanged PNG atlases and export source rectangles/outline clips.

No sprite pixels are rewritten. Outlines let the preview draw each complete
pose independently even when generated art crosses the nominal grid gutters.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/poppinparty/actions"
NAMES = ["idle", "walk", "run", "jump", "guard", "hit", "knockdown", "entry",
         "j1", "j2", "j3", "k", "u", "i", "o", "p"]
LABELS = ["待机", "行走", "奔跑", "跳跃", "防御", "受击", "倒地", "入场",
          "普攻一段", "普攻二段", "普攻三段", "重击K", "技能U", "技能I", "技能O", "大招P"]
EXTRAS = {"arisa-entry": 1, "kasumi-u": 1, "kasumi-i": .88, "tae-jump": .84, "rimi-k": .94}


def analyze(file):
    image = Image.open(file).convert("RGBA")
    alpha = np.asarray(image.getchannel("A"))
    count, labels, stats, centers = cv2.connectedComponentsWithStats((alpha > 32).astype("uint8"), 8)
    return image, labels, stats, centers


def geometry(mask):
    # A tiny outline expansion retains the generated antialiasing at the edge.
    outline = cv2.dilate(mask.astype("uint8"), np.ones((5, 5), np.uint8))
    ys, xs = np.nonzero(outline)
    rect = [int(xs.min()), int(ys.min()), int(xs.max()-xs.min()+1), int(ys.max()-ys.min()+1)]
    contours, _ = cv2.findContours(outline, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons = [cv2.approxPolyDP(c, .65, True).reshape(-1, 2).tolist() for c in contours if cv2.contourArea(c) > 4]
    return rect, polygons


def main():
    characters = {}
    for key in ["kasumi", "tae", "rimi", "saaya", "arisa"]:
        file = DEST / f"{key}.png"
        image, labels, stats, centers = analyze(file)
        width, height = image.size
        candidates = [i for i in range(1, len(stats)) if stats[i, 4] > 5000 and stats[i, 2] < width*.4]
        frames = {}
        for index, name in enumerate(NAMES):
            extra = f"{key}-{name}"
            if extra in EXTRAS:
                single = DEST / f"{extra}.png"
                _, single_labels, single_stats, _ = analyze(single)
                body = max(range(1, len(single_stats)), key=lambda i: single_stats[i, 4])
                rect, contours = geometry(single_labels == body)
                frames[name] = {"label": LABELS[index], "file": single.name, "rect": rect,
                                "outlines": contours, "heightRatio": EXTRAS[extra]}
                if extra == "kasumi-u":
                    frames[name]["mirror"] = True
                continue
            row, col = divmod(index, 4)
            eligible = [i for i in candidates if int(centers[i, 1] / (height/4)) == row]
            target = ((col+.5)*width/4, (row+.5)*height/4)
            body = min(eligible, key=lambda i: abs(centers[i, 0]-target[0]))
            if abs(centers[body, 0]-target[0]) > width/8:
                raise ValueError(f"Cannot isolate {key}/{name}; review the atlas")
            mask = labels == body
            if key == "rimi" and name == "u":
                # The tossed cornet is intentionally detached from her hand.
                for i in range(1, len(stats)):
                    if 500 < stats[i, 4] < 5000 and 210 < centers[i, 0] < 290 and 1140 < centers[i, 1] < 1230:
                        mask |= labels == i
            rect, contours = geometry(mask)
            frames[name] = {"label": LABELS[index], "file": file.name, "rect": rect, "outlines": contours}
        standing_height = frames["idle"]["rect"][3]
        for frame in frames.values():
            frame.setdefault("heightRatio", round(frame["rect"][3] / standing_height, 4))
        characters[key] = {"kind": "16-key-poses", "atlas": file.name, "frames": frames}
    manifest = {"version": 1, "status": "offline-unregistered", "note": "Generated 2D key poses; source PNG pixels are unchanged. Source outlines prevent neighboring-pose ghosts.", "characters": characters}
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))+"\n", encoding="utf-8")
    print(f"Exported {sum(len(c['frames']) for c in characters.values())} independent key poses")


if __name__ == "__main__":
    main()
