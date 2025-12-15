
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppStore } from './store';
import Sidebar from './components/Sidebar';
import { ShieldCheck, User as UserIcon, Lock, Mail, ArrowRight, Loader, ArrowLeft, Briefcase, CheckCircle, ChevronDown } from 'lucide-react';
import { UserRole } from './types';

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
  const { login, requestPasswordReset, resetPassword, registerUser, hasUsers } = useAppStore();
  
  // State to manage views: 'SETUP' (first run), 'LOGIN', 'FORGOT', 'RESET'
  const [view, setView] = useState<'SETUP' | 'LOGIN' | 'FORGOT' | 'RESET'>('LOGIN');

  // Initialization check
  useEffect(() => {
      if (!hasUsers) {
          setView('SETUP');
      }
  }, [hasUsers]);
  
  // Form States
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot/Reset Specifics
  const [resetCode, setResetCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      try {
        // Now passing role as well
        const result = await login(email, password, role);
        if (!result.success) setError(result.message);
      } catch (err) {
        setError('An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
  };

  const handleSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
      }
      if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
      }

      setIsLoading(true);
      const success = await registerUser(name, email, password, role);
      setIsLoading(false);

      if (success) {
          setSuccessMsg("Account created! Please sign in.");
          setView('LOGIN');
          setPassword('');
          setConfirmPassword('');
      } else {
          setError("Email already registered.");
      }
  };

  const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      const res = await requestPasswordReset(email);
      setIsLoading(false);
      if (res.success) {
          setSuccessMsg(res.message); 
          setView('RESET');
      } else {
          setSuccessMsg(res.message);
      }
  };

  const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setIsLoading(true);
      const res = await resetPassword(resetCode, password);
      setIsLoading(false);
      if (res.success) {
          setSuccessMsg("Password changed successfully! Please log in.");
          setView('LOGIN');
          setPassword('');
          setConfirmPassword('');
          setResetCode('');
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
            {/* --- SETUP (FIRST RUN) VIEW --- */}
            {view === 'SETUP' && (
                <form onSubmit={handleSetup} className="space-y-4 animate-fade-in">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">System Setup</h2>
                        <p className="text-xs text-gray-500">Create the first account to initialize the system.</p>
                    </div>

                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Position (Role)</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select 
                                className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] bg-white text-gray-900 appearance-none"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                            >
                                <option value="ADMIN">Administrator</option>
                                <option value="ORDER_ENTRY">Staff / Sales</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="text" required className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] text-gray-900 placeholder-gray-400" placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="email" required className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] text-gray-900 placeholder-gray-400" placeholder="name@shop.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Password</label>
                            <input type="password" required className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] text-gray-900 placeholder-gray-400" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Confirm</label>
                            <input type="password" required className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] text-gray-900 placeholder-gray-400" placeholder="******" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-[#C49A46] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-[#b0883b] transition-all flex justify-center items-center mt-6">
                        {isLoading ? <Loader className="animate-spin" size={18} /> : 'Complete Setup'}
                    </button>
                </form>
            )}

            {/* --- LOGIN VIEW --- */}
            {view === 'LOGIN' && (
                <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                    <h2 className="text-xl font-bold text-gray-800 text-center">Sign In</h2>
                    
                    {successMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100 flex items-center"><CheckCircle size={14} className="mr-2"/>{successMsg}</div>}
                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center"><ArrowRight size={14} className="mr-2"/>{error}</div>}
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Position</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                            <select 
                                className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] bg-white text-gray-900 appearance-none transition-all cursor-pointer hover:border-gray-300"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                            >
                                <option value="ADMIN">Administrator</option>
                                <option value="ORDER_ENTRY">Staff / Sales</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                required 
                                className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] transition-all text-gray-900 placeholder-gray-400" 
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
                                className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] transition-all text-gray-900 placeholder-gray-400" 
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-[#C49A46] hover:bg-[#b0883b] text-white font-bold py-3 rounded-lg shadow-lg transition-all flex justify-center items-center disabled:opacity-70">
                        {isLoading ? <Loader className="animate-spin" /> : <>Sign In <ArrowRight size={18} className="ml-2"/></>}
                    </button>
                </form>
            )}

            {/* --- FORGOT PASSWORD VIEW --- */}
            {view === 'FORGOT' && (
                 <form onSubmit={handleForgot} className="space-y-6 animate-fade-in">
                    <button type="button" onClick={() => setView('LOGIN')} className="text-gray-500 text-xs font-bold hover:text-black flex items-center mb-4"><ArrowLeft size={12} className="mr-1"/> BACK TO LOGIN</button>
                    <h2 className="text-xl font-bold text-gray-800 text-center">Recover Password</h2>
                    <p className="text-sm text-gray-500 text-center">Enter your email to receive a recovery link/code.</p>
                    
                    {/* Note to user about security */}
                    <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded border border-blue-100">
                        <strong>Note:</strong> Since this is a desktop app without a mail server, the code will be sent to your screen.
                    </div>

                    {successMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100">{successMsg}</div>}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="email" required className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#C49A46] focus:ring-1 focus:ring-[#C49A46] text-gray-900 placeholder-gray-400" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-black text-white font-bold py-3 rounded-lg shadow-lg hover:bg-gray-800 transition-all flex justify-center items-center">
                        {isLoading ? <Loader className="animate-spin" size={18} /> : 'Send Recovery Email'}
                    </button>
                 </form>
            )}

            {/* --- RESET PASSWORD VIEW --- */}
            {view === 'RESET' && (
                 <form onSubmit={handleReset} className="space-y-6 animate-fade-in">
                     <button type="button" onClick={() => setView('LOGIN')} className="text-gray-500 text-xs font-bold hover:text-black flex items-center mb-4"><ArrowLeft size={12} className="mr-1"/> BACK TO LOGIN</button>
                    <h2 className="text-xl font-bold text-gray-800 text-center">Set New Password</h2>
                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>}
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Reset Code</label>
                        <input type="text" required placeholder="Enter Code" className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none font-mono text-center uppercase tracking-widest text-lg text-gray-900 placeholder-gray-400" value={resetCode} onChange={e => setResetCode(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">New Password</label>
                        <input type="password" required className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none text-gray-900 placeholder-gray-400" placeholder="Min 6 chars" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Confirm Password</label>
                        <input type="password" required className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none text-gray-900 placeholder-gray-400" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
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
