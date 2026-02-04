import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { FileText, Save, Loader2, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import {
  globalInstructionsAtom,
  projectInstructionsAtom,
} from '@/store/settingsAtoms';
import { readClaudeMd, writeClaudeMd } from '@/services/config';

export default function InstructionsSettings() {
  const [globalInstructions, setGlobalInstructions] = useAtom(
    globalInstructionsAtom
  );
  const [projectInstructions, setProjectInstructions] = useAtom(
    projectInstructionsAtom
  );
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  // 加载全局指令
  const loadGlobalInstructions = useCallback(async () => {
    setLoading(true);
    try {
      const content = await readClaudeMd();
      setGlobalInstructions(content);
      setOriginalContent(content);
      setHasChanges(false);
    } catch (err) {
      console.error('加载全局指令失败:', err);
    } finally {
      setLoading(false);
    }
  }, [setGlobalInstructions]);

  // 初始加载
  useEffect(() => {
    loadGlobalInstructions();
  }, [loadGlobalInstructions]);

  // 检测变更
  useEffect(() => {
    setHasChanges(globalInstructions !== originalContent);
  }, [globalInstructions, originalContent]);

  // 保存全局指令
  const handleSave = async () => {
    if (activeTab !== 'global') return;

    setSaving(true);
    try {
      await writeClaudeMd(globalInstructions);
      setOriginalContent(globalInstructions);
      setHasChanges(false);
    } catch (err) {
      console.error('保存全局指令失败:', err);
    } finally {
      setSaving(false);
    }
  };

  // 键盘快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, saving, globalInstructions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">指令配置</h1>
            <p className="text-muted-foreground">
              编辑 Claude 的全局和项目指令
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGlobalInstructions}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存
            {hasChanges && <span className="ml-1 text-xs">(⌘S)</span>}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">
            全局指令
            {hasChanges && activeTab === 'global' && (
              <span className="ml-1 text-xs text-orange-500">*</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="project">项目指令</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>全局指令 (CLAUDE.md)</CardTitle>
              <CardDescription>
                这些指令将应用于所有项目。文件位置：~/.claude/CLAUDE.md
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MarkdownEditor
                  value={globalInstructions}
                  onChange={setGlobalInstructions}
                  height="500px"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>项目指令</CardTitle>
              <CardDescription>
                这些指令仅应用于当前项目。文件位置：./CLAUDE.md
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={projectInstructions}
                onChange={setProjectInstructions}
                height="500px"
              />
              <p className="mt-4 text-sm text-muted-foreground">
                注意：项目指令功能需要在具体项目目录中使用，当前为演示模式。
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
