import { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useAtomValue } from 'jotai';
import { resolvedThemeAtom } from '@/store/uiAtoms';
import { Skeleton } from '@/components/ui/skeleton';

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
  language?: string;  // 支持自定义语言
}

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  height = '400px',
  className,
  language = 'markdown',
}: MarkdownEditorProps) {
  const resolvedTheme = useAtomValue(resolvedThemeAtom);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleChange: OnChange = (newValue) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }
  };

  // 当主题变化时更新编辑器主题
  useEffect(() => {
    if (editorRef.current) {
      // Monaco 会自动响应主题变化
    }
  }, [resolvedTheme]);

  return (
    <div className={className}>
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          readOnly,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          fontSize: 14,
          tabSize: 2,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
        loading={
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        }
      />
    </div>
  );
}
