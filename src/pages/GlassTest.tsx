import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/components/ui/glass-card"

export default function GlassTest() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">液态玻璃效果测试</h1>

      {/* 测试 1: 渐变背景 */}
      <div className="p-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
        <GlassCard className="max-w-md">
          <GlassCardHeader>
            <GlassCardTitle className="text-white">测试 1</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-white/90">如果你能看到模糊的背景，说明效果生效了</p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* 测试 2: 纯色背景 */}
      <div className="p-8 rounded-xl bg-red-500">
        <GlassCard variant="light" blur="xl" className="max-w-md">
          <GlassCardHeader>
            <GlassCardTitle className="text-white">测试 2 - 强模糊</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-white/90">这个应该有更强的模糊效果</p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* 测试 3: 检查 CSS */}
      <div className="p-4 border rounded">
        <h3 className="font-bold mb-2">调试信息</h3>
        <p className="text-sm">如果看不到效果，请检查：</p>
        <ul className="text-sm list-disc list-inside space-y-1 mt-2">
          <li>浏览器是否支持 backdrop-filter</li>
          <li>打开开发者工具检查元素是否有 backdrop-blur 类</li>
          <li>检查 CSS 是否正确加载</li>
        </ul>
      </div>
    </div>
  )
}
