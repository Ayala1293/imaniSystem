
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppStore } from './store';
import Sidebar from './components/Sidebar';
import { ShieldCheck, User as UserIcon, Lock, ArrowRight, Loader, ArrowLeft, Briefcase, CheckCircle, ChevronDown, ServerCrash, Terminal, Trash2 } from 'lucide-react';
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

const LoginScreen = () => {
  const { login, requestPasswordReset, resetPassword, registerUser, hasUsers, systemError, factoryReset } = useAppStore();
  
  // State to manage views: 'SETUP' (first run), 'LOGIN', 'FORGOT', 'RESET'
  const [view, setView] = useState<'SETUP' | 'LOGIN' | 'FORGOT' | 'RESET' | 'LOADING'>('LOADING');

  // Initialization check
  useEffect(() => {
      // Only decide view once hasUsers is definitely known (not null)
      if (hasUsers === null) return;

      // If we are currently loading, set initial view based on hasUsers
      if (view === 'LOADING') {
          if (hasUsers === true) {
              setView('LOGIN');
          } else {
              setView('SETUP');
          }
      } 
      // Corrective logic: If we are in LOGIN view but backend says no users, go to SETUP
      else if (view === 'LOGIN' && hasUsers === false) {
          setView('SETUP');
      }
      // Note: We do NOT force LOGIN if hasUsers becomes true later (e.g. after setup),
      // because handleSetup handles that transition manually or we auto-login.
  }, [hasUsers, view]);
  
  // Form States
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // Changed from email
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
        // Normalize input on client side too
        const cleanUser = username.trim().toLowerCase();
        const result = await login(cleanUser, password, role);
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
      const cleanUser = username.trim().toLowerCase();
      const res = await registerUser(name, cleanUser, password, role);
      setIsLoading(false);

      if (res.success) {
          setSuccessMsg("Account created! Please sign in.");
          // We transition to LOGIN, but if registerUser auto-logs in, this component will unmount anyway.
          setView('LOGIN');
          setPassword('');
          setConfirmPassword('');
      } else {
          setError(res.message);
      }
  };

  const handleForgot = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      const cleanUser = username.trim().toLowerCase();
      const res = await requestPasswordReset(cleanUser);
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
  
  const handleFactoryReset = () => {
      if(window.confirm("ARE YOU SURE?\n\nThis will delete ALL registered user accounts. You will have to create a new Admin account.\n\nData (Products/Orders) will NOT be deleted, only access credentials.")) {
          factoryReset();
      }
  };

  if (systemError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col items-center text-center p-8 border-t-4 border-red-500">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                    <ServerCrash size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">System Unavailable</h1>
                <p className="text-gray-500 mb-6 px-4">{systemError}</p>
                
                <div className="bg-gray-50 p-5 rounded-lg text-left text-sm text-gray-700 w-full mb-6 border border-gray-200">
                    <p className="font-bold mb-3 flex items-center"><Terminal size={14} className="mr-2"/> Troubleshooting Steps:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                        <li>
                            <strong>Check Dependencies:</strong> If this is your first time running the app, the backend might be missing libraries.
                            <div className="mt-1 bg-black text-gray-300 p-2 rounded font-mono text-xs">
                                cd backend<br/>
                                npm install
                            </div>
                        </li>
                        <li><strong>Check Database:</strong> Ensure <code>mongod.exe</code> exists in <code>resources/mongodb/bin/</code> (Windows).</li>
                        <li><strong>Restart:</strong> Close the app completely and reopen it.</li>
                    </ol>
                </div>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all">Retry Connection</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-8 text-center bg-[#111111] text-white">
            <h1 className="text-3xl font-bold">Imani Homes &<span className="theme-text"> Imports</span></h1>
            <p className="text-gray-400 mt-2 text-sm flex items-center justify-center gap-1"><ShieldCheck size={14}/> Secure Shop Management System</p>
        </div>
        
        <div className="p-8 relative">
            {view === 'LOADING' && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <Loader className="animate-spin text-gray-400" size={32} />
                    <p className="text-sm text-gray-500">Initializing System...</p>
                </div>
            )}

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
                                className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-white text-gray-900 appearance-none"
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
                            <input type="text" required className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-gray-900 placeholder-gray-400" placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Username</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="text" required className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-gray-900 placeholder-gray-400" placeholder="e.g. admin123" value={username} onChange={e => setUsername(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Password</label>
                            <input type="password" required className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] text-gray-900 placeholder-gray-400" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Confirm</label>
                            <input type="password" required className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] text-gray-900 placeholder-gray-400" placeholder="******" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full theme-bg text-white font-bold py-3 rounded-lg shadow-lg hover:brightness-110 transition-all flex justify-center items-center mt-6">
                        {isLoading ? <Loader className="animate-spin" size={18} /> : 'Complete Setup'}
                    </button>
                </form>
            )}

            {/* --- LOGIN VIEW --- */}
            {view === 'LOGIN' && (
                <div className="space-y-6">
                    <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                        <h2 className="text-xl font-bold text-gray-800 text-center">Sign In</h2>
                        
                        {successMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100 flex items-center"><CheckCircle size={14} className="mr-2"/>{successMsg}</div>}
                        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center"><ArrowRight size={14} className="mr-2"/>{error}</div>}
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Position</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
                                <select 
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-white text-gray-900 appearance-none transition-all cursor-pointer hover:border-gray-300"
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
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Username</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all text-gray-900 placeholder-gray-400" 
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Password</label>
                                <button type="button" onClick={() => setView('FORGOT')} className="text-xs theme-text font-bold hover:underline">Forgot?</button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="password" 
                                    required 
                                    className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all text-gray-900 placeholder-gray-400" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button disabled={isLoading} className="w-full theme-bg hover:brightness-110 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex justify-center items-center disabled:opacity-70">
                            {isLoading ? <Loader className="animate-spin" /> : <>Sign In <ArrowRight size={18} className="ml-2"/></>}
                        </button>
                    </form>
                    
                    <div className="border-t pt-4 text-center">
                        <button onClick={handleFactoryReset} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center justify-center mx-auto transition-colors"><Trash2 size={10} className="mr-1"/> Locked out? System Reset</button>
                    </div>
                </div>
            )}

            {/* --- FORGOT PASSWORD VIEW --- */}
            {view === 'FORGOT' && (
                 <form onSubmit={handleForgot} className="space-y-6 animate-fade-in">
                    <button type="button" onClick={() => setView('LOGIN')} className="text-gray-500 text-xs font-bold hover:text-black flex items-center mb-4"><ArrowLeft size={12} className="mr-1"/> BACK TO LOGIN</button>
                    <h2 className="text-xl font-bold text-gray-800 text-center">Recover Password</h2>
                    <p className="text-sm text-gray-500 text-center">Enter your username to recover.</p>
                    
                    {successMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-100">{successMsg}</div>}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Username</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="text" required className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-gray-900 placeholder-gray-400" value={username} onChange={e => setUsername(e.target.value)} />
                        </div>
                    </div>

                    <button disabled={isLoading} className="w-full bg-black text-white font-bold py-3 rounded-lg shadow-lg hover:bg-gray-800 transition-all flex justify-center items-center">
                        {isLoading ? <Loader className="animate-spin" size={18} /> : 'Request Reset'}
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

                    <button disabled={isLoading} className="w-full theme-bg text-white font-bold py-3 rounded-lg shadow-lg hover:brightness-110 transition-all flex justify-center items-center">
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
    // SECURITY: Enforce Role-Based Access Control for rendering pages
    const isAdmin = currentUser.role === 'ADMIN';

    switch (currentView) {
      // Admin Only Pages: Fallback to 'orders' if not admin
      case 'products': return isAdmin ? <Products /> : <Orders />;
      case 'freight': return isAdmin ? <Freight /> : <Orders />;
      case 'settings': return isAdmin ? <Settings /> : <Orders />;
      
      // Public/Shared Pages
      case 'orders': return <Orders />;
      case 'clients': return <Clients />;
      case 'payments': return <Payments />;
      case 'reports': return <Reports />;
      case 'stock': return <Stock />;
      
      default: return <Orders />;
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
