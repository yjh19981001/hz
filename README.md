# 璀璨宝石：对决（Splendor Duel）网页版

本项目是一个双人本地热座（hot-seat）网页实现，基于官方规则的核心流程制作：

- 5x5 螺旋填充 token 版图
- 回合包含可选行动（卷轴、补充版图）+ 强制行动（拿 token / 预定 / 购买）
- 购买、加成、王冠、皇家卡、卡牌能力、token 上限与三种胜利条件

> 说明：为避免直接复制官方美术资源，本项目采用“文艺复兴珠宝”风格化 UI 重新绘制。
> 卡池数据为程序生成，用于规则驱动玩法演示（非官方牌面全集复刻）。
> 若你有合法授权的图片素材，可在页面“素材包（自备）”里配置 `cardArt` URL 覆盖默认卡面背景。
> 页面内置了一个可一键加载的 OpenGameArt CC0 预设素材包（3 张纹理图），用于快速替换卡图背景。

## 运行

直接打开 `index.html` 即可。

## 规则依据（在线来源）

- Splendor Duel Rulebook (Space Cowboys / Asmodee)
  - https://meepletron-storage.s3.us-east-2.amazonaws.com/resources/splendor-duel-rulebook.pdf

## 开源素材包（页面预设）

- Parchment background / Felis Chaus / CC0  
  https://opengameart.org/content/parchment-background
- Chalkboard Texture / MonoTone / CC0  
  https://opengameart.org/content/chalkboard-texture
- CC0 Monochrome Gradient Textures / PuzzleAndy / CC0  
  https://opengameart.org/content/cc0-monochrome-gradient-textures
