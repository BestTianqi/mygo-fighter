# 素世技能 · 小天素罗召唤

2026-10-18。使用内置 ImageGen，以用户上传的 `b8b71d985e0ca38a144ecb6437bee793388704813.gif` 为造型参考，新绘四姿势透明图集 `soyo-tensora-v1.png`。

参考动图已存为 `reference/soyo-tensora-reference.gif`，共34帧，另保存第0、11、22帧用于观察。绘制时以 `reference/tensora-reference-0.png` 为金黄色、圆滚滚天妇罗外壳与小脸开口的主参考，`soyo-idle.png` 仅作素世发色与面部参考。召唤物是动图中的小吉祥物体型，素世本人的正常身材立绘不变。

四格顺序：待机、跳动、向右冲刺、碰撞攻击。运行素材 `soyo-tensora-runtime.webp` 经现有连通区域提取、脚底对齐、无损打包后以 `MYGO_ASSETS.soyoTensora` 内嵌至离线HTML。

## 游戏规则

- 素世按T，2P按小键盘Enter，手机点「小天素罗」。爱音同键仍是TGW音波。
- 消耗50%共鸣，地面起手220ms，召唤三个独立行动的小天素罗，持续10秒有效战斗时间。
- 三只错开追击，突进命中后返回素世附近再出击；移动及平台高度可跟随目标。每次原始伤害4，格挡磨血1，爱音的正面钢板可以抵消伤害。
- 召唤物不会给素世回充共鸣，单只每次突进只命中一次，起手可被打断；持续期间不能叠加或刷新。
- 暂停和命中停顿冻结寿命与行动。到期、素世KO、回合结果和重开清除召唤物。
- 练习按钮沿用当前所选角色，便于选素世后试招。

## 最终 ImageGen 提示词

Use case: reference-inspired game sprite asset, identity-preserve. IMAGE 1 is a frame from the user's supplied GIF and is the primary authority for this mascot's exact recognizable costume silhouette and materials. IMAGE 2 is the game's normal-proportion Nagasaki Soyo and is ONLY a face/hair color reference. Create a transparent 2x2 sheet of FOUR complete separated animation sprites of '小天素罗': a tiny Soyo tempura mascot. Preserve the uploaded GIF's large spherical plump GOLDEN-YELLOW TEMPURA / crunchy fried batter costume, densely soft craggy crumb texture, puffy rounded top hood, cute small HUMAN ANIME SOYO FACE visible in the upper-front oval opening, original light ash-brown side-parted sweeping bangs and short side wisps, large gentle downturned pale blue-gray eyes, tiny gentle smile, peach skin, miniature stubby rounded arms at the sides and little warm amber/orange feet at the bottom. Costume is one huge ROUND golden puffy sphere, not normal human anatomy and not school uniform; face is small relative to the sphere, just like GIF. Match the GIF's recognisable slightly plush deep-fried fritter appearance. NO dragon features, NO dragon horns, NO lizard tails, NO beak, NO duck face, NO bear ears, NO pink hair. The character's human face must be clearly visible. Polished anime-game cel illustration with subtle crunchy crumb texture, not a photograph; fits beside clean 2D anime fighting sprites. Consistent warm golden body color and exact Soyo face in all four poses. Every sprite mildly faces RIGHT in three-quarter view while its face remains readable from front. Strict 2 columns x 2 rows invisible layout, exactly one complete mascot per quadrant, consistent body/face size and scale; generous transparent margins on all sides; all hood tops, arms, feet and crumbs within own cell. TOP LEFT: calm round idle, tiny hands beside round belly, gentle composed face. TOP RIGHT: cheerful little bouncing hop, tiny feet lifted and arms spread slightly, bouncy round body, mildly cheerful face. BOTTOM LEFT: charging / lunging toward RIGHT with round body inclined forward, tiny arms drawn back, determined small face, both complete feet visible. BOTTOM RIGHT: forward bump / short paw swat attack toward RIGHT, one tiny padded arm stretched out, round body compressed slightly, determined cute open-mouth expression. Never transform into a full human girl. No lettering, labels, grid lines, UI, floor, cast shadows, aura, speed lines, background RGB haze, detached particles or extra props. Genuine transparent RGBA pixels outside every silhouette, including between limbs; no baked-in checkerboard.
