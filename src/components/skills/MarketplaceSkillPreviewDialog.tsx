import { useState } from 'react';
import {
  Eye, Code, Download, Tag, CheckCircle2, Sparkles, FileText, Folder, File,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import type { CachedSkillInfo } from '@/types/marketplace';

interface MarketplaceSkillPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: CachedSkillInfo | null;
  onInstall: (skillName: string) => void;
  installing?: boolean;
}

/** 解析 frontmatter，返回 metadata 和正文 */
function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return { metadata: {}, body: content };

  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      const metadata: Record<string, string> = {};
      lines.slice(1, i).forEach((line) => {
        const m = line.trim().match(/^([\w-]+):\s*(.+)$/);
        if (m) metadata[m[1]] = m[2].replace(/^["']|["']$/g, '');
      });
      return { metadata, body: lines.slice(i + 1).join('\n').trimStart() };
    }
  }
  return { metadata: {}, body: content };
}

export function MarketplaceSkillPreviewDialog({
  open,
  onOpenChange,
  skill,
  onInstall,
  installing,
}: MarketplaceSkillPreviewDialogProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  if (!skill) return null;

  const hasContent = !!skill.skillContent;
  const { metadata, body } = hasContent
    ? parseFrontmatter(skill.skillContent!)
    : { metadata: {}, body: '' };

  const displayName = metadata.name || skill.name;
  const displayDescription = metadata.description || skill.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col gap-6 p-6">
        {/* 标题卡片 - 与详情页相同的渐变样式 */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shrink-0">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight mb-1">{displayName}</h2>
                  {displayDescription && (
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {displayDescription}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {skill.installed && (
                      <Badge variant="secondary" className="gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        已安装{skill.installedVersion ? ` v${skill.installedVersion}` : ''}
                      </Badge>
                    )}
                    {skill.hasUpdate && (
                      <Badge variant="default" className="gap-1.5">有更新</Badge>
                    )}
                    {skill.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1.5">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 操作区 */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                {skill.version && (
                  <span className="text-sm text-muted-foreground">
                    版本 <span className="font-medium text-foreground">{skill.version}</span>
                  </span>
                )}
                {skill.targetTools.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    目标工具：{skill.targetTools.join(', ')}
                  </span>
                )}
                <Button
                  onClick={() => onInstall(skill.name)}
                  disabled={(skill.installed && !skill.hasUpdate) || installing}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {skill.hasUpdate ? '更新' : skill.installed ? '已安装' : '安装'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 内容区 - 两栏布局与详情页一致 */}
        <div className="grid grid-cols-[180px_1fr] gap-4 flex-1 min-h-0">
          {/* 左侧文件目录 */}
          <Card className="h-fit">
            <CardHeader className="border-b bg-muted/30 py-3 px-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Folder className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">文件目录</CardTitle>
                  <CardDescription className="text-xs">1 个文件</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground font-medium"
              >
                <File className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">SKILL.md</span>
              </button>
            </CardContent>
          </Card>

          {/* 右侧内容区 */}
          <Card className="overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-muted/30 py-3 px-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">SKILL.md</CardTitle>
                    <CardDescription className="text-xs">Skill 主文档</CardDescription>
                  </div>
                </div>
                {hasContent && (
                  <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
                    <Button
                      variant={viewMode === 'preview' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('preview')}
                      className="h-8 gap-1.5 text-xs transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      预览
                    </Button>
                    <Button
                      variant={viewMode === 'code' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('code')}
                      className="h-8 gap-1.5 text-xs transition-all"
                    >
                      <Code className="h-3.5 w-3.5" />
                      源代码
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {hasContent ? (
                viewMode === 'preview' ? (
                  <div className="markdown-preview p-8">
                    <ReactMarkdown>{body}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="border-t">
                    <MarkdownEditor value={skill.skillContent!} readOnly height="450px" />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-base font-medium mb-1">没有 SKILL.md 文件</p>
                  <p className="text-sm">请刷新市场源后重试</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
