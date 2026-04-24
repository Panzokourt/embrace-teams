import { useEffect, useState } from 'react';
import { X, Building2, Package, Calendar, ExternalLink, Loader2, FolderOpen, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface ClientPayload {
  type: 'client';
  id: string;
}

interface DeliverablePayload {
  type: 'deliverable';
  id: string;
}

export type EntityDrawerPayload = ClientPayload | DeliverablePayload | null;

interface Props {
  payload: EntityDrawerPayload;
  onClose: () => void;
}

interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  logo_url?: string | null;
  notes?: string | null;
  projects: { id: string; name: string; status: string }[];
}

interface DeliverableData {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  project_id?: string | null;
  project_name?: string;
  tasks_total: number;
  tasks_done: number;
}

export default function FocusEntityDrawer({ payload, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<ClientData | null>(null);
  const [deliverable, setDeliverable] = useState<DeliverableData | null>(null);
  const [loading, setLoading] = useState(false);

  // Animate open after mount
  useEffect(() => {
    if (payload) {
      setClient(null);
      setDeliverable(null);
      requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(false);
    }
  }, [payload]);

  // Fetch entity data
  useEffect(() => {
    if (!payload) return;
    setLoading(true);

    (async () => {
      try {
        if (payload.type === 'client') {
          const { data: c } = await supabase
            .from('clients')
            .select('id, name, email, phone, website, industry, logo_url, notes')
            .eq('id', payload.id)
            .maybeSingle();
          if (!c) return;
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, status')
            .eq('client_id', payload.id)
            .order('created_at', { ascending: false })
            .limit(8);
          setClient({ ...(c as any), projects: (projects || []) as any });
        } else {
          const { data: d } = await supabase
            .from('deliverables')
            .select('id, name, description, status, due_date, project_id, project:projects(name)')
            .eq('id', payload.id)
            .maybeSingle();
          if (!d) return;
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, status')
            .eq('deliverable_id', payload.id);
          const total = tasks?.length || 0;
          const done = (tasks || []).filter((t: any) => t.status === 'completed' || t.status === 'done').length;
          const proj: any = (d as any).project || {};
          setDeliverable({
            id: (d as any).id, name: (d as any).name,
            description: (d as any).description, status: (d as any).status,
            due_date: (d as any).due_date, project_id: (d as any).project_id,
            project_name: proj.name,
            tasks_total: total, tasks_done: done,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [payload]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  if (!payload) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[440px] z-[61] bg-[#161b25] border-l border-white/10 shadow-2xl flex flex-col',
          'transform transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {payload.type === 'client'
              ? <Building2 className="h-4 w-4 text-[#3b82f6]" />
              : <Package className="h-4 w-4 text-[#3b82f6]" />}
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              {payload.type === 'client' ? 'Πελάτης' : 'Παραδοτέο'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-10 text-white/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && payload.type === 'client' && client && (
            <>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {client.logo_url
                    ? <img src={client.logo_url} alt={client.name} className="w-full h-full object-cover" />
                    : <Building2 className="h-6 w-6 text-white/60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-white leading-tight">{client.name}</h2>
                  {client.industry && (
                    <p className="text-white/60 text-sm mt-0.5">{client.industry}</p>
                  )}
                </div>
              </div>

              {(client.email || client.phone || client.website) && (
                <div className="space-y-2.5 bg-white/[0.04] border border-white/10 rounded-xl p-4">
                  {client.email && <Field label="Email" value={client.email} />}
                  {client.phone && <Field label="Τηλέφωνο" value={client.phone} />}
                  {client.website && (
                    <Field
                      label="Website"
                      value={
                        <a href={client.website} target="_blank" rel="noreferrer"
                           className="text-[#3b82f6] hover:underline inline-flex items-center gap-1">
                          {client.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      }
                    />
                  )}
                </div>
              )}

              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-widest text-white/55 mb-2 flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5" /> Projects ({client.projects.length})
                </h3>
                {client.projects.length === 0 ? (
                  <p className="text-white/40 text-sm italic">Δεν υπάρχουν projects</p>
                ) : (
                  <div className="space-y-1.5">
                    {client.projects.map(p => (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        onClick={handleClose}
                        className="block bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg px-3 py-2.5 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-sm font-medium truncate">{p.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-white/55 px-2 py-0.5 rounded-full bg-white/10 shrink-0">
                            {p.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {client.notes && (
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-widest text-white/55 mb-2">Σημειώσεις</h3>
                  <p className="text-white/75 text-sm whitespace-pre-wrap leading-relaxed bg-white/[0.04] border border-white/10 rounded-xl p-4">
                    {client.notes}
                  </p>
                </div>
              )}

              <Link
                to={`/clients/${client.id}`}
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#3b82f6]/15 hover:bg-[#3b82f6]/25 border border-[#3b82f6]/30 text-[#3b82f6] text-sm font-medium transition-colors"
              >
                Άνοιγμα στη σελίδα πελάτη <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}

          {!loading && payload.type === 'deliverable' && deliverable && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-white leading-tight">{deliverable.name}</h2>
                {deliverable.project_name && (
                  <p className="text-white/60 text-sm mt-1">από το project «{deliverable.project_name}»</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                  label="Ολοκληρωμένα"
                  value={`${deliverable.tasks_done}/${deliverable.tasks_total}`}
                />
                <KpiCard
                  icon={<Clock className="h-4 w-4 text-amber-300" />}
                  label="Εκκρεμή"
                  value={String(Math.max(0, deliverable.tasks_total - deliverable.tasks_done))}
                />
              </div>

              <div className="space-y-2.5 bg-white/[0.04] border border-white/10 rounded-xl p-4">
                {deliverable.status && <Field label="Status" value={deliverable.status} />}
                {deliverable.due_date && (
                  <Field label="Προθεσμία" value={
                    <span className="inline-flex items-center gap-1.5 text-white">
                      <Calendar className="h-3.5 w-3.5 text-white/50" />
                      {format(new Date(deliverable.due_date), 'd MMM yyyy', { locale: el })}
                    </span>
                  } />
                )}
              </div>

              {deliverable.description && (
                <div>
                  <h3 className="text-[12px] font-semibold uppercase tracking-widest text-white/55 mb-2">Περιγραφή</h3>
                  <p className="text-white/75 text-sm whitespace-pre-wrap leading-relaxed bg-white/[0.04] border border-white/10 rounded-xl p-4">
                    {deliverable.description}
                  </p>
                </div>
              )}

              {deliverable.project_id && (
                <Link
                  to={`/projects/${deliverable.project_id}`}
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#3b82f6]/15 hover:bg-[#3b82f6]/25 border border-[#3b82f6]/30 text-[#3b82f6] text-sm font-medium transition-colors"
                >
                  Άνοιγμα project <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-white/55 shrink-0">{label}</span>
      <span className="text-white text-right break-all">{value}</span>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-2 text-white/60 text-xs mb-1">{icon} {label}</div>
      <p className="text-white text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
