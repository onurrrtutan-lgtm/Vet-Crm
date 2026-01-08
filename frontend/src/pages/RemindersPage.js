import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { remindersAPI, customersAPI, petsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Plus, Bell, Check, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const reminderTypes = [
  { value: 'appointment', label: 'Randevu', icon: '📅' },
  { value: 'vaccination', label: 'Aşı', icon: '💉' },
  { value: 'medication', label: 'İlaç', icon: '💊' },
  { value: 'food', label: 'Mama', icon: '🍖' },
  { value: 'checkup', label: 'Kontrol', icon: '🩺' },
  { value: 'custom', label: 'Özel', icon: '📝' },
];

const RemindersPage = () => {
  const { t } = useTranslation();
  const [reminders, setReminders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [formData, setFormData] = useState({
    reminder_type: 'custom',
    title: '',
    message: '',
    due_date: '',
    customer_id: '',
    pet_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [remindersRes, customersRes, petsRes] = await Promise.all([
        remindersAPI.getAll(),
        customersAPI.getAll(),
        petsAPI.getAll()
      ]);
      setReminders(remindersRes.data);
      setCustomers(customersRes.data);
      setPets(petsRes.data);
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
        due_date: new Date(formData.due_date).toISOString(),
        pet_id: formData.pet_id || null
      };
      
      await remindersAPI.create(data);
      toast.success(t('success'));
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const handleDelete = async (reminderId) => {
    if (!window.confirm('Bu hatırlatmayı silmek istediğinizden emin misiniz?')) return;
    try {
      await remindersAPI.delete(reminderId);
      toast.success(t('success'));
      fetchData();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const resetForm = () => {
    setFormData({
      reminder_type: 'custom',
      title: '',
      message: '',
      due_date: '',
      customer_id: '',
      pet_id: ''
    });
  };

  const getReminderTypeInfo = (type) => {
    return reminderTypes.find(r => r.value === type) || reminderTypes[5];
  };

  const getCustomerName = (customerId) => {
    return customers.find(c => c.customer_id === customerId)?.name || 'Bilinmeyen';
  };

  const getPetName = (petId) => {
    if (!petId) return null;
    return pets.find(p => p.pet_id === petId)?.name || null;
  };

  const filteredPets = formData.customer_id
    ? pets.filter(p => p.customer_id === formData.customer_id)
    : [];

  const pendingReminders = reminders.filter(r => !r.sent);
  const sentReminders = reminders.filter(r => r.sent);

  const renderReminderCard = (reminder) => {
    const typeInfo = getReminderTypeInfo(reminder.reminder_type);
    const petName = getPetName(reminder.pet_id);
    
    return (
      <div
        key={reminder.reminder_id}
        className="flex items-start justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        data-testid={`reminder-card-${reminder.reminder_id}`}
      >
        <div className="flex gap-4">
          <div className="text-2xl">{typeInfo.icon}</div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{reminder.title}</h3>
              <Badge variant="secondary" className="bg-[#E0ECE4] text-[#0F4C5C]">
                {typeInfo.label}
              </Badge>
              {reminder.sent ? (
                <Badge className="bg-green-100 text-green-700">
                  <Check className="w-3 h-3 mr-1" />
                  Gönderildi
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Bekliyor
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{reminder.message}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{getCustomerName(reminder.customer_id)}</span>
              {petName && <span>• {petName}</span>}
              <span>• {format(parseISO(reminder.due_date), 'd MMM yyyy HH:mm', { locale: tr })}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(reminder.reminder_id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reminders-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">{t('reminders')}</h1>
          <p className="text-muted-foreground">Otomatik hatırlatma yönetimi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="add-reminder-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_reminder')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">{t('add_reminder')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('reminder_type')} *</Label>
                <Select
                  value={formData.reminder_type}
                  onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
                >
                  <SelectTrigger data-testid="reminder-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('customers')} *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    customer_id: value,
                    pet_id: '' 
                  })}
                >
                  <SelectTrigger data-testid="reminder-customer-select">
                    <SelectValue placeholder="Müşteri seçin" />
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

              {formData.customer_id && filteredPets.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('pets')}</Label>
                  <Select
                    value={formData.pet_id}
                    onValueChange={(value) => setFormData({ ...formData, pet_id: value })}
                  >
                    <SelectTrigger data-testid="reminder-pet-select">
                      <SelectValue placeholder="Pet seçin (opsiyonel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPets.map((pet) => (
                        <SelectItem key={pet.pet_id} value={pet.pet_id}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="reminder-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t('message')} *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  data-testid="reminder-message-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">{t('due_date')} *</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  data-testid="reminder-date-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="save-reminder-btn">
                  {t('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reminders List */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Bekleyen ({pendingReminders.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Gönderilen ({sentReminders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
              ) : pendingReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Bekleyen hatırlatma yok</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReminders.map(renderReminderCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
              ) : sentReminders.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Gönderilen hatırlatma yok</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentReminders.map(renderReminderCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemindersPage;
