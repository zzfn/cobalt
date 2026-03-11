import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useAtomValue } from 'jotai';
import { currentWorkspaceAtom } from '@/store/workspaceAtoms';

export default function WorkspaceInfo() {
  const currentWorkspace = useAtomValue(currentWorkspaceAtom);

  return (
    <Card className="h-full border-border/70 bg-card">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/65">Workspace</p>
            <p className="mt-2 text-base font-semibold tracking-[-0.03em] truncate">
              {currentWorkspace?.name || '全局模式'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {currentWorkspace?.path || '未锁定到具体项目目录'}
            </p>
          </div>
          <Link
            to="/settings/general"
            className="rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            管理
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
