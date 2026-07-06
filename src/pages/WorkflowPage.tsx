import { PageGradient } from '@/components/ui/PageGradient';

export const WorkflowPage = () => (
  <div className="p-6 bg-background flex-1 relative">
    <PageGradient />
    <div className="relative z-10">
      <h1 className="text-2xl font-bold">Workflow Page</h1>
      <p className="mt-2">Manage your workflows here.</p>
    </div>
  </div>
);
