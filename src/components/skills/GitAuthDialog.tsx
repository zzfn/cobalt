import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GitAuthChallenge, GitAuthInput } from '@/types/skills';

interface GitAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: GitAuthChallenge | null;
  loading?: boolean;
  onConfirm: (auth: GitAuthInput) => void;
}

export function GitAuthDialog({
  open,
  onOpenChange,
  challenge,
  loading = false,
  onConfirm,
}: GitAuthDialogProps) {
  const [method, setMethod] = useState<'https' | 'ssh'>('https');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');

  const suggestedMethod = challenge?.suggestedMethod ?? 'https';

  useEffect(() => {
    if (open) {
      setMethod(suggestedMethod);
      setSecret('');
      if (suggestedMethod === 'ssh') {
        setUsername('');
      }
    }
  }, [open, suggestedMethod]);

  const canSubmit = useMemo(() => {
    if (method === 'https' && !username.trim()) return false;
    if (!secret.trim()) return false;
    return true;
  }, [method, username, secret]);

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      method,
      username: method === 'https' ? username.trim() : undefined,
      secret: secret.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>仓库认证</DialogTitle>
          <DialogDescription>
            {challenge?.message || '该仓库需要认证凭据'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {(challenge?.canUseHttps ?? true) && (
              <Button
                type="button"
                variant={method === 'https' ? 'default' : 'outline'}
                onClick={() => setMethod('https')}
                disabled={loading}
              >
                HTTPS
              </Button>
            )}
            {(challenge?.canUseSsh ?? true) && (
              <Button
                type="button"
                variant={method === 'ssh' ? 'default' : 'outline'}
                onClick={() => setMethod('ssh')}
                disabled={loading}
              >
                SSH
              </Button>
            )}
          </div>

          {method === 'https' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="git-username">用户名</Label>
                <Input
                  id="git-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="GitHub 用户名"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="git-token">Token / 密码</Label>
                <Input
                  id="git-token"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="推荐使用 Personal Access Token"
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ssh-passphrase">SSH Key Passphrase</Label>
              <Input
                id="ssh-passphrase"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="输入 SSH 私钥口令"
                disabled={loading}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || loading}>
            {loading ? '验证中...' : '继续'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
