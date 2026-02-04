import { useState } from 'react';
import { Shield, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PermissionsCardProps {
  allow: string[];
  deny: string[];
  onAllowChange: (allow: string[]) => void;
  onDenyChange: (deny: string[]) => void;
}

export default function PermissionsCard({
  allow,
  deny,
  onAllowChange,
  onDenyChange,
}: PermissionsCardProps) {
  const [newAllowItem, setNewAllowItem] = useState('');
  const [newDenyItem, setNewDenyItem] = useState('');

  const handleAddAllow = () => {
    if (newAllowItem.trim() && !allow.includes(newAllowItem.trim())) {
      onAllowChange([...allow, newAllowItem.trim()]);
      setNewAllowItem('');
    }
  };

  const handleAddDeny = () => {
    if (newDenyItem.trim() && !deny.includes(newDenyItem.trim())) {
      onDenyChange([...deny, newDenyItem.trim()]);
      setNewDenyItem('');
    }
  };

  const handleRemoveAllow = (item: string) => {
    onAllowChange(allow.filter((i) => i !== item));
  };

  const handleRemoveDeny = (item: string) => {
    onDenyChange(deny.filter((i) => i !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'allow' | 'deny') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'allow') {
        handleAddAllow();
      } else {
        handleAddDeny();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          权限管理
        </CardTitle>
        <CardDescription>
          配置 Claude Code 的工具权限，格式如 Bash(npm run *)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 允许列表 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400">允许列表</h4>
          <div className="flex flex-wrap gap-2">
            {allow.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              >
                {item}
                <button
                  onClick={() => handleRemoveAllow(item)}
                  className="ml-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {allow.length === 0 && (
              <span className="text-sm text-muted-foreground">暂无允许项</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入权限规则，如 Bash(npm run *)"
              value={newAllowItem}
              onChange={(e) => setNewAllowItem(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'allow')}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddAllow} disabled={!newAllowItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 拒绝列表 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400">拒绝列表</h4>
          <div className="flex flex-wrap gap-2">
            {deny.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              >
                {item}
                <button
                  onClick={() => handleRemoveDeny(item)}
                  className="ml-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {deny.length === 0 && (
              <span className="text-sm text-muted-foreground">暂无拒绝项</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入权限规则，如 WebFetch"
              value={newDenyItem}
              onChange={(e) => setNewDenyItem(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'deny')}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddDeny} disabled={!newDenyItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
