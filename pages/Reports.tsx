
import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Download, Package, ArrowLeft, Users, FileText, Database, Upload, Loader, Printer } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const Reports = () => {
  const { orders, products, catalogs, clients, shopSettings, payments, expenses, importData } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const handleDownloadBackup = () => {
    const backupData = { 
        catalogs, 
        products, 
        clients, 
        orders, 
        payments, 
        expenses,
        shopSettings,
        exportedAt: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IMANI_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("WARNING: This will replace ALL current data with the contents of the backup file. Proceed?")) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = JSON.parse(evt.target?.result as string);
            const success = await importData(data);
            if (success) {
                alert("Database restored successfully!");
                window.location.reload();
            } else {
                alert("Import failed. Check file format.");
            }
        } catch (err) { 
            console.error("Import error:", err);
            alert("Invalid JSON file or corrupted data."); 
        }
        finally { setIsImporting(false); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateProductSummary = () => {
      if (!activeCatalog) return;
      setIsGeneratingPdf(true);
      try {
        const doc = new jsPDF();
        const catalogProducts = products.filter(p => p.catalogId === activeCatalogId);
        doc.setFontSize(22); doc.text(shopSettings.shopName, 14, 20);
        doc.setFontSize(10); doc.text(`Inventory: ${activeCatalog.name}`, 14, 28);
        const tableBody = catalogProducts.map(p => {
            const catalogOrders = orders.filter(o => o.items.some(i => i.productId === p.id));
            const totalUnits = catalogOrders.reduce((acc, o) => acc + o.items.filter(i => i.productId === p.id).reduce((s,i) => s + i.quantity, 0), 0);
            return [p.name, p.category, p.fobPrice.toLocaleString(), totalUnits.toString()];
        });
        autoTable(doc, { startY: 40, head: [['Product', 'Category', 'Price', 'Sold']], body: tableBody });
        doc.save(`${activeCatalog.name}_Inventory.pdf`);
      } finally { setIsGeneratingPdf(false); }
  };

  const generateClientList = () => {
      if (!activeCatalog) return;
      setIsGeneratingPdf(true);
      try {
        const doc = new jsPDF();
        const catalogOrders = orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.catalogId === activeCatalogId));
        const activeClients = clients.filter(c => new Set(catalogOrders.map(o => o.clientId)).has(c.id));
        doc.setFontSize(22); doc.text(shopSettings.shopName, 14, 20);
        doc.setFontSize(10); doc.text(`Clients: ${activeCatalog.name}`, 14, 28);
        const tableBody = activeClients.map(c => [c.name, c.phone, c.email || 'N/A']);
        autoTable(doc, { startY: 40, head: [['Customer', 'Phone', 'Email']], body: tableBody });
        doc.save(`${activeCatalog.name}_Clients.pdf`);
      } finally { setIsGeneratingPdf(false); }
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-8 animate-fade-in">
              <div><h2 className="text-4xl font-black text-gray-900 tracking-tight">System Data & Reports</h2></div>

              <div className="p-8 rounded-3xl border shadow-sm bg-white border-gray-100">
                  <div className="flex items-center gap-4 mb-6"><div className="p-4 rounded-2xl theme-bg-light theme-text"><Database size={32} /></div><div><h3 className="text-2xl font-black text-gray-800">System Maintenance</h3><p className="text-gray-500">Securely back up or restore your entire business database.</p></div></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                          <p className="font-bold text-gray-800 mb-2">Export Full Backup</p>
                          <p className="text-xs text-gray-500 mb-4">Downloads all clients, orders, products, and settings.</p>
                          <button onClick={handleDownloadBackup} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border rounded-xl text-sm font-black hover:bg-gray-100 transition-all shadow-sm"><Download size={18} /> Download JSON</button>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                          <p className="font-bold text-gray-800 mb-2">Restore from File</p>
                          <p className="text-xs text-gray-500 mb-4">Overwrites all current data with a previous backup.</p>
                          <input type="file" accept=".json" ref={fileInputRef} onChange={handleUploadBackup} className="hidden" />
                          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full flex items-center justify-center gap-2 px-6 py-3 theme-bg text-white rounded-xl text-sm font-black shadow-lg">
                              {isImporting ? <Loader className="animate-spin" size={18} /> : <Upload size={18} />} Select Backup File
                          </button>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                  <h3 className="text-2xl font-black text-gray-800">Catalog Reports</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catalogs.map(c => (
                      <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-8 rounded-3xl border border-gray-100 hover:theme-border transition-all cursor-pointer group shadow-sm">
                          <div className="p-4 theme-bg-light theme-text rounded-2xl w-fit mb-6"><FileText size={28} /></div>
                          <h3 className="text-2xl font-black text-gray-900">{c.name}</h3>
                          <p className="text-xs font-bold text-gray-400 mt-4 uppercase">View PDF Options &rarr;</p>
                      </div>
                    ))}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setActiveCatalogId(null)} className="p-4 bg-white border rounded-2xl hover:bg-gray-50 shadow-sm transition-all"><ArrowLeft size={20} className="text-gray-600" /></button>
            <div><h2 className="text-3xl font-black text-gray-900">{activeCatalog?.name} Documents</h2></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
                <div className="p-5 theme-bg-light theme-text rounded-2xl w-fit mb-8"><Package size={40} /></div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">Inventory Summary</h3>
                <p className="text-gray-500 text-sm mb-10 leading-relaxed">PDF list of all products and quantities sold in this month.</p>
                <button disabled={isGeneratingPdf} onClick={generateProductSummary} className="w-full flex justify-center items-center px-8 py-5 theme-bg text-white rounded-2xl font-black shadow-lg">
                    {isGeneratingPdf ? <Loader className="animate-spin mr-2"/> : <Printer className="mr-2"/>} Download Summary
                </button>
            </div>
            
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
                <div className="p-5 bg-slate-100 text-slate-900 rounded-2xl w-fit mb-8"><Users size={40} /></div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">Client Registry</h3>
                <p className="text-gray-500 text-sm mb-10 leading-relaxed">PDF list of all customers who placed orders from this import month.</p>
                <button disabled={isGeneratingPdf} onClick={generateClientList} className="w-full flex justify-center items-center px-8 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-lg">
                    {isGeneratingPdf ? <Loader className="animate-spin mr-2"/> : <Printer className="mr-2"/>} Download Registry
                </button>
            </div>
        </div>
    </div>
  );
};

export default Reports;
