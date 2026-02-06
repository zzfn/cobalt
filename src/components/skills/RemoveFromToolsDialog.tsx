import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AI_TOOL_META, type AiToolType } from '@/types/skills';
import { AlertCircle } from 'lucide-react';

interface RemoveFromToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedTools: string[]) => void;
  installedTools: string[];
  skillName?: string;
}

export function RemoveFromToolsDialog({
  open,
  onOpenChange,
  onConfirm,
  installedTools,
  skillName,
}: RemoveFromToolsDialogProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  // 当对话框打开时，清空选择
  useEffect(() => {
    if (open) {
      setSelectedTools(new Set());
    }
  }, [open]);

  const toggleTool = (toolId: string) => {
    const newSelected = new Set(selectedTools);
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId);
    } else {
      newSelected.add(toolId);
    }
    setSelectedTools(newSelected);
  };

  const handleConfirm = () => {
    if (selectedTools.size === 0) {
      return;
    }
    onConfirm(Array.from(selectedTools));
    onOpenChange(false);
  };

  const isLastTool = installedTools.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>从工具中移除</DialogTitle>
          <DialogDescription>
            {skillName ? `选择要从哪些工具中移除 "${skillName}"` : '选择要从哪些工具中移除'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLastTool && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>注意：</strong>这是该 Skill 安装的最后一个工具。移除后，该 Skill 将被完全卸载。
              </div>
            </div>
          )}

          {installedTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              该 Skill 未安装到任何工具
            </div>
          ) : (
            <div className="space-y-3">
              {installedTools.map((toolId) => {
                const tool = AI_TOOL_META[toolId as AiToolType];
                if (!tool) return null;

                return (
                  <div
                    key={toolId}
                    className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => toggleTool(toolId)}
                  >
                    <Checkbox
                      checked={selectedTools.has(toolId)}
                      onCheckedChange={() => toggleTool(toolId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">{tool.icon}</span>
                      <div>
                        <div className="font-medium">{tool.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          ~/.{tool.name === 'claude-code' ? 'claude' : tool.name === 'opencode' ? 'config/opencode' : tool.name === 'antigravity' ? 'gemini/antigravity/global_skills' : tool.name}/skills/
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={selectedTools.size === 0}
          >
            从 {selectedTools.size} 个工具中移除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
