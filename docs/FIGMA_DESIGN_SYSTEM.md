# Cobalt 设计规范
## Figma 风格设计系统

> "极度克制，不干扰用户的创作"

---

## 目录

1. [设计理念](#设计理念)
2. [颜色系统](#颜色系统)
3. [圆角规范](#圆角规范)
4. [字体系统](#字体系统)
5. [间距系统](#间距系统)
6. [阴影系统](#阴影系统)
7. [组件状态](#组件状态)
8. [使用示例](#使用示例)

---

## 设计理念

Cobalt 的设计语言深受 Figma 启发，遵循以下核心原则：

### 极度克制

- **内容优先**：界面是容器，内容才是主角
- **减少视觉噪音**：每一像素都应有其目的
- **隐而不藏**：功能在需要时出现，不需要时退居幕后

### 高对比度灰阶

- 使用灰阶层次建立清晰的视觉层级
- 保留足够的对比度确保可读性
- 避免过度使用渐变和装饰

### 克制的色彩

- 品牌色仅用于关键交互（选中状态、分享按钮等）
- 大面积保持中性色
- 状态色传达明确语义（成功、警告、错误）

---

## 颜色系统

### 浅色模式 (Light Mode)

#### 基础灰阶

| 变量名 | HSL 值 | Hex | 用途 |
|--------|--------|-----|------|
| `--white` | 0 0% 100% | #FFFFFF | 纯白背景 |
| `--gray-50` | 0 0% 97% | #F7F7F7 | 极浅背景 |
| `--gray-100` | 0 0% 95% | #F2F2F2 | 次级背景 |
| `--gray-200` | 0 0% 90% | #E6E6E6 | 边框、分隔线 |
| `--gray-300` | 0 0% 80% | #CCCCCC | 禁用边框 |
| `--gray-400` | 0 0% 65% | #A6A6A6 | 占位符 |
| `--gray-500` | 0 0% 50% | #808080 | 次要文字 |
| `--gray-600` | 0 0% 40% | #666666 | 中等文字 |
| `--gray-700` | 0 0% 30% | #4D4D4D | 主要文字 |
| `--gray-800` | 0 0% 20% | #333333 | 深色文字 |
| `--gray-900` | 0 0% 12% | #1E1E1E | 标题文字 |
| `--black` | 0 0% 4% | #0D0D0D | 纯黑文字 |

#### 主题色（克制的使用）

| 变量名 | HSL 值 | Hex | 用途 |
|--------|--------|-----|------|
| `--primary` | 250 82% 60% | #7C3AED | 选中状态、关键按钮 |
| `--primary-hover` | 250 82% 55% | #6D28D9 | 悬停状态 |
| `--primary-active` | 250 82% 50% | #5B21B6 | 激活状态 |
| `--primary-light` | 250 82% 96% | #F3E8FF | 浅色背景强调 |

#### 功能色

| 变量名 | HSL 值 | Hex | 用途 |
|--------|--------|-----|------|
| `--success` | 142 76% 36% | #0D9488 | 成功状态 |
| `--success-light` | 142 76% 96% | #CCFBF1 | 成功背景 |
| `--warning` | 38 92% 50% | #F59E0B | 警告状态 |
| `--warning-light` | 38 92% 96% | #FEF3C7 | 警告背景 |
| `--error` | 0 84% 60% | #EF4444 | 错误状态 |
| `--error-light` | 0 84% 96% | #FEE2E2 | 错误背景 |

### 深色模式 (Dark Mode)

#### 基础灰阶

| 变量名 | HSL 值 | Hex | 用途 |
|--------|--------|-----|------|
| `--white` | 0 0% 100% | #FFFFFF | 文字（反转） |
| `--gray-50` | 0 0% 12% | #1E1E1E | 深色背景 |
| `--gray-100` | 0 0% 15% | #262626 | 次级背景 |
| `--gray-200` | 0 0% 20% | #333333 | 卡片背景 |
| `--gray-300` | 0 0% 25% | #404040 | 边框、分隔线 |
| `--gray-400` | 0 0% 35% | #595959 | 次要边框 |
| `--gray-500` | 0 0% 50% | #808080 | 占位符 |
| `--gray-600` | 0 0% 65% | #A6A6A6 | 次要文字 |
| `--gray-700` | 0 0% 80% | #CCCCCC | 中等文字 |
| `--gray-800` | 0 0% 90% | #E6E6E6 | 主要文字 |
| `--gray-900` | 0 0% 95% | #F2F2F2 | 标题文字 |
| `--black` | 0 0% 4% | #0D0D0D | 纯黑背景 |

#### 主题色（深色调整）

| 变量名 | HSL 值 | Hex | 用途 |
|--------|--------|-----|------|
| `--primary` | 250 70% 65% | #8B5CF6 | 选中状态 |
| `--primary-hover` | 250 70% 70% | #A78BFA | 悬停状态 |
| `--primary-active` | 250 70% 60% | #7C3AED | 激活状态 |
| `--primary-light` | 250 70% 20% | #312E81 | 深色背景强调 |

### CSS 变量映射

```css
/* 语义化映射 */
:root {
  --background: var(--gray-50);
  --foreground: var(--gray-900);
  --card: var(--white);
  --card-foreground: var(--gray-900);
  --border: var(--gray-200);
  --input: var(--gray-200);
  --ring: var(--primary);
}

.dark {
  --background: var(--gray-50);
  --foreground: var(--gray-800);
  --card: var(--gray-100);
  --card-foreground: var(--gray-800);
  --border: var(--gray-300);
  --input: var(--gray-300);
}
```

---

## 圆角规范

统一的圆角系统保持视觉一致性。

| 尺寸 | 值 | 用途 |
|------|-----|------|
| `--radius-none` | 0px | 无圆角（特殊场景） |
| `--radius-sm` | 4px | 小元素（标签、徽章） |
| `--radius-md` | 6px | 按钮、输入框 |
| `--radius-lg` | 8px | 卡片、面板 |
| `--radius-xl` | 10px | 对话框、弹窗 |
| `--radius-full` | 9999px | 圆形按钮、头像 |

### 使用建议

- 小组件（Badge、Tag）：`sm`
- 交互元素（Button、Input）：`md`
- 容器元素（Card、Panel）：`lg`
- 浮层元素（Dialog、Popover）：`xl`

---

## 字体系统

### 字体栈

使用系统字体栈，确保在各平台上的原生体验：

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
             'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
             sans-serif;
```

代码字体：

```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono',
             'Droid Sans Mono', 'Source Code Pro', monospace;
```

### 字重层次

| 名称 | 字重 | 使用场景 |
|------|------|----------|
| Light | 300 | 极少使用 |
| Regular | 400 | 正文、普通文本 |
| Medium | 500 | 次级标题、强调 |
| Semibold | 600 | 三级标题、重要文字 |
| Bold | 700 | 一二级标题 |

### 字号规范

| 名称 | 大小 | 行高 | 使用场景 |
|------|------|------|----------|
| `xs` | 12px | 16px | 辅助说明、标签 |
| `sm` | 14px | 20px | 次要文字、说明 |
| `base` | 16px | 24px | 正文内容 |
| `lg` | 18px | 28px | 次级标题 |
| `xl` | 20px | 28px | 三级标题 |
| `2xl` | 24px | 32px | 二级标题 |
| `3xl` | 30px | 38px | 一级标题 |
| `4xl` | 36px | 44px | 特殊大标题 |

### 文字颜色

| 场景 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 主标题 | gray-900 (#1E1E1E) | gray-100 (#F2F2F2) |
| 正文 | gray-700 (#4D4D4D) | gray-300 (#CCCCCC) |
| 次要文字 | gray-500 (#808080) | gray-500 (#808080) |
| 占位符 | gray-400 (#A6A6A6) | gray-500 (#808080) |
| 禁用 | gray-300 (#CCCCCC) | gray-400 (#595959) |

---

## 间距系统

基于 4px 基准的 8点栅格系统。

### 间距刻度

| 名称 | 值 | 用途 |
|------|-----|------|
| `0` | 0px | 无间距 |
| `px` | 1px | 细边框 |
| `0.5` | 2px | 紧密间距 |
| `1` | 4px | 极小间距 |
| `1.5` | 6px | 小间距 |
| `2` | 8px | 基础间距 |
| `2.5` | 10px | |
| `3` | 12px | 小段落间距 |
| `3.5` | 14px | |
| `4` | 16px | 标准间距 |
| `5` | 20px | 舒适间距 |
| `6` | 24px | 大间距 |
| `7` | 28px | |
| `8` | 32px | 区块间距 |
| `9` | 36px | |
| `10` | 40px | 页面边距 |
| `12` | 48px | 大区块间距 |
| `16` | 64px | 页面级间距 |
| `20` | 80px | 特大间距 |

### 推荐组合

| 组件 | 内边距 (padding) | 外边距 (margin) |
|------|------------------|-----------------|
| Button | 8px 16px | 4px |
| Input | 8px 12px | 8px |
| Card | 16px | 16px |
| Dialog | 24px | - |

---

## 阴影系统

克制的阴影，主要用于层级区分。

| 名称 | 值 | 使用场景 |
|------|-----|----------|
| `--shadow-xs` | `0 1px 2px rgb(0 0 0 / 0.05)` | 极细微层级 |
| `--shadow-sm` | `0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06)` | 轻微浮起 |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | 卡片、面板 |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | 弹窗、下拉 |
| `--shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | 模态对话框 |

### 使用原则

- 页面元素默认无阴影
- 卡片使用 `sm` 或 `md`
- 浮层元素（Dropdown、Popover）使用 `lg`
- 模态对话框使用 `xl`

---

## 组件状态

### 交互状态

| 状态 | 描述 | CSS 实现 |
|------|------|----------|
| Default | 默认状态 | 基础样式 |
| Hover | 鼠标悬停 | 背景色加深 5% |
| Active | 点击激活 | 背景色加深 10% |
| Focus | 键盘聚焦 | 添加 ring 边框 |
| Disabled | 禁用状态 | 透明度 50%，指针事件禁用 |
| Loading | 加载状态 | 骨架屏或加载指示器 |

### Focus Ring

聚焦状态的环形边框，确保键盘导航的可访问性：

```css
.focus-ring:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* 或使用 ring 工具 */
.focus-visible:focus-visible {
  @apply ring-2 ring-ring ring-offset-2 ring-offset-background;
}
```

---

## 使用示例

### 按钮

```tsx
// 主要按钮 - 仅用于最重要操作
<button className="
  bg-primary text-primary-foreground
  px-4 py-2 rounded-md
  hover:bg-primary-hover
  active:bg-primary-active
  focus:ring-2 focus:ring-ring focus:ring-offset-2
  transition-colors
">
  分享
</button>

// 次要按钮 - 常用操作
<button className="
  bg-white border border-gray-200 text-gray-700
  px-4 py-2 rounded-md
  hover:bg-gray-50
  focus:ring-2 focus:ring-ring focus:ring-offset-2
  transition-colors
">
  取消
</button>

// 幽灵按钮 - 低优先级操作
<button className="
  text-gray-600
  px-4 py-2 rounded-md
  hover:bg-gray-100
  focus:ring-2 focus:ring-ring focus:ring-offset-2
  transition-colors
">
  编辑
</button>
```

### 输入框

```tsx
<input className="
  w-full
  bg-white border border-gray-200
  px-3 py-2 rounded-md
  text-gray-700 placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
  disabled:bg-gray-50 disabled:text-gray-400
  transition-colors
" />
```

### 卡片

```tsx
<div className="
  bg-white rounded-lg p-4
  border border-gray-200
  shadow-sm
  hover:shadow-md
  transition-shadow
">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    标题
  </h3>
  <p className="text-base text-gray-600">
    内容描述
  </p>
</div>
```

### 选中状态

```tsx
// 列表项选中
<div className="
  bg-primary/5 border-l-2 border-primary
  px-4 py-3
  text-gray-900
">
  已选中的项目
</div>

// 标签页选中
<button className="
  border-b-2 border-primary
  px-4 py-2
  text-primary font-medium
">
  激活的标签
</button>
```

### 分隔线

```tsx
// 水平分隔线
<hr className="border-t border-gray-200 my-6" />

// 垂直分隔线
<div className="w-px h-6 bg-gray-200" />
```

---

## 设计清单

在实现新组件时，请遵循以下检查清单：

- [ ] 使用合适的圆角（sm/md/lg/xl）
- [ ] 确保文字颜色符合层级（900/700/500）
- [ ] 添加 hover 和 focus 状态
- [ ] 使用语义化的颜色变量
- [ ] 保持克制的阴影使用
- [ ] 遵循 8px 栅格系统
- [ ] 确保可访问性（对比度、焦点环）
- [ ] 同时适配浅色和深色模式

---

## 参考资源

- [Figma Design](https://www.figma.com) - 设计灵感来源
- [Tailwind CSS](https://tailwindcss.com) - 工具类框架
- [Radix UI](https://www.radix-ui.com) - 无障碍组件基础
