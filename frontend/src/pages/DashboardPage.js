import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, appointmentsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Users, 
  PawPrint, 
  Calendar, 
  Bell, 
  TrendingUp, 
  TrendingDown,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

const speciesIcons = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  rabbit: '🐰',
  hamster: '🐹',
  fish: '🐠',
  other: '🐾'
};

const statusLabels = {
  scheduled: { label: 'Planlandı', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Onaylandı', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700' },
  no_show: { label: 'Gelmedi', color: 'bg-orange-100 text-orange-700' }
};

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentClick = async (appointment) => {
    setSelectedAppointment(appointment);
    setDetailsLoading(true);
    
    try {
      const response = await appointmentsAPI.getDetails(appointment.appointment_id);
      setAppointmentDetails(response.data);
    } catch (error) {
      toast.error('Randevu detayları yüklenemedi');
      setSelectedAppointment(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    setCancelLoading(true);
    try {
      const response = await appointmentsAPI.cancel(selectedAppointment.appointment_id);
      
      if (response.data.whatsapp_mocked) {
        toast.success('Randevu iptal edildi. WhatsApp bildirimi simüle edildi (API bağlantısı yok)');
      } else if (response.data.whatsapp_sent) {
        toast.success('Randevu iptal edildi ve müşteriye WhatsApp bildirimi gönderildi');
      } else {
        toast.success('Randevu iptal edildi');
      }
      
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
      setAppointmentDetails(null);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Randevu iptal edilemedi');
    } finally {
      setCancelLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          {t('welcome')}, {user?.name?.split(' ')[0] || 'Kullanıcı'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {user?.clinic_name || 'VetFlow Veteriner Kliniği'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-customers">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('total_customers')}
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-[#E0ECE4] flex items-center justify-center">
              <Users className="h-5 w-5 text-[#0F4C5C]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_customers || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-pets">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('total_pets')}
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-[#E0ECE4] flex items-center justify-center">
              <PawPrint className="h-5 w-5 text-[#0F4C5C]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_pets || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-appointments">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('today_appointments')}
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-[#E0ECE4] flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#0F4C5C]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.today_appointments || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-reminders">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('pending_reminders')}
            </CardTitle>
            <div className="w-10 h-10 rounded-lg bg-[#FF6B6B]/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-[#FF6B6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pending_reminders || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-income">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('monthly_income')}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.monthly_income)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-expense">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('monthly_expense')}
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.monthly_expense)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-shadow" data-testid="stat-profit">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('net_profit')}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-[#0F4C5C]" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.monthly_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats?.monthly_profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments */}
      <Card className="border-border/50" data-testid="recent-appointments">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#0F4C5C]" />
            {t('recent_appointments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_appointments?.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_appointments.map((apt, index) => (
                <div 
                  key={apt.appointment_id || index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleAppointmentClick(apt)}
                  data-testid={`appointment-card-${apt.appointment_id}`}
                >
                  <div>
                    <p className="font-medium">{apt.title}</p>
                    <p className="text-sm text-muted-foreground">{apt.description || 'Randevu'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(apt.date), 'dd MMM yyyy', { locale: tr })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(apt.date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t('no_data')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => {
        if (!open) {
          setSelectedAppointment(null);
          setAppointmentDetails(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Randevu Detayları</DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F4C5C]" />
            </div>
          ) : appointmentDetails ? (
            <div className="space-y-6">
              {/* Appointment Info */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{appointmentDetails.appointment?.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {appointmentDetails.appointment?.description || 'Randevu'}
                    </p>
                  </div>
                  <Badge className={statusLabels[appointmentDetails.appointment?.status]?.color || 'bg-gray-100'}>
                    {statusLabels[appointmentDetails.appointment?.status]?.label || 'Bilinmiyor'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(appointmentDetails.appointment?.date), 'dd MMMM yyyy - HH:mm', { locale: tr })}
                  </span>
                </div>
              </div>

              {/* Pet Info */}
              {appointmentDetails.pet && (
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-[#0F4C5C]" />
                    Evcil Hayvan
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{speciesIcons[appointmentDetails.pet.species] || '🐾'}</span>
                    <div>
                      <p className="font-semibold">{appointmentDetails.pet.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointmentDetails.pet.breed || 'Irk belirtilmemiş'}
                        {appointmentDetails.pet.weight && ` • ${appointmentDetails.pet.weight} kg`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              {appointmentDetails.customer && (
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0F4C5C]" />
                    Müşteri
                  </h4>
                  <div className="space-y-2">
                    <p className="font-semibold">{appointmentDetails.customer.name}</p>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {appointmentDetails.customer.phone}
                    </p>
                    {appointmentDetails.customer.email && (
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {appointmentDetails.customer.email}
                      </p>
                    )}
                    {appointmentDetails.customer.address && (
                      <p className="text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {appointmentDetails.customer.address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {appointmentDetails.appointment?.status !== 'cancelled' && 
               appointmentDetails.appointment?.status !== 'completed' && (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => setCancelDialogOpen(true)}
                    data-testid="cancel-appointment-btn"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Randevuyu İptal Et
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Randevuyu İptal Et
            </DialogTitle>
            <DialogDescription>
              Bu randevuyu iptal etmek istediğinizden emin misiniz? 
              Müşteriye WhatsApp üzerinden bildirim gönderilecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelLoading}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={cancelLoading}
              data-testid="confirm-cancel-btn"
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İptal Ediliyor...
                </>
              ) : (
                'Evet, İptal Et'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
