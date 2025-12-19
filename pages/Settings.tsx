
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { 
  Save, 
  Smartphone, 
  CreditCard, 
  Plus, 
  Trash2, 
  Users, 
  UserPlus, 
  AlertTriangle, 
  RefreshCw, 
  Loader, 
  Palette, 
  PhoneCall, 
  Building2,
  Hash,
  Upload
} from 'lucide-react';
import { UserRole } from '../types';

const Settings = () => {
  const { 
    shopSettings, 
    updateShopSettings,
    users,
    registerUser,
    deleteUser,
    currentUser,
    factoryReset
  } = useAppStore();
  
  const [formData, setFormData] = useState(shopSettings);
  const [newPhone, setNewPhone] = useState('');
  
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'ORDER_ENTRY' as UserRole });
  const [userError, setUserError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Keep form in sync if shopSettings changes (e.g. after a reset)
  useEffect(() => {
    setFormData(shopSettings);
  }, [shopSettings]);

  const handleSave = () => {
      updateShopSettings(formData);
      alert("Settings saved successfully!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const addPhoneNumber = () => {
      if (newPhone && !formData.phoneNumbers.includes(newPhone)) {
          setFormData({ ...formData, phoneNumbers: [...formData.phoneNumbers, newPhone] });
          setNewPhone('');
      }
  };

  const removePhoneNumber = (phone: string) => {
      setFormData({ ...formData, phoneNumbers: formData.phoneNumbers.filter(p => p !== phone) });
  };

  const handleAddUser = async () => {
      setUserError('');
      if (!newUser.name || !newUser.username || !newUser.password) {
          setUserError("All fields required");
          return;
      }
      const res = await registerUser(newUser.name, newUser.username, newUser.password, newUser.role);
      if (res.success) {
          setNewUser({ name: '', username: '', password: '', role: 'ORDER_ENTRY' });
          alert("User account created successfully!");
      } else {
          setUserError(res.message);
      }
  };

  const handleFactoryReset = async () => {
      const confirm1 = window.confirm("⚠️ DANGER: FACTORY RESET\n\nThis will delete EVERYTHING:\n- All Orders & Payments\n- All Clients\n- All Products & Catalogs\n- All User Accounts\n\nAre you sure?");
      if (confirm1) {
          const confirm2 = window.confirm("FINAL WARNING:\nThis cannot be undone. System will be wiped and you will be logged out.\n\nProceed?");
          if (confirm2) {
              setIsResetting(true);
              try {
                  await factoryReset();
              } catch (e) {
                  setIsResetting(false);
                  alert("Factory reset failed.");
              }
          }
      }
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Shop Configuration</h2>
            <p className="text-gray-500 font-medium">Control identity, banking, and staff permissions.</p>
        </div>
        <button onClick={handleSave} className="flex items-center px-8 py-3 theme-bg text-white rounded-xl shadow-lg font-black hover:brightness-110 active:scale-95 transition-all">
            <Save size={20} className="mr-2" /> Save Settings
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <Building2 size={24} className="theme-text"/> Identity & Branding
              </h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Shop Public Name</label>
                      <input 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl theme-ring outline-none focus:bg-white transition-all text-gray-900 font-bold" 
                        value={formData.shopName} 
                        onChange={e => setFormData({...formData, shopName: e.target.value})}
                      />
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Logo / Invoice Watermark</label>
                      <div className="flex items-center gap-6">
                          <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner group relative">
                              {formData.logoUrl ? (
                                  <img src={formData.logoUrl} className="w-full h-full object-contain p-2" />
                              ) : (
                                  <Smartphone className="text-gray-300" size={32} />
                              )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="px-5 py-2.5 bg-white border-2 border-gray-100 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50 text-xs font-black text-gray-700 flex items-center gap-2">
                                <Upload size={14} /> Upload New Logo
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                            <p className="text-[10px] text-gray-400 font-medium italic">Transparent PNG recommended (max 2MB)</p>
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contact Numbers</label>
                      <div className="flex gap-2 mb-3">
                          <input 
                            placeholder="+254..." 
                            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl theme-ring outline-none text-gray-900 font-mono" 
                            value={newPhone} 
                            onChange={e => setNewPhone(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && addPhoneNumber()}
                          />
                          <button onClick={addPhoneNumber} className="p-3 theme-bg text-white rounded-xl shadow-md hover:brightness-110"><Plus size={20}/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {formData.phoneNumbers.map(phone => (
                              <div key={phone} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
                                  <PhoneCall size={12} /> {phone}
                                  <button onClick={() => removePhoneNumber(phone)} className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={12}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <CreditCard size={24} className="text-emerald-600"/> Payment Gateways
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                      <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4">FOB Banking (M-Pesa)</h4>
                      <div className="space-y-4">
                          <div>
                              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Paybill</label>
                              <input className="w-full p-2.5 bg-white border border-amber-200 rounded-xl outline-none font-mono text-gray-900 font-bold" value={formData.fobPaybill} onChange={e => setFormData({...formData, fobPaybill: e.target.value})}/>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Account Number</label>
                              <input className="w-full p-2.5 bg-white border border-amber-200 rounded-xl outline-none font-mono text-gray-900 font-bold" value={formData.fobAccountNumber} onChange={e => setFormData({...formData, fobAccountNumber: e.target.value})}/>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-4">Freight Banking (M-Pesa)</h4>
                      <div className="space-y-4">
                          <div>
                              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Paybill</label>
                              <input className="w-full p-2.5 bg-white border border-blue-200 rounded-xl outline-none font-mono text-gray-900 font-bold" value={formData.freightPaybill} onChange={e => setFormData({...formData, freightPaybill: e.target.value})}/>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Account Number</label>
                              <input className="w-full p-2.5 bg-white border border-blue-200 rounded-xl outline-none font-mono text-gray-900 font-bold" value={formData.freightAccountNumber} onChange={e => setFormData({...formData, freightAccountNumber: e.target.value})}/>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-8 lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-1 space-y-6">
                      <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <UserPlus size={24} className="text-indigo-600"/> New Staff Member
                      </h3>
                      <div className="space-y-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</label><input placeholder="e.g. Mary Wanjiku" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-sm" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/></div>
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Username</label><input placeholder="mary.w" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-sm" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/></div>
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Access Password</label><input type="password" placeholder="••••••••" className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold text-sm" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/></div>
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">System Role</label><select className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-black outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                              <option value="ORDER_ENTRY">Staff (Order Entry)</option>
                              <option value="ADMIN">Administrator</option>
                          </select></div>
                          {userError && <p className="text-xs text-red-600 font-black px-2">{userError}</p>}
                          <button onClick={handleAddUser} className="w-full py-4 theme-bg text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:brightness-110 transition-all">Create Account</button>
                      </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                      <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <Users size={24} className="text-blue-600"/> Active Accounts
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map(u => (
                          <div key={u.id} className="p-5 bg-white border border-gray-100 rounded-2xl flex justify-between items-center group hover:border-indigo-200 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center font-black theme-text text-xl">
                                    {u.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-sm text-gray-800">{u.name}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{u.role}</p>
                                </div>
                            </div>
                            {u.id !== currentUser?.id && (
                                <button onClick={() => deleteUser(u.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 size={20}/>
                                </button>
                            )}
                          </div>
                        ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-red-50 p-8 rounded-3xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
              <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
                  <AlertTriangle size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-red-900">Danger Zone</h3>
                  <p className="text-sm text-red-700 font-medium max-w-md">
                      A <strong>Factory Reset</strong> wipes the local database entirely. All data will be lost forever.
                  </p>
              </div>
          </div>
          <button 
            onClick={handleFactoryReset} 
            disabled={isResetting}
            className={`flex items-center px-10 py-5 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-200 transition-all font-black text-lg ${isResetting ? 'opacity-50 cursor-wait' : 'hover:bg-red-700 active:scale-95'}`}
          >
              {isResetting ? <Loader size={24} className="mr-3 animate-spin" /> : <RefreshCw size={24} className="mr-3" />}
              {isResetting ? 'Wiping Database...' : 'Factory Reset System'}
          </button>
      </div>

      <div className="flex justify-center py-6 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase italic">Imani Management System • Stable Distribution</p>
      </div>
    </div>
  );
};

export default Settings;
