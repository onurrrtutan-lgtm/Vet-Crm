import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { petsAPI, customersAPI, healthRecordsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { 
  Plus, 
  Edit, 
  Trash2, 
  PawPrint, 
  History, 
  Calendar, 
  Syringe, 
  Pill,
  FileText,
  User,
  Phone,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const speciesOptions = [
  { value: 'dog', label: 'Köpek', icon: '🐕' },
  { value: 'cat', label: 'Kedi', icon: '🐱' },
  { value: 'bird', label: 'Kuş', icon: '🐦' },
  { value: 'rabbit', label: 'Tavşan', icon: '🐰' },
  { value: 'hamster', label: 'Hamster', icon: '🐹' },
  { value: 'fish', label: 'Balık', icon: '🐠' },
  { value: 'other', label: 'Diğer', icon: '🐾' },
];

const recordTypeLabels = {
  vaccination: { label: 'Aşı', icon: Syringe, color: 'bg-green-100 text-green-700' },
  treatment: { label: 'Tedavi', icon: Pill, color: 'bg-blue-100 text-blue-700' },
  surgery: { label: 'Ameliyat', icon: FileText, color: 'bg-red-100 text-red-700' },
  checkup: { label: 'Kontrol', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
};

const appointmentStatusLabels = {
  scheduled: { label: 'Planlandı', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Onaylandı', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700' },
  no_show: { label: 'Gelmedi', color: 'bg-orange-100 text-orange-700' },
};

const PetsPage = () => {
  const { t } = useTranslation();
  const [pets, setPets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedPetHistory, setSelectedPetHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    record_type: 'checkup',
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    next_due_date: '',
    cost: ''
  });
  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    species: 'dog',
    breed: '',
    birth_date: '',
    weight: '',
    color: '',
    microchip_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [petsRes, customersRes] = await Promise.all([
        petsAPI.getAll(),
        customersAPI.getAll()
      ]);
      setPets(petsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (pet) => {
    setHistoryLoading(true);
    setHistoryDialogOpen(true);
    
    try {
      const response = await petsAPI.getHistory(pet.pet_id);
      setSelectedPetHistory(response.data);
    } catch (error) {
      toast.error('Geçmiş yüklenemedi');
      setHistoryDialogOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!selectedPetHistory?.pet?.pet_id) return;

    try {
      const data = {
        pet_id: selectedPetHistory.pet.pet_id,
        record_type: recordForm.record_type,
        title: recordForm.title,
        description: recordForm.description || null,
        date: new Date(recordForm.date).toISOString(),
        next_due_date: recordForm.next_due_date ? new Date(recordForm.next_due_date).toISOString() : null,
        cost: recordForm.cost ? parseFloat(recordForm.cost) : null
      };

      await healthRecordsAPI.create(data);
      toast.success('Kayıt eklendi');
      setAddRecordOpen(false);
      setRecordForm({
        record_type: 'checkup',
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: '',
        cost: ''
      });
      
      // Refresh history
      const response = await petsAPI.getHistory(selectedPetHistory.pet.pet_id);
      setSelectedPetHistory(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kayıt eklenemedi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        birth_date: formData.birth_date ? new Date(formData.birth_date).toISOString() : null
      };
      
      if (editingPet) {
        await petsAPI.update(editingPet.pet_id, data);
        toast.success(t('success'));
      } else {
        await petsAPI.create(data);
        toast.success(t('success'));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const handleEdit = (pet) => {
    setEditingPet(pet);
    setFormData({
      customer_id: pet.customer_id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      birth_date: pet.birth_date ? pet.birth_date.split('T')[0] : '',
      weight: pet.weight || '',
      color: pet.color || '',
      microchip_id: pet.microchip_id || '',
      notes: pet.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (petId) => {
    if (!window.confirm('Bu pet\'i silmek istediğinizden emin misiniz?')) return;
    try {
      await petsAPI.delete(petId);
      toast.success(t('success'));
      fetchData();
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const resetForm = () => {
    setEditingPet(null);
    setFormData({
      customer_id: '',
      name: '',
      species: 'dog',
      breed: '',
      birth_date: '',
      weight: '',
      color: '',
      microchip_id: '',
      notes: ''
    });
  };

  const getSpeciesInfo = (species) => {
    return speciesOptions.find(s => s.value === species) || speciesOptions[6];
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.customer_id === customerId);
    return customer?.name || 'Bilinmeyen';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'd MMM yyyy', { locale: tr });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'd MMM yyyy HH:mm', { locale: tr });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="pets-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">{t('pets')}</h1>
          <p className="text-muted-foreground">Evcil hayvanları yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="add-pet-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_pet')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingPet ? t('edit') : t('add_pet')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('customers')} *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                >
                  <SelectTrigger data-testid="pet-customer-select">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pet_name">{t('pet_name')} *</Label>
                  <Input
                    id="pet_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="pet-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('species')} *</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => setFormData({ ...formData, species: value })}
                  >
                    <SelectTrigger data-testid="pet-species-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="breed">{t('breed')}</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    data-testid="pet-breed-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">{t('color')}</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    data-testid="pet-color-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">{t('birth_date')}</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    data-testid="pet-birthdate-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">{t('weight')}</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    data-testid="pet-weight-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="microchip_id">{t('microchip_id')}</Label>
                <Input
                  id="microchip_id"
                  value={formData.microchip_id}
                  onChange={(e) => setFormData({ ...formData, microchip_id: e.target.value })}
                  data-testid="pet-microchip-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet_notes">{t('notes')}</Label>
                <Textarea
                  id="pet_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="pet-notes-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="bg-[#0F4C5C] hover:bg-[#0A3A46]" data-testid="save-pet-btn">
                  {t('save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pets List */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">{t('loading')}</p>
            </div>
          ) : pets.length === 0 ? (
            <div className="p-8 text-center">
              <PawPrint className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('no_data')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pet_name')}</TableHead>
                  <TableHead>{t('species')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('breed')}</TableHead>
                  <TableHead>{t('customers')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('weight')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.map((pet) => {
                  const speciesInfo = getSpeciesInfo(pet.species);
                  return (
                    <TableRow key={pet.pet_id} data-testid={`pet-row-${pet.pet_id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{speciesInfo.icon}</span>
                          {pet.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-[#E0ECE4] text-[#0F4C5C]">
                          {speciesInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{pet.breed || '-'}</TableCell>
                      <TableCell>{getCustomerName(pet.customer_id)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {pet.weight ? `${pet.weight} kg` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewHistory(pet)}
                            title="Geçmişi Görüntüle"
                            data-testid={`history-pet-${pet.pet_id}`}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(pet)}
                            data-testid={`edit-pet-${pet.pet_id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pet.pet_id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`delete-pet-${pet.pet_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pet History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {selectedPetHistory?.pet && (
                <>
                  <span className="text-2xl">{getSpeciesInfo(selectedPetHistory.pet.species).icon}</span>
                  {selectedPetHistory.pet.name} - Geçmiş
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {historyLoading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">{t('loading')}</p>
            </div>
          ) : selectedPetHistory && (
            <div className="space-y-6">
              {/* Pet & Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PawPrint className="w-4 h-4" />
                      Pet Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Tür:</span> {getSpeciesInfo(selectedPetHistory.pet.species).label}</p>
                    <p><span className="text-muted-foreground">Irk:</span> {selectedPetHistory.pet.breed || '-'}</p>
                    <p><span className="text-muted-foreground">Doğum:</span> {formatDate(selectedPetHistory.pet.birth_date)}</p>
                    <p><span className="text-muted-foreground">Ağırlık:</span> {selectedPetHistory.pet.weight ? `${selectedPetHistory.pet.weight} kg` : '-'}</p>
                  </CardContent>
                </Card>
                
                {selectedPetHistory.customer && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Sahip Bilgileri
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Ad:</span> {selectedPetHistory.customer.name}</p>
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {selectedPetHistory.customer.phone}
                      </p>
                      {selectedPetHistory.customer.email && (
                        <p><span className="text-muted-foreground">Email:</span> {selectedPetHistory.customer.email}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tabs for History */}
              <Tabs defaultValue="records">
                <TabsList>
                  <TabsTrigger value="records">
                    Sağlık Kayıtları ({selectedPetHistory.health_records?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="appointments">
                    Randevular ({selectedPetHistory.appointments?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="records" className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Sağlık Kayıtları</h3>
                    <Dialog open={addRecordOpen} onOpenChange={setAddRecordOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-[#0F4C5C] hover:bg-[#0A3A46]">
                          <Plus className="w-4 h-4 mr-1" />
                          Kayıt Ekle
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Yeni Sağlık Kaydı</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddRecord} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Kayıt Türü</Label>
                            <Select
                              value={recordForm.record_type}
                              onValueChange={(v) => setRecordForm({...recordForm, record_type: v})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vaccination">Aşı</SelectItem>
                                <SelectItem value="treatment">Tedavi</SelectItem>
                                <SelectItem value="surgery">Ameliyat</SelectItem>
                                <SelectItem value="checkup">Kontrol</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Başlık *</Label>
                            <Input
                              value={recordForm.title}
                              onChange={(e) => setRecordForm({...recordForm, title: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Textarea
                              value={recordForm.description}
                              onChange={(e) => setRecordForm({...recordForm, description: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tarih *</Label>
                              <Input
                                type="date"
                                value={recordForm.date}
                                onChange={(e) => setRecordForm({...recordForm, date: e.target.value})}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sonraki Tarih</Label>
                              <Input
                                type="date"
                                value={recordForm.next_due_date}
                                onChange={(e) => setRecordForm({...recordForm, next_due_date: e.target.value})}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Ücret (₺)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={recordForm.cost}
                              onChange={(e) => setRecordForm({...recordForm, cost: e.target.value})}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setAddRecordOpen(false)}>
                              İptal
                            </Button>
                            <Button type="submit" className="bg-[#0F4C5C] hover:bg-[#0A3A46]">
                              Kaydet
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {selectedPetHistory.health_records?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Tür</TableHead>
                          <TableHead>Başlık</TableHead>
                          <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                          <TableHead className="hidden md:table-cell">Sonraki</TableHead>
                          <TableHead className="text-right">Ücret</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPetHistory.health_records.map((record) => {
                          const typeInfo = recordTypeLabels[record.record_type] || recordTypeLabels.checkup;
                          const TypeIcon = typeInfo.icon;
                          return (
                            <TableRow key={record.record_id}>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell>
                                <Badge className={typeInfo.color}>
                                  <TypeIcon className="w-3 h-3 mr-1" />
                                  {typeInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{record.title}</TableCell>
                              <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                                {record.description || '-'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {formatDate(record.next_due_date)}
                              </TableCell>
                              <TableCell className="text-right">
                                {record.cost ? `₺${record.cost.toFixed(2)}` : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Henüz kayıt yok</p>
                  )}
                </TabsContent>

                <TabsContent value="appointments" className="mt-4">
                  <h3 className="font-medium mb-4">Randevu Geçmişi</h3>
                  {selectedPetHistory.appointments?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Başlık</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="hidden md:table-cell">Açıklama</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPetHistory.appointments.map((apt) => {
                          const statusInfo = appointmentStatusLabels[apt.status] || appointmentStatusLabels.scheduled;
                          return (
                            <TableRow key={apt.appointment_id}>
                              <TableCell>{formatDateTime(apt.date)}</TableCell>
                              <TableCell className="font-medium">{apt.title}</TableCell>
                              <TableCell>
                                <Badge className={statusInfo.color}>
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {apt.description || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Henüz randevu yok</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PetsPage;
