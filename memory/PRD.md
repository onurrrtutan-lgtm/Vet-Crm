# VetFlow - Veteriner Klinik Yönetim Sistemi

## Problem Statement
Veterinerlik klinikleri için kapsamlı bir yönetim sistemi. Müşteri takibi, evcil hayvan yönetimi, randevu sistemi, WhatsApp entegrasyonu ile otomatik hatırlatmalar, AI chatbot ve mali tablo takibi özellikleri.

## Tarih
- **Oluşturulma:** 8 Ocak 2026
- **MVP Tamamlanma:** 8 Ocak 2026
- **Abonelik Sistemi:** 8 Ocak 2026

## Kullanıcı Tercihleri
- WhatsApp: Meta WhatsApp Business Cloud API
- AI: OpenAI GPT (Emergent LLM Key)
- Auth: JWT + Google OAuth (Emergent Auth)
- Payment: Stripe
- Dil: Türkçe + İngilizce

## User Personas
1. **Veteriner Hekim** - Klinik sahibi, tüm özelliklere erişim
2. **Klinik Çalışanı** - Randevu ve müşteri yönetimi
3. **Müşteri** - WhatsApp üzerinden iletişim

## Abonelik Planları

### Starter - $9.90/ay
- 10 müşteri kaydı
- Kayıtlı müşterilere sınırsız WhatsApp yanıt
- 9 kayıtsız müşteriye aylık WhatsApp yanıt
- WhatsApp üzerinden randevu oluşturma
- Otomatik hatırlatmalar

### Professional - $17.90/ay (En Popüler)
- 40 müşteri kaydı
- Kayıtlı müşterilere sınırsız WhatsApp yanıt
- 14 kayıtsız müşteriye aylık WhatsApp yanıt
- WhatsApp üzerinden randevu oluşturma
- Otomatik hatırlatmalar
- Gelişmiş raporlar

### Unlimited - $29.90/ay
- Sınırsız müşteri kaydı
- Kayıtlı müşterilere sınırsız WhatsApp yanıt
- 50 kayıtsız müşteriye aylık WhatsApp yanıt
- WhatsApp üzerinden randevu oluşturma
- Otomatik hatırlatmalar
- Tüm raporlar ve analizler
- Öncelikli destek

### Ek Yanıt Paketleri
- 10 Yanıt: $2.50 ($0.25/yanıt)
- 25 Yanıt: $6.25 ($0.25/yanıt)
- 50 Yanıt: $12.50 ($0.25/yanıt)

## Implemented Features

### Backend (FastAPI + MongoDB + Stripe)
- Auth sistemi (register, login, Google OAuth, logout)
- **Subscription Management:**
  - Plan tanımları ve limitler
  - Stripe checkout session oluşturma
  - Payment status tracking
  - Trial subscription (7 gün)
  - Extra response pack satın alma
  - Customer limit enforcement
  - WhatsApp response limit tracking
- Customer API (CRUD + limit kontrolü)
- Pet API (CRUD)
- Health Records API
- Appointment API (CRUD)
- Product API (CRUD)
- Pet Product Usage tracking
- Reminder API
- Transaction/Finance API
- **WhatsApp AI Chatbot:**
  - Subscription bazlı yanıt limitleri
  - Kayıtlı müşterilere sınırsız yanıt
  - Kayıtsız müşterilere limitli yanıt
  - WhatsApp üzerinden randevu oluşturma
  - Takvim uygunluk kontrolü
  - Alternatif saat önerisi
- AI Settings API
- Dashboard Stats API
- APScheduler ile otomatik hatırlatmalar

### Frontend (React + Shadcn UI + Stripe)
- Login/Register sayfası
- Dashboard (istatistikler)
- Müşteriler sayfası (limit kontrolü)
- Evcil Hayvanlar sayfası
- Randevular sayfası (takvim)
- Ürünler sayfası
- Hatırlatmalar sayfası
- Mali Tablolar sayfası
- WhatsApp sayfası (mesajlar + AI ayarları)
- **Abonelik Sayfası:**
  - Plan karşılaştırma
  - Mevcut kullanım göstergeleri
  - Stripe checkout redirect
  - Payment status kontrolü
  - Trial başlatma
  - Ek yanıt paketi satın alma
- Ayarlar sayfası
- i18n (TR/EN)

## Architecture
```
/app
├── backend/
│   ├── server.py (FastAPI + Stripe endpoints)
│   ├── models.py
│   ├── auth.py
│   ├── subscription.py (plan configs, limit checks)
│   ├── ai_chat.py (WhatsApp + randevu oluşturma)
│   ├── whatsapp.py
│   ├── scheduler.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── SubscriptionPage.js
│   │   │   └── ...
│   │   ├── lib/api.js
│   │   └── components/
│   └── .env
```

## MOCKED APIs
- **WhatsApp Business Cloud API** - WHATSAPP_ACCESS_TOKEN ve WHATSAPP_PHONE_NUMBER_ID gerekiyor

## Next Steps
1. WhatsApp Business API anahtarlarını eklemek
2. Gerçek Stripe hesabı ile production'a geçiş
3. Raporlama modülü ekleme (grafikler)
4. PDF fatura oluşturma
