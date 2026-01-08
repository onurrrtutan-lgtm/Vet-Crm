import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appointmentsAPI, customersAPI, petsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
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
import { Badge } from '../components/ui/badge';
import { Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700'
};

const statusLabels = {
  scheduled: 'Planlandı',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'Gelmedi'
};

const AppointmentsPage = () => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    customer_id: '',
    pet_id: '',
    title: '',
    description: '',
    date: '',
    time: '10:00',
    duration_minutes: 30,
    status: 'scheduled'
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      
      const [aptsRes, customersRes, petsRes] = await Promise.all([
        appointmentsAPI.getAll({
          start_date: start.toISOString(),
          end_date: end.toISOString()
        }),
        customersAPI.getAll(),
        petsAPI.getAll()
      ]);
      
      setAppointments(aptsRes.data);
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
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const data = {
        customer_id: formData.customer_id,
        pet_id: formData.pet_id,
        title: formData.title,
        description: formData.description,
        date: dateTime.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        status: formData.status
      };
      
      await appointmentsAPI.create(data);
      toast.success(t('success'));
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await appointmentsAPI.update(appointmentId, { status: newStatus });
      toast.success(t('success'));
      fetchData();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!window.confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) return;
    try {
      await appointmentsAPI.delete(appointmentId);
      toast.success(t('success'));
      fetchData();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      pet_id: '',
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: '10:00',
      duration_minutes: 30,
      status: 'scheduled'
    });
  };

  const filteredPets = formData.customer_id
    ? pets.filter(p => p.customer_id === formData.customer_id)
    : [];

  const appointmentsForDate = appointments.filter(apt => {
    const aptDate = parseISO(apt.date);
    return isSameDay(aptDate, selectedDate);
  });

  const getCustomerName = (customerId) => {
    return customers.find(c => c.customer_id === customerId)?.name || 'Bilinmeyen';
  };

  const getPetName = (petId) => {
    return pets.find(p => p.pet_id === petId)?.name || 'Bilinmeyen';
  };

  // Highlight dates with appointments
  const appointmentDates = appointments.map(apt => parseISO(apt.date));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="appointments-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">{t('appointments')}</h1>
          <p className="text-muted-foreground">Randevularınızı yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#0F4C5C] hover:bg-[#0A3A46]" 
              data-testid="add-appointment-btn"
              onClick={() => setFormData(prev => ({
                ...prev,
                date: format(selectedDate, 'yyyy-MM-dd')
              }))}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_appointment')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{t('add_appointment')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <SelectTrigger data-testid="apt-customer-select">
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

              {formData.customer_id && (
                <div className="space-y-2">
                  <Label>{t('pets')} *</Label>
                  <Select
                    value={formData.pet_id}
                    onValueChange={(value) => setFormData({ ...formData, pet_id: value })}
                  >
                    <SelectTrigger data-testid="apt-pet-select">
                      <SelectValue placeholder="Pet seçin" />
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
                <Label htmlFor="title">{t('appointment_title')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ör: Aşı kontrolü"
                  required
                  data-testid="apt-title-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">{t('date')} *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="apt-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Saat *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    data-testid="apt-time-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">{t('duration')}</Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duration_minutes: parseInt(value) })}
                >
                  <SelectTrigger data-testid="apt-duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 dakika</SelectItem>
                    <SelectItem value="30">30 dakika</SelectItem>
                    <SelectItem value="45">45 dakika</SelectItem>
                    <SelectItem value="60">60 dakika</SelectItem>
                    <SelectItem value="90">90 dakika</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="apt-description-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="save-apt-btn">
                  {t('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar and Appointments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#0F4C5C]" />
              Takvim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={tr}
              className="rounded-md border"
              modifiers={{
                hasAppointment: appointmentDates
              }}
              modifiersStyles={{
                hasAppointment: {
                  backgroundColor: '#E0ECE4',
                  color: '#0F4C5C',
                  fontWeight: 'bold'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-heading">
              {format(selectedDate, 'd MMMM yyyy', { locale: tr })} Randevuları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
            ) : appointmentsForDate.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Bu tarihte randevu yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointmentsForDate.map((apt) => (
                  <div
                    key={apt.appointment_id}
                    className="flex items-start justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`apt-card-${apt.appointment_id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(parseISO(apt.date), 'HH:mm')}
                        </span>
                        <Badge className={statusColors[apt.status]}>
                          {statusLabels[apt.status]}
                        </Badge>
                      </div>
                      <h3 className="font-semibold">{apt.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getCustomerName(apt.customer_id)} - {getPetName(apt.pet_id)}
                      </p>
                      {apt.description && (
                        <p className="text-sm text-muted-foreground mt-1">{apt.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {apt.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(apt.appointment_id, 'confirmed')}
                          className="text-green-600 hover:text-green-700"
                          title="Onayla"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(apt.appointment_id, 'completed')}
                          className="text-blue-600 hover:text-blue-700"
                          title="Tamamlandı"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(apt.appointment_id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentsPage;
