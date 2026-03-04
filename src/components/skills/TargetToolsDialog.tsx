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
import { getSupportedAiTools } from '@/services/skills';
import type { AiToolInfo } from '@/types/skills';

interface TargetToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedTools: string[]) => void;
  defaultTools?: string[];
  skillName?: string;
  excludeTools?: string[]; // 要排除的工具（已安装的工具）
  workspacePath?: string | null; // 当前工作区路径
  workspaceName?: string; // 当前工作区名称
}

export function TargetToolsDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultTools = [],
  skillName,
  excludeTools = [],
  workspacePath,
  workspaceName,
}: TargetToolsDialogProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [toolsInfo, setToolsInfo] = useState<AiToolInfo[]>([]);

  // 从后端加载工具信息（只加载一次）
  useEffect(() => {
    getSupportedAiTools()
      .then(setToolsInfo)
      .catch(err => console.error('加载工具信息失败:', err));
  }, []);

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

  // 过滤掉已排除的工具
  const availableTools = toolsInfo.filter(tool => !excludeTools.includes(tool.id));

  // 根据是否在项目模式下显示不同的基础路径
  const getInstallPath = (relativePath: string) => {
    if (workspacePath) {
      // 项目模式：显示各个工具的项目级目录
      const projectDir = workspaceName || workspacePath;
      return `${projectDir}/${relativePath}`;
    } else {
      // 全局模式：显示各个工具的路径
      return `~/${relativePath}`;
    }
  };

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
          {workspacePath && (
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              📁 当前安装到项目：<span className="font-medium">{workspaceName || workspacePath}</span>
            </div>
          )}

          {availableTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              该 Skill 已安装到所有支持的工具
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {availableTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => toggleTool(tool.id)}
                  >
                    <Checkbox
                      checked={selectedTools.has(tool.id)}
                      onCheckedChange={() => toggleTool(tool.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">{tool.icon}</span>
                      <div>
                        <div className="font-medium">{tool.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {getInstallPath(tool.relativePath)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {defaultTools.length > 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              💡 提示：该 Skill 推荐安装到 {defaultTools.map(t => toolsInfo.find(info => info.id === t)?.displayName || t).join(', ')}
            </div>
          )}

          {excludeTools.length > 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              ℹ️ 已安装到：{excludeTools.map(t => toolsInfo.find(info => info.id === t)?.displayName || t).join(', ')}
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
