import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Plus, 
  Loader2,
  Receipt,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  paid: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string | null;
}

interface ProjectFinancialsManagerProps {
  projectId: string;
  clientId?: string | null;
}

const EXPENSE_CATEGORIES = ['Υπηρεσίες', 'Υλικά', 'Ταξίδια', 'Software', 'Marketing', 'Άλλο'];

export function ProjectFinancialsManager({ projectId, clientId }: ProjectFinancialsManagerProps) {
  const { isAdmin, isManager } = useAuth();
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
    amount: '',
    issued_date: new Date().toISOString().split('T')[0],
    due_date: '',
    paid: false,
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [invoicesRes, expensesRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('project_id', projectId).order('issued_date', { ascending: false }),
        supabase.from('expenses').select('*').eq('project_id', projectId).order('expense_date', { ascending: false }),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (expensesRes.error) throw expensesRes.error;

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
    setSaving(true);

    try {
      const invoiceData = {
        project_id: projectId,
        client_id: clientId || null,
        invoice_number: invoiceForm.invoice_number,
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
          .select()
          .single();

        if (error) throw error;
        setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? data : i));
        toast.success('Το τιμολόγιο ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (error) throw error;
        setInvoices(prev => [data, ...prev]);
        toast.success('Το τιμολόγιο δημιουργήθηκε!');
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
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
      toast.success('Το τιμολόγιο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      invoice_number: invoice.invoice_number,
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
      amount: '',
      issued_date: new Date().toISOString().split('T')[0],
      due_date: '',
      paid: false,
    });
  };

  // Expense handlers
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const expenseData = {
        project_id: projectId,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount) || 0,
        expense_date: expenseForm.expense_date,
        category: expenseForm.category || null,
      };

      if (editingExpense) {
        const { data, error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
          .select()
          .single();

        if (error) throw error;
        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? data : e));
        toast.success('Το έξοδο ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .single();

        if (error) throw error;
        setExpenses(prev => [data, ...prev]);
        toast.success('Το έξοδο δημιουργήθηκε!');
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
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      toast.success('Το έξοδο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      description: expense.description,
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
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
    });
  };

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Τιμολογημένα</p>
            <p className="text-xl font-bold">€{totalInvoiced.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Εισπραχθέντα</p>
            <p className="text-xl font-bold text-success">€{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Έξοδα</p>
            <p className="text-xl font-bold text-destructive">€{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices and Expenses */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Τιμολόγια ({invoices.length})</TabsTrigger>
          <TabsTrigger value="expenses">Έξοδα ({expenses.length})</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => { resetInvoiceForm(); setInvoiceDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Νέο Τιμολόγιο
              </Button>
            </div>
          )}

          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν τιμολόγια</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.issued_date), 'd MMM yyyy', { locale: el })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">€{invoice.amount.toLocaleString()}</p>
                      <Badge variant={invoice.paid ? "default" : "outline"} className={invoice.paid ? "bg-success" : ""}>
                        {invoice.paid ? 'Πληρωμένο' : 'Εκκρεμεί'}
                      </Badge>
                    </div>
                    {canManage && !invoice.paid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsPaid(invoice)}
                        title="Σημείωση ως πληρωμένο"
                      >
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    {canManage && (
                      <EditDeleteActions
                        onEdit={() => handleEditInvoice(invoice)}
                        onDelete={() => handleDeleteInvoice(invoice.id)}
                        itemName={invoice.invoice_number}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => { resetExpenseForm(); setExpenseDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Νέο Έξοδο
              </Button>
            </div>
          )}

          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν έξοδα</p>
          ) : (
            <div className="space-y-2">
              {expenses.map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category || 'Χωρίς κατηγορία'} • {format(new Date(expense.expense_date), 'd MMM yyyy', { locale: el })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-destructive">-€{expense.amount.toLocaleString()}</p>
                    {canManage && (
                      <EditDeleteActions
                        onEdit={() => handleEditExpense(expense)}
                        onDelete={() => handleDeleteExpense(expense.id)}
                        itemName={expense.description}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={(open) => { setInvoiceDialogOpen(open); if (!open) resetInvoiceForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Επεξεργασία Τιμολογίου' : 'Νέο Τιμολόγιο'}</DialogTitle>
            <DialogDescription>
              {editingInvoice ? 'Ενημερώστε τα στοιχεία του τιμολογίου' : 'Προσθέστε ένα νέο τιμολόγιο'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvoiceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Αριθμός *</Label>
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
                  required
                />
              </div>
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
        <DialogContent className="max-w-md">
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
                placeholder="Περιγραφή εξόδου"
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

            <div className="space-y-2">
              <Label htmlFor="expense_date">Ημερομηνία</Label>
              <Input
                id="expense_date"
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
              />
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
  );
}
