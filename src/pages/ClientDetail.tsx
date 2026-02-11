import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, 
  FolderKanban, Wallet, FileText, Loader2, TrendingUp, 
  CheckCircle2, Clock, StickyNote
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget: number;
  start_date: string | null;
  end_date: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
}

interface Contract {
  id: string;
  contract_number: string | null;
  total_amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (id) fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, status, progress, budget, start_date, end_date')
        .eq('client_id', id)
        .order('created_at', { ascending: false });
      
      setProjects(projectsData || []);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, issued_date, due_date, paid, paid_date')
        .eq('client_id', id)
        .order('issued_date', { ascending: false });
      
      setInvoices(invoicesData || []);

      // Fetch contracts through projects
      if (projectsData && projectsData.length > 0) {
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, contract_number, total_amount, status, start_date, end_date')
          .in('project_id', projectsData.map(p => p.id));
        
        setContracts(contractsData || []);
      }

    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Σφάλμα κατά τη φόρτωση πελάτη');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = invoices.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
  const pendingInvoices = invoices.filter(i => !i.paid);
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const activeProjects = projects.filter(p => p.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <Building2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Ο πελάτης δεν βρέθηκε</h2>
        <Button variant="outline" onClick={() => navigate('/clients')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Επιστροφή
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {client.contact_email && (
                <span className="text-muted-foreground">{client.contact_email}</span>
              )}
              <Badge variant="outline">{projects.length} έργα</Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProjects.length}</p>
                <p className="text-sm text-muted-foreground">Ενεργά έργα</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Συνολικά έσοδα</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{pendingAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Εκκρεμεί</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-sm text-muted-foreground">Τιμολόγια</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Πληροφορίες
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.contact_email}</span>
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.contact_phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Πελάτης από: {format(new Date(client.created_at), 'd MMM yyyy', { locale: el })}</span>
              </div>
              {client.notes && (
                <div className="pt-2 border-t">
                  <div className="flex items-start gap-3">
                    <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">{client.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Projects, Invoices, Contracts */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="projects">
            <TabsList>
              <TabsTrigger value="projects">
                <FolderKanban className="h-4 w-4 mr-2" />
                Έργα ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="invoices">
                <FileText className="h-4 w-4 mr-2" />
                Τιμολόγια ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="contracts">
                <Wallet className="h-4 w-4 mr-2" />
                Συμβόλαια ({contracts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {projects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν έργα</p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map(project => (
                        <Link 
                          key={project.id} 
                          to={`/projects/${project.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <div>
                            <span className="font-medium">{project.name}</span>
                            {project.budget > 0 && (
                              <span className="text-sm text-muted-foreground ml-2">
                                • €{project.budget.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={project.status === 'active' ? 'default' : 'outline'}>
                              {project.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{project.progress}%</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {invoices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν τιμολόγια</p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map(invoice => (
                        <div 
                          key={invoice.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div>
                            <span className="font-medium">{invoice.invoice_number}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              • {format(new Date(invoice.issued_date), 'd MMM yyyy', { locale: el })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">€{Number(invoice.amount).toLocaleString()}</span>
                            {invoice.paid ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Πληρώθηκε
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <Clock className="h-3 w-3 mr-1" />
                                Εκκρεμεί
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contracts" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  {contracts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν συμβόλαια</p>
                  ) : (
                    <div className="space-y-3">
                      {contracts.map(contract => (
                        <div 
                          key={contract.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div>
                            <span className="font-medium">{contract.contract_number || 'Χωρίς αριθμό'}</span>
                            {contract.start_date && (
                              <span className="text-sm text-muted-foreground ml-2">
                                • {format(new Date(contract.start_date), 'd MMM yyyy', { locale: el })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">€{Number(contract.total_amount).toLocaleString()}</span>
                            <Badge variant="outline">{contract.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
