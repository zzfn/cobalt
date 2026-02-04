import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  FileText,
  Settings,
  Archive,
  type LucideIcon,
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const quickActions: QuickAction[] = [
  {
    title: 'Skills 管理',
    description: '管理和配置 Skills',
    href: '/skills',
    icon: Sparkles,
  },
  {
    title: '全局指令',
    description: '编辑 Claude 的全局指令',
    href: '/settings/instructions',
    icon: FileText,
  },
  {
    title: '通用设置',
    description: '配置应用的基本设置',
    href: '/settings/general',
    icon: Settings,
  },
  {
    title: '配置备份',
    description: '备份和恢复配置',
    href: '/settings/claude-code',
    icon: Archive,
  },
];

export default function QuickActions() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">快捷操作</CardTitle>
        <CardDescription>常用功能的快速入口</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Button
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-1 p-3 text-left hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{action.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {action.description}
                  </span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
