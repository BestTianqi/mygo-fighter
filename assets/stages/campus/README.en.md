[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Campus and MyGO stage assets

Nine new stages are added on top of the existing six, for fifteen in total. All new backgrounds come from publicly reachable 《BanG Dream! Girls Band Party!》 background assets on the web, and keep their original PNG; at runtime each is cropped to 16:9 around its own focal point, compressed to WebP and embedded in the offline HTML. No similar school photograph was used in place of an original scene.

| Stage                                            | Original background ID | Terrain                                                                 |
| ------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| 花咲川女子学园 (Hanasakigawa Girls' High School) | bg00003                | low flowerbed ledges, a central high corridor and side detour platforms |
| 羽丘女子学园 (Haneoka Girls' High School)        | bg00010                | multi-level connected platforms with an upper walkway                   |
| 月之森女子学园 (Tsukinomori Girls' High School)  | bg00470                | clock-gate plaza with a raised stone-pillar platform                    |
| 月之森·庭院 (Tsukinomori garden)                 | bg00473                | flowerbeds, a gallery corridor and a central raised platform            |
| 羽丘·学校天台 (Haneoka rooftop)                  | bg00012                | equipment ledges and fenced platforms                                   |
| CiRCLE·练习室 (CiRCLE practice room)             | bg00033                | speaker low platforms and a wooden raised platform                      |
| RiNG·练习室 (RiNG practice room)                 | bg00918                | a drum riser, speakers and an upper catwalk                             |
| 大台阶·黄昏 (the great staircase, dusk)          | bg01007                | real walkable continuous steps and rest platforms                       |
| 大台阶·夜景 (the great staircase, night)         | bg01008                | steps at different heights and side detour platforms                    |

All backgrounds are original game art, and the rights belong to the original rights holders; they are not original to this project or CC-licensed assets. The original URLs, download dates, sizes and SHA-256 hashes are in [sources.json](sources.json).

Scene verification:

- [Background image gallery](https://bandori.fandom.com/wiki/Girls_Band_Party%21_Background_Images): Hanasakigawa school gate, Haneoka school gate/rooftop, CiRCLE practice room.
- [Morfonica episode 1 story data](https://bestdori.com/assets/jp/scenario/band/021_rip/Scenarioband6-001.asset): Tsukinomori scenes; `bg00473` corresponds to「月ノ森女子学園 庭園」.
- [MyGO episode 7 story data](https://bestdori.com/assets/jp/scenario/band/045_rip/Scenarioband8-007.asset): `bg00010` corresponds to「羽丘女子学園 校門前」.
- [MyGO episode 8 story data](https://bestdori.com/assets/jp/scenario/band/045_rip/Scenarioband8-008.asset): `bg01007` corresponds to「大階段」; `bg01008` is the night view of the same scene.
- [MyGO episode 16 story data](https://bestdori.com/assets/jp/scenario/band/045_rip/Scenarioband8-016.asset): `bg00918` corresponds to「RiNG スタジオ」.

The terrain is a playable layout designed independently for this game. The standable line matches the collision height, so you can jump up onto platforms, drop down through them with ↓ plus jump, and walk on slopes and steps. Low ground, high platforms and the camera all use the existing battle rules; the top layer of every new stage has passed an actual CPU climb test.
