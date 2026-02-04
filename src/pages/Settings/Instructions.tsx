import { useState } from 'react';
import { useAtom } from 'jotai';
import { FileText, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import { globalInstructionsAtom, projectInstructionsAtom } from '@/store/settingsAtoms';

export default function InstructionsSettings() {
  const [globalInstructions, setGlobalInstructions] = useAtom(globalInstructionsAtom);
  const [projectInstructions, setProjectInstructions] = useAtom(projectInstructionsAtom);
  const [activeTab, setActiveTab] = useState('global');

  const handleSave = () => {
    // TODO: 实现保存逻辑
    console.log('保存指令');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">指令配置</h1>
            <p className="text-muted-foreground">编辑 Claude 的全局和项目指令</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          保存
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">全局指令</TabsTrigger>
          <TabsTrigger value="project">项目指令</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>全局指令 (CLAUDE.md)</CardTitle>
              <CardDescription>
                这些指令将应用于所有项目。文件位置：~/.claude/CLAUDE.md
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={globalInstructions}
                onChange={setGlobalInstructions}
                height="500px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>项目指令</CardTitle>
              <CardDescription>
                这些指令仅应用于当前项目。文件位置：./CLAUDE.md
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={projectInstructions}
                onChange={setProjectInstructions}
                height="500px"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
