import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("vetflow_language") || "tr",
  fallbackLng: "tr",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});



const resources = {
  tr: {
    translation: {
      // Common
      app_name: 'VetFlow',
      save: 'Kaydet',
      cancel: 'İptal',
      delete: 'Sil',
      edit: 'Düzenle',
      add: 'Ekle',
      search: 'Ara',
      loading: 'Yükleniyor...',
      no_data: 'Veri bulunamadı',
      success: 'Başarılı',
      error: 'Hata',
      confirm: 'Onayla',
      close: 'Kapat',
      back: 'Geri',
      next: 'İleri',
      view: 'Görüntüle',
      actions: 'İşlemler',
      
      // Auth
      login: 'Giriş Yap',
      register: 'Kayıt Ol',
      logout: 'Çıkış',
      email: 'E-posta',
      password: 'Şifre',
      name: 'Ad Soyad',
      clinic_name: 'Klinik Adı',
      login_with_google: 'Google ile Giriş',
      forgot_password: 'Şifremi Unuttum',
      no_account: 'Hesabınız yok mu?',
      have_account: 'Zaten hesabınız var mı?',
      
      // Navigation
      dashboard: 'Panel',
      customers: 'Müşteriler',
      pets: 'Evcil Hayvanlar',
      appointments: 'Randevular',
      products: 'Ürünler',
      reminders: 'Hatırlatmalar',
      finance: 'Mali Tablolar',
      whatsapp: 'WhatsApp',
      settings: 'Ayarlar',
      
      // Dashboard
      welcome: 'Hoş Geldiniz',
      total_customers: 'Toplam Müşteri',
      total_pets: 'Toplam Pet',
      today_appointments: 'Bugünkü Randevular',
      pending_reminders: 'Bekleyen Hatırlatmalar',
      monthly_income: 'Aylık Gelir',
      monthly_expense: 'Aylık Gider',
      recent_appointments: 'Yaklaşan Randevular',
      
      // Customers
      add_customer: 'Müşteri Ekle',
      customer_name: 'Müşteri Adı',
      phone: 'Telefon',
      address: 'Adres',
      notes: 'Notlar',
      customer_details: 'Müşteri Detayları',
      
      // Pets
      add_pet: 'Pet Ekle',
      pet_name: 'Pet Adı',
      species: 'Tür',
      breed: 'Irk',
      birth_date: 'Doğum Tarihi',
      weight: 'Ağırlık (kg)',
      color: 'Renk',
      microchip_id: 'Mikroçip ID',
      health_records: 'Sağlık Kayıtları',
      dog: 'Köpek',
      cat: 'Kedi',
      bird: 'Kuş',
      rabbit: 'Tavşan',
      hamster: 'Hamster',
      fish: 'Balık',
      other: 'Diğer',
      
      // Appointments
      add_appointment: 'Randevu Ekle',
      appointment_title: 'Randevu Başlığı',
      appointment_date: 'Tarih',
      duration: 'Süre (dk)',
      status: 'Durum',
      scheduled: 'Planlandı',
      confirmed: 'Onaylandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
      no_show: 'Gelmedi',
      
      // Products
      add_product: 'Ürün Ekle',
      product_name: 'Ürün Adı',
      category: 'Kategori',
      brand: 'Marka',
      unit: 'Birim',
      price: 'Fiyat',
      stock: 'Stok',
      food: 'Mama',
      medicine: 'İlaç',
      accessory: 'Aksesuar',
      
      // Reminders
      add_reminder: 'Hatırlatma Ekle',
      reminder_type: 'Hatırlatma Türü',
      due_date: 'Tarih',
      message: 'Mesaj',
      sent: 'Gönderildi',
      pending: 'Bekliyor',
      vaccination: 'Aşı',
      medication: 'İlaç',
      checkup: 'Kontrol',
      custom: 'Özel',
      
      // Finance
      add_transaction: 'İşlem Ekle',
      income: 'Gelir',
      expense: 'Gider',
      amount: 'Tutar',
      date: 'Tarih',
      description: 'Açıklama',
      total_income: 'Toplam Gelir',
      total_expense: 'Toplam Gider',
      net_profit: 'Net Kar',
      
      // WhatsApp
      whatsapp_messages: 'WhatsApp Mesajları',
      send_message: 'Mesaj Gönder',
      ai_settings: 'AI Ayarları',
      tone: 'Ton',
      friendly: 'Samimi',
      professional: 'Profesyonel',
      casual: 'Günlük',
      greeting_message: 'Karşılama Mesajı',
      clinic_info: 'Klinik Bilgileri',
      services: 'Hizmetler',
      working_hours: 'Çalışma Saatleri',
      custom_instructions: 'Özel Talimatlar',
      
      // Settings
      language: 'Dil',
      turkish: 'Türkçe',
      english: 'English',
      profile: 'Profil',
      
      // Consumption Tracking
      daily_consumption: 'Günlük Tüketim',
      last_purchase: 'Son Alım',
      remaining_days: 'Kalan Gün',
      auto_remind: 'Otomatik Hatırlat',
      remind_before: 'Kaç Gün Önce'
    }
  },
  en: {
    translation: {
      // Common
      app_name: 'VetFlow',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      loading: 'Loading...',
      no_data: 'No data found',
      success: 'Success',
      error: 'Error',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      view: 'View',
      actions: 'Actions',
      
      // Auth
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      clinic_name: 'Clinic Name',
      login_with_google: 'Login with Google',
      forgot_password: 'Forgot Password',
      no_account: "Don't have an account?",
      have_account: 'Already have an account?',
      
      // Navigation
      dashboard: 'Dashboard',
      customers: 'Customers',
      pets: 'Pets',
      appointments: 'Appointments',
      products: 'Products',
      reminders: 'Reminders',
      finance: 'Finance',
      whatsapp: 'WhatsApp',
      settings: 'Settings',
      
      // Dashboard
      welcome: 'Welcome',
      total_customers: 'Total Customers',
      total_pets: 'Total Pets',
      today_appointments: "Today's Appointments",
      pending_reminders: 'Pending Reminders',
      monthly_income: 'Monthly Income',
      monthly_expense: 'Monthly Expense',
      recent_appointments: 'Upcoming Appointments',
      
      // Customers
      add_customer: 'Add Customer',
      customer_name: 'Customer Name',
      phone: 'Phone',
      address: 'Address',
      notes: 'Notes',
      customer_details: 'Customer Details',
      
      // Pets
      add_pet: 'Add Pet',
      pet_name: 'Pet Name',
      species: 'Species',
      breed: 'Breed',
      birth_date: 'Birth Date',
      weight: 'Weight (kg)',
      color: 'Color',
      microchip_id: 'Microchip ID',
      health_records: 'Health Records',
      dog: 'Dog',
      cat: 'Cat',
      bird: 'Bird',
      rabbit: 'Rabbit',
      hamster: 'Hamster',
      fish: 'Fish',
      other: 'Other',
      
      // Appointments
      add_appointment: 'Add Appointment',
      appointment_title: 'Appointment Title',
      appointment_date: 'Date',
      duration: 'Duration (min)',
      status: 'Status',
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
      
      // Products
      add_product: 'Add Product',
      product_name: 'Product Name',
      category: 'Category',
      brand: 'Brand',
      unit: 'Unit',
      price: 'Price',
      stock: 'Stock',
      food: 'Food',
      medicine: 'Medicine',
      accessory: 'Accessory',
      
      // Reminders
      add_reminder: 'Add Reminder',
      reminder_type: 'Reminder Type',
      due_date: 'Due Date',
      message: 'Message',
      sent: 'Sent',
      pending: 'Pending',
      vaccination: 'Vaccination',
      medication: 'Medication',
      checkup: 'Checkup',
      custom: 'Custom',
      
      // Finance
      add_transaction: 'Add Transaction',
      income: 'Income',
      expense: 'Expense',
      amount: 'Amount',
      date: 'Date',
      description: 'Description',
      total_income: 'Total Income',
      total_expense: 'Total Expense',
      net_profit: 'Net Profit',
      
      // WhatsApp
      whatsapp_messages: 'WhatsApp Messages',
      send_message: 'Send Message',
      ai_settings: 'AI Settings',
      tone: 'Tone',
      friendly: 'Friendly',
      professional: 'Professional',
      casual: 'Casual',
      greeting_message: 'Greeting Message',
      clinic_info: 'Clinic Info',
      services: 'Services',
      working_hours: 'Working Hours',
      custom_instructions: 'Custom Instructions',
      
      // Settings
      language: 'Language',
      turkish: 'Turkish',
      english: 'English',
      profile: 'Profile',
      
      // Consumption Tracking
      daily_consumption: 'Daily Consumption',
      last_purchase: 'Last Purchase',
      remaining_days: 'Remaining Days',
      auto_remind: 'Auto Remind',
      remind_before: 'Days Before'
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('vetflow_language') || 'tr',
  fallbackLng: 'tr',
  interpolation: {
    escapeValue: false
  }
  
});

export default i18n;
