import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, customersAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

const incomeCategories = ['Muayene', 'Aşı', 'Ameliyat', 'Tedavi', 'Mama Satışı', 'İlaç Satışı', 'Aksesuar', 'Diğer'];
const expenseCategories = ['Kira', 'Elektrik', 'Su', 'Personel', 'Malzeme', 'Stok', 'Vergi', 'Diğer'];

const FinancePage = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    transaction_type: 'income',
    amount: '',
    category: '',
    description: '',
    customer_id: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      
      const [transactionsRes, summaryRes, customersRes] = await Promise.all([
        transactionsAPI.getAll({
          start_date: start.toISOString(),
          end_date: end.toISOString()
        }),
        transactionsAPI.getSummary({
          start_date: start.toISOString(),
          end_date: end.toISOString()
        }),
        customersAPI.getAll()
      ]);
      
      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        customer_id: formData.customer_id || null
      };
      
      await transactionsAPI.create(data);
      toast.success(t('success'));
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_type: 'income',
      amount: '',
      category: '',
      description: '',
      customer_id: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount || 0);
  };

  const getCustomerName = (customerId) => {
    if (!customerId) return null;
    return customers.find(c => c.customer_id === customerId)?.name || null;
  };

  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(t => t.transaction_type === activeTab);

  const categories = formData.transaction_type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="finance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">{t('finance')}</h1>
          <p className="text-muted-foreground">Gelir ve gider takibi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="add-transaction-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_transaction')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">{t('add_transaction')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>İşlem Türü *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    transaction_type: value,
                    category: '' 
                  })}
                >
                  <SelectTrigger data-testid="transaction-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Gelir
                      </span>
                    </SelectItem>
                    <SelectItem value="expense">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        Gider
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('amount')} (₺) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    data-testid="transaction-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('category')} *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="transaction-category-select">
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">{t('date')} *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="transaction-date-input"
                />
              </div>

              {formData.transaction_type === 'income' && (
                <div className="space-y-2">
                  <Label>{t('customers')}</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger data-testid="transaction-customer-select">
                      <SelectValue placeholder="Müşteri seçin (opsiyonel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="transaction-description-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="save-transaction-btn">
                  {t('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50" data-testid="total-income-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('total_income')}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.total_income)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="total-expense-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('total_expense')}
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.total_expense)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="net-profit-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('net_profit')}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-[#0F4C5C]" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.net_profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">Tümü</TabsTrigger>
              <TabsTrigger value="income" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Gelirler
              </TabsTrigger>
              <TabsTrigger value="expense" className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Giderler
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t('no_data')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>{t('category')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('description')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('customers')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.transaction_id}>
                        <TableCell>
                          {format(parseISO(transaction.date), 'd MMM', { locale: tr })}
                        </TableCell>
                        <TableCell>
                          {transaction.transaction_type === 'income' ? (
                            <Badge className="bg-green-100 text-green-700">Gelir</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">Gider</Badge>
                          )}
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getCustomerName(transaction.customer_id) || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;
