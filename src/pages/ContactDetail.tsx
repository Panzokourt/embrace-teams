import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Globe, MapPin, Hash, Building2, User, Landmark, Pencil, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContactForm } from '@/components/contacts/ContactForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const categoryLabels: Record<string, string> = {
  client: 'Πελάτης', supplier: 'Προμηθευτής', partner: 'Συνεργάτης',
  media: 'Μέσα', government: 'Φορέας', freelancer: 'Freelancer', other: 'Άλλο',
};

const sectorLabels: Record<string, string> = {
  public: 'Δημόσιος Τομέας', private: 'Ιδιωτικός Τομέας', non_profit: 'Μη Κερδοσκοπικός',
  government: 'Κυβερνητικός', mixed: 'Μικτός',
};

const entityIcons: Record<string, any> = { person: User, company: Building2, organization: Landmark };

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  const companyId = company?.id;
  const [contact, setContact] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchContact = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
    setContact(data);

    // Fetch associated projects
    const { data: pca } = await supabase.from('project_contact_access').select('*, projects(id, name, status)').eq('contact_id', id);
    setProjects((pca || []).map((p: any) => ({ ...p.projects, role: p.role })));
    setLoading(false);
  };

  useEffect(() => { fetchContact(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Φόρτωση...</div>;
  if (!contact) return <div className="flex items-center justify-center h-64 text-muted-foreground">Η επαφή δεν βρέθηκε</div>;

  const EntityIcon = entityIcons[contact.entity_type] || User;
  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleInvite = async () => {
    if (!contact.email) { toast.error('Η επαφή δεν έχει email'); return; }
    if (!companyId) return;
    const projectIds = projects.map(p => p.id);
    if (projectIds.length === 0) { toast.error('Πρέπει πρώτα να αναθέσετε έργα'); return; }

    const { error } = await supabase.from('invitations').insert({
      email: contact.email,
      company_id: companyId,
      role: 'standard',
      access_scope: 'assigned',
      project_ids: projectIds,
      invited_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) toast.error(error.message);
    else toast.success('Η πρόσκληση στάλθηκε');
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Ευρετήριο
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials(contact.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              {contact.client_id && <Badge variant="outline">Πελάτης</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><EntityIcon className="h-4 w-4" />{contact.entity_type === 'person' ? 'Φυσικό Πρόσωπο' : contact.entity_type === 'company' ? 'Εταιρεία' : 'Οργανισμός'}</span>
              <Badge variant="secondary">{categoryLabels[contact.category] || contact.category}</Badge>
              {contact.sector && <Badge variant="outline">{sectorLabels[contact.sector] || contact.sector}</Badge>}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(contact.tags || []).map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {contact.client_id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/clients/${contact.client_id}`}><ExternalLink className="h-4 w-4 mr-1" />Καρτέλα Πελάτη</Link>
            </Button>
          )}
          {contact.email && <Button variant="outline" size="sm" onClick={handleInvite}><Send className="h-4 w-4 mr-1" />Πρόσκληση</Button>}
          <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-1" />Επεξεργασία</Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Στοιχεία</TabsTrigger>
          <TabsTrigger value="projects">Έργα ({projects.length})</TabsTrigger>
          <TabsTrigger value="notes">Σημειώσεις</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">Στοιχεία Επικοινωνίας</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.email && <InfoRow icon={Mail} label="Email" value={contact.email} />}
              {contact.phone && <InfoRow icon={Phone} label="Τηλέφωνο" value={contact.phone} />}
              {contact.secondary_phone && <InfoRow icon={Phone} label="Δεύτερο Τηλ." value={contact.secondary_phone} />}
              {contact.website && <InfoRow icon={Globe} label="Ιστοσελίδα" value={contact.website} />}
              {contact.address && <InfoRow icon={MapPin} label="Διεύθυνση" value={contact.address} />}
              {contact.tax_id && <InfoRow icon={Hash} label="ΑΦΜ" value={contact.tax_id} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardContent className="pt-6">
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν συνδεδεμένα έργα</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Έργο</TableHead><TableHead>Ρόλος</TableHead><TableHead>Κατάσταση</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {projects.map(p => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline">{p.role}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap text-sm">{contact.notes || 'Δεν υπάρχουν σημειώσεις'}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ContactForm open={editOpen} onOpenChange={setEditOpen} contact={contact} onSaved={fetchContact} />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm">{value}</p></div>
    </div>
  );
}
