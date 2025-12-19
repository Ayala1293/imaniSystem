
import React from 'react';
import { 
  LayoutDashboard,
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  FileText, 
  LogOut,
  Container,
  ClipboardCheck,
  Settings,
  WifiOff
} from 'lucide-react';
import { useAppStore } from '../store';

const Sidebar = () => {
  const { currentUser, logout, currentView, setCurrentView, shopSettings, isOffline } = useAppStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Running Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Payments (M-Pesa)', icon: CreditCard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'freight', label: 'Set Freight', icon: Container, adminOnly: true },
    { id: 'stock', label: 'Stock Taking', icon: ClipboardCheck },
    { id: 'products', label: 'Product Catalog', icon: Package, adminOnly: true },
    { id: 'reports', label: 'Data & Reports', icon: FileText },
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
        <h1 className="text-xl font-bold tracking-tight" style={{ color: '#fff' }}>
            {shopSettings.shopName}
        </h1>
        <div className="flex items-center justify-between mt-1">
             <p className="text-[10px] opacity-70">v3.0.0 • {currentUser?.role}</p>
             {isOffline && <span className="flex items-center text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse"><WifiOff size={10} className="mr-1"/> OFFLINE</span>}
        </div>
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
                  <Icon size={18} className="mr-3" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700/30">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: 'var(--color-accent)' }}
            >
                {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-xs font-medium truncate" style={{ color: '#fff' }}>{currentUser?.name}</p>
                <p className="text-[10px] opacity-60 truncate">Connected</p>
            </div>
        </div>
        <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 bg-black/20 hover:bg-red-900/50 hover:text-red-300 rounded-lg transition-all text-xs"
        >
          <LogOut size={14} className="mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
