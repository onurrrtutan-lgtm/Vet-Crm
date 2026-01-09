// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// TEK resources tanımı olmalı (Render'daki hata bunun iki kez yazılması)
const resources = {
  tr: {
    translation: {
      // buraya TR metinlerin (ister boş kalsın)
      "loading": "Yükleniyor...",
      "login": "Giriş",
    },
  },
  en: {
    translation: {
      // buraya EN metinlerin (ister boş kalsın)
      "loading": "Loading...",
      "login": "Login",
    },
  },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "tr",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
  });
}

export default i18n;
