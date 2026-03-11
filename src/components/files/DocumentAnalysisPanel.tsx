import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Brain, RefreshCw, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentAnalysisPanelProps {
  fileId: string;
  fileName: string;
  documentType: string;
  analysis: Record<string, any> | null;
  onAnalysisUpdate: (analysis: Record<string, any>) => void;
  onReanalyze: () => void;
  analyzing?: boolean;
}

export function DocumentAnalysisPanel({
  fileId,
  fileName,
  documentType,
  analysis,
  onAnalysisUpdate,
  onReanalyze,
  analyzing,
}: DocumentAnalysisPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  if (!analysis && !analyzing) return null;

  const startEdit = () => {
    setEditData({ ...analysis });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('file_attachments')
        .update({ ai_analysis: editData } as any)
        .eq('id', fileId);
      if (error) throw error;
      onAnalysisUpdate(editData);
      setEditing(false);
      toast.success('Η ανάλυση ενημερώθηκε');
    } catch {
      toast.error('Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  const renderValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">—</span>;
    if (typeof value === 'string') return <span className="text-sm">{value}</span>;
    if (typeof value === 'number') return <span className="text-sm font-medium">{value.toLocaleString()}</span>;
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground italic text-sm">Κενό</span>;
      if (typeof value[0] === 'string') {
        return (
          <ul className="list-disc list-inside space-y-0.5">
            {value.map((v, i) => <li key={i} className="text-sm">{v}</li>)}
          </ul>
        );
      }
      return (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="text-sm bg-muted/50 rounded p-2">
              {Object.entries(item).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground capitalize">{k}:</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="text-sm space-y-1">
          {Object.entries(value).map(([k, v]) => (
            <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
          ))}
        </div>
      );
    }
    return <span className="text-sm">{String(value)}</span>;
  };

  const LABEL_MAP: Record<string, string> = {
    summary: 'Περίληψη',
    parties: 'Συμβαλλόμενα Μέρη',
    start_date: 'Ημ. Έναρξης',
    end_date: 'Ημ. Λήξης',
    value: 'Αξία',
    currency: 'Νόμισμα',
    payment_terms: 'Όροι Πληρωμής',
    obligations: 'Υποχρεώσεις',
    termination_conditions: 'Όροι Λύσης',
    special_clauses: 'Ειδικοί Όροι',
    objectives: 'Στόχοι',
    target_audience: 'Κοινό-Στόχος',
    kpis: 'KPIs',
    budget: 'Προϋπολογισμός',
    timeline: 'Χρονοδιάγραμμα',
    deliverables: 'Παραδοτέα',
    tone_of_voice: 'Τόνος',
    constraints: 'Περιορισμοί',
    services: 'Υπηρεσίες',
    total_cost: 'Συνολικό Κόστος',
    terms: 'Όροι',
    validity_period: 'Περίοδος Ισχύος',
    title: 'Τίτλος',
    entities: 'Οντότητες',
    dates: 'Ημερομηνίες',
    amounts: 'Ποσά',
    key_points: 'Βασικά Σημεία',
    action_items: 'Ενέργειες',
    invoice_number: 'Αρ. Τιμολογίου',
    issuer: 'Εκδότης',
    recipient: 'Παραλήπτης',
    items: 'Στοιχεία',
    subtotal: 'Υποσύνολο',
    vat: 'ΦΠΑ',
    total: 'Σύνολο',
    issue_date: 'Ημ. Έκδοσης',
    due_date: 'Ημ. Πληρωμής',
  };

  const typeLabels: Record<string, string> = {
    contract: 'Συμβόλαιο',
    brief: 'Brief',
    proposal: 'Πρόταση',
    report: 'Αναφορά',
    invoice: 'Τιμολόγιο',
    presentation: 'Παρουσίαση',
    creative: 'Δημιουργικό',
    vendor_doc: 'Προμηθευτής',
    correspondence: 'Αλληλογραφία',
    other: 'Γενικό',
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Ανάλυση
            <Badge variant="outline" className="text-[10px]">{typeLabels[documentType] || documentType}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            {!analyzing && analysis && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); onReanalyze(); }} title="Επανάληψη ανάλυσης">
                  <RefreshCw className="h-3 w-3" />
                </Button>
                {!editing ? (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); startEdit(); }} title="Επεξεργασία">
                    <Save className="h-3 w-3" />
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setEditing(false); }}>
                      <X className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); saveEdit(); }} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 text-primary" />}
                    </Button>
                  </>
                )}
              </>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0">
          {analyzing ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ανάλυση σε εξέλιξη...
            </div>
          ) : analysis ? (
            <div className="space-y-3">
              {Object.entries(analysis).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    {LABEL_MAP[key] || key}
                  </p>
                  {editing ? (
                    typeof value === 'string' ? (
                      key === 'summary' ? (
                        <Textarea
                          value={editData[key] || ''}
                          onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                          rows={2}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          value={editData[key] || ''}
                          onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="h-7 text-sm"
                        />
                      )
                    ) : typeof value === 'number' ? (
                      <Input
                        type="number"
                        value={editData[key] ?? ''}
                        onChange={e => setEditData(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        className="h-7 text-sm"
                      />
                    ) : (
                      renderValue(key, value)
                    )
                  ) : (
                    renderValue(key, value)
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
