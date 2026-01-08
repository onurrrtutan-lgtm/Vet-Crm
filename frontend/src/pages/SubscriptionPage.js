import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { subscriptionAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { 
  Crown, 
  Check, 
  Users, 
  MessageCircle, 
  Calendar,
  Zap,
  Star,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [responsePacks, setResponsePacks] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    fetchData();
    checkPaymentStatus();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, currentRes, limitsRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getCurrent(),
        subscriptionAPI.getLimits()
      ]);
      
      setPlans(plansRes.data.plans);
      setResponsePacks(plansRes.data.response_packages);
      setCurrentSub(currentRes.data);
      setLimits(limitsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    const sessionId = searchParams.get('session_id');
    const payment = searchParams.get('payment');
    
    if (payment === 'cancelled') {
      toast.error('Ödeme iptal edildi');
      return;
    }
    
    if (sessionId && payment === 'success') {
      setPaymentDialog(true);
      setPaymentStatus('checking');
      
      // Poll for payment status
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkStatus = async () => {
        try {
          const res = await subscriptionAPI.getPaymentStatus(sessionId);
          
          if (res.data.payment_status === 'paid') {
            setPaymentStatus('success');
            toast.success('Ödeme başarılı! Aboneliğiniz aktifleştirildi.');
            fetchData();
            return;
          }
          
          if (res.data.status === 'expired') {
            setPaymentStatus('failed');
            toast.error('Ödeme süresi doldu');
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 2000);
          } else {
            setPaymentStatus('timeout');
          }
        } catch (error) {
          setPaymentStatus('error');
        }
      };
      
      checkStatus();
    }
  };

  const handleSubscribe = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await subscriptionAPI.createCheckout(planId);
      window.location.href = res.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bir hata oluştu');
      setCheckoutLoading(null);
    }
  };

  const handleBuyResponsePack = async (packId) => {
    setCheckoutLoading(packId);
    try {
      const res = await subscriptionAPI.createResponsePackCheckout(packId);
      window.location.href = res.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bir hata oluştu');
      setCheckoutLoading(null);
    }
  };

  const handleStartTrial = async () => {
    setCheckoutLoading('trial');
    try {
      await subscriptionAPI.startTrial();
      toast.success('7 günlük deneme başlatıldı!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deneme başlatılamadı');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'starter': return <Package className="w-6 h-6" />;
      case 'professional': return <Star className="w-6 h-6" />;
      case 'unlimited': return <Crown className="w-6 h-6" />;
      default: return <Package className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F4C5C]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="subscription-page">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-heading font-bold mb-2">Abonelik Planları</h1>
        <p className="text-muted-foreground">
          Kliniğinize en uygun planı seçin. İstediğiniz zaman yükseltin veya iptal edin.
        </p>
      </div>

      {/* Current Subscription Status */}
      {currentSub?.has_subscription && limits && (
        <Card className="border-[#0F4C5C]/20 bg-[#0F4C5C]/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#0F4C5C]">
                    {currentSub.subscription?.status === 'trial' ? 'Deneme' : 'Aktif'}
                  </Badge>
                  <span className="font-semibold text-lg">
                    {plans?.[currentSub.subscription?.plan]?.name || 'Starter'} Plan
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bitiş: {new Date(currentSub.subscription?.current_period_end).toLocaleDateString('tr-TR')}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Müşteri Kullanımı</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0F4C5C]" />
                    <span className="font-medium">
                      {limits.customer_limit?.current} / {limits.customer_limit?.limit === -1 ? '∞' : limits.customer_limit?.limit}
                    </span>
                  </div>
                  {limits.customer_limit?.limit !== -1 && (
                    <Progress 
                      value={(limits.customer_limit?.current / limits.customer_limit?.limit) * 100} 
                      className="h-1.5 mt-1"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">WhatsApp Yanıt</p>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#0F4C5C]" />
                    <span className="font-medium">
                      {limits.whatsapp_responses?.remaining} kalan
                    </span>
                  </div>
                  <Progress 
                    value={((limits.whatsapp_responses?.monthly_limit - limits.whatsapp_responses?.used) / limits.whatsapp_responses?.monthly_limit) * 100} 
                    className="h-1.5 mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Subscription - Start Trial */}
      {!currentSub?.has_subscription && (
        <Card className="border-[#FF6B6B]/30 bg-[#FF6B6B]/5">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-[#FF6B6B] mb-4" />
            <h3 className="font-semibold text-lg mb-2">Henüz aboneliğiniz yok</h3>
            <p className="text-muted-foreground mb-4">
              7 günlük ücretsiz deneme ile başlayın veya bir plan seçin.
            </p>
            <Button 
              onClick={handleStartTrial}
              disabled={checkoutLoading === 'trial'}
              className="bg-[#FF6B6B] hover:bg-[#e55a5a]"
              data-testid="start-trial-btn"
            >
              {checkoutLoading === 'trial' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              7 Gün Ücretsiz Dene
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans && Object.entries(plans).map(([planId, plan]) => {
          const isCurrentPlan = currentSub?.subscription?.plan === planId;
          const isProfessional = planId === 'professional';
          
          return (
            <Card 
              key={planId}
              className={`relative ${isProfessional ? 'border-[#0F4C5C] shadow-lg scale-105' : 'border-border/50'}`}
              data-testid={`plan-${planId}`}
            >
              {isProfessional && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#0F4C5C]">En Popüler</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  isProfessional ? 'bg-[#0F4C5C] text-white' : 'bg-[#E0ECE4] text-[#0F4C5C]'
                }`}>
                  {getPlanIcon(planId)}
                </div>
                <CardTitle className="text-xl font-heading">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{formatCurrency(plan.price)}</span>
                  <span className="text-muted-foreground">/ay</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className={`w-full ${isProfessional ? 'bg-[#0F4C5C] hover:bg-[#0A3A46]' : ''}`}
                  variant={isProfessional ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(planId)}
                  disabled={checkoutLoading === planId || isCurrentPlan}
                  data-testid={`subscribe-${planId}-btn`}
                >
                  {checkoutLoading === planId ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : isCurrentPlan ? (
                    'Mevcut Plan'
                  ) : (
                    'Satın Al'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Response Packages */}
      {currentSub?.has_subscription && (
        <div className="mt-12">
          <h2 className="text-2xl font-heading font-bold mb-2 text-center">Ek Yanıt Paketleri</h2>
          <p className="text-muted-foreground text-center mb-6">
            Kayıtsız müşterilere daha fazla yanıt vermek için ek paket satın alın.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {responsePacks && Object.entries(responsePacks).map(([packId, pack]) => (
              <Card key={packId} className="border-border/50" data-testid={`pack-${packId}`}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 bg-[#E0ECE4] flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-[#0F4C5C]" />
                  </div>
                  <h3 className="font-semibold mb-1">{pack.name}</h3>
                  <p className="text-2xl font-bold text-[#0F4C5C] mb-1">
                    {formatCurrency(pack.price)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {pack.responses} yanıt • {formatCurrency(pack.price_per_response)}/yanıt
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleBuyResponsePack(packId)}
                    disabled={checkoutLoading === packId}
                    data-testid={`buy-pack-${packId}-btn`}
                  >
                    {checkoutLoading === packId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      'Satın Al'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payment Status Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Durumu</DialogTitle>
            <DialogDescription>
              {paymentStatus === 'checking' && 'Ödemeniz kontrol ediliyor...'}
              {paymentStatus === 'success' && 'Ödemeniz başarıyla tamamlandı!'}
              {paymentStatus === 'failed' && 'Ödeme işlemi başarısız oldu.'}
              {paymentStatus === 'timeout' && 'Ödeme durumu kontrol edilemedi.'}
              {paymentStatus === 'error' && 'Bir hata oluştu.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {paymentStatus === 'checking' && (
              <Loader2 className="w-12 h-12 animate-spin text-[#0F4C5C]" />
            )}
            {paymentStatus === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            )}
            {(paymentStatus === 'failed' || paymentStatus === 'error') && (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>
          {paymentStatus !== 'checking' && (
            <Button onClick={() => setPaymentDialog(false)} className="w-full">
              Kapat
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPage;
