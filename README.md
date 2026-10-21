# LINOX Packaging Studio / 参数化产品包装生成器

无需 AI 绘图、无需后端、无需依赖安装的浏览器参数化纸盒包装系统。从型号库选择轴承、批量填入产品尺寸，生成参考稿风格的效果展示板和批量 PDF（首页为包装清单）。

## 快速使用

- 点击 `index.html` 无法保证 ES Modules 在 `file://` 直接运行，建议使用本地静态 HTTP 服务器。
- Python：`python3 -m http.server 4173`，浏览器访问 `http://localhost:4173`。
- 或运行 `npm run dev`（同样调用本机 Python HTTP server）。
- 也可以托管到 GitHub Pages：仓库 Settings → Pages → Deploy from a branch → main / (root)。

## 核心功能

- 型号库：从 632 个杆端 / 向心 / 深沟型号中选择，自动填充分类、长宽高；型号字段仍可手改，旧型号不存在时可选择相同尺寸的型号后改名。
- 类型 SVG 线稿：Rod End、Radial Spherical Plain Bearing、Deep Groove Ball Bearing，每个类别固定，型号变更仅更新文字。
- 批量行按“产品尺寸 + 余量（默认 3 mm）”计算；数量默认 1 件，每行可改。
- 自动生成参考稿效果展示板（正面/背面/侧面 + 开盒 + 刀模）；所有面、开盒和刀模均按真实长宽高比例绘制。
- 印刷字体固定为：**型号 Barlow Semi Condensed，分类 Barlow**（均为 SIL OFL 授权，许可文件在 `assets/fonts/*-LICENSE.txt`）。导出 PDF 时内嵌字体，不依赖本机字体。
- 排版按字体真实字宽计算（`src/font-metrics.js`），正面的型号与分类分别按各自字体测量，正面文字不会与产品图重叠。同一长宽比的面板共用一套比例化字阶：LOGO、型号、分类随面板尺寸缩放；超长型号优先在连字符处换行，避免把整块文字缩小。如需更换固定字体：修改 `src/fonts.js` 的 `MODEL_FONT` / `CATEGORY_FONT`，并确保对应 woff2 与 `scripts/measure-fonts.html` 生成的字宽数据齐全。
- 分组 `<g id="cut">` 红色裁切、`<g id="crease">` 青色压痕、`<g id="print">` 印刷。浏览器打印面板把彩色效果展示图居中输出为 A3 横向页面，可另存为 PDF。
- 浏览器本地自动保存批量行；刷新页面不会恢复成示例数据。
- **批量导出 PDF** 是唯一导出方式；首頁为包装清单，之后一页一个包装，数量在右上角用红色大号标签突出显示。
- 包含 Node 内置测试：`npm test`（无需安装 NPM 依赖）。

## 批量生成

- 每行包含：型号输入框、分类下拉框、长/宽/高数字输入、余量输入（默认 3 mm）、数量（默认 1）；
- “从型号库添加”按杆端、向心、深沟三组列出型号；选中后新增一行（或填入当前空行），自动写入分类和产品尺寸，型号仍可编辑；
- 默认按“产品尺寸 + 余量”计算，可逐行修改余量与数量；
- 点“新增一行”追加空行，点“删除”移除该行；空行会被忽略；
- 无效行会在行内提示错误，不阻塞其他有效行；
- 点击行内“预览”会把该行载入下方单件全景预览；
- **批量导出 PDF** 会在最前面生成“包装清单”索引页（型号、成品尺寸、数量、对应 PDF 页码），之后每个包装一页 A3 横向；数量在每页右上角用大号红色数字突出显示；在打印面板选择“另存为 PDF”即可；
- 批量行会自动保存在浏览器本地，刷新页面不会恢复成示例数据。

## 型号库

`src/bearing-catalog.js` 由 `scripts/build-bearing-catalog.mjs` 从 `linox-astro/src/data/product-models` 和 `src/data/products/rod-ends/inch-series.csv` 生成，只保留三个包装分类：

- 杆端关节轴承：`d2_mm`（头部外径）、`l2_mm` / `l4_mm`（公/母杆总长）、`W_mm`（宽度，缺失时用 `B_mm`）；
- PHSB / POSB 英寸系列：从 `rod-ends/inch-series.csv` 读取 `Overall Length L`、`Ball Diameter d2`、`Width B`，按 ×25.4 换算为毫米；
- 向心关节轴承与深沟球轴承：`D_mm × D_mm × B_mm`。

型号库目前收录 632 个尺寸完整的型号（含 PHSB/POSB 英寸系列，已换算为毫米）。所有型号直接使用源数据中的产品尺寸，不再保留额外 override；批量默认再加 3 mm 余量形成纸盒尺寸。例如 GE17C 填入 30×30×14，加余量后为 33×33×17。数据变化后运行：

```bash
npm run catalog -- ../linox-astro
```

型号库只负责“快速填充”，所有字段仍可手动修改；如果某个型号不在库中，可选择尺寸相同的型号填入后，再把型号名字改掉，尺寸不会被重置。

## 重要限制：正式生产前必须打样

**当前刀模是参数化工程概念结构，并非印刷包装厂审批过的正式生产刀模。** 算法目前没有包含纸板厚度、折痕/刀线校正、插舌锁扣工艺、公差、设备最小糊口宽度、出血边距、专色、字体转曲、材料展开系数、排版拼版和供应商标准。未经打样、工厂核对和纸盒实际装配测试，不要直接开刀、印刷或批量生产。小型/异形尺寸尤其应由厂商确认。

其中 `length/width/depth` 是名义成品外尺寸，不是产品内部净空。选“产品尺寸”时加上的是 **每个方向的合计余量**，不等于最终净空余量。

**LOGO 与素材：** `src/artwork.js` 中的 LINOX 字标取自官方 `linox-logo.svg`（linox-astro 仓库），已将其 clip-path 结构展平为路径，红色 `#e60012`；® 由程序绘制。产品图（Rod End / 向心关节轴承 / 深沟球轴承）和背面品牌框来自 `assets/*.png`（位图，已裁边并压缩）。替换素材后运行 `npm run assets` 重新生成 `src/assets.js`（以 data URI 内嵌，导出的 SVG 不依赖外部文件）。位图在 80 mm 宽面上约 250–400 dpi，正式印刷前建议换成矢量版。

**尺寸和 PDF：** 批量“导出 PDF”通过浏览器打印面板输出**彩色效果展示图和包装清单**；每个包装一页 A3 横向。打印面板中选择“另存为 PDF”即可，不保证符合印厂 PDF/X 标准；正式生产前仍需由供应商核对物理尺寸与结构。

**英文与商标：** 目前保留设计稿中的 `CORROSION-RESISTANT`, `ISO 9001:2015`, `MADE IN CHINA`。使用方需确认文字真实性、当时认证有效性和可印刷范围。不要将显示的 ISO 文字误认为当前证书真实性校验。

## 架构

```
index.html
src/
  app.js       # batch UI, preview, autosave, PDF export
  geometry.js  # mm-based flat dieline cut/fold geometry + validators
  artwork.js   # print artwork (front/back/side layouts) and elevations
  bearing-catalog.js # generated: 3-category bearing model/dimension catalog
  assets.js        # generated: product images + back-panel block as data URIs
  fonts.js         # print font registry, @font-face (embedded / URL), text measuring
  font-metrics.js  # per-font glyph widths and cap heights
assets/            # source PNGs (run `npm run assets` after replacing)
scripts/build-assets.mjs
scripts/build-bearing-catalog.mjs
  presentation.js  # reference-style presentation board
  styles.css   # desktop/mobile interface and print layout
tests/
  geometry.test.js
  catalog.test.js
.github/workflows/test.yml
```

未来路线：导入真实 LINOX SVG 商标、供应商认可刀模模板、CMYK/PDF/X 交付、分类素材库、出血/安全区、Excel/CSV 文件导入批量、独立印刷层导出、与 ERPNext 商品数据集成。