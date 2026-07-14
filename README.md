# 好天气 · Good Weather

送给楠的像素叙事游戏。
"有你的每一个日子，都是我生命里的好天气。"

## 技术

- Vite + TypeScript + Canvas2D 自研微引擎（零运行时依赖）
- 逻辑分辨率 360×640 竖屏，像素风格（`image-rendering: pixelated`）
- 音频全部 WebAudio 代码合成（蝉鸣/BGM/音效）；真实录音后续以文件接入
- 素材管线：Codex 按规格书出雪碧图 → `public/assets/` → `src/core/assets.ts` 注册

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
```

## 结构

```
src/core/     引擎（场景循环/输入/音频/存档/切帧）
src/scenes/   章节场景（title → memo备忘录壳 → ch1蝉鸣 → …）
public/assets 像素素材（规格见桌面《好天气-美术规格》系列文档）
```

## 章节路线图

0. 备忘录（壳）✅ 骨架
1. 蝉鸣 — 2019夏·发传单 ✅ 可玩原型
2. 备忘录 — 异地电话/水吧切水果（待做）
3. 8月 — 第一次分开（待做）
4. 床铺 — 两年等待（待做）
5. 阜阳站 — 重逢（待做）
6. 车票 — 轮流奔现（待做）
7. 瑞安的夏天 — 同居（待做）
8. 结局 —（等故事最后一段）

## 打包 APK（最终交付形态）

用 Capacitor 包 WebView，全部素材离线封装：

```bash
npm run build
npm i -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init "好天气" com.dong.goodweather --web-dir dist
npx cap add android
npx cap sync && npx cap open android   # Android Studio 出签名APK
```

要点：`capacitor.config.ts` 设 `backgroundColor: '#151318'`、锁竖屏；
她的歌等音频文件放 `public/assets/audio/`，随包离线。
