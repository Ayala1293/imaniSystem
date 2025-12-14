import React from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  FileText, 
  LogOut,
  Container
} from 'lucide-react';
import { useAppStore } from '../store';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { currentUser, logout } = useAppStore();

  const menuItems = [
    { id: 'orders', label: 'Running Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Payments (M-Pesa)', icon: CreditCard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'freight', label: 'Set Freight', icon: Container, adminOnly: false }, // Changed to false
    { id: 'products', label: 'Product Catalog', icon: Package, adminOnly: true },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col fixed left-0 top-0 shadow-xl z-20">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white tracking-tight">GlobalShop<span className="text-blue-500">Sync</span></h1>
        <p className="text-xs text-slate-500 mt-1">v2.5.1 • {currentUser?.role}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {menuItems.map((item) => {
            if (item.adminOnly && currentUser?.role !== 'ADMIN') return null;
            
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center px-6 py-3 transition-colors duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white border-r-4 border-blue-400' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="mr-3" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">Connected</p>
            </div>
        </div>
        <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 rounded-lg transition-all"
        >
          <LogOut size={16} className="mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;