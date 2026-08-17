# 小程序端 Icon 与组件限制说明

本文档说明微信小程序（Taro）环境下 **Icon** 与 **UI 组件** 的平台限制，以及本项目当前方案的设计原因与使用方式。

相关代码：

| 包 / 应用 | 职责 |
|-----------|------|
| `packages/icons` | 语义化图标注册表、Iconify 子集、SVG / data URI 构建 |
| `packages/ui` | Web 端设计系统（DOM + CSS Modules） |
| `packages/ui-taro` | 小程序端薄封装层（Taro 组件 + SCSS） |
| `packages/campaign-taro` | 活动页 Schema 渲染（小程序实现） |
| `apps/mini-program` | Taro 应用入口与页面 |

---

## 一、小程序运行环境的共性限制

微信小程序不是浏览器，Taro 只是把 React 语法编译为小程序组件树，底层仍是微信的运行时。

| 限制 | 影响 |
|------|------|
| **无 DOM** | 不能使用 `document`、`window`、`<div>`、`<button>`、`createPortal` 等 Web API |
| **组件白名单** | 只能使用 `@tarojs/components` 提供的标签（`View`、`Text`、`Image`、`Button` 等） |
| **样式子集** | 不支持完整 CSS（如 `aspect-ratio` 部分机型、`position: fixed` 行为差异、选择器限制等） |
| **尺寸单位** | 设计稿 750 宽，常用 `rpx`；`pxtransform` 会把 `px` 转为 `rpx` |
| **包体积** | 主包 2MB、分包等限制，不宜引入完整 Iconify 图标集或 `@iconify/react` |
| **网络与资源** | 图片域名须配置白名单；`Image` 对 SVG data URI 的支持与 Web `<img>` 行为不同 |

因此 **不能直接把 `packages/ui` 拿来给小程序用**，需要单独的 `packages/ui-taro` 实现层。

---

## 二、Icon 的限制

### 2.1 Web 方案在小程序上不可行

Web 端 `Icon` 使用 `@iconify/react`，在运行时按 Iconify ID 渲染内联 SVG：

```tsx
// packages/ui — 仅适用于浏览器
<IconifyIcon icon={getIconifyId(name)} width={size} color={color} />
```

小程序端存在以下问题：

1. **`@iconify/react` 依赖 DOM**，无法在微信小程序环境运行。
2. **不能随意内联 `<svg>`**：React 写的 SVG 不会按 Web 方式直接变成可用的原生节点；需走 `Image`、iconfont 或微信内置能力。
3. **手抄 SVG path 不可维护**：图标一多，path 分散在各处，换图标集或改风格成本极高。

### 2.2 `currentColor` 在 data URI 中失效

小程序 `Icon` 将 SVG 编成 `data:image/svg+xml,...` 后交给 `<Image src={...} />` 渲染。此时 SVG 不再继承外层 CSS 的 `color`，`fill="currentColor"` **不会**随父级文字色变化。

因此 `packages/icons/src/render.ts` 在生成 SVG 时，会把 `currentColor` **替换为显式颜色值**：

```ts
function applyColorToSvgBody(body: string, color: string): string {
  return body
    .replace(/fill="currentColor"/g, `fill="${color}"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`);
}
```

业务侧传 `color` prop（如点赞激活态 `#ff6b4a`、默认 `#b2bec3`），而不是依赖 CSS 继承。

### 2.3 其他常见 Icon 方案对比

| 方案 | 优点 | 在本项目的局限 |
|------|------|----------------|
| 微信内置 `icon` 组件 | 零成本 | 样式固定、语义少，难以与 Web 统一 |
| 本地 iconfont | 体积小 | 需维护字体文件；换图标要重新切图/打包 |
| 图片雪碧图 / PNG | 兼容性好 | 多倍图、变色困难 |
| 内联 SVG 组件 | Web 体验好 | 小程序不支持 |
| **Iconify 子集 + data URI + Image** | 与 Web 共用语义名、可换图标集 | 需构建子集；颜色需显式传入 |

---

## 三、当前 Icon 方案

### 3.1 架构分层

```
业务（ProductCard、TabBar、活动页…）
        ↓  name="heart"  color="#ff6b4a"  filled
packages/ui-taro / Icon
        ↓  buildIconDataUri()
packages/icons
  ├── registry.ts          语义名 → Iconify ID（如 mdi-light:heart）
  ├── iconify-lookup.json  构建时生成的精简子集（约数 KB）
  └── render.ts            iconToSVG → 上色 → data URI
        ↓
<TaroImage src="data:image/svg+xml,..." />
```

**Web 与小程序共用**：

- `packages/icons` 的 **语义注册表**（`heart`、`cart`、`search`…）
- **同一套 Iconify 图标集**（当前为 `mdi-light`）

**分端实现**：

- Web：`@iconify/react` 运行时渲染
- 小程序：`buildIconDataUri` + `Image`

### 3.2 小程序 `Icon` 实现要点

```tsx
// packages/ui-taro/src/components/Icon.tsx
const src = buildIconDataUri(name, { size, color, filled });
return (
  <View style={{ width: sizePx, height: sizePx }}>
    <Image src={src} mode="aspectFit" style={{ width: sizePx, height: sizePx }} />
  </View>
);
```

- 使用 `useMemo` 缓存 data URI，避免重复编码。
- `filled` 通过 registry 映射到另一 Iconify ID（如空心/实心），而非 CSS 伪类。

### 3.3 子集生成（控制包体积）

不能把整个 `@iconify-json/mdi-light` 打进小程序包。流程：

1. 在 `packages/icons/src/registry.ts` 登记用到的 Iconify ID。
2. 运行 `npm run generate --workspace=@shiguang/icons`。
3. 脚本扫描 registry，从图标集提取所需图标，写入 `src/generated/iconify-lookup.json`。

未登记或未 generate 的图标，运行时会抛错，避免静默缺失。

### 3.4 如何换图标

1. 打开 [icon-sets.iconify.design/mdi-light](https://icon-sets.iconify.design/mdi-light/) 挑选图标。
2. 修改 `packages/icons/src/registry.ts` 中对应语义名的 `filled` / `outline` ID。
3. 执行 `npm run generate --workspace=@shiguang/icons`。
4. Web 与小程序同步生效，**无需手抄 path**。

---

## 四、组件的限制

### 4.1 不能复用 `packages/ui`

| 能力 | Web (`packages/ui`) | 小程序限制 |
|------|---------------------|------------|
| 基础标签 | `<button>`、`<img>` | 须用 `Button`、`Image` 等 Taro 组件 |
| 样式 | CSS Modules（`*.module.css`） | 使用 SCSS + 类名；全局注入 `tokens.scss` |
| 弹层 | `Modal` + `createPortal` | 无 Portal；常用 `Taro.showModal` 或页面内绝对定位 |
| 提示 | `ToastProvider` + Context | 使用 `Taro.showToast` |
| 布局 | Flex / Grid 较完整 | 基本 Flex 可用，部分属性有差异 |
| 图片比例 | CSS `aspect-ratio` | 常用 `padding-top` 百分比占位（见 `ui-taro/Image`） |
| 主题 | `ThemeProvider` + CSS 变量 | 通过 SCSS 变量与类名，无完整 CSS 变量生态 |

`packages/ui-taro` 目前导出的组件：`Button`、`Icon`、`Image`、`Price`、`Loading`、`Empty`、`ProductCard`。  
Web 独有、小程序未抽象的有：`Modal`、`Toast`、`Tabs`、`Skeleton`、`Countdown`（活动倒计时在 `campaign-taro` 内单独实现）等。

### 4.2 事件与交互差异

- 点击区域：小程序用 `View` 的 `onClick`，需注意与滚动、冒泡的交互（如 `ProductCard` 点赞要 `stopPropagation`）。
- `Button`：微信 `Button` 有默认样式与 `open-type` 等能力，需用 class 覆盖默认外观。
- 列表滚动：Feed 等页面使用 `ScrollView` / 页面级 `useReachBottom`，而非 Web 的 `window` 滚动。

### 4.3 富文本与活动块

`campaign-taro` 的 `RichTextBlock` 将内容按行拆成多个 `Text`，**未使用** `dangerouslySetInnerHTML` 或完整 HTML 解析——小程序对富文本、外链、脚本有安全限制，复杂 HTML 应使用微信 `rich-text` 组件或服务端裁剪后的结构化数据。

活动页整体通过 `campaign-taro` 单独维护，与 Web 的 `apps/campaign` 渲染器 **共享 Schema 类型**（`@shiguang/campaign-schema`），但 Block 实现分端。

### 4.4 Monorepo 编译配置

小程序通过 Taro 直接编译 monorepo 内 TS 源码（非预构建 dist），在 `apps/mini-program/config/index.ts` 中：

- **`compile.include`**：把 `shared`、`api-client`、`ui-taro`、`icons`、`campaign-taro` 等纳入编译。
- **`alias`**：将 `@shiguang/*` 指到各包 `src`。
- **`extensionAlias`**：`shared` 等包使用 Node ESM 风格的 `.js` 后缀导入时，映射到 `.ts` 源文件（Webpack 与 Vite 行为不同，小程序侧必须配置）。

---

## 五、为什么采用「语义层 + 分端实现」

这是 IMPLEMENTATION_PLAN 阶段 8 所说的 **跨端组件抽象（thin wrapper）**：

1. **统一对外 API**：如 `Button` 的 `variant`、`size`、`loading`，业务写法两端接近。
2. **统一设计 token**：`ui-taro` 的 `tokens.scss` 与 Web `tokens.css` 颜色、间距语义对齐。
3. **平台差异内聚**：Icon 的 data URI、Image 的占位比例、Toast/Modal 走原生 API，不泄漏到页面。
4. **共享逻辑与类型**：`@shiguang/shared`、`@shiguang/api-client`、`@shiguang/campaign-schema` 跨端复用。
5. **可维护的图标体系**：registry + Iconify 子集，避免双端各维护一套 path。

不采用「一套 UI 源码编译到两端」的原因：小程序对 DOM、CSS、包体积、内置组件的限制与 Web 差异大，强行单包会导致大量 `if (isWeapp)` 分支，反而更难维护。

---

## 六、Web 与小程序对照

| 项目 | Web | 小程序 |
|------|-----|--------|
| UI 包 | `@shiguang/ui` | `@shiguang/ui-taro` |
| Icon 渲染 | `@iconify/react` | `buildIconDataUri` + `Image` |
| Icon 换色 | `color` prop / CSS | 必须传 `color` prop（显式写入 SVG） |
| 图标注册 | `packages/icons/registry.ts` | 同左 |
| 样式 | CSS Modules + CSS 变量 | SCSS + rpx |
| 轻提示 | `useToast()` | `Taro.showToast()` |
| 对话框 | `<Modal />` | `Taro.showModal()` 或自绘页面层 |
| 活动渲染 | `apps/campaign` | `packages/campaign-taro` |
| 设计宽度 | px / rem | 750 设计稿 + rpx |

---

## 七、开发注意事项

### Icon

- 新增语义图标：先改 `registry.ts`，再 `npm run generate --workspace=@shiguang/icons`。
- 激活态需要视觉区别时：在 registry 为 `filled` / `outline` 配置不同 Iconify ID，并传 `filled` + `color`。
- 不要在小程端引入 `@iconify/react` 或完整图标 JSON。

### 组件

- 新通用组件：在 `ui-taro` 增加实现，Props 尽量与 `ui` 对齐；平台特有行为写在组件内部。
- 图片使用 `ui-taro` 的 `Image`，通过 `aspectRatio` 避免列表加载时高度跳动。
- 需要 Modal/Toast 时优先用微信 API，或评估是否在 `ui-taro` 补薄封装。
- 修改 `packages/shared` 等包的相对导入时，注意保留 `.js` 后缀与小程序 `extensionAlias` 配置。

### 调试

- 真机图片、API 须配置合法域名；开发期可在开发者工具关闭域名校验。
- 自定义 TabBar 使用 `ui-taro` 的 `Icon`，与 Feed 卡片点赞图标共用同一套 registry。

---

## 八、延伸阅读

- [拾光市集 · 微信小程序开发指南](./mini-program.md) — 启动、登录、分享、部署
- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) 阶段 8 — 跨端目标与任务清单
- [Iconify 文档](https://iconify.design/)
- [Taro 文档](https://docs.taro.zone/)
