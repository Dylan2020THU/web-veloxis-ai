# 大川激流 AI 学院 · Veloxis AI Academy

这是一个能够真正带你手把手精进人工智能的学习平台。

- 该网站平台导览图的手绘等距风格，4 大核心学院按罗盘方位布置：
  - **数学广场** Foundation Plaza —— 正南
  - **机器意志工坊** Machine Will Workshop —— 东北偏东
  - **深度觉醒实验室** Deep Awakening Lab —— 东北偏北
  - **强化训练竞技场** Reinforcement Training Arena —— 正北
- 像 Google Maps 的连续平滑缩放：
  - 缩到最小 → 4 个学院区 + 主路径
  - 中等 → 章节楼宇浮现
  - 放大 → 技术点 pin + 先修依赖路径
- `Cmd / Ctrl + K` 全局模糊搜索，按回车直接飞到节点
- 节点点击 → 右侧侧栏；侧栏「打开详情页」→ 独立路由 `/course/:id`

## 技术栈

| 层 | 技术 |
| --- | --- |
| 构建/开发 | Vite 5 |
| UI | React 18 + TypeScript |
| 样式 | Tailwind CSS（手写 + Token） |
| 渲染 | 纯 SVG（程序化等距投影） |
| 缩放/平移 | d3-zoom + d3-selection |
| 布局 | d3-hierarchy（treemap squarify） |
| 动画 | Framer Motion（侧栏 / 搜索框） |
| 路由 | React Router 6 |

> 整张 2.5D 地图 100% 由 OPML 数据驱动，无需任何手绘素材；所有几何（地块、楼宇、道路、远山、湖泊）都由代码生成。

## 快速开始

> 本项目需要 Node.js ≥ 18（自带 npm）。Cursor 内置的 node 可执行文件不带 npm，请到 [nodejs.org](https://nodejs.org/) 安装官方版本。

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
#    predev 钩子会自动跑 `node scripts/opml-to-json.mjs` 把 OPML 解析为 JSON
npm run dev

# 3. 仅重新生成数据（OPML 改动后）
npm run data

# 4. 生产构建
npm run build && npm run preview
```

打开 [http://localhost:5173](http://localhost:5173) 即可看到大川激流 AI 学院首页。

## 项目结构

```
.
├── AI课程总体系_True_Intelligence_v2.opml   原始课程总图
├── scripts/opml-to-json.mjs                 OPML → roadmap.json 解析器
├── public/data/roadmap.json                 构建期生成（已 .gitignore）
├── src/
│   ├── main.tsx                             React 入口
│   ├── App.tsx                              路由
│   ├── routes/
│   │   ├── HomeMap.tsx                      首页 2.5D 地图
│   │   └── CourseDetail.tsx                 节点详情页
│   ├── map/
│   │   ├── MapCanvas.tsx                    主画布：d3-zoom + 三层分组
│   │   ├── Scenery.tsx                      远山 / 湖泊 / 主路径装饰层
│   │   ├── layout.ts                        树 → 等距坐标的核心算法
│   │   ├── iso.ts                           等距投影 + 立方体面 path 工具
│   │   ├── lod.ts                           zoom → 哪些层显示
│   │   ├── tokens.ts                        尺寸 / 配色 / 缓动常量
│   │   └── nodes/
│   │       ├── DistrictShape.tsx            学院区块 + 牌坊
│   │       ├── BuildingShape.tsx            等距楼宇（章节）
│   │       ├── PinNode.tsx                  技术点 pin
│   │       └── DependencyEdge.tsx           先修依赖虚线
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── ZoomControls.tsx
│   │   ├── MiniMap.tsx
│   │   ├── SearchBar.tsx                    Cmd+K 模糊搜索
│   │   └── SidePanel.tsx                    点击节点后右侧详情
│   └── data/
│       ├── types.ts
│       ├── theme.ts                         4 套学院主题色
│       └── useRoadmap.ts                    fetch + 布局缓存
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## 缩放层级（LOD）

视图状态由 [`src/map/lod.ts`](src/map/lod.ts) 的 `pickVisible(k)` 纯函数计算，主要阈值在 [`src/map/tokens.ts`](src/map/tokens.ts)：

| zoom 区间 | 显示内容 |
| --- | --- |
| `< 0.6` | 4 个学院 + 牌坊 + 主路径 + 远山 / 湖 |
| `0.6 – 1.4` | 章节楼宇（按 stars + leaf count 加权占地与高度） |
| `1.4 – 2.4` | 技术点 pin + 先修依赖弧线 |
| `> 2.4` | pin 图标点 + 全部标签强显 |

切换通过对每层 `<g>` 的 `opacity` 做 `smoothstep` 渐变完成，搭配 SVG 自身的 GPU 合成，整体在 5000+ SVG 节点下仍能保持 60 FPS（M1 / Ryzen 5）。

## 布局算法

详见 [`src/map/layout.ts`](src/map/layout.ts)：

1. 顶层 4 个区（P1–P4）按罗盘方位（bearing-from-north + 距离）放置在等距投影后的世界坐标里，西南留白给湖。
2. 区内章节用 `d3.treemap().tile(treemapSquarify)` 按预计算的叶子数加权摆放——内容多的章节自动占地更大。
3. 每个章节生成一个等距盒子（`half`、`height` 由 stars + leaf count 决定）；3 星以上为 landmark，顶部加光带。
4. 章节下的叶子节点围绕楼宇做半径递增的同心环 pin。
5. 解析 OPML 中 `[需 1.1, 1.2]` 这类 prereq 引用，转换为节点间 quadratic bezier 弧线。

## 部署

项目纯前端静态站，可一键部署到 Vercel / Netlify / GitHub Pages：

```bash
npm run build
# dist/ 目录就是最终产物
```

GitHub Pages 部署时记得把 `vite.config.ts` 的 `base` 设为 `/<repo-name>/`。

## 后续路线

- [ ] 课程详情页接入 markdown / mdx 内容源
- [ ] 用户进度本地存储（localStorage）+ 进度可视化（节点点亮）
- [ ] 升级渲染到 PixiJS / WebGL 以支持 1 万+ 节点
- [ ] 一张可下载的 PDF 版地图（vector → print）
