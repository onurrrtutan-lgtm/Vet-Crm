import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  PawPrint,
  Calendar,
  Package,
  Bell,
  DollarSign,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Crown
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/customers', icon: Users, label: t('customers') },
    { path: '/pets', icon: PawPrint, label: t('pets') },
    { path: '/appointments', icon: Calendar, label: t('appointments') },
    { path: '/products', icon: Package, label: t('products') },
    { path: '/reminders', icon: Bell, label: t('reminders') },
    { path: '/finance', icon: DollarSign, label: t('finance') },
    { path: '/whatsapp', icon: MessageCircle, label: t('whatsapp') },
    { path: '/subscription', icon: Crown, label: 'Abonelik' },
    { path: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}
      
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F4C5C] flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-heading font-bold text-[#0F4C5C]">VetFlow</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            data-testid="close-sidebar-btn"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[#0F4C5C] text-white"
                        : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                    )
                  }
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#E0ECE4] flex items-center justify-center">
                <span className="text-sm font-medium text-[#0F4C5C]">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
