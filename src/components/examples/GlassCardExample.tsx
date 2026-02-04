import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardFooter,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"

/**
 * 液态玻璃效果示例页面
 */
export function GlassCardExample() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white text-center mb-12">
          液态玻璃效果展示
        </h1>

        {/* 默认样式 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>默认玻璃效果</GlassCardTitle>
              <GlassCardDescription>
                使用默认的液态玻璃样式
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm">
                这是一个使用默认配置的液态玻璃卡片，具有适中的模糊效果和半透明背景。
              </p>
            </GlassCardContent>
            <GlassCardFooter>
              <Button variant="secondary" size="sm">
                了解更多
              </Button>
            </GlassCardFooter>
          </GlassCard>

          {/* 浅色变体 */}
          <GlassCard variant="light" blur="lg">
            <GlassCardHeader>
              <GlassCardTitle>浅色玻璃</GlassCardTitle>
              <GlassCardDescription>
                更明亮的玻璃效果，强模糊
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm">
                使用 variant="light" 和 blur="lg" 创建更明亮、更模糊的效果。
              </p>
            </GlassCardContent>
          </GlassCard>

          {/* 深色变体 */}
          <GlassCard variant="dark" blur="sm">
            <GlassCardHeader>
              <GlassCardTitle>深色玻璃</GlassCardTitle>
              <GlassCardDescription>
                更深的玻璃效果，弱模糊
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm">
                使用 variant="dark" 和 blur="sm" 创建更深、更清晰的效果。
              </p>
            </GlassCardContent>
          </GlassCard>

          {/* 彩色变体 */}
          <GlassCard variant="colored" blur="xl">
            <GlassCardHeader>
              <GlassCardTitle>彩色玻璃</GlassCardTitle>
              <GlassCardDescription>
                带主题色的玻璃效果，超强模糊
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm">
                使用 variant="colored" 和 blur="xl" 创建带主题色的超模糊效果。
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* 无边框和阴影 */}
        <GlassCard variant="light" bordered={false} shadow={false}>
          <GlassCardHeader>
            <GlassCardTitle>无边框无阴影</GlassCardTitle>
            <GlassCardDescription>
              更简洁的玻璃效果
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-sm">
              使用 bordered=false 和 shadow=false 创建更简洁的玻璃效果。
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* 嵌套玻璃效果 */}
        <GlassCard variant="dark" blur="lg" className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6">嵌套玻璃效果</h2>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} variant="light" blur="md" className="p-4">
                <h3 className="font-semibold mb-2">卡片 {i}</h3>
                <p className="text-xs text-muted-foreground">
                  玻璃效果可以嵌套使用
                </p>
              </GlassCard>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
