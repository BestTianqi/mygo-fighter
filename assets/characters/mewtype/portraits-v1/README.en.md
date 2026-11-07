[简体中文](README.md) | **English** | [日本語](README.ja.md)

# MewType Five-Character Portraits

Arale (10), Ritsu (11), Miyako (12), Yuno (13) and Nonoka (14) use their initial virtual outfits, with normal body proportions and transparent backgrounds.

`*-source-v1.png` are full-body redraws made with an image generation tool; the references come from the initial designs kept in `../reference/`, and Miyako's full-body outfit also references the existing `../miyako/virtual-idle.webp`. These redraws are not passed off as official material.

`crops.json` records the portrait crops. Run `python tools/build_mewtype_portraits.py` to generate the full-body previews, square portraits and idle atlas, and to update the runtime assets. The menu, character select, portraits, normal results and idle use the new images; attacks and movement keep each character's existing action atlas.
