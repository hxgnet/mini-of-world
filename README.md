# mini-of-world · 微尘世界

一个纯前端、零依赖的像素上帝沙盒，玩法参考 WorldBox（世界盒子）：塑造地形、播撒生命、观看村庄繁衍与部族战争。

## 在线试玩

开启 GitHub Pages 后访问：`https://hxgnet.github.io/mini-of-world/`

## 玩法

- **地形**：陆地、海洋、沙滩、森林、山岩，海岸线自动拼接
- **生命**：人类、野兽、怪物；人类会自动加入附近村庄
- **文明**：村庄自行建房、繁衍、招募士兵；蓝曦、赤炎、青苔、金穗四个部族会结盟、宣战、停战
- **天灾**：火焰蔓延、闪电、陨石、瘟疫、治愈、抹除
- **观察**：点击任意生灵查看部族、生命、年龄与状态；顶部显示纪元、人口、村庄与局势
- **时间**：暂停 / 1× / 2× / 4×；滚轮缩放，右键拖动平移

## 运行

直接双击 `index.html`，或用任意静态服务器：

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 文件说明

- `index.html` / `style.css` / `game.js`：项目源码
- `assets/`：像素素材与字体

## 美术素材

像素素材来自 [Kenney.nl](https://kenney.nl) 的 Roguelike RPG、Particle Pack 与 Game Icons，均为 CC0 公共领域授权。
