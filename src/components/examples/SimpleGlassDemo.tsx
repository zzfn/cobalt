import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card"

/**
 * 在普通页面中使用的液态玻璃卡片示例
 * 适合在 Dashboard 等页面中使用
 */
export function SimpleGlassDemo() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">液态玻璃效果示例</h2>

      {/* 需要有背景才能看出玻璃效果 */}
      <div className="relative p-8 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard variant="light" blur="lg">
            <GlassCardHeader>
              <GlassCardTitle>浅色玻璃</GlassCardTitle>
              <GlassCardDescription>
                强模糊效果
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm">
                这是一个液态玻璃卡片，具有半透明背景和模糊效果。
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="dark" blur="md">
            <GlassCardHeader>
              <GlassCardTitle>深色玻璃</GlassCardTitle>
              <GlassCardDescription>
                中等模糊效果
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm">
                深色变体适合在浅色背景上使用。
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>

      {/* 使用图片作为背景 */}
      <div
        className="relative p-8 rounded-2xl bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80)'
        }}
      >
        <GlassCard variant="light" blur="xl" className="max-w-md">
          <GlassCardHeader>
            <GlassCardTitle className="text-white">图片背景</GlassCardTitle>
            <GlassCardDescription className="text-white/80">
              在图片背景上的玻璃效果
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-sm text-white/90">
              液态玻璃效果在图片背景上表现最佳，可以清晰看到模糊和半透明效果。
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
