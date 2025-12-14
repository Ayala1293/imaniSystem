
import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Search, UserPlus, Phone, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Client } from '../types';
import * as XLSX from 'xlsx';

const Clients = () => {
  const { clients, addClient, currentUser } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({ name: '', phone: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClient = () => {
    if (newClient.name && newClient.phone) {
        addClient({
            id: Date.now().toString(),
            name: newClient.name,
            phone: newClient.phone,
            email: '' 
        });
        setNewClient({ name: '', phone: '' });
        setShowAddForm(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let addedCount = 0;
        data.forEach((row: any) => {
            // Check for common column names
            const name = row['Name'] || row['name'] || row['Client Name'];
            const phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['Contact'];

            if (name && phone) {
                // Simple duplicate check
                const exists = clients.some(c => c.phone === String(phone) || c.name.toLowerCase() === String(name).toLowerCase());
                if (!exists) {
                    addClient({
                        id: `import-${Date.now()}-${Math.random()}`,
                        name: String(name),
                        phone: String(phone),
                        email: ''
                    });
                    addedCount++;
                }
            }
        });
        
        if (addedCount > 0) {
            alert(`Successfully imported ${addedCount} clients.`);
        } else {
            alert('No new unique clients found or invalid format. Columns required: Name, Phone');
        }
    };
    reader.readAsBinaryString(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Client Management</h2>
            <div className="flex gap-2">
                {currentUser?.role === 'ADMIN' && (
                    <>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <FileSpreadsheet size={18} className="mr-2" />
                            Import Excel
                        </button>
                    </>
                )}
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    <UserPlus size={18} className="mr-2" />
                    Add Client
                </button>
            </div>
        </div>

        {/* Add Client Form Inline */}
        {showAddForm && (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in">
                <h3 className="font-bold text-blue-900 mb-4">New Client Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input 
                        placeholder="Full Name" 
                        className="p-3 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                        value={newClient.name}
                        onChange={e => setNewClient({...newClient, name: e.target.value})}
                    />
                    <input 
                        placeholder="Phone Number" 
                        className="p-3 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                        value={newClient.phone}
                        onChange={e => setNewClient({...newClient, phone: e.target.value})}
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-blue-700 hover:bg-blue-100 rounded-lg">Cancel</button>
                    <button onClick={handleAddClient} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700">Save Client</button>
                </div>
            </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <Search className="text-gray-400 mr-3" />
            <input 
                type="text" 
                placeholder="Search clients by name or phone (e.g. +254...)" 
                className="flex-1 outline-none text-black bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact Info</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredClients.map(client => (
                        <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-800">{client.name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1 text-sm text-gray-600">
                                    <div className="flex items-center"><Phone size={14} className="mr-2 text-gray-400"/> {client.phone}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                <span className="text-sm text-gray-600">Active</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Clients;
