import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, FileText, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import type { SkillDetail as SkillDetailType } from '@/types/skills';
import { getSkillDetail, toggleSkill as toggleSkillApi, uninstallSkill } from '@/services/skills';
import { logActivity } from '@/lib/activityLogger';

export default function SkillDetail() {
  const { skillName } = useParams<{ skillName: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载 Skill 详情
  useEffect(() => {
    if (!skillName) return;

    const loadSkill = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSkillDetail(skillName);
        setSkill(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载 Skill 详情失败';
        setError(message);
        console.error('加载 Skill 详情失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSkill();
  }, [skillName]);

  // 切换启用状态
  const handleToggle = async (enabled: boolean) => {
    if (!skill) return;

    // 乐观更新
    setSkill((prev) => (prev ? { ...prev, enabled } : null));

    try {
      await toggleSkillApi(skill.name, enabled);
      // 记录活动
      logActivity(
        'skill_toggle',
        `${enabled ? '启用' : '禁用'}了 Skill: ${skill.name}`,
        { skillName: skill.name, enabled }
      );
    } catch (err) {
      // 回滚
      setSkill((prev) => (prev ? { ...prev, enabled: !enabled } : null));
      console.error('切换 Skill 状态失败:', err);
    }
  };

  // 删除 Skill
  const handleDelete = async () => {
    if (!skill) return;

    try {
      await uninstallSkill(skill.name);
      alert(`Skill "${skill.name}" 已删除`);
      navigate('/skills');
    } catch (err) {
      console.error('删除 Skill 失败:', err);
      alert(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="space-y-6">
        <Link to="/skills">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回 Skills 列表
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">
            {error || `Skill "${skillName}" 不存在`}
          </h3>
        </div>
      </div>
    );
  }

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除 Skill "{skill.name}" 吗？此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <span className="text-sm text-muted-foreground">
            {skill.enabled ? '已启用' : '已禁用'}
          </span>
          <Switch checked={skill.enabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">v{skill.metadata.version}</Badge>
        {skill.installedBy && skill.installedBy.length > 0 && (
          <Badge variant="outline">
            安装自: {skill.installedBy.join(', ')}
          </Badge>
        )}
        {skill.metadata.tags?.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* 内容标签页 */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">SKILL.md</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill 内容</CardTitle>
              <CardDescription>SKILL.md 文件内容</CardDescription>
            </CardHeader>
            <CardContent>
              {skill.content ? (
                <MarkdownEditor value={skill.content} readOnly height="400px" />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  <p className="mt-2">没有 SKILL.md 文件</p>
                </div>
              )}
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
                <Switch checked={skill.enabled} onCheckedChange={handleToggle} />
              </div>
              <Separator />
              <div>
                <p className="font-medium">安装信息</p>
                {skill.installedBy && skill.installedBy.length > 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    安装工具: {skill.installedBy.join(', ')}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    未记录安装来源
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
