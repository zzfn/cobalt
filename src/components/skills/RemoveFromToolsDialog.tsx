import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base">从工具中移除</DialogTitle>
          <DialogDescription>
            {skillName ? `选择要从哪些工具中移除 "${skillName}"` : '选择要从哪些工具中移除'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {isLastTool && (
            <div className="flex items-start gap-2 rounded-[14px] border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/20 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="leading-5">
                这是该 Skill 安装的最后一个工具。移除后，这个 Skill 会被一并卸载。
              </div>
            </div>
          )}

          {installedTools.length === 0 ? (
            <div className="rounded-[14px] border border-border/70 bg-muted/20 py-7 text-center text-sm text-muted-foreground">
              该 Skill 未安装到任何工具
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {installedTools.map((toolId) => {
                const tool = AI_TOOL_META[toolId as AiToolType];
                if (!tool) return null;

                return (
                  <div
                    key={toolId}
                    className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-border/70 bg-background/72 px-3 py-2.5 transition-colors hover:bg-surface-hover"
                    onClick={() => toggleTool(toolId)}
                  >
                    <Checkbox
                      checked={selectedTools.has(toolId)}
                      onCheckedChange={() => toggleTool(toolId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{tool.displayName}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          ~/.{tool.name === 'claude-code' ? 'claude' : tool.name === 'opencode' ? 'config/opencode' : tool.name === 'antigravity' ? 'gemini/antigravity/global_skills' : tool.name}/skills/
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
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
