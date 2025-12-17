
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Save, Upload, Smartphone, CreditCard, Plus, Trash2, Users, UserPlus } from 'lucide-react';
import { UserRole } from '../types';

const Settings = () => {
  const { 
    shopSettings, 
    updateShopSettings,
    users,
    registerUser,
    deleteUser,
    currentUser
  } = useAppStore();
  
  const [formData, setFormData] = useState(shopSettings);
  const [newPhone, setNewPhone] = useState('');
  
  // User Management State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'ORDER_ENTRY' as UserRole });
  const [userError, setUserError] = useState('');

  const handleSave = () => {
      updateShopSettings(formData);
      alert("Settings saved successfully!");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const res = reader.result as string;
              // Just save the logo for PDF watermarking
              setFormData(prev => ({ ...prev, logoUrl: res }));
          };
          reader.readAsDataURL(file);
      }
  };

  const addPhoneNumber = () => {
      if (newPhone) {
          setFormData(prev => ({...prev, phoneNumbers: [...prev.phoneNumbers, newPhone]}));
          setNewPhone('');
      }
  };

  const removePhoneNumber = (index: number) => {
      setFormData(prev => ({...prev, phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)}));
  };

  const handleAddUser = async () => {
      setUserError('');
      if (!newUser.name || !newUser.username || !newUser.password) {
          setUserError("All fields required");
          return;
      }
      if (newUser.password.length < 6) {
          setUserError("Password too short (min 6)");
          return;
      }

      const res = await registerUser(newUser.name, newUser.username, newUser.password, newUser.role);
      if (res.success) {
          setIsAddingUser(false);
          setNewUser({ name: '', username: '', password: '', role: 'ORDER_ENTRY' });
          alert("User added!");
      } else {
          setUserError(res.message);
      }
  };

  const handleDeleteUser = async (id: string) => {
      if (id === currentUser?.id) {
          alert("Cannot delete yourself.");
          return;
      }
      if (window.confirm("Are you sure you want to delete this user?")) {
          await deleteUser(id);
      }
  };

  return (
    <div className="space-y-8 pb-10">
      <div><h2 className="text-3xl font-bold text-gray-800">Shop Configuration</h2><p className="text-gray-500">Manage details.</p></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Smartphone size={20} className="mr-2 theme-text"/> General Information</h3>
              <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label><input className="w-full p-2 border rounded theme-ring focus:ring-2 outline-none text-gray-900" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})}/></div>
                  
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone Numbers</label>
                      <div className="space-y-2 mb-2">
                          {formData.phoneNumbers.map((phone, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                  <input className="flex-1 p-2 border rounded bg-gray-50 text-gray-700 text-sm" value={phone} readOnly />
                                  <button onClick={() => removePhoneNumber(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-2">
                          <input className="flex-1 p-2 border rounded theme-ring focus:ring-2 outline-none text-sm text-gray-900" placeholder="Add phone number..." value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                          <button onClick={addPhoneNumber} className="p-2 theme-bg text-white rounded"><Plus size={18}/></button>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo (For PDF Watermark)</label>
                      <div className="flex items-center gap-4">
                          <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                              {formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-contain" /> : <span className="text-gray-400 text-xs">No Logo</span>}
                          </div>
                          {/* Force icon color to be visible */}
                          <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 w-fit">
                              <Upload size={16} className="mr-2 text-gray-700"/> 
                              <span className="text-sm font-medium text-gray-700">Upload Logo</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                          </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">This logo will appear as a watermark on exported PDFs.</p>
                  </div>
              </div>
          </div>
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><CreditCard size={20} className="mr-2 text-green-600"/> Payment Accounts</h3>
                <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg border"><h4 className="text-sm font-bold text-gray-700 uppercase mb-3">FOB Payments</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-gray-500 mb-1">Paybill</label><input className="w-full p-2 border rounded text-gray-900" value={formData.fobPaybill} onChange={e => setFormData({...formData, fobPaybill: e.target.value})}/></div><div><label className="block text-xs text-gray-500 mb-1">Account Number</label><input className="w-full p-2 border rounded text-gray-900" value={formData.fobAccountNumber} onChange={e => setFormData({...formData, fobAccountNumber: e.target.value})}/></div></div></div>
                    <div className="p-4 bg-gray-50 rounded-lg border"><h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Freight Payments</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-gray-500 mb-1">Paybill</label><input className="w-full p-2 border rounded text-gray-900" value={formData.freightPaybill} onChange={e => setFormData({...formData, freightPaybill: e.target.value})}/></div><div><label className="block text-xs text-gray-500 mb-1">Account Number</label><input className="w-full p-2 border rounded text-gray-900" value={formData.freightAccountNumber} onChange={e => setFormData({...formData, freightAccountNumber: e.target.value})}/></div></div></div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-gray-800 flex items-center"><Users size={20} className="mr-2 text-blue-600"/> Team Management</h3>
                     {!isAddingUser && <button onClick={() => setIsAddingUser(true)} className="flex items-center px-3 py-1.5 text-xs font-bold theme-bg rounded text-white"><UserPlus size={14} className="mr-1"/> Add Staff</button>}
                </div>
                
                {isAddingUser && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 animate-fade-in border border-blue-100">
                        <h4 className="font-bold text-gray-800 text-sm mb-3">Add New Team Member</h4>
                        <div className="space-y-3">
                            <input className="w-full p-2 text-sm border rounded" placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
                            <input className="w-full p-2 text-sm border rounded" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
                            <div className="flex gap-2">
                                <input className="flex-1 p-2 text-sm border rounded" type="password" placeholder="Password (min 6 chars)" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
                                <select className="p-2 border rounded text-sm bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                                    <option value="ORDER_ENTRY">Staff</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            {userError && <p className="text-red-500 text-xs font-bold">{userError}</p>}
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsAddingUser(false)} className="px-3 py-1 text-xs font-bold text-gray-600">Cancel</button>
                                <button onClick={handleAddUser} className="px-3 py-1 text-xs font-bold theme-bg text-white rounded">Create User</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-gray-100">
                    {users.map(u => (
                        <div key={u.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-sm text-gray-800">{u.name} {u.id === currentUser?.id && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded ml-1">(You)</span>}</p>
                                <p className="text-xs text-gray-500">{u.username} • {u.role}</p>
                            </div>
                            {u.id !== currentUser?.id && <button onClick={() => handleDeleteUser(u.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>}
                        </div>
                    ))}
                    {users.length === 0 && <p className="text-sm text-gray-400 italic">No users found.</p>}
                </div>
            </div>
          </div>
      </div>
      <div className="flex justify-end pt-6 border-t"><button onClick={handleSave} className="flex items-center px-8 py-3 theme-bg rounded-lg shadow-lg font-bold text-lg"><Save size={20} className="mr-2" /> Save Configuration</button></div>
    </div>
  );
};

export default Settings;
