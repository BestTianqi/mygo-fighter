[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Mujica Portraits and Page Refinement · 2026-10-23

Using the built-in image_gen, ten full-body portraits were drawn from the locally saved official 2D references: casual and stage outfits for all five members, keeping normal proportions, each character's eye shape, hair color and outfit. Umiri and Mutsumi wear mouth-and-nose masks; Sakiko, Uika and Nyamu wear eye masks.

Final picks: source-v2 for Umiri, Uika and Nyamu; source-v3 for Sakiko; source-v4 for Mutsumi. source-v3 is a transparent-edge revision; Mutsumi v4 separates the two complete figures to keep the skirt hems from touching. All original drafts are kept. The complete initial prompts and reference files for each character are in sources.json; the revision prompts are recorded separately in revisions.json.

tools/build_portrait_assets.py generates full-body portraits with an alpha channel, separate centered face thumbnails and a 235-world-unit-high idle frame. The character select page, main menu, team avatars and in-match idle all use the same asset set. The existing two-form attack/movement/mask actions are kept, and a slight upper-body motion driven by travel distance step frequency and fixed at the soles is added in the animation layer.
