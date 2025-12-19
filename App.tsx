
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppStore } from './store';
import Sidebar from './components/Sidebar';
import { 
  ShieldCheck, 
  User as UserIcon, 
  Lock, 
  ArrowRight, 
  Loader, 
  ArrowLeft, 
  Briefcase, 
  CheckCircle, 
  ChevronDown 
} from 'lucide-react';
import { UserRole } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Clients from './pages/Clients';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Freight from './pages/Freight';
import Stock from './pages/Stock';
import Settings from './pages/Settings';

const LoginScreen = () => {
  const { login, registerUser } = useAppStore();
  const [view, setView] = useState<'SETUP' | 'LOGIN' | 'LOADING'>('LOGIN');

  const [role, setRole] = useState<UserRole>('ADMIN');
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(username, password, role);
    if (!result.success) setError(result.message);
    setIsLoading(false);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    await registerUser(name, username, password, role);
    setView('LOGIN');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-[#111111] text-white">
          <h1 className="text-3xl font-bold">Imani <span className="theme-text">System</span></h1>
          <p className="text-gray-400 mt-1 text-xs">Shop Management Protocol v3.0</p>
        </div>
        <div className="p-8">
          {view === 'SETUP' ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-4">Initialize Administrator</h2>
              {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</div>}
              <input placeholder="Full Name" className="w-full p-3 border rounded-xl" value={name} onChange={e => setName(e.target.value)} required />
              <input placeholder="Username" className="w-full p-3 border rounded-xl" value={username} onChange={e => setUsername(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required />
              <input type="password" placeholder="Confirm" className="w-full p-3 border rounded-xl" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              <button className="w-full theme-bg p-3 rounded-xl font-bold shadow-lg">Initialize System</button>
              <button type="button" onClick={() => setView('LOGIN')} className="w-full text-xs text-gray-400">Back to Login</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-4">Account Secure Login</h2>
              {error && <div className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</div>}
              <div className="relative">
                <Briefcase className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <select className="w-full pl-10 p-3 border rounded-xl bg-white appearance-none" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  <option value="ADMIN">Administrator</option>
                  <option value="ORDER_ENTRY">Sales Staff</option>
                </select>
                <ChevronDown className="absolute right-3 top-4 text-gray-400 pointer-events-none" size={16} />
              </div>
              <input placeholder="Username" className="w-full p-3 border rounded-xl" value={username} onChange={e => setUsername(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required />
              <button disabled={isLoading} className="w-full theme-bg p-3 rounded-xl font-bold shadow-lg flex justify-center items-center">
                {isLoading ? <Loader className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={18} className="ml-2"/></>}
              </button>
              <button type="button" onClick={() => setView('SETUP')} className="w-full text-xs text-gray-400 mt-4">New System Setup?</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const { currentUser, currentView, shopSettings } = useAppStore();
  
  useEffect(() => {
    const theme = shopSettings?.theme;
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.primary || '#C49A46');
      root.style.setProperty('--color-secondary', theme.secondary || '#111111');
      root.style.setProperty('--color-accent', theme.accent || '#DAA520');
      root.style.setProperty('--color-sidebar-text', theme.text || '#F3F4F6');
    }
  }, [shopSettings]);

  if (!currentUser) return <LoginScreen />;

  const renderPage = () => {
    const isAdmin = currentUser.role === 'ADMIN';
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'products': return isAdmin ? <Products /> : <Orders />;
      case 'orders': return <Orders />;
      case 'clients': return <Clients />;
      case 'payments': return <Payments />;
      case 'reports': return <Reports />;
      case 'freight': return isAdmin ? <Freight /> : <Orders />;
      case 'stock': return <Stock />;
      case 'settings': return isAdmin ? <Settings /> : <Orders />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8 overflow-y-auto h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto animate-fade-in">{renderPage()}</div>
      </div>
    </div>
  );
};

const App = () => <AppProvider><MainLayout /></AppProvider>;
export default App;
