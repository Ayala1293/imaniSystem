
import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Search, UserPlus, Phone, FileSpreadsheet, UploadCloud, Edit, ShoppingCart, X } from 'lucide-react';
import { Client } from '../types';
import * as XLSX from 'xlsx';

const Clients = () => {
  const { clients, addClient, updateClient, currentUser, setCurrentView, setPendingOrderClientId } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({ name: '', phone: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveClient = () => {
    if (clientFormData.name && clientFormData.phone) {
        if (isEditing && clientFormData.id) updateClient(clientFormData as Client);
        else addClient({ id: Date.now().toString(), name: clientFormData.name, phone: clientFormData.phone, email: '' });
        setClientFormData({ name: '', phone: '' });
        setShowAddForm(false);
        setIsEditing(false);
    }
  };

  const handleEditClick = () => {
      if (!selectedClient) return;
      setClientFormData({ ...selectedClient });
      setIsEditing(true);
      setSelectedClient(null);
      setShowAddForm(true);
  };

  const handleTakeOrderClick = () => {
      if (!selectedClient) return;
      setPendingOrderClientId(selectedClient.id);
      setCurrentView('orders');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let addedCount = 0;
        data.forEach((row: any) => {
            const name = row['Name'] || row['name'] || row['Client Name'];
            const phone = row['Phone'] || row['phone'] || row['Phone Number'];
            if (name && phone && !clients.some(c => c.phone === String(phone))) {
                addClient({ id: `import-${Date.now()}-${Math.random()}`, name: String(name), phone: String(phone), email: '' });
                addedCount++;
            }
        });
        alert(`Imported ${addedCount} clients.`);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));

  return (
    <div className="space-y-6 relative">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Client Management</h2>
            <div className="flex gap-2">
                {currentUser?.role === 'ADMIN' && (
                    <>
                        <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"><FileSpreadsheet size={18} className="mr-2" /> Import Excel</button>
                    </>
                )}
                <button onClick={() => { setShowAddForm(!showAddForm); setIsEditing(false); setClientFormData({name: '', phone: ''}); }} className="flex items-center px-4 py-2 theme-bg rounded-lg shadow-md"><UserPlus size={18} className="mr-2" /> Add Client</button>
            </div>
        </div>

        {showAddForm && (
            <div className="theme-bg-light p-6 rounded-xl border theme-border-light animate-fade-in">
                <h3 className="font-bold theme-text mb-4">{isEditing ? 'Edit Client' : 'New Client'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input placeholder="Full Name" className="p-3 rounded-lg border theme-border-light outline-none theme-ring focus:ring-2 text-gray-900" value={clientFormData.name} onChange={e => setClientFormData({...clientFormData, name: e.target.value})}/>
                    <input placeholder="Phone Number" className="p-3 rounded-lg border theme-border-light outline-none theme-ring focus:ring-2 text-gray-900" value={clientFormData.phone} onChange={e => setClientFormData({...clientFormData, phone: e.target.value})}/>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2 theme-text font-medium hover:bg-white/50 rounded-lg">Cancel</button>
                    <button onClick={handleSaveClient} className="px-6 py-2 theme-bg font-bold rounded-lg shadow-sm">{isEditing ? 'Update Client' : 'Save Client'}</button>
                </div>
            </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <Search className="text-gray-400 mr-3" />
            <input type="text" placeholder="Search clients..." className="flex-1 outline-none text-black bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact Info</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredClients.map(client => (
                        <tr key={client.id} onClick={() => setSelectedClient(client)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                            <td className="px-6 py-4"><div className="font-bold text-gray-800">{client.name}</div></td>
                            <td className="px-6 py-4"><div className="flex items-center text-sm text-gray-600"><Phone size={14} className="mr-2 text-gray-400"/> {client.phone}</div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {selectedClient && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
                    <div className="p-6 text-center border-b border-gray-100">
                        <div className="w-16 h-16 theme-bg-light theme-text rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">{selectedClient.name.charAt(0)}</div>
                        <h3 className="text-xl font-bold text-gray-800">{selectedClient.name}</h3>
                        <p className="text-gray-500">{selectedClient.phone}</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3 bg-gray-50">
                        <button onClick={handleEditClick} className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:theme-border-light hover:shadow-md transition-all text-gray-700 hover:theme-text"><Edit size={24} className="mb-2"/><span className="font-bold text-sm">Edit</span></button>
                        <button onClick={handleTakeOrderClick} className="flex flex-col items-center justify-center p-4 theme-bg rounded-xl shadow-md hover:shadow-lg transition-all"><ShoppingCart size={24} className="mb-2"/><span className="font-bold text-sm">Take Order</span></button>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="w-full py-3 text-center text-gray-400 hover:text-gray-600 text-sm font-medium border-t border-gray-100">Close</button>
                </div>
            </div>
        )}
    </div>
  );
};

export default Clients;
