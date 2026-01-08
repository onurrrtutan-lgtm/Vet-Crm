import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { whatsappAPI, aiSettingsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  Settings, 
  Check, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const WhatsAppPage = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [aiSettings, setAiSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendData, setSendData] = useState({ phone: '', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [messagesRes, settingsRes] = await Promise.all([
        whatsappAPI.getMessages(),
        aiSettingsAPI.get()
      ]);
      setMessages(messagesRes.data);
      setAiSettings(settingsRes.data);
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!sendData.phone || !sendData.message) return;
    
    setSendLoading(true);
    try {
      await whatsappAPI.sendMessage(sendData.phone, sendData.message);
      toast.success('Mesaj gönderildi');
      setSendData({ phone: '', message: '' });
      fetchData();
    } catch (error) {
      toast.error('Mesaj gönderilemedi');
    } finally {
      setSendLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await aiSettingsAPI.update(aiSettings);
      toast.success('Ayarlar kaydedildi');
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return <Check className="w-3 h-3 text-green-500" />;
      case 'sent':
        return <Clock className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="whatsapp-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">{t('whatsapp')}</h1>
        <p className="text-muted-foreground">WhatsApp mesajları ve AI chatbot ayarları</p>
      </div>

      {/* Info Banner */}
      <Card className="border-[#FF6B6B]/30 bg-[#FF6B6B]/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#FF6B6B] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[#FF6B6B]">WhatsApp Entegrasyonu</p>
            <p className="text-muted-foreground">
              WhatsApp Business API entegrasyonu için Meta Business hesabınızı bağlamanız gerekmektedir. 
              API anahtarlarınızı Ayarlar sayfasından ekleyebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Mesajlar
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Mesaj Gönder
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Ayarları
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Mesaj Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Henüz mesaj yok</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.direction === 'outbound'
                            ? 'bg-[#0F4C5C] text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{msg.message_text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                          msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'
                        }`}>
                          <span>{msg.phone_number}</span>
                          <span>•</span>
                          <span>
                            {format(parseISO(msg.created_at), 'HH:mm', { locale: tr })}
                          </span>
                          {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Message Tab */}
        <TabsContent value="send">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Manuel Mesaj Gönder</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon Numarası</Label>
                  <Input
                    id="phone"
                    value={sendData.phone}
                    onChange={(e) => setSendData({ ...sendData, phone: e.target.value })}
                    placeholder="+90 5XX XXX XX XX"
                    required
                    data-testid="wa-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wa-message">Mesaj</Label>
                  <Textarea
                    id="wa-message"
                    value={sendData.message}
                    onChange={(e) => setSendData({ ...sendData, message: e.target.value })}
                    placeholder="Mesajınızı yazın..."
                    rows={4}
                    required
                    data-testid="wa-message-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-[#0F4C5C] hover:bg-[#0A3A46]"
                  disabled={sendLoading}
                  data-testid="wa-send-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendLoading ? 'Gönderiliyor...' : 'Gönder'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#0F4C5C]" />
                AI Chatbot Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiSettings && (
                <div className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('tone')}</Label>
                      <Select
                        value={aiSettings.tone}
                        onValueChange={(value) => setAiSettings({ ...aiSettings, tone: value })}
                      >
                        <SelectTrigger data-testid="ai-tone-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">😊 Samimi</SelectItem>
                          <SelectItem value="professional">👔 Profesyonel</SelectItem>
                          <SelectItem value="casual">🎉 Günlük</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('language')}</Label>
                      <Select
                        value={aiSettings.language}
                        onValueChange={(value) => setAiSettings({ ...aiSettings, language: value })}
                      >
                        <SelectTrigger data-testid="ai-language-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                          <SelectItem value="en">🇬🇧 English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="greeting">{t('greeting_message')}</Label>
                    <Textarea
                      id="greeting"
                      value={aiSettings.greeting_message || ''}
                      onChange={(e) => setAiSettings({ ...aiSettings, greeting_message: e.target.value })}
                      rows={2}
                      data-testid="ai-greeting-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinic_info">{t('clinic_info')}</Label>
                    <Textarea
                      id="clinic_info"
                      value={aiSettings.clinic_info || ''}
                      onChange={(e) => setAiSettings({ ...aiSettings, clinic_info: e.target.value })}
                      placeholder="Klinik adı, adresi, iletişim bilgileri..."
                      rows={3}
                      data-testid="ai-clinic-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="services">{t('services')}</Label>
                    <Textarea
                      id="services"
                      value={aiSettings.services || ''}
                      onChange={(e) => setAiSettings({ ...aiSettings, services: e.target.value })}
                      placeholder="Sunulan hizmetler: Muayene, Aşılama, Ameliyat..."
                      rows={3}
                      data-testid="ai-services-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="working_hours">{t('working_hours')}</Label>
                    <Input
                      id="working_hours"
                      value={aiSettings.working_hours || ''}
                      onChange={(e) => setAiSettings({ ...aiSettings, working_hours: e.target.value })}
                      placeholder="Hafta içi 09:00-18:00, Cumartesi 10:00-14:00"
                      data-testid="ai-hours-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">{t('custom_instructions')}</Label>
                    <Textarea
                      id="instructions"
                      value={aiSettings.custom_instructions || ''}
                      onChange={(e) => setAiSettings({ ...aiSettings, custom_instructions: e.target.value })}
                      placeholder="AI'ın nasıl davranmasını istediğinize dair özel talimatlar..."
                      rows={4}
                      data-testid="ai-instructions-input"
                    />
                  </div>

                  <Button 
                    onClick={handleUpdateSettings}
                    className="bg-[#0F4C5C] hover:bg-[#0A3A46]"
                    data-testid="save-ai-settings-btn"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Ayarları Kaydet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppPage;
