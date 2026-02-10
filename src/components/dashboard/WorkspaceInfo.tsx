import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAtomValue } from 'jotai';
import { currentWorkspaceAtom } from '@/store/workspaceAtoms';

export default function WorkspaceInfo() {
  const currentWorkspace = useAtomValue(currentWorkspaceAtom);

  return (
    <Card className="border border-border-strong">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/50">
              <Home className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground/60">当前工作区</p>
              <p className="text-sm font-medium truncate">
                {currentWorkspace?.name || '全局模式'}
              </p>
            </div>
          </div>
          <Link
            to="/settings/general"
            className="text-xs text-muted-foreground/60 hover:text-foreground px-3 py-1.5 rounded hover:bg-muted/50 transition-colors"
          >
            管理
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
