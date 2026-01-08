import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { User, Globe, Moon, Sun, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import i18n from '../i18n';

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = React.useState(
    localStorage.getItem('vetflow_language') || 'tr'
  );

  const handleLanguageChange = (value) => {
    setLanguage(value);
    localStorage.setItem('vetflow_language', value);
    i18n.changeLanguage(value);
    toast.success(t('success'));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">{t('settings')}</h1>
        <p className="text-muted-foreground">Uygulama ayarlarını yönetin</p>
      </div>

      {/* Profile Card */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <User className="w-5 h-5 text-[#0F4C5C]" />
            {t('profile')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#E0ECE4] flex items-center justify-center">
                <span className="text-2xl font-medium text-[#0F4C5C]">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{user?.name || 'Kullanıcı'}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              {user?.clinic_name && (
                <p className="text-sm text-muted-foreground">{user.clinic_name}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#0F4C5C]" />
            {t('language')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label>Uygulama Dili</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger data-testid="language-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Hesap İşlemleri</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            data-testid="settings-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">VetFlow v1.0.0</p>
            <p>Veteriner Klinik Yönetim Sistemi</p>
            <p className="mt-2">© 2024 VetFlow. Tüm hakları saklıdır.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
