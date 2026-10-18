# LINOX Packaging Studio / 参数化产品包装生成器

无需 AI 绘图、无需后端、无需依赖安装的浏览器参数化纸盒包装系统。输入产品型号、品类、长宽高，即时生成三视图、3D 闭盒示意和带尺寸的反向插舌纸盒展开 SVG。

## 快速使用

- 点击 `index.html` 无法保证 ES Modules 在 `file://` 直接运行，建议使用本地静态 HTTP 服务器。
- Python：`python3 -m http.server 4173`，浏览器访问 `http://localhost:4173`。
- 或运行 `npm run dev`（同样调用本机 Python HTTP server）。
- 也可以托管到 GitHub Pages：仓库 Settings → Pages → Deploy from a branch → main / (root)。

## 核心功能

- 预设：SI15C (83×23×16)、GE17C (32×32×16)、S6004-2RS (46×46×15) mm。
- 类型 SVG 线稿：Rod End、Radial Spherical Plain Bearing、Deep Groove Ball Bearing，每个类别固定，型号变更仅更新文字。
- 两种尺寸模式：直接输入名义纸盒外尺寸；或输入产品外尺寸并给每个方向加上总余量（默认加 2 mm）。
- 自动生成：前/后/侧三视图、3D 闭盒矢量示意、纸盒展开刀模。展平展开使用标准毫米 SVG `width/height` 与 `viewBox`。
- 默认预览（效果展示）按参考稿版式固定比例绘制：灰色台面上的正面/背面/侧面 + 开盒示意，下方为同版式刀模。尺寸标注显示真实毫米，但画面比例对所有型号一致；生产用的精确毫米刀模请用“刀模 SVG”导出。
- 分组 `<g id="cut">` 红色裁切、`<g id="crease">` 青色压痕、`<g id="print">` 印刷。浏览器打印按钮提供保存为 PDF 工作流程。
- 导出 SVG、导入/导出 JSON 配置；浏览器本地自动保存输入数据。
- 包含 Node 内置测试：`npm test`（无需安装 NPM 依赖）。

## 重要限制：正式生产前必须打样

**当前刀模是参数化工程概念结构，并非印刷包装厂审批过的正式生产刀模。** 算法目前没有包含纸板厚度、折痕/刀线校正、插舌锁扣工艺、公差、设备最小糊口宽度、出血边距、专色、字体转曲、材料展开系数、排版拼版和供应商标准。未经打样、工厂核对和纸盒实际装配测试，不要直接开刀、印刷或批量生产。小型/异形尺寸尤其应由厂商确认。

其中 `length/width/depth` 是名义成品外尺寸，不是产品内部净空。选“产品尺寸”时加上的是 **每个方向的合计余量**，不等于最终净空余量。

**LOGO：** 当前内置 LINOX 红黑字样是基于用户提供的包装图片进行轮廓矢量化的 *可替换参考稿*，不是已确认的官方原版 SVG。上线正式印刷前，将 `src/artwork.js` 里的 `logo()` 替换成经授权、精确描摹的原始 SVG paths。类别插画也是可替换的工程示意图，需按你的真实产品核对后冻结版本。

**尺寸和 PDF：** 下载的 SVG 具备毫米单位。浏览器“打印 / PDF”只提供方便的预览/输出，不保证无缩放或符合印厂 PDF/X 标准。需在矢量编辑工具 / RIP 检查物理尺寸后再用于生产。

**英文与商标：** 目前保留设计稿中的 `CORROSION-RESISTANT`, `ISO 9001:2015`, `MADE IN CHINA`。使用方需确认文字真实性、当时认证有效性和可印刷范围。不要将显示的 ISO 文字误认为当前证书真实性校验。

## 架构

```
index.html
src/
  app.js       # browser UI and local export/import
  geometry.js  # mm-based flat dieline cut/fold geometry + validators
  artwork.js   # print artwork (front/back/side layouts) and elevations
  illustrations.js # per-category product line art (line + shaded variants)
  presentation.js  # reference-style presentation board
  styles.css   # desktop/mobile interface and print layout
tests/
  geometry.test.js
.github/workflows/test.yml
```

未来路线：导入真实 LINOX SVG 商标、供应商认可刀模模板、CMYK/PDF/X 交付、分类素材库、出血/安全区、Excel 批量生成、独立印刷层导出、与 ERPNext 商品数据集成。