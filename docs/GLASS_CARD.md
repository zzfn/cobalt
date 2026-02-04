# 液态玻璃效果组件使用指南

## 简介

`GlassCard` 组件提供了现代化的液态玻璃（Glassmorphism）效果，支持多种样式变体和自定义选项。

## 基础使用

```tsx
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from "@/components/ui/glass-card"

function MyComponent() {
  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>标题</GlassCardTitle>
        <GlassCardDescription>描述文字</GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent>
        <p>卡片内容</p>
      </GlassCardContent>
      <GlassCardFooter>
        <button>操作按钮</button>
      </GlassCardFooter>
    </GlassCard>
  )
}
```

## Props 配置

### GlassCard

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `"default" \| "light" \| "dark" \| "colored"` | `"default"` | 玻璃效果变体 |
| `blur` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | 模糊强度 |
| `bordered` | `boolean` | `true` | 是否显示边框 |
| `shadow` | `boolean` | `true` | 是否显示阴影 |

## 样式变体

### 1. 默认样式 (default)
```tsx
<GlassCard variant="default">
  {/* 适中的透明度和模糊效果 */}
</GlassCard>
```

### 2. 浅色样式 (light)
```tsx
<GlassCard variant="light">
  {/* 更明亮的玻璃效果 */}
</GlassCard>
```

### 3. 深色样式 (dark)
```tsx
<GlassCard variant="dark">
  {/* 更深的玻璃效果 */}
</GlassCard>
```

### 4. 彩色样式 (colored)
```tsx
<GlassCard variant="colored">
  {/* 带主题色的玻璃效果 */}
</GlassCard>
```

## 模糊强度

```tsx
{/* 弱模糊 */}
<GlassCard blur="sm">...</GlassCard>

{/* 中等模糊（默认） */}
<GlassCard blur="md">...</GlassCard>

{/* 强模糊 */}
<GlassCard blur="lg">...</GlassCard>

{/* 超强模糊 */}
<GlassCard blur="xl">...</GlassCard>
```

## 自定义样式

```tsx
<GlassCard
  variant="light"
  blur="lg"
  bordered={false}
  shadow={false}
  className="hover:scale-105 transition-transform"
>
  {/* 自定义样式 */}
</GlassCard>
```

## 最佳实践

### 1. 背景选择
液态玻璃效果在有色彩或图片背景上效果最佳：

```tsx
<div className="bg-gradient-to-br from-blue-500 to-purple-500 p-8">
  <GlassCard>
    {/* 玻璃效果在渐变背景上很好看 */}
  </GlassCard>
</div>
```

### 2. 嵌套使用
可以嵌套使用不同变体的玻璃卡片：

```tsx
<GlassCard variant="dark" blur="lg">
  <GlassCard variant="light" blur="md">
    {/* 嵌套玻璃效果 */}
  </GlassCard>
</GlassCard>
```

### 3. 响应式设计
结合 Tailwind 的响应式类：

```tsx
<GlassCard className="w-full md:w-1/2 lg:w-1/3">
  {/* 响应式宽度 */}
</GlassCard>
```

## 窗口透明（可选）

如果需要整个窗口透明效果，可以在 `tauri.conf.json` 中启用：

```json
{
  "app": {
    "windows": [{
      "transparent": true,
      "decorations": false
    }]
  }
}
```

**注意**：启用窗口透明后，需要确保根元素背景透明：

```css
body {
  background: transparent;
}
```

## 示例

查看完整示例：`src/components/examples/GlassCardExample.tsx`

运行示例：
```bash
pnpm tauri dev
```

## 浏览器兼容性

- ✅ Chrome/Edge 76+
- ✅ Safari 9+
- ✅ Firefox 103+
- ⚠️ 旧版浏览器可能不支持 `backdrop-filter`

## 性能优化

1. 避免过度使用超强模糊（`blur="xl"`）
2. 嵌套层级不要超过 3 层
3. 在移动设备上考虑使用较弱的模糊效果
