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

interface TargetToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedTools: string[]) => void;
  defaultTools?: string[];
  skillName?: string;
  excludeTools?: string[]; // 要排除的工具（已安装的工具）
}

export function TargetToolsDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultTools = [],
  skillName,
  excludeTools = [],
}: TargetToolsDialogProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  // 当对话框打开时，初始化选中的工具
  useEffect(() => {
    if (open) {
      if (defaultTools.length > 0) {
        // 如果有默认工具，使用默认工具
        setSelectedTools(new Set(defaultTools));
      } else {
        // 否则默认选中 claude-code
        setSelectedTools(new Set(['claude-code']));
      }
    }
  }, [open, defaultTools]);

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

  const allTools: AiToolType[] = ['claude-code', 'cursor', 'codex', 'opencode', 'antigravity', 'droid'];

  // 过滤掉已排除的工具
  const availableTools = allTools.filter(tool => !excludeTools.includes(tool));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>选择安装目标工具</DialogTitle>
          <DialogDescription>
            {skillName ? `选择要将 "${skillName}" 安装到哪些 AI 工具` : '选择要安装到哪些 AI 工具'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              该 Skill 已安装到所有支持的工具
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {availableTools.map((toolId) => {
              const tool = AI_TOOL_META[toolId];
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

          {defaultTools.length > 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              💡 提示：该 Skill 推荐安装到 {defaultTools.map(t => AI_TOOL_META[t as AiToolType]?.displayName).join(', ')}
            </div>
          )}

          {excludeTools.length > 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              ℹ️ 已安装到：{excludeTools.map(t => AI_TOOL_META[t as AiToolType]?.displayName).join(', ')}
            </div>
          )}
          </>
        )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={selectedTools.size === 0}>
            安装到 {selectedTools.size} 个工具
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
