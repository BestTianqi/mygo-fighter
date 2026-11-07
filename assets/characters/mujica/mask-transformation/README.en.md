[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Mujica Mask Transformation Actions

Using the built-in imagegen and each character's existing casual and stage outfits, three complete full-body actions were drawn per character, keeping normal anime proportions and outfit colors. The five original PNGs, the extracted atlases and the frame data all live in this directory; see sources.json for the reference files and source-image hashes.

Action prompt: three complete full-body figures of the same height in a row. Left, in casual clothes holding the mask with both hands at chest level; middle, in casual clothes raising a hand to put the mask on; right, in stage outfit with both hands lowered after the mask is on. Umiri and Mutsumi cover nose and mouth; Sakiko, Uika and Nyamu cover the eyes. Keep each character's face, hair and outfit, seven-head proportions, non-chibi, transparent background, no instruments or effects, complete hair and shoes.

After the H transformation, 0–220 ms holds the mask, 220–440 ms puts it on, and 440–720 ms is the finished pose. The first two frames keep the casual outfit, and the third switches to the stage outfit. At 440 ms a spreading aura bursts out, and rising particles and a halo fade out by 1100 ms; this is reduced when reduced motion is enabled. The action is purely presentational: the stage skill is still granted immediately, with no added move lockout or invincibility. Movement, attacks and hit reactions keep priority as normal combat actions.

tools/build_mask_assets.py extracts by transparent connected regions; the original portraits and the 560 two-form actions stay unchanged.
