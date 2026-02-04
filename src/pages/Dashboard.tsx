import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Settings, Sparkles, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const quickLinks = [
    {
      title: '通用设置',
      description: '配置应用的基本设置',
      href: '/settings/general',
      icon: Settings,
    },
    {
      title: '全局指令',
      description: '编辑 Claude 的全局指令',
      href: '/settings/instructions',
      icon: FileText,
    },
    {
      title: 'Skills 管理',
      description: '管理和配置 Skills',
      href: '/skills',
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">仪表板</h1>
          <p className="text-muted-foreground">欢迎使用 Cobalt - Claude 配置管理工具</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <link.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                </div>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>快速开始</CardTitle>
          <CardDescription>了解如何使用 Cobalt</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium">1. 配置全局指令</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              在「设置 → 全局指令」中编辑 CLAUDE.md 文件，定义 Claude 的行为规范。
            </p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium">2. 管理 Skills</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              在「Skills」页面中查看、启用或禁用各种 Skills，扩展 Claude 的能力。
            </p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium">3. 自定义设置</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              在「设置 → 通用设置」中调整主题、编辑器等偏好设置。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
