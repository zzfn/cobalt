import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import MarkdownEditor from '@/components/common/MarkdownEditor';

export default function SkillDetail() {
  const { skillName } = useParams<{ skillName: string }>();

  // TODO: 从 store 获取 skill 详情
  const skill = {
    id: '1',
    name: skillName || 'unknown',
    description: '这是一个示例 Skill 的详细描述',
    enabled: true,
    source: 'builtin' as const,
    content: `# ${skillName}\n\n这是 Skill 的内容...`,
    readme: `# ${skillName}\n\n## 简介\n\n这是一个示例 Skill。\n\n## 使用方法\n\n\`\`\`\n/${skillName}\n\`\`\``,
    metadata: {
      name: skillName || 'unknown',
      version: '1.0.0',
      description: '这是一个示例 Skill 的详细描述',
      author: 'Anthropic',
      tags: ['example', 'demo'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-15',
    },
  };

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Link to="/skills">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回 Skills 列表
        </Button>
      </Link>

      {/* 标题区域 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">{skill.name}</h1>
            <p className="text-muted-foreground">{skill.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {skill.enabled ? '已启用' : '已禁用'}
          </span>
          <Switch checked={skill.enabled} />
        </div>
      </div>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">v{skill.metadata.version}</Badge>
        {skill.metadata.author && (
          <Badge variant="outline">作者: {skill.metadata.author}</Badge>
        )}
        {skill.metadata.tags?.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* 内容标签页 */}
      <Tabs defaultValue="readme">
        <TabsList>
          <TabsTrigger value="readme">说明文档</TabsTrigger>
          <TabsTrigger value="content">Skill 内容</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        <TabsContent value="readme" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>说明文档</CardTitle>
              <CardDescription>Skill 的使用说明和示例</CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor value={skill.readme || ''} readOnly height="400px" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill 内容</CardTitle>
              <CardDescription>Skill 的 Markdown 定义</CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor value={skill.content} readOnly height="400px" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill 设置</CardTitle>
              <CardDescription>配置此 Skill 的行为</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用 Skill</p>
                  <p className="text-sm text-muted-foreground">
                    启用后可在 Claude 中使用此 Skill
                  </p>
                </div>
                <Switch checked={skill.enabled} />
              </div>
              <Separator />
              <div>
                <p className="font-medium">来源信息</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  类型: {skill.source === 'builtin' ? '内置' : skill.source === 'local' ? '本地' : '远程'}
                </p>
                {skill.metadata.createdAt && (
                  <p className="text-sm text-muted-foreground">
                    创建时间: {skill.metadata.createdAt}
                  </p>
                )}
                {skill.metadata.updatedAt && (
                  <p className="text-sm text-muted-foreground">
                    更新时间: {skill.metadata.updatedAt}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
