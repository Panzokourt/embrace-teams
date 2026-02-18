import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectTemplatesManager } from '@/components/settings/ProjectTemplatesManager';
import { BriefsList } from '@/components/blueprints/BriefsList';
import { FileStack, LayoutTemplate, FileText } from 'lucide-react';

export default function Blueprints() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileStack className="h-8 w-8" />
          Προσχέδια
        </h1>
        <p className="text-muted-foreground mt-1">
          Project templates και προ-φόρμες briefs
        </p>
      </div>

      <Tabs defaultValue="briefs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="briefs" className="gap-2">
            <FileText className="h-4 w-4" />
            Προ-φόρμες
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Project Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="briefs">
          <BriefsList />
        </TabsContent>

        <TabsContent value="templates">
          <ProjectTemplatesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
