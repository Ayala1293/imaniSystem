import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import Sidebar from './components/Sidebar';
import { MOCK_USERS } from './constants';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

// Pages
import Products from './pages/Products';
import Orders from './pages/Orders';
import Clients from './pages/Clients';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Freight from './pages/Freight';

const LoginScreen = () => {
  const { login } = useAppStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">GlobalShop<span className="text-blue-600">Sync</span></h1>
            <p className="text-gray-500 mt-2">Secure Shop Management System</p>
        </div>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-center">Select User Role (Demo)</p>
          {MOCK_USERS.map(user => (
            <button
              key={user.id}
              onClick={() => login(user.id)}
              className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
            >
              <div className={`p-3 rounded-full mr-4 ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                {user.role === 'ADMIN' ? <ShieldCheck /> : <UserIcon />}
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 group-hover:text-blue-700">{user.name}</p>
                <p className="text-sm text-gray-500">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-gray-400">
            System v2.5.0 • Secure Encryption Enabled
        </p>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const [activePage, setActivePage] = useState('orders');
  const { currentUser } = useAppStore();

  if (!currentUser) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'clients': return <Clients />;
      case 'payments': return <Payments />;
      case 'reports': return <Reports />;
      case 'freight': return <Freight />;
      default: return <Orders />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 ml-64 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
            {renderPage()}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
