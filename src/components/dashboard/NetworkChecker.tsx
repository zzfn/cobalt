import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EndpointStatus {
  name: string;
  url: string;
  status: 'checking' | 'reachable' | 'unreachable';
  latency: number | null;
}

const ENDPOINTS: Pick<EndpointStatus, 'name' | 'url'>[] = [
  { name: 'Anthropic', url: 'https://anthropic.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Google', url: 'https://www.google.com' },
];

async function checkEndpoint(url: string): Promise<{ reachable: boolean; latency: number | null }> {
  const start = Date.now();
  try {
    await fetch(url, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(8000),
    });
    return { reachable: true, latency: Date.now() - start };
  } catch {
    return { reachable: false, latency: null };
  }
}

function StatusDot({ status }: { status: EndpointStatus['status'] }) {
  if (status === 'checking') {
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/50" />;
  }
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        status === 'reachable' ? 'bg-green-500' : 'bg-red-400'
      )}
    />
  );
}

export default function NetworkChecker() {
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>(
    ENDPOINTS.map((e) => ({ ...e, status: 'checking', latency: null }))
  );
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setEndpoints(ENDPOINTS.map((e) => ({ ...e, status: 'checking', latency: null })));

    await Promise.all(
      ENDPOINTS.map(async (endpoint, index) => {
        const result = await checkEndpoint(endpoint.url);
        setEndpoints((prev) => {
          const next = [...prev];
          next[index] = {
            ...endpoint,
            status: result.reachable ? 'reachable' : 'unreachable',
            latency: result.latency,
          };
          return next;
        });
      })
    );

    setChecking(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const allReachable = endpoints.every((e) => e.status === 'reachable');
  const isChecking = endpoints.some((e) => e.status === 'checking');

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">网络检测</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-[10px] hover:bg-muted/50"
            onClick={runChecks}
            disabled={checking}
            title="重新检测"
          >
            <RefreshCw className={cn('h-3 w-3 text-muted-foreground/60', checking && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {endpoints.map((endpoint) => (
          <div
            key={endpoint.url}
            className="flex items-center justify-between rounded-[14px] border border-border/55 px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <StatusDot status={endpoint.status} />
              <span className="text-[13px]">{endpoint.name}</span>
            </div>
            <div className="text-[11px] text-muted-foreground/60 tabular-nums">
              {endpoint.status === 'checking' && '检测中...'}
              {endpoint.status === 'reachable' && endpoint.latency !== null && `${endpoint.latency} ms`}
              {endpoint.status === 'unreachable' && <span className="text-red-400">不可达</span>}
            </div>
          </div>
        ))}
        {!isChecking && (
          <p className={cn(
            'border-t border-border/50 pt-1.5 text-[11px]',
            allReachable ? 'text-muted-foreground/50' : 'text-red-400/80'
          )}>
            {allReachable ? '网络连接正常' : '部分节点无法访问，请检查网络或代理设置'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
