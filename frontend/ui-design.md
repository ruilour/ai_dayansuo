# AI答研所 — UI 设计规范

> 基于 `.design-context.md` 设计上下文的具体实现指南。
> **核心视觉原则**：深色葡萄紫基调、内容为光源、圆润亲和。
> **重要**：UI 中尽量不使用 emoji（避免跨平台渲染不一致），改用 SVG 图标或纯文字表达。

---

## 1. 色彩系统（OKLCH）

### 1.1 品牌色 — 葡萄紫

所有颜色使用 `oklch()` 格式，确保感知一致性。色相 hue 控制在 280°–290° 之间的矿物紫，避免过亮/过霓虹。

```css
/* 品牌色：葡萄紫（深色主题专用） */
--color-brand-50:  oklch(0.92 0.06 290);   /* 极浅紫 — 标签/徽章背景 */
--color-brand-100: oklch(0.85 0.08 290);   /* 浅紫背景 */
--color-brand-200: oklch(0.75 0.12 290);   /* 边框/次要元素 */
--color-brand-300: oklch(0.65 0.16 285);   /* 辅助色 */
--color-brand-400: oklch(0.58 0.20 285);   /* 悬停态（hover 变亮） */
--color-brand-500: oklch(0.52 0.22 280);   /* 主色按钮/链接 */
--color-brand-600: oklch(0.46 0.20 280);   /* 按压态 */
--color-brand-700: oklch(0.40 0.18 280);   /* 深紫 */
--color-brand-800: oklch(0.35 0.15 280);   /* 更深 */
--color-brand-900: oklch(0.30 0.12 280);   /* 最深 */
```

### 1.2 深色主题中性色（紫调中性）

中性色向葡萄紫色相（290°）轻微倾斜，chroma 随亮度降低。

```css
--color-surface:           oklch(0.12 0.008 290);  /* 页面背景 — 深紫黑 */
--color-surface-card:      oklch(0.16 0.012 290);  /* 卡片/面板背景 */
--color-surface-elevated:  oklch(0.20 0.014 290);  /* 弹窗/模态框 */
--color-surface-border:    oklch(0.24 0.016 290);  /* 边框/分隔线 */
--color-surface-disabled:  oklch(0.30 0.018 290);  /* 禁用态 */

--color-text-primary:    oklch(0.92 0.005 290);  /* 标题 — 近白 */
--color-text-body:       oklch(0.80 0.008 290);  /* 正文 */
--color-text-muted:      oklch(0.58 0.010 290);  /* 次要文字 */
--color-text-placeholder: oklch(0.42 0.012 290); /* 占位符 */
```

### 1.3 语义色（深色主题版）

```css
--color-success: oklch(0.65 0.15 150);   /* 柔和绿 */
--color-warning: oklch(0.75 0.15 85);    /* 暖琥珀 */
--color-danger:  oklch(0.65 0.18 30);    /* 暖红 */
--color-info:    oklch(0.60 0.12 250);   /* 冷蓝（仅用作点缀） */
```

### 1.4 阴影（深色主题改用微光）

传统阴影在深色背景上不可见。使用极低不透明度的白色模拟"微光"。

```css
--shadow-sm: 0 1px 2px oklch(1 0 0 / 0.03), 0 1px 3px oklch(1 0 0 / 0.04);
--shadow-md: 0 4px 6px oklch(1 0 0 / 0.04), 0 2px 4px oklch(1 0 0 / 0.03);
--shadow-lg: 0 10px 15px oklch(1 0 0 / 0.05), 0 4px 6px oklch(1 0 0 / 0.04);
--shadow-xl: 0 20px 25px oklch(1 0 0 / 0.06), 0 8px 10px oklch(1 0 0 / 0.04);
```

### 1.5 应用规则

| 用途 | 颜色 | 说明 |
|------|------|------|
| 页面背景 | `--color-surface` | 深紫黑 |
| 卡片/面板 | `--color-surface-card` | 稍亮 |
| 弹窗 | `--color-surface-elevated` | 更亮一层 |
| 主按钮 | `--color-brand-500` | 葡萄紫 |
| 按钮悬停 | `--color-brand-400` | 更亮 |
| 链接文字 | `--color-brand-400` | 可识别 |
| 正文 | `--color-text-body` | 浅灰 |
| 标题 | `--color-text-primary` | 近白 |
| 分割线 | `--color-surface-border` | 若有似无 |
| 禁用态 | `--color-surface-disabled` | 灰色紫 |

> ⚠️ 蓝色（`--color-info`）仅用于信息提示和辅助链接，**不主导界面**。

---

## 2. 字体系统

### 2.1 字体栈

```css
--font-display: 'Noto Serif SC', 'Newsreader', Georgia, serif;
--font-body: 'Noto Sans SC', -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

> 深色背景下字体渲染稍有不同：正文行高增加 0.05–0.1，防止浅色字在深色背景上显得发虚。

### 2.2 字号层级

```css
--text-xs:   0.75rem;    /* 12px — 辅助信息 */
--text-sm:   0.875rem;   /* 14px — 次要文字/元数据 */
--text-base: 1rem;       /* 16px — 正文 */
--text-lg:   1.25rem;    /* 20px — 引文/摘要 */
--text-xl:   1.5rem;     /* 24px — 小标题 */
--text-2xl:  1.875rem;   /* 30px — 页面标题 */
--text-3xl:  2.375rem;   /* 38px — 大标题 */
```

### 2.3 行高（深色主题调整）

```css
--leading-tight:  1.25;   /* 标题（深色+0.05） */
--leading-normal: 1.7;    /* 正文（深色+0.1） */
--leading-relaxed: 1.9;   /* 长文阅读 */
```

### 2.4 应用规则

- 同一页面最多使用**两种字族**（展示体 + 正文字）
- 正文线宽 **65–75ch**
- **禁止**全部使用默认系统字体堆栈

---

## 3. 间距系统

### 3.1 间距令牌

```css
--space-xs:  0.25rem;    /* 4px  */
--space-sm:  0.5rem;     /* 8px  */
--space-md:  0.75rem;    /* 12px */
--space-lg:  1rem;       /* 16px */
--space-xl:  1.5rem;     /* 24px */
--space-2xl: 2rem;       /* 32px */
--space-3xl: 3rem;       /* 48px */
--space-4xl: 4rem;       /* 64px */
--space-5xl: 6rem;       /* 96px */
```

### 3.2 间距原则

- **尽量用 `gap` 而非 `margin`**
- 标题上方间距 > 下方间距（视觉上"属于"下方内容）
- **不做均匀填充** — 用疏密变化创造视觉节奏

---

## 4. 圆角系统

```css
--radius-sm:   0.375rem;  /* 6px  — 标签/徽章 */
--radius-md:   0.5rem;    /* 8px  — 按钮/输入框 */
--radius-lg:   0.75rem;   /* 12px — 卡片 */
--radius-xl:   1rem;      /* 16px — 模态框/大面板 */
--radius-full: 9999px;    /* 圆形/药丸 */
```

---

## 5. 图标系统

### 5.1 规则

- **UI 界面不使用 emoji** — 统一使用 SVG 图标
- 图标风格：线性，圆头端点，2px 描边
- 所有图标应为 `1em` 尺寸，随文字缩放

### 5.2 常用图标映射

| 场景 | 图标名（项目 Icons.jsx） | 说明 |
|------|------------------------|------|
| 发送 | `IconSendHorizonal` | — |
| 存入 | `IconSave` / `IconArchive` | — |
| 继续聊 | `IconMessageSquare` | — |
| 新话题 | `IconPlus` | — |
| 分享 | `IconShare2` | — |
| 点赞 | `IconHeart` / `IconHeartFilled` | 填充态表示已赞 |
| 评论 | `IconMessageCircle` | — |
| 广场 | `IconGlobe` | — |
| 搜索 | `IconSearch` | — |
| 关闭 | `IconX` | — |
| 用户 | `IconUser` | — |
| 退出 | `IconLogOut` | — |
| 返回 | `IconChevronLeft` | — |
| 展开 | `IconChevronDown` | — |
| 收起 | `IconChevronRight` | — |
| 加载 | `IconLoader` | 自带旋转动画 |
| 确认 | `IconCheck` | — |
| 锁定 | `IconLock` | — |
| 菜单 | `IconMoreHorizontal` | — |
| 回复 | `IconReply` | — |
| 删除 | `IconTrash2` | — |
| logo | `IconFlask` | 烧瓶图标作为品牌标识 |

### 5.3 例外

- 不修改用户自己在内容中输入的 emoji
- 用户默认头像：用首字母 SVG 圆形代替 emoji

---

## 6. 组件设计规范

### 6.1 导航栏

```
┌──────────────────────────────────────────────┐
│  [葡萄紫烧瓶]  AI答研所    广场    [登录/注册] │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │
└──────────────────────────────────────────────┘
```

- 高度：56px（`h-14`）
- 背景：`--color-surface-card` + 底部细描边 `--color-surface-border`
- Logo：烧瓶 SVG 图标（葡萄紫）+ 文字
- 当前导航项：底部品牌色条

### 6.2 对话页

- **用户气泡**：右对齐，`--color-brand-500` 背景，`--radius-xl` + `--radius-md` 右下
- **AI 回答**：左对齐，纯文字，无背景框，`--color-text-body`
- **思考过程**：可折叠，`--color-surface-card` 背景，`--color-text-muted`
- **输入框**：`--color-surface` 背景，聚焦时 `--color-brand-500` 边框
- **三按钮**："继续聊"默认高亮（品牌色实心）

### 6.3 帖子卡片

- 卡片：`--color-surface-card` 背景，`--color-surface-border` 边框
- 用户名：`--color-text-muted`
- 点赞/评论数：`--color-text-placeholder`
- 标题：`--color-text-primary`

### 6.4 弹窗/模态框

- 背景：`--color-surface-elevated`（比卡片亮一层）
- 遮罩：`oklch(0 0 0 / 0.65)`（深黑半透明）
- 过渡：从底部淡入

### 6.5 空状态

- SVG 线描颜色：`--color-surface-disabled`
- 标题：`--color-text-muted`
- 描述：`--color-text-placeholder`
- 使用 SVG 插画，非 emoji

### 6.6 评论区

- 头像：圆形 SVG 占位，`--color-brand-200` 背景，白色首字母
- 一级评论：直接展示
- 二级评论：左缩进 + `--color-surface-border` 竖线

---

## 7. 动效指南

### 7.1 缓动曲线

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--ease-in-out:    cubic-bezier(0.65, 0, 0.35, 1);
```

### 7.2 应用

| 场景 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| 页面进入 | opacity + translateY | 300ms | ease-out-quart |
| 模态弹窗 | opacity + scale | 250ms | ease-out-quart |
| 按钮悬停 | background-color/sombox-shadow | 150ms | ease-in-out |
| 卡片悬停 | translateY | 200ms | ease-out-quart |
| 消息出现 | opacity + translateY | 200ms | ease-out-quart |

### 7.3 规则

- **只动 transform 和 opacity**
- 尊重 `prefers-reduced-motion`
- 不做弹跳/弹性缓动

---

## 8. Tailwind 配置

```js
// tailwind.config.js 关键配置
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'oklch(0.92 0.06 290)',
          100: 'oklch(0.85 0.08 290)',
          200: 'oklch(0.75 0.12 290)',
          300: 'oklch(0.65 0.16 285)',
          400: 'oklch(0.58 0.20 285)',
          500: 'oklch(0.52 0.22 280)',
          600: 'oklch(0.46 0.20 280)',
          700: 'oklch(0.40 0.18 280)',
          800: 'oklch(0.35 0.15 280)',
          900: 'oklch(0.30 0.12 280)',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'Newsreader', 'Georgia', 'serif'],
        body: ['"Noto Sans SC"', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'monospace'],
      },
    },
  },
}
```

---

## 9. 设计检查清单

使用 `/magistero` 设计前，逐项确认：

- [ ] 深色主题（`<html class="dark">`）
- [ ] 颜色全部使用 OKLCH
- [ ] UI 中无 emoji（头像占位、用户内容除外）
- [ ] 葡萄紫为主色，蓝色仅作点缀
- [ ] 正文线宽 ≤ 75ch
- [ ] 使用 4pt 间距体系
- [ ] 动画只使用 transform + opacity
- [ ] 尊重 `prefers-reduced-motion`
- [ ] 标题使用展示字体，正文使用正文字体
- [ ] 卡片 `--radius-lg`，按钮 `--radius-md`
- [ ] 无 `border-left` 彩色侧边条纹（absolute ban）
- [ ] 无渐变文字（absolute ban）
- [ ] 空状态使用 SVG 线描（非 emoji）
- [ ] 左侧边栏不采用树形导航风格
- [ ] 无玻璃拟态装饰性使用
- [ ] 无霓虹发光/赛博朋克过度效果
