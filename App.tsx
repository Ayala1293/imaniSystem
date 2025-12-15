
import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import Sidebar from './components/Sidebar';
import { ShieldCheck, User as UserIcon, Lock, Mail, ArrowRight, Loader, ArrowLeft } from 'lucide-react';

// Pages
import Products from './pages/Products';
import Orders from './pages/Orders';
import Clients from './pages/Clients';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Freight from './pages/Freight';
import Stock from './pages/Stock';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';

const LoginScreen = () => {
  const { login, requestPasswordReset, resetPassword } = useAppStore();
  const [view, setView] = useState<'LOGIN' | 'FORGOT' | 'RESET'>('LOGIN');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot/Reset State
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      try {
        const result = await login(email, password);
        if (!result.success) setError(result.message);
      } catch (err) {
        setError('An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
  };

  const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      const res = await requestPasswordReset(email);
      setIsLoading(false);
      if (res.success) {
          alert(res.message); // In real app, this is swallowed, but for demo we alert
          setSuccessMsg('If account exists, code sent. Check console/alert.');
          setView('RESET');
      } else {
          setSuccessMsg(res.message);
      }
  };

  const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      const res = await resetPassword(resetCode, newPassword);
      setIsLoading(false);
      if (res.success) {
          alert("Password changed!");
          setView('LOGIN');
          setPassword('');
          setResetCode('');
          setNewPassword('');
      } else {
          setError(res.message);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-8 text-center bg-[#111111] text-white">
            <h1 className="text-3xl font-bold">Imani Homes &<span className="text-[#C49A46]"> Imports</span></h1>
            <p className="text-gray-400 mt-2 text-sm flex items-center justify-center gap-1"><ShieldCheck size={14}/> Secure Shop Management System</p>
        </div>
        
        <div className="p-8">
            {view === 'LOGIN' && (
                <form onSubmit={handleLogin} className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-800 text-center">Sign In</h2>
                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center"><ArrowRight size={14} className="mr-2"/>{error}</div>}
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                required 
                                className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] transition-all text-gray-900" 
                                placeholder="name@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Password</label>
                            <button type="button" onClick={() => setView('FORGOT')} className="text-xs text-[#C49A46] font-bold hover:underline">Forgot?</button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                required 
                                className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] transition-all text-gray-900" 
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-[#C49A46] hover:bg-[#b0883b] text-white font-bold py-3 rounded-lg shadow-lg transition-all flex justify-center items-center disabled:opacity-70">
                        {isLoading ? <Loader className="animate-spin" /> : <>Sign In <ArrowRight size={18} className="ml-2"/></>}
                    </button>
                    
                    <div className="text-center text-xs text-gray-400 mt-4">
                        <p>Default Admin: admin@shop.com / password123</p>
                    </div>
                </form>
            )}

            {view === 'FORGOT' && (
                 <form onSubmit={handleForgot} className="space-y-6 animate-fade-in">
                    <button type="button" onClick={() => setView('LOGIN')} className="text-gray-500 text-xs font-bold hover:text-black flex items-center mb-4"><ArrowLeft size={12} className="mr-1"/> BACK TO LOGIN</button>
                    <h2 className="text-xl font-bold text-gray-800 text-center">Reset Password</h2>
                    <p className="text-sm text-gray-500 text-center">Enter your email to receive a secure reset code.</p>
                    {successMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100">{successMsg}</div>}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="email" required className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] text-gray-900" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-black text-white font-bold py-3 rounded-lg shadow-lg hover:bg-gray-800 transition-all flex justify-center items-center">
                        {isLoading ? <Loader className="animate-spin" size={18} /> : 'Send Reset Code'}
                    </button>
                 </form>
            )}

            {view === 'RESET' && (
                 <form onSubmit={handleReset} className="space-y-6 animate-fade-in">
                     <button type="button" onClick={() => setView('LOGIN')} className="text-gray-500 text-xs font-bold hover:text-black flex items-center mb-4"><ArrowLeft size={12} className="mr-1"/> BACK TO LOGIN</button>
                    <h2 className="text-xl font-bold text-gray-800 text-center">Set New Password</h2>
                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>}
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Reset Code</label>
                        <input type="text" required placeholder="Enter 8-char code" className="w-full p-3 border border-gray-200 rounded-lg outline-none font-mono text-center uppercase tracking-widest text-lg text-gray-900" value={resetCode} onChange={e => setResetCode(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">New Password</label>
                        <input type="password" required className="w-full p-3 border border-gray-200 rounded-lg outline-none text-gray-900" placeholder="Min 6 chars" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>

                    <button disabled={isLoading} className="w-full bg-[#C49A46] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-[#b0883b] transition-all flex justify-center items-center">
                        {isLoading ? <Loader className="animate-spin" size={18} /> : 'Update Password'}
                    </button>
                 </form>
            )}
        </div>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const { currentUser, currentView, shopSettings } = useAppStore();

  // Inject CSS Variables for Dynamic Theming
  React.useEffect(() => {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', shopSettings.theme.primary);
      root.style.setProperty('--color-secondary', shopSettings.theme.secondary);
      root.style.setProperty('--color-accent', shopSettings.theme.accent);
      root.style.setProperty('--color-sidebar-text', shopSettings.theme.text);
  }, [shopSettings]);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'clients': return <Clients />;
      case 'payments': return <Payments />;
      case 'reports': return <Reports />;
      case 'freight': return <Freight />;
      case 'stock': return <Stock />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto animate-fade-in">
            {renderPage()}
        </div>
      </div>
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
