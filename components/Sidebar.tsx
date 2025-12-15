
import React from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  FileText, 
  LogOut,
  Container,
  ClipboardCheck,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { useAppStore } from '../store';

const Sidebar = () => {
  const { currentUser, logout, currentView, setCurrentView, shopSettings } = useAppStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Running Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Payments (M-Pesa)', icon: CreditCard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'freight', label: 'Set Freight', icon: Container, adminOnly: true },
    { id: 'stock', label: 'Stock Taking', icon: ClipboardCheck, adminOnly: false },
    { id: 'products', label: 'Product Catalog', icon: Package, adminOnly: true },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'settings', label: 'Shop Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <div 
        className="w-64 h-screen flex flex-col fixed left-0 top-0 shadow-xl z-20 transition-colors duration-300"
        style={{ 
            backgroundColor: 'var(--color-secondary)',
            color: 'var(--color-sidebar-text)' 
        }}
    >
      <div className="p-6 border-b border-gray-700/30">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#fff' }}>
            {shopSettings.shopName}
        </h1>
        <p className="text-xs opacity-70 mt-1">v3.0.0 • {currentUser?.role}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {menuItems.map((item) => {
            if (item.adminOnly && currentUser?.role !== 'ADMIN') return null;
            
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center px-6 py-3 transition-colors duration-200 hover:bg-white/10`}
                  style={isActive ? {
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      borderRight: '4px solid var(--color-accent)'
                  } : {}}
                >
                  <Icon size={20} className="mr-3" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700/30">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: 'var(--color-accent)' }}
            >
                {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium truncate" style={{ color: '#fff' }}>{currentUser?.name}</p>
                <p className="text-xs opacity-60 truncate">Connected</p>
            </div>
        </div>
        <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 bg-black/20 hover:bg-red-900/50 hover:text-red-300 rounded-lg transition-all text-sm"
        >
          <LogOut size={16} className="mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
