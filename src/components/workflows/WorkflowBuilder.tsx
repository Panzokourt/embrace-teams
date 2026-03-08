import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useWorkflowStages, useWorkflowConnections, type IntakeWorkflow, type IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';
import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnection, WorkflowConnectionDraft, type ConnectionData } from './WorkflowConnection';
import { WorkflowMinimap } from './WorkflowMinimap';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowSidePanel } from './WorkflowSidePanel';
import { WorkflowConnectionDialog } from './WorkflowConnectionDialog';
import { WorkflowStageDialog } from './WorkflowStageDialog';

interface WorkflowBuilderProps {
  workflow: IntakeWorkflow;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<IntakeWorkflow>) => Promise<boolean>;
}

const START_NODE = { id: '__start__', x: 100, y: 300 };
const END_NODE = { id: '__end__', x: 900, y: 300 };

export function WorkflowBuilder({ workflow, onBack, onUpdate }: WorkflowBuilderProps) {
  const { stages, addStage, updateStage, deleteStage } = useWorkflowStages(workflow.id);
  const { connections, addConnection, updateConnection, deleteConnection } = useWorkflowConnections(workflow.id);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(80);
  const [panY, setPanY] = useState(40);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging connection state
  const [draggingConnection, setDraggingConnection] = useState<{ fromId: string; fromX: number; fromY: number; mouseX: number; mouseY: number } | null>(null);

  const selectedStage = stages.find(s => s.id === selectedNodeId) || null;

  const getNodePosition = useCallback((stageId: string) => {
    if (stageId === '__start__') return START_NODE;
    if (stageId === '__end__') return END_NODE;
    const s = stages.find(st => st.id === stageId);
    if (!s) return { x: 400, y: 300 };
    return { x: s.position_x || 400, y: s.position_y || 300 };
  }, [stages]);

  // Handle pan
  const handlePanChange = useCallback((x: number, y: number) => {
    setPanX(x);
    setPanY(y);
  }, []);

  // Node position update
  const handlePositionChange = useCallback(async (stageId: string, x: number, y: number) => {
    await updateStage(stageId, { position_x: x, position_y: y } as any);
  }, [updateStage]);

  // Connection drag start
  const handleConnectionStart = useCallback((fromId: string, e: React.MouseEvent) => {
    const pos = getNodePosition(fromId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingConnection({
      fromId,
      fromX: pos.x,
      fromY: pos.y,
      mouseX: (e.clientX - rect.left - panX) / zoom,
      mouseY: (e.clientY - rect.top - panY) / zoom,
    });
  }, [getNodePosition, panX, panY, zoom]);

  // Mouse move for connection draft
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingConnection) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingConnection(prev => prev ? {
      ...prev,
      mouseX: (e.clientX - rect.left - panX) / zoom,
      mouseY: (e.clientY - rect.top - panY) / zoom,
    } : null);
  }, [draggingConnection, panX, panY, zoom]);

  // Connection end
  const handleConnectionEnd = useCallback(async (toId: string) => {
    if (!draggingConnection || draggingConnection.fromId === toId) {
      setDraggingConnection(null);
      return;
    }
    // Check duplicate
    const exists = connections.some(c =>
      (c.from_stage_id || '__start__') === draggingConnection.fromId &&
      (c.to_stage_id || '__end__') === toId
    );
    if (!exists) {
      await addConnection({
        from_stage_id: draggingConnection.fromId === '__start__' ? null : draggingConnection.fromId,
        to_stage_id: toId === '__end__' ? null : toId,
      });
    }
    setDraggingConnection(null);
  }, [draggingConnection, connections, addConnection]);

  // Cancel drag on mouse up anywhere
  useEffect(() => {
    const handleUp = () => setDraggingConnection(null);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  // Add new stage
  const handleAddNode = useCallback(() => {
    setStageDialogOpen(true);
  }, []);

  const handleSaveNewStage = useCallback(async (data: Partial<IntakeWorkflowStage>) => {
    // Default position to center of canvas
    const newStage = await addStage({
      ...data,
      position_x: (-panX / zoom) + 400,
      position_y: (-panY / zoom) + 250,
    } as any);
    return newStage;
  }, [addStage, panX, panY, zoom]);

  // Save workflow settings
  const handleSave = useCallback(async () => {
    const ok = await onUpdate(workflow.id, {
      name: workflow.name,
      is_draft: true,
    });
    if (ok) toast({ title: 'Αποθηκεύτηκε' });
  }, [workflow, onUpdate]);

  // Publish with validation
  const handlePublish = useCallback(async () => {
    // Validate
    const warnings: string[] = [];

    // Check for orphan nodes (no incoming connections)
    for (const stage of stages) {
      const hasIncoming = connections.some(c => c.to_stage_id === stage.id);
      const fromStart = connections.some(c => c.from_stage_id === null && c.to_stage_id === stage.id);
      if (!hasIncoming && !fromStart) {
        warnings.push(`Ο κόμβος "${stage.name}" δεν έχει εισερχόμενη σύνδεση`);
      }
    }

    // Check for dead-ends (no outgoing connections)
    for (const stage of stages) {
      const hasOutgoing = connections.some(c => c.from_stage_id === stage.id);
      const toEnd = connections.some(c => c.from_stage_id === stage.id && c.to_stage_id === null);
      if (!hasOutgoing && !toEnd) {
        warnings.push(`Ο κόμβος "${stage.name}" δεν έχει εξερχόμενη σύνδεση`);
      }
    }

    // Approval stages need approver
    for (const stage of stages) {
      if (stage.stage_type === 'approval' && !stage.approver_role && !stage.approver_user_id) {
        warnings.push(`Ο κόμβος έγκρισης "${stage.name}" δεν έχει ορισμένο εγκρίνοντα`);
      }
    }

    if (warnings.length > 0) {
      toast({
        title: 'Προειδοποιήσεις',
        description: warnings.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    const newVersion = (workflow.version || 1) + 1;
    const ok = await onUpdate(workflow.id, {
      version: newVersion,
      published_version: newVersion,
      is_draft: false,
      is_active: true,
    } as any);
    if (ok) toast({ title: `Δημοσιεύτηκε ως v${newVersion}` });
  }, [stages, connections, workflow, onUpdate]);

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (stages.length === 0) {
      setZoom(1);
      setPanX(80);
      setPanY(40);
      return;
    }
    const allX = [START_NODE.x, END_NODE.x, ...stages.map(s => s.position_x || 400)];
    const allY = [START_NODE.y, END_NODE.y, ...stages.map(s => s.position_y || 300)];
    const minX = Math.min(...allX) - 100;
    const maxX = Math.max(...allX) + 100;
    const minY = Math.min(...allY) - 100;
    const maxY = Math.max(...allY) + 100;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = rect.width / (maxX - minX);
    const scaleY = rect.height / (maxY - minY);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5);
    setPanX(-minX * newZoom + 20);
    setPanY(-minY * newZoom + 60);
    setZoom(newZoom);
  }, [stages]);

  // Build connection data for SVG
  const connectionDataList: ConnectionData[] = connections.map(c => {
    const fromPos = getNodePosition(c.from_stage_id || '__start__');
    const toPos = getNodePosition(c.to_stage_id || '__end__');
    return {
      id: c.id,
      fromX: fromPos.x + (c.from_stage_id ? 112 : 32),
      fromY: fromPos.y,
      toX: toPos.x - (c.to_stage_id ? 112 : 32),
      toY: toPos.y,
      label: c.label || undefined,
      selected: selectedConnectionId === c.id,
    };
  });

  // Selected connection for dialog
  const selectedConn = connections.find(c => c.id === selectedConnectionId);

  // Minimap nodes
  const minimapNodes = [
    { x: START_NODE.x, y: START_NODE.y, type: 'start' as const },
    { x: END_NODE.x, y: END_NODE.y, type: 'end' as const },
    ...stages.map(s => ({ x: s.position_x || 400, y: s.position_y || 300 })),
  ];

  const canvasRect = containerRef.current?.getBoundingClientRect();

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-8rem)] rounded-2xl border border-border/40 overflow-hidden" onMouseMove={handleCanvasMouseMove}>
      <WorkflowToolbar
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(2, z + 0.15))}
        onZoomOut={() => setZoom(z => Math.max(0.2, z - 0.15))}
        onFitToScreen={handleFitToScreen}
        onAddNode={handleAddNode}
        onSave={handleSave}
        onPublish={handlePublish}
        onBack={onBack}
        isDraft={workflow.is_draft !== false}
        version={workflow.version || 1}
        publishedVersion={(workflow as any).published_version || 0}
        workflowName={workflow.name}
      />

      <WorkflowCanvas
        zoom={zoom}
        panX={panX}
        panY={panY}
        onZoomChange={setZoom}
        onPanChange={handlePanChange}
        svgLayer={
          <>
            {connectionDataList.map(cd => (
              <WorkflowConnection
                key={cd.id}
                connection={cd}
                onClick={() => { setSelectedConnectionId(cd.id); setSelectedNodeId(null); setConnectionDialogOpen(true); }}
              />
            ))}
            {draggingConnection && (
              <WorkflowConnectionDraft
                fromX={draggingConnection.fromX + 112}
                fromY={draggingConnection.fromY}
                toX={draggingConnection.mouseX}
                toY={draggingConnection.mouseY}
              />
            )}
          </>
        }
      >
        {/* Start node */}
        <WorkflowNode
          specialType="start"
          x={START_NODE.x}
          y={START_NODE.y}
          selected={selectedNodeId === '__start__'}
          onClick={() => { setSelectedNodeId('__start__'); setSelectedConnectionId(null); }}
          onConnectionStart={(e) => handleConnectionStart('__start__', e)}
          zoom={zoom}
        />

        {/* End node */}
        <WorkflowNode
          specialType="end"
          x={END_NODE.x}
          y={END_NODE.y}
          selected={selectedNodeId === '__end__'}
          onClick={() => { setSelectedNodeId('__end__'); setSelectedConnectionId(null); }}
          onConnectionEnd={() => handleConnectionEnd('__end__')}
          zoom={zoom}
        />

        {/* Stage nodes */}
        {stages.map(stage => (
          <WorkflowNode
            key={stage.id}
            stage={stage}
            x={stage.position_x || 400}
            y={stage.position_y || 300}
            selected={selectedNodeId === stage.id}
            onClick={() => { setSelectedNodeId(stage.id); setSelectedConnectionId(null); }}
            onDelete={() => deleteStage(stage.id)}
            onPositionChange={(nx, ny) => handlePositionChange(stage.id, nx, ny)}
            onNameChange={(name) => updateStage(stage.id, { name })}
            onSlaChange={(sla) => updateStage(stage.id, { sla_hours: sla })}
            onConnectionStart={(e) => handleConnectionStart(stage.id, e)}
            onConnectionEnd={() => handleConnectionEnd(stage.id)}
            zoom={zoom}
          />
        ))}
      </WorkflowCanvas>

      {/* Minimap */}
      <WorkflowMinimap
        nodes={minimapNodes}
        zoom={zoom}
        panX={panX}
        panY={panY}
        canvasWidth={canvasRect?.width || 800}
        canvasHeight={canvasRect?.height || 600}
        onNavigate={(x, y) => { setPanX(x); setPanY(y); }}
      />

      {/* Side panel */}
      {selectedStage && (
        <WorkflowSidePanel
          stage={selectedStage}
          onUpdate={(updates) => updateStage(selectedStage.id, updates)}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Connection dialog */}
      <WorkflowConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
        connectionId={selectedConn?.id || null}
        label={selectedConn?.label || ''}
        condition={(selectedConn?.condition as any) || {}}
        onSave={(id, label, condition) => updateConnection(id, { label, condition })}
        onDelete={(id) => { deleteConnection(id); setSelectedConnectionId(null); }}
      />

      {/* Stage dialog for adding new nodes */}
      <WorkflowStageDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        stage={null}
        onSave={handleSaveNewStage}
        nextSortOrder={stages.length}
      />
    </div>
  );
}
