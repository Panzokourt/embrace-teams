import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, FileQuestion, Lightbulb, Loader2, Unlink } from 'lucide-react';
import type { HealthReport } from '@/hooks/useKBCompiler';

interface Props {
  report: HealthReport | null;
  onRun: () => void;
  isLoading: boolean;
}

export function KBHealthCheck({ report, onRun, isLoading }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Wiki Health Check</h3>
          <p className="text-xs text-muted-foreground">Ανάλυση ποιότητας και πληρότητας του wiki</p>
        </div>
        <Button onClick={onRun} disabled={isLoading} className="gap-1">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          {isLoading ? 'Αναλύει...' : 'Εκτέλεση Ελέγχου'}
        </Button>
      </div>

      {!report && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Πατήστε "Εκτέλεση Ελέγχου" για ανάλυση του wiki.</p>
        </div>
      )}

      {report && (
        <>
          {/* Score */}
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`text-3xl font-bold ${report.overall_score >= 70 ? 'text-green-500' : report.overall_score >= 40 ? 'text-yellow-500' : 'text-destructive'}`}>
                {report.overall_score}/100
              </div>
              <div>
                <p className="text-sm font-medium">Συνολική Βαθμολογία</p>
                <p className="text-xs text-muted-foreground">
                  {report.overall_score >= 70 ? 'Καλή κατάσταση' : report.overall_score >= 40 ? 'Χρειάζεται βελτίωση' : 'Κρίσιμα ζητήματα'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contradictions */}
          {report.contradictions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Αντιφάσεις ({report.contradictions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.contradictions.map((c, i) => (
                  <div key={i} className="text-sm p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="font-medium">"{c.page1}" ↔ "{c.page2}"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Orphans */}
          {report.orphan_pages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-warning">
                  <Unlink className="h-4 w-4" /> Ορφανές Σελίδες ({report.orphan_pages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {report.orphan_pages.map((p, i) => (
                  <Badge key={i} variant="outline">{p}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Missing Concepts */}
          {report.missing_concepts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" /> Ελλιπείς Έννοιες ({report.missing_concepts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.missing_concepts.map((c, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Improvements */}
          {report.improvements.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" /> Προτάσεις Βελτίωσης ({report.improvements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.improvements.map((imp, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{imp.page}</p>
                    <p className="text-xs text-muted-foreground">{imp.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
