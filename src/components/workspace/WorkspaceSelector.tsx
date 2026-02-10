import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import {
  Globe,
  FolderOpen,
  Plus,
  ChevronDown,
  X,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  workspacesListAtom,
  currentWorkspaceAtom,
  workspacesLoadingAtom,
} from '@/store/workspaceAtoms';
import {
  listWorkspaces,
  addWorkspace,
  removeWorkspace,
  switchWorkspace,
  getCurrentWorkspace,
} from '@/services/workspace';
import type { Workspace } from '@/types/workspace';

interface WorkspaceSelectorProps {
  collapsed?: boolean;
}

export default function WorkspaceSelector({ collapsed = false }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useAtom(workspacesListAtom);
  const [currentWorkspace, setCurrentWorkspace] = useAtom(currentWorkspaceAtom);
  const [loading, setLoading] = useAtom(workspacesLoadingAtom);
  const [isOpen, setIsOpen] = useState(false);

  // 加载工作区列表
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const [list, current] = await Promise.all([
        listWorkspaces(),
        getCurrentWorkspace(),
      ]);
      setWorkspaces(list);
      setCurrentWorkspace(current);
    } catch (error) {
      console.error('加载工作区失败:', error);
      toast.error('加载工作区失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkspace = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择工作区文件夹',
      });

      if (selected) {
        const workspace = await addWorkspace(selected as string);
        await handleSwitchWorkspace(workspace.id);
        await loadWorkspaces();
        toast.success(`已添加工作区: ${workspace.name}`);
      }
    } catch (error) {
      console.error('添加工作区失败:', error);
      toast.error(error instanceof Error ? error.message : '添加工作区失败');
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string | null) => {
    try {
      const workspace = await switchWorkspace(workspaceId);
      setCurrentWorkspace(workspace);
      setIsOpen(false);

      // 触发 skills 列表刷新
      window.dispatchEvent(new CustomEvent('workspace-changed', { detail: workspace }));

      if (workspace) {
        toast.success(`已切换到: ${workspace.name}`);
      } else {
        toast.success('已切换到全局工作区');
      }
    } catch (error) {
      console.error('切换工作区失败:', error);
      toast.error('切换工作区失败');
    }
  };

  const handleRemoveWorkspace = async (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation();
    try {
      await removeWorkspace(workspaceId);
      await loadWorkspaces();
      toast.success('工作区已移除');
    } catch (error) {
      console.error('移除工作区失败:', error);
      toast.error('移除工作区失败');
    }
  };

  // 折叠模式下只显示图标
  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-sm hover:bg-sidebar-item-hover"
        onClick={() => setIsOpen(!isOpen)}
        title={currentWorkspace ? currentWorkspace.name : '全局工作区'}
      >
        {currentWorkspace ? (
          <Folder className="h-4 w-4" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* 当前工作区按钮 - Figma 风格 */}
      <Button
        variant="ghost"
        className="w-full justify-between px-3 h-9 rounded-sm hover:bg-sidebar-item-hover"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <div className="flex items-center gap-2 min-w-0">
          {currentWorkspace ? (
            <>
              <Folder className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium">{currentWorkspace.name}</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 shrink-0 text-green-500" />
              <span className="text-sm font-medium">全局工作区</span>
            </>
          )}
        </div>
        <ChevronDown className={cn(
          'h-3.5 w-3.5 shrink-0 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 菜单内容 - Figma 极简风格 */}
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-sm border border-border bg-card p-1 shadow-sm">
            {/* 全局工作区选项 */}
            <WorkspaceItem
              isGlobal
              isActive={!currentWorkspace}
              onClick={() => handleSwitchWorkspace(null)}
            />

            {/* 工作区列表 */}
            {workspaces.length > 0 && (
              <div className="my-1 border-t border-border/50" />
            )}

            {workspaces.map((workspace) => (
              <WorkspaceItem
                key={workspace.id}
                workspace={workspace}
                isActive={currentWorkspace?.id === workspace.id}
                onClick={() => handleSwitchWorkspace(workspace.id)}
                onRemove={(e) => handleRemoveWorkspace(e, workspace.id)}
              />
            ))}

            {/* 添加工作区按钮 */}
            <div className="my-1 border-t border-border/50" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 rounded-sm hover:bg-sidebar-item-hover"
              onClick={handleOpenWorkspace}
            >
              <Plus className="h-4 w-4" />
              <span>打开工作区...</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface WorkspaceItemProps {
  workspace?: Workspace;
  isGlobal?: boolean;
  isActive: boolean;
  onClick: () => void;
  onRemove?: (e: React.MouseEvent) => void;
}

function WorkspaceItem({
  workspace,
  isGlobal,
  isActive,
  onClick,
  onRemove,
}: WorkspaceItemProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors',
        'hover:bg-sidebar-item-hover',
        isActive && 'bg-sidebar-item-active'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isGlobal ? (
          <>
            <Globe className="h-4 w-4 shrink-0 text-green-500" />
            <span className="font-medium">全局工作区</span>
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{workspace?.name}</div>
              {workspace?.skillCount !== undefined && workspace.skillCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {workspace.skillCount} skills
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 移除按钮（仅非全局工作区显示） */}
      {!isGlobal && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded-sm"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
