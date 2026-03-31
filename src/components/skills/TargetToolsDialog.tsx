import { useState, useEffect } from 'react';
import { CheckCircle2, FolderTree } from 'lucide-react';
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
      // 只保留在 toolsInfo 中存在的有效 AI 工具 ID，过滤掉权限字符串等无效值
      const validToolIds = new Set(toolsInfo.map(t => t.id));
      const validDefaults = defaultTools.filter(t => validToolIds.has(t));
      if (validDefaults.length > 0) {
        setSelectedTools(new Set(validDefaults));
      } else {
        // 否则默认选中 claude-code
        setSelectedTools(new Set(['claude-code']));
      }
    }
  }, [open, defaultTools, toolsInfo]);

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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base">选择安装目标工具</DialogTitle>
          <DialogDescription>
            {skillName ? `选择要将 "${skillName}" 安装到哪些 AI 工具` : '选择要安装到哪些 AI 工具'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {workspacePath && (
            <div className="flex items-start gap-2 rounded-[14px] border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" />
              <div className="min-w-0">
                <p className="font-medium text-foreground/80">当前项目</p>
                <p className="mt-0.5 truncate text-xs">{workspaceName || workspacePath}</p>
              </div>
            </div>
          )}

          {availableTools.length === 0 ? (
            <div className="rounded-[14px] border border-border/70 bg-muted/20 py-7 text-center text-sm text-muted-foreground">
              该 Skill 已安装到所有支持的工具
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-border/70 bg-background/72 px-3 py-2.5 transition-colors hover:bg-surface-hover"
                    onClick={() => toggleTool(tool.id)}
                  >
                    <Checkbox
                      checked={selectedTools.has(tool.id)}
                      onCheckedChange={() => toggleTool(tool.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{tool.displayName}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {getInstallPath(tool.relativePath)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {defaultTools.filter(t => toolsInfo.some(info => info.id === t)).length > 0 && (
                <div className="flex items-start gap-2 rounded-[14px] border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/65" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/70">推荐目标</p>
                    <p className="mt-1 text-xs leading-5">
                      {defaultTools
                        .map(t => toolsInfo.find(info => info.id === t)?.displayName)
                        .filter(Boolean)
                        .join('、')}
                    </p>
                  </div>
                </div>
              )}

              {excludeTools.length > 0 && (
                <div className="rounded-[14px] border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  已安装到：{excludeTools.map(t => toolsInfo.find(info => info.id === t)?.displayName || t).join('、')}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
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
