# Ave Mujica 双形态制作与接入

后续剧情梗、原声与大招更新见 [技能与配音说明](MEME_SKILLS_IMPLEMENTATION.md)。以下保留本组角色初次接入时的制作与验收记录。

状态：已完成离线接入与验收。五人、十形态、40个技能及560张动作关键帧均已嵌入正式 index.html。

已确认：H消耗50能量，地面立即变身20秒，不可刷新；常态校服/常服，演出形态为经典官方服装与面具。J三连、K重击、L虚影闪身、UIO技能、P大招。两个形态有不同的三技能和大招，风格为乐器战斗与剧情梗结合。正常动画头身比，匹配官方2D脸，不使用Q版。生命200，共鸣100。

角色ID：八幡海铃5、丰川祥子6、三角初华7、若叶睦8、祐天寺若麦9。界面按祥子、初华、海铃、睦、若麦排序。

每形态56帧，7张4列×2行透明图，每格一个完整人物，按照下面的顺序命名。源稿在 assets/mujica/<key>/<normal|stage>/group-<1..7>-v1.png；清单在 assets/mujica/<key>/manifest.json。人物key为sakiko/uika/umiri/mutsumi/nyamu。常态与演出形态的姿势、服装和动作都需实际绘制，不通过同一立绘位移伪造。

1. idle, walk-contact, walk-pass, guard-standing, guard-crouch, dash-forward, dash-back, jump-rise
2. jump-fall, landing, hit-high, hit-low, knockdown-fall, knockdown-ground, getup, victory
3. throw-windup, throw-release, jab-1-windup, jab-1-impact, jab-1-recover, jab-2-windup, jab-2-impact, jab-2-recover
4. jab-3-windup, jab-3-impact, jab-3-recover, heavy-windup, heavy-impact, heavy-recover, crouch-light-windup, crouch-light-impact
5. crouch-light-recover, crouch-heavy-windup, crouch-heavy-impact, crouch-heavy-recover, air-light-windup, air-light-impact, air-light-recover, air-heavy-windup
6. air-heavy-impact, air-heavy-recover, skill-u-windup, skill-u-impact, skill-u-recover, skill-i-windup, skill-i-impact, skill-i-recover
7. skill-o-windup, skill-o-impact, skill-o-recover, super-windup, super-impact, super-recover, transform-prepare, transform-release

Manifest schema: {key,id,name,references:[{path,source}],forms:{normal:{groups:[{file,columns:4,rows:2,names:[8 pose names],prompt:"full imagegen prompt"}]},stage:{groups:[...]}}}。file相对于assets目录。两形态各7组，中文说明可以增加，不改变names。

运行素材的站立高度235世界单位；蹲姿保持符合实际的较低高度，空中姿势按人物尺寸；倒地使用身体中心锚点。高分辨率原稿保留，运行图按显示需求压缩，全部图片嵌入最终离线HTML，目标小于95MiB。主菜单使用轻量透明立绘，开局前预热双方常态和演出图集。

技能见本次已确认计划：U/I/O分别20/25/30能量，P100；各角色有完整双技能组。纯战斗数据由src/mujica.js导出；stageForm为null或{ms:20000}，旧五人与企鹅逻辑保持兼容。到期打断尚未释放的演出攻击，已生成的飞行物/阵法按原寿命结束。菜单/暂停/命中停顿冻结计时，回合重置清理。

## 已实现的双形态技能

每格按 U / I / O / P 顺序列出。所有技能在地面或平台上施放；普通攻击仍有站立、蹲下、空中三种姿态与J三连，L保留人物虚影。

| 角色 | 校服／常服 | Mujica演出形态 |
| --- | --- | --- |
| 丰川祥子 | 琴键问候（琴键弹）／茶会谢绝（24耐久护盾）／不必再联系（击退波）／往日琴声（三段合奏） | 黑键断章（双弹）／遗忘之牢（预警阵法）／傀儡律令（拉拽）／神谕终幕（三段终章） |
| 三角初华 | 星屑和弦（音符弹）／偶像步伐（前移280，无伤害与无敌）／追星连奏（三连）／致那颗星（三段飞行和弦） | 悲恸斩弦（近身斩击）／双月滑奏（突进斩击）／哀歌回响（缓慢大音波）／星落哀歌（锁定施放时目标位置的上段三连） |
| 八幡海铃 | 精准拨弦（远程低音）／稳拍反拨（正面反击）／收工重拍（对空）／支援合奏（三段） | 恐惧重低音（贴地低段弹）／沉锚弦钩（命中拉近100）／铁壁终拍（近身指令投）／深渊低鸣（三段） |
| 若叶睦 | 青瓜投掷（抛物线）／寡言拨弦（低段）／请安静一点（四周震荡）／未说出口的独奏（三段） | 人偶切线（长距离斩击）／替身谢幕（后撤反击）／断线坠幕（上段）／空壳剧场（三段） |
| 祐天寺若麦 | 补光闪拍（近身闪光）／流量冲刺（突进掌击）／开播连击（三连）／全场热搜（三段） | 绯红双击（双击）／踏碎节拍（跃起踩踏）／狂欢过门（四连）／狂爱谢幕（八连） |

茶会护盾持续2秒，冷却6秒；遗忘之牢预警0.6秒，冷却4秒，同一角色最多一处。两种反击仅在各自有效窗口生效，投技、背后攻击与起手阶段能破解。拉拽只在未防御命中后发生。大招消耗100，施放1.9秒，水平范围最多420、垂直范围300；依通常防御、命中停顿与连段衰减结算，能在起手无敌结束后被打断。初华演出大招为上段，需要站防。

验收已通过：213项战斗与动作测试、16项素材/打包/离线一致性测试，以及正式HTML中五人十形态的UIO/P、J三连、虚影瞬移、2P、电脑实际攻击、菜单冻结/到期恢复、K.O./下一回合和横竖屏触控。旧五人及企鹅统一键位、主菜单、虚影与实时移动/三连回归亦通过。浏览器检查无页面错误或联网请求。正式HTML实盘79,202,238字节，低于95MiB。

所有人物图均由内置imagegen生成。完整逐组提示词、官方参考来源和最终版本选择保存在：[祥子](mujica/sakiko/manifest.json)、[初华](mujica/uika/manifest.json)、[海铃](mujica/umiri/manifest.json)、[睦](mujica/mutsumi/manifest.json)、[若麦](mujica/nyamu/manifest.json)。原稿与修稿均保留；运行图采用保留精确透明度的高质量WebP，完整动作在 mujica-preview.html 中离线查看。
