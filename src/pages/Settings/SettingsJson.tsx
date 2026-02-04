import { useEffect, useState, useRef } from 'react';
import { FileJson, Save, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Editor, { OnMount } from '@monaco-editor/react';
import { useAtomValue } from 'jotai';
import { resolvedThemeAtom } from '@/store/uiAtoms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { readSettings, writeSettings } from '@/services/config';
import type { ClaudeCodeSettings } from '@/types/settings';

export default function SettingsJsonEditor() {
  const resolvedTheme = useAtomValue(resolvedThemeAtom);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [settings, setSettings] = useState<ClaudeCodeSettings | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const settingsData = await readSettings();
      setSettings(settingsData);
      setJsonText(JSON.stringify(settingsData, null, 2));
      setHasChanges(false);
      setJsonError(null);
    } catch (error) {
      toast.error('加载配置失败', {
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 处理编辑器挂载
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // 处理 JSON 文本变化
  const handleJsonChange = (value: string | undefined) => {
    if (value === undefined) return;

    setJsonText(value);
    setHasChanges(true);

    // 验证 JSON 格式
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON 格式错误');
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (jsonError) {
      toast.error('无法保存', {
        description: 'JSON 格式错误，请修正后再保存',
      });
      return;
    }

    setSaving(true);
    try {
      const parsedSettings = JSON.parse(jsonText) as ClaudeCodeSettings;
      await writeSettings(parsedSettings);
      setSettings(parsedSettings);
      setHasChanges(false);
      toast.success('配置已保存');
    } catch (error) {
      toast.error('保存配置失败', {
        description: String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  // 格式化 JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setJsonError(null);
      toast.success('JSON 已格式化');
    } catch (error) {
      toast.error('格式化失败', {
        description: 'JSON 格式错误',
      });
    }
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败', {
        description: String(error),
      });
    }
  };

  // 重置到原始值
  const handleReset = () => {
    if (settings) {
      setJsonText(JSON.stringify(settings, null, 2));
      setHasChanges(false);
      setJsonError(null);
      toast.success('已重置为保存的版本');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileJson className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">settings.json</h1>
            <p className="text-muted-foreground">直接编辑 Claude Code 配置文件</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadConfig}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleFormat} disabled={!!jsonError}>
            格式化
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            复制
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            重置
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges || !!jsonError}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* JSON 错误提示 */}
      {jsonError && (
        <div className="flex items-center gap-2 p-4 border border-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">JSON 格式错误: {jsonError}</p>
        </div>
      )}

      {/* 编辑器 */}
      <Card>
        <CardHeader>
          <CardTitle>配置内容</CardTitle>
          <CardDescription>
            直接编辑 JSON 配置文件。请确保 JSON 格式正确，否则无法保存。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Editor
            height="600px"
            defaultLanguage="json"
            value={jsonText}
            onChange={handleJsonChange}
            onMount={handleEditorDidMount}
            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              fontSize: 14,
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              formatOnPaste: true,
              formatOnType: true,
            }}
            loading={
              <div className="flex h-[600px] items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* 配置说明 */}
      <Card>
        <CardHeader>
          <CardTitle>配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">permissions</h3>
            <p className="text-sm text-muted-foreground">
              权限配置，包含 <code className="px-1 py-0.5 bg-muted rounded">allow</code> 和{' '}
              <code className="px-1 py-0.5 bg-muted rounded">deny</code> 列表，用于控制 Claude Code 的访问权限。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">env</h3>
            <p className="text-sm text-muted-foreground">
              环境变量配置，键值对形式。常用的环境变量包括：
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>
                <code className="px-1 py-0.5 bg-muted rounded">ANTHROPIC_AUTH_TOKEN</code> - API Key
              </li>
              <li>
                <code className="px-1 py-0.5 bg-muted rounded">ANTHROPIC_BASE_URL</code> - API Base URL
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
