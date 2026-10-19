# LINOX Packaging Studio / 参数化产品包装生成器

无需 AI 绘图、无需后端、无需依赖安装的浏览器参数化纸盒包装系统。输入产品型号、品类、长宽高，生成参考稿风格的效果展示板、毫米刀模 SVG，并支持单件与批量导出。

## 快速使用

- 点击 `index.html` 无法保证 ES Modules 在 `file://` 直接运行，建议使用本地静态 HTTP 服务器。
- Python：`python3 -m http.server 4173`，浏览器访问 `http://localhost:4173`。
- 或运行 `npm run dev`（同样调用本机 Python HTTP server）。
- 也可以托管到 GitHub Pages：仓库 Settings → Pages → Deploy from a branch → main / (root)。

## 核心功能

- 预设：SI15C (83×23×16)、GE17C (32×32×16)、S6004-2RS (46×46×15) mm。
- 类型 SVG 线稿：Rod End、Radial Spherical Plain Bearing、Deep Groove Ball Bearing，每个类别固定，型号变更仅更新文字。
- 两种尺寸模式：直接输入名义纸盒外尺寸；或输入产品外尺寸并给每个方向加上总余量（默认加 2 mm）。
- 自动生成：参考稿效果展示板（正面/背面/侧面 + 开盒 + 刀模）和毫米刀模展开。展平展开使用标准毫米 SVG `width/height` 与 `viewBox`。
- 默认预览（效果展示）按参考稿版式绘制：灰色台面上的正面/背面/侧面 + 开盒示意，下方为刀模。所有面、开盒和刀模均按真实长宽高比例绘制（各区域分别缩放适配画面）；生产用的精确毫米刀模请用“刀模 SVG”导出。
- 印刷字体固定为：**型号 Barlow Semi Condensed，分类 Barlow**（均为 SIL OFL 授权，许可文件在 `assets/fonts/*-LICENSE.txt`）。侧面的型号和尺寸标注沿用型号字体。导出的 SVG 只内嵌这两款字体各 3 个字重（woff2），不依赖本机字体；送印前仍建议在 AI/CorelDRAW 中转曲。
- 排版按字体真实字宽计算（`src/font-metrics.js`），正面的型号与分类分别按各自字体测量，正面文字不会与产品图重叠。同一长宽比的面板共用一套比例化字阶：LOGO、型号、分类随面板尺寸缩放；超长型号优先在连字符处换行，避免把整块文字缩小。如需更换固定字体：修改 `src/fonts.js` 的 `MODEL_FONT` / `CATEGORY_FONT`，并确保对应 woff2 与 `scripts/measure-fonts.html` 生成的字宽数据齐全。
- 分组 `<g id="cut">` 红色裁切、`<g id="crease">` 青色压痕、`<g id="print">` 印刷。浏览器打印按钮把彩色效果展示图居中输出为 A3 横向页面，可另存为 PDF。
- 导出 SVG、导入/导出 JSON 配置；浏览器本地自动保存输入数据。
- 批量生成：粘贴多行「型号, 分类, 长, 宽, 高, 余量(可选)」，默认按产品尺寸 + 3 mm 余量计算；点击任一行可载入单件全景预览；批量导出压缩包内含效果图、刀模图和 `清单.csv`。
- 包含 Node 内置测试：`npm test`（无需安装 NPM 依赖）。

## 批量生成

批量输入每行一条，逗号、中文逗号、分号或 Tab 分隔均可：

```text
# 型号, 分类, 长, 宽, 高, 余量(可选)
SI15C, 杆端, 80, 20, 13
GE17C, 向心, 29, 29, 13
S6004-2RS, 深沟, 43, 43, 12, 4
```

- 默认按产品尺寸 + 余量生成，默认余量 3 mm，可在第六列单独覆盖；
- 分类支持 `杆端 / 向心 / 深沟`，也兼容 `Rod End / Radial / Deep Groove` 和 `rod / radial / deep`；
- 支持可选的表头行和 `#` 注释；无效行会在列表中单独提示，不阻塞其他行；
- 点击列表中的「预览」会把该行载入下方单件预览；
- 「批量导出压缩包」会生成 `效果图/`、`刀模/` 和 `清单.csv`，内容全部在浏览器本地生成。

## 重要限制：正式生产前必须打样

**当前刀模是参数化工程概念结构，并非印刷包装厂审批过的正式生产刀模。** 算法目前没有包含纸板厚度、折痕/刀线校正、插舌锁扣工艺、公差、设备最小糊口宽度、出血边距、专色、字体转曲、材料展开系数、排版拼版和供应商标准。未经打样、工厂核对和纸盒实际装配测试，不要直接开刀、印刷或批量生产。小型/异形尺寸尤其应由厂商确认。

其中 `length/width/depth` 是名义成品外尺寸，不是产品内部净空。选“产品尺寸”时加上的是 **每个方向的合计余量**，不等于最终净空余量。

**LOGO 与素材：** `src/artwork.js` 中的 LINOX 字标取自官方 `linox-logo.svg`（linox-astro 仓库），已将其 clip-path 结构展平为路径，红色 `#e60012`；® 由程序绘制。产品图（Rod End / 向心关节轴承 / 深沟球轴承）和背面品牌框来自 `assets/*.png`（位图，已裁边并压缩）。替换素材后运行 `npm run assets` 重新生成 `src/assets.js`（以 data URI 内嵌，导出的 SVG 不依赖外部文件）。位图在 80 mm 宽面上约 250–400 dpi，正式印刷前建议换成矢量版。

**尺寸和 PDF：** 下载的刀模 SVG 具备毫米单位。浏览器“打印效果图”输出的是**彩色效果展示图**，已居中并保留背景色，但不保证毫米 1:1 或符合印厂 PDF/X 标准；生产请使用“刀模图”下载，并在矢量编辑工具 / RIP 检查物理尺寸。

**英文与商标：** 目前保留设计稿中的 `CORROSION-RESISTANT`, `ISO 9001:2015`, `MADE IN CHINA`。使用方需确认文字真实性、当时认证有效性和可印刷范围。不要将显示的 ISO 文字误认为当前证书真实性校验。

## 架构

```
index.html
src/
  app.js       # browser UI and local export/import
  batch.js     # batch row parsing and category aliases
  zip.js       # dependency-free ZIP writer for batch downloads
  geometry.js  # mm-based flat dieline cut/fold geometry + validators
  artwork.js   # print artwork (front/back/side layouts) and elevations
  assets.js        # generated: product images + back-panel block as data URIs
  fonts.js         # print font registry, @font-face (embedded / URL), text measuring
  font-metrics.js  # per-font glyph widths and cap heights
assets/            # source PNGs (run `npm run assets` after replacing)
scripts/build-assets.mjs
  presentation.js  # reference-style presentation board
  styles.css   # desktop/mobile interface and print layout
tests/
  geometry.test.js
  batch.test.js
  zip.test.js
.github/workflows/test.yml
```

未来路线：导入真实 LINOX SVG 商标、供应商认可刀模模板、CMYK/PDF/X 交付、分类素材库、出血/安全区、Excel/CSV 文件导入批量、独立印刷层导出、与 ERPNext 商品数据集成。