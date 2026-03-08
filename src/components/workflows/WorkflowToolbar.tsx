import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, Maximize, Plus, Save, Upload, ArrowLeft } from 'lucide-react';

interface WorkflowToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onAddNode: () => void;
  onSave: () => void;
  onPublish: () => void;
  onBack: () => void;
  isDraft: boolean;
  version: number;
  publishedVersion: number;
  workflowName: string;
}

export function WorkflowToolbar({
  zoom, onZoomIn, onZoomOut, onFitToScreen, onAddNode, onSave, onPublish, onBack,
  isDraft, version, publishedVersion, workflowName,
}: WorkflowToolbarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-card/80 backdrop-blur-sm border-b border-border/40">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{workflowName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">v{version}</Badge>
            {isDraft && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-500 border-amber-500/30">Πρόχειρο</Badge>}
            {publishedVersion > 0 && (
              <span className="text-[10px] text-muted-foreground">Δημοσιευμένη: v{publishedVersion}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 bg-muted rounded-xl px-1 py-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] font-medium text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFitToScreen} title="Προσαρμογή στην οθόνη">
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button size="sm" variant="outline" onClick={onAddNode} className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" /> Κόμβος
        </Button>
        <Button size="sm" variant="outline" onClick={onSave} className="gap-1.5 h-8">
          <Save className="h-3.5 w-3.5" /> Αποθήκευση
        </Button>
        <Button size="sm" onClick={onPublish} className="gap-1.5 h-8">
          <Upload className="h-3.5 w-3.5" /> Δημοσίευση
        </Button>
      </div>
    </div>
  );
}
