import { useState } from 'react';
import { Variable, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EnvVariablesCardProps {
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}

export default function EnvVariablesCard({ env, onChange }: EnvVariablesCardProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const entries = Object.entries(env);

  const handleAdd = () => {
    if (newKey.trim() && !env[newKey.trim()]) {
      onChange({ ...env, [newKey.trim()]: newValue });
      setNewKey('');
      setNewValue('');
    }
  };

  const handleRemove = (key: string) => {
    const newEnv = { ...env };
    delete newEnv[key];
    onChange(newEnv);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...env, [key]: value });
  };

  const toggleVisibility = (key: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleKeys(newVisible);
  };

  const isSensitive = (key: string) => {
    const sensitivePatterns = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'CREDENTIAL'];
    return sensitivePatterns.some((pattern) => key.toUpperCase().includes(pattern));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Variable className="h-5 w-5" />
          环境变量
        </CardTitle>
        <CardDescription>配置 Claude Code 运行时的环境变量</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 现有变量列表 */}
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map(([key, value]) => {
              const sensitive = isSensitive(key);
              const visible = visibleKeys.has(key);
              return (
                <div key={key} className="flex items-center gap-2">
                  <Input value={key} disabled className="w-40 font-mono text-sm" />
                  <div className="relative flex-1">
                    <Input
                      type={sensitive && !visible ? 'password' : 'text'}
                      value={value}
                      onChange={(e) => handleValueChange(key, e.target.value)}
                      className="pr-10 font-mono text-sm"
                    />
                    {sensitive && (
                      <button
                        type="button"
                        onClick={() => toggleVisibility(key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(key)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无环境变量</p>
        )}

        {/* 添加新变量 */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            placeholder="变量名"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-40 font-mono text-sm"
          />
          <Input
            placeholder="值"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 font-mono text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newKey.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
