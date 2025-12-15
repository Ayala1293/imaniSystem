
import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Save, Upload, Smartphone, CreditCard, Plus, Trash2, Download, Database, CheckCircle, AlertTriangle, ShieldAlert, Clock, User } from 'lucide-react';

const Settings = () => {
  const { 
    shopSettings, 
    updateShopSettings, 
    catalogs, 
    products, 
    clients, 
    orders, 
    payments,
    importData,
    authLogs,
    currentUser
  } = useAppStore();
  
  const [formData, setFormData] = useState(shopSettings);
  const [newPhone, setNewPhone] = useState('');
  const [importStatus, setImportStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBackup = () => {
      const backupData = {
          timestamp: new Date().toISOString(),
          shopName: shopSettings.shopName,
          catalogs,
          products,
          clients,
          orders,
          payments,
          shopSettings
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shopSettings.shopName.replace(/\s+/g, '_')}_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          const success = await importData(content);
          setImportStatus(success ? 'SUCCESS' : 'ERROR');
          setTimeout(() => setImportStatus('IDLE'), 3000);
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 pb-10">
      <div><h2 className="text-3xl font-bold text-gray-800">Shop Configuration</h2><p className="text-gray-500">Manage details and data backups.</p></div>
      
      {/* Backup & Recovery Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Database size={20} className="mr-2 text-blue-600"/> Data Management</h3>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
              <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm"><Download size={20}/></div>
                  <div>
                      <h4 className="font-bold text-blue-900">Backup & Restore</h4>
                      <p className="text-sm text-blue-700 mt-1">
                          Since this system runs on your desktop without a cloud server, use this feature to save your data permanently or transfer it to another computer.
                      </p>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={handleBackup} className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 border-dashed rounded-xl hover:bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all group">
                  <Download size={32} className="mb-3 text-gray-400 group-hover:text-blue-500"/>
                  <span className="font-bold text-gray-700 group-hover:text-blue-700">Download Backup File</span>
                  <span className="text-xs text-gray-400 mt-1">Save all orders, products, and clients</span>
              </button>

              <div className="relative">
                  <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestore} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-gray-200 border-dashed rounded-xl hover:bg-gray-50 hover:border-green-300 hover:shadow-md transition-all group">
                      {importStatus === 'IDLE' && <><Upload size={32} className="mb-3 text-gray-400 group-hover:text-green-500"/><span className="font-bold text-gray-700 group-hover:text-green-700">Restore from Backup</span><span className="text-xs text-gray-400 mt-1">Upload a previously saved .json file</span></>}
                      {importStatus === 'SUCCESS' && <div className="animate-fade-in text-center"><CheckCircle size={40} className="text-green-500 mx-auto mb-2"/><span className="font-bold text-green-600">Restore Successful!</span></div>}
                      {importStatus === 'ERROR' && <div className="animate-fade-in text-center"><AlertTriangle size={40} className="text-red-500 mx-auto mb-2"/><span className="font-bold text-red-600">Invalid File</span></div>}
                  </button>
              </div>
          </div>
      </div>

      {/* Security Audit Log Section - Admin Only */}
      {currentUser?.role === 'ADMIN' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><ShieldAlert size={20} className="mr-2 text-purple-600"/> Security Audit Logs</h3>
              <div className="overflow-x-auto max-h-96 border rounded-lg">
                  <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                          <tr className="border-b">
                              <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-600">User / Email</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {authLogs.slice().reverse().map(log => (
                              <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-500 flex items-center gap-2">
                                      <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-gray-800 font-medium">
                                      <div className="flex items-center gap-2"><User size={12}/> {log.email}</div>
                                  </td>
                                  <td className="px-4 py-2">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                          log.action === 'LOGIN_SUCCESS' ? 'bg-green-100 text-green-700' :
                                          log.action === 'LOGIN_FAILED' ? 'bg-red-100 text-red-700' :
                                          'bg-blue-100 text-blue-700'
                                      }`}>
                                          {log.action.replace('_', ' ')}
                                      </span>
                                  </td>
                                  <td className="px-4 py-2 text-gray-600 italic">{log.details || '-'}</td>
                              </tr>
                          ))}
                          {authLogs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No logs recorded yet.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><CreditCard size={20} className="mr-2 text-green-600"/> Payment Accounts</h3>
              <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg border"><h4 className="text-sm font-bold text-gray-700 uppercase mb-3">FOB Payments</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-gray-500 mb-1">Paybill</label><input className="w-full p-2 border rounded text-gray-900" value={formData.fobPaybill} onChange={e => setFormData({...formData, fobPaybill: e.target.value})}/></div><div><label className="block text-xs text-gray-500 mb-1">Account Number</label><input className="w-full p-2 border rounded text-gray-900" value={formData.fobAccountNumber} onChange={e => setFormData({...formData, fobAccountNumber: e.target.value})}/></div></div></div>
                  <div className="p-4 bg-gray-50 rounded-lg border"><h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Freight Payments</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-gray-500 mb-1">Paybill</label><input className="w-full p-2 border rounded text-gray-900" value={formData.freightPaybill} onChange={e => setFormData({...formData, freightPaybill: e.target.value})}/></div><div><label className="block text-xs text-gray-500 mb-1">Account Number</label><input className="w-full p-2 border rounded text-gray-900" value={formData.freightAccountNumber} onChange={e => setFormData({...formData, freightAccountNumber: e.target.value})}/></div></div></div>
              </div>
          </div>
      </div>
      <div className="flex justify-end pt-6 border-t"><button onClick={handleSave} className="flex items-center px-8 py-3 theme-bg rounded-lg shadow-lg font-bold text-lg"><Save size={20} className="mr-2" /> Save Configuration</button></div>
    </div>
  );
};

export default Settings;
