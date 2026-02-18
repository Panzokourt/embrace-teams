import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Receipt,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Project {
  id: string;
  name: string;
  budget: number;
  agency_fee_percentage: number;
  client?: { name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  paid: boolean;
  project_id: string;
  project?: { name: string } | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string | null;
  project_id: string;
  project?: { name: string } | null;
}

const EXPENSE_CATEGORIES = ['Υπηρεσίες', 'Υλικά', 'Ταξίδια', 'Software', 'Marketing', 'Άλλο'];
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function FinancialsPage() {
  const { isAdmin, isManager } = useAuth();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    project_id: '',
    amount: '',
    issued_date: new Date().toISOString().split('T')[0],
    due_date: '',
    paid: false,
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    project_id: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, invoicesRes, expensesRes] = await Promise.all([
        supabase.from('projects').select('*, client:clients(name)'),
        supabase.from('invoices').select('*, project:projects(name)').order('issued_date', { ascending: false }),
        supabase.from('expenses').select('*, project:projects(name)').order('expense_date', { ascending: false }),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setProjects(projectsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Invoice handlers
  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.project_id) {
      toast.error('Επιλέξτε ένα έργο');
      return;
    }
    setSaving(true);

    try {
      const invoiceData = {
        invoice_number: invoiceForm.invoice_number,
        project_id: invoiceForm.project_id,
        amount: parseFloat(invoiceForm.amount) || 0,
        issued_date: invoiceForm.issued_date,
        due_date: invoiceForm.due_date || null,
        paid: invoiceForm.paid,
      };

      if (editingInvoice) {
        const { data, error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id)
          .select('*, project:projects(name)')
          .single();

        if (error) throw error;
        setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? data : i));
        toast.success('Το τιμολόγιο ενημερώθηκε!');
        logUpdate('invoice', editingInvoice.id, invoiceForm.invoice_number);
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select('*, project:projects(name)')
          .single();

        if (error) throw error;
        setInvoices(prev => [data, ...prev]);
        toast.success('Το τιμολόγιο δημιουργήθηκε!');
        logCreate('invoice', data.id, invoiceForm.invoice_number);
      }

      setInvoiceDialogOpen(false);
      resetInvoiceForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ paid: true, paid_date: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoices(prev => prev.map(i => 
        i.id === invoice.id ? { ...i, paid: true } : i
      ));
      toast.success('Το τιμολόγιο σημειώθηκε ως πληρωμένο!');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const deletedInvoice = invoices.find(i => i.id === invoiceId);
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
      toast.success('Το τιμολόγιο διαγράφηκε!');
      logDelete('invoice', invoiceId, deletedInvoice?.invoice_number);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      invoice_number: invoice.invoice_number,
      project_id: invoice.project_id,
      amount: invoice.amount.toString(),
      issued_date: invoice.issued_date,
      due_date: invoice.due_date || '',
      paid: invoice.paid,
    });
    setInvoiceDialogOpen(true);
  };

  const resetInvoiceForm = () => {
    setEditingInvoice(null);
    setInvoiceForm({
      invoice_number: '',
      project_id: '',
      amount: '',
      issued_date: new Date().toISOString().split('T')[0],
      due_date: '',
      paid: false,
    });
  };

  // Expense handlers
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.project_id) {
      toast.error('Επιλέξτε ένα έργο');
      return;
    }
    setSaving(true);

    try {
      const expenseData = {
        description: expenseForm.description,
        project_id: expenseForm.project_id,
        amount: parseFloat(expenseForm.amount) || 0,
        expense_date: expenseForm.expense_date,
        category: expenseForm.category || null,
      };

      if (editingExpense) {
        const { data, error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
          .select('*, project:projects(name)')
          .single();

        if (error) throw error;
        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? data : e));
        toast.success('Το έξοδο ενημερώθηκε!');
        logUpdate('expense', editingExpense.id, expenseForm.description);
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select('*, project:projects(name)')
          .single();

        if (error) throw error;
        setExpenses(prev => [data, ...prev]);
        toast.success('Το έξοδο δημιουργήθηκε!');
        logCreate('expense', data.id, expenseForm.description);
      }

      setExpenseDialogOpen(false);
      resetExpenseForm();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const deletedExpense = expenses.find(e => e.id === expenseId);
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      toast.success('Το έξοδο διαγράφηκε!');
      logDelete('expense', expenseId, deletedExpense?.description);
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description,
      project_id: expense.project_id,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      category: expense.category || '',
    });
    setExpenseDialogOpen(true);
  };

  const resetExpenseForm = () => {
    setEditingExpense(null);
    setExpenseForm({
      description: '',
      project_id: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
    });
  };

  // Calculate totals
  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget), 0);
  const totalAgencyFee = projects.reduce((sum, p) => sum + (Number(p.budget) * Number(p.agency_fee_percentage) / 100), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPending = totalInvoiced - totalPaid;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalInvoiced - totalExpenses;

  // Chart data
  const projectPLData = projects.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    budget: Number(p.budget),
    fee: Number(p.budget) * Number(p.agency_fee_percentage) / 100,
  }));

  const expensesByCategory = expenses.reduce((acc, e) => {
    const category = e.category || 'Άλλο';
    acc[category] = (acc[category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const canManage = isAdmin || isManager;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <DollarSign className="h-8 w-8" />
            Οικονομικά & P&L
          </h1>
          <p className="text-muted-foreground mt-1">
            Επισκόπηση εσόδων, εξόδων και κερδοφορίας
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            {/* Invoice Dialog */}
            <Dialog open={invoiceDialogOpen} onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) resetInvoiceForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Τιμολόγιο
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Επεξεργασία Τιμολογίου' : 'Νέο Τιμολόγιο'}</DialogTitle>
                  <DialogDescription>
                    {editingInvoice ? 'Ενημερώστε τα στοιχεία του τιμολογίου' : 'Προσθέστε ένα νέο τιμολόγιο'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoice_number">Αριθμός Τιμολογίου *</Label>
                      <Input
                        id="invoice_number"
                        value={invoiceForm.invoice_number}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                        placeholder="ΤΙΜ-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Ποσό (€) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project">Έργο *</Label>
                    <Select
                      value={invoiceForm.project_id}
                      onValueChange={(value) => setInvoiceForm(prev => ({ ...prev, project_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε έργο" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issued_date">Ημ/νία Έκδοσης</Label>
                      <Input
                        id="issued_date"
                        type="date"
                        value={invoiceForm.issued_date}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, issued_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Ημ/νία Πληρωμής</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={invoiceForm.due_date}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setInvoiceDialogOpen(false); resetInvoiceForm(); }}>
                      Ακύρωση
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingInvoice ? 'Αποθήκευση' : 'Δημιουργία'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Expense Dialog */}
            <Dialog open={expenseDialogOpen} onOpenChange={(open) => { setExpenseDialogOpen(open); if (!open) resetExpenseForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Έξοδο
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExpense ? 'Επεξεργασία Εξόδου' : 'Νέο Έξοδο'}</DialogTitle>
                  <DialogDescription>
                    {editingExpense ? 'Ενημερώστε τα στοιχεία του εξόδου' : 'Προσθέστε ένα νέο έξοδο'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Περιγραφή *</Label>
                    <Input
                      id="description"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="π.χ. Εκτύπωση υλικού"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exp_amount">Ποσό (€) *</Label>
                      <Input
                        id="exp_amount"
                        type="number"
                        step="0.01"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Κατηγορία</Label>
                      <Select
                        value={expenseForm.category}
                        onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exp_project">Έργο *</Label>
                      <Select
                        value={expenseForm.project_id}
                        onValueChange={(value) => setExpenseForm(prev => ({ ...prev, project_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε έργο" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense_date">Ημ/νία</Label>
                      <Input
                        id="expense_date"
                        type="date"
                        value={expenseForm.expense_date}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setExpenseDialogOpen(false); resetExpenseForm(); }}>
                      Ακύρωση
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {editingExpense ? 'Αποθήκευση' : 'Δημιουργία'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έσοδα</p>
                <p className="text-2xl font-bold">€{totalInvoiced.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έξοδα</p>
                <p className="text-2xl font-bold">€{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={netProfit >= 0 ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Καθαρό Κέρδος</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{netProfit.toLocaleString()}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {netProfit >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalPending > 0 ? 'border-warning/20 bg-warning/5' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Εκκρεμή Τιμολόγια</p>
                <p className="text-2xl font-bold">€{totalPending.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget ανά Έργο</CardTitle>
            <CardDescription>Προϋπολογισμός και agency fee</CardDescription>
          </CardHeader>
          <CardContent>
            {projectPLData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectPLData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="budget" fill="hsl(var(--chart-1))" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fee" fill="hsl(var(--chart-2))" name="Agency Fee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Δεν υπάρχουν δεδομένα
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Έξοδα ανά Κατηγορία</CardTitle>
            <CardDescription>Κατανομή εξόδων</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString()}`, 'Ποσό']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Δεν υπάρχουν έξοδα
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices & Expenses */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Τιμολόγια ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Έξοδα ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            P&L Έργων
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Αριθμός</TableHead>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Ποσό</TableHead>
                  <TableHead>Ημ/νία</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  {canManage && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-8">
                      Δεν υπάρχουν τιμολόγια
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.project?.name || '-'}</TableCell>
                      <TableCell>€{Number(invoice.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.issued_date), 'd MMM yyyy', { locale: el })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline"
                          className={invoice.paid ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                          {invoice.paid ? 'Πληρώθηκε' : 'Εκκρεμεί'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!invoice.paid && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleMarkAsPaid(invoice)}
                                title="Σημείωση ως πληρωμένο"
                              >
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            <EditDeleteActions
                              onEdit={() => handleEditInvoice(invoice)}
                              onDelete={() => handleDeleteInvoice(invoice.id)}
                              itemName={`το τιμολόγιο "${invoice.invoice_number}"`}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Περιγραφή</TableHead>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Κατηγορία</TableHead>
                  <TableHead>Ποσό</TableHead>
                  <TableHead>Ημ/νία</TableHead>
                  {canManage && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-8">
                      Δεν υπάρχουν έξοδα
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map(expense => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.project?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category || 'Άλλο'}</Badge>
                      </TableCell>
                      <TableCell className="text-destructive">-€{Number(expense.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(expense.expense_date), 'd MMM yyyy', { locale: el })}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <EditDeleteActions
                            onEdit={() => handleEditExpense(expense)}
                            onDelete={() => handleDeleteExpense(expense.id)}
                            itemName={`το έξοδο "${expense.description}"`}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Πελάτης</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Agency Fee %</TableHead>
                  <TableHead>Agency Fee €</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Δεν υπάρχουν έργα
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map(project => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.client?.name || '-'}</TableCell>
                      <TableCell>€{Number(project.budget).toLocaleString()}</TableCell>
                      <TableCell>{Number(project.agency_fee_percentage)}%</TableCell>
                      <TableCell className="text-success font-medium">
                        €{(Number(project.budget) * Number(project.agency_fee_percentage) / 100).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
