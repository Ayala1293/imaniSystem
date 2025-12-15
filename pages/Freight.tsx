
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Container, Edit2, Search, Save, AlertCircle, Calendar, ArrowLeft } from 'lucide-react';
import { Product } from '../types';

const Freight = () => {
  const { products, updateProduct, orders, updateOrder, catalogs } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempFreight, setTempFreight] = useState<number>(0);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const handleStartEdit = (product: Product) => { setEditingId(product.id); setTempFreight(product.freightCharge || 0); };

  const handleSaveFreight = (product: Product) => {
     if (tempFreight < 0) return;
     const updatedProduct = { ...product, freightCharge: tempFreight };
     updateProduct(updatedProduct);
     orders.forEach(order => {
         if (order.status === 'DELIVERED' || order.isLocked) return; 
         if (order.items.some(i => i.productId === product.id)) {
             const updatedItems = order.items.map(item => item.productId === product.id ? { ...item, freightTotal: tempFreight * item.quantity } : item);
             const newFreightTotal = updatedItems.reduce((sum, i) => sum + i.freightTotal, 0);
             let newFreightStatus = order.freightPaymentStatus;
             if (order.totalFreightPaid >= newFreightTotal && newFreightTotal > 0) newFreightStatus = 'PAID';
             else if (order.totalFreightPaid > 0) newFreightStatus = 'PARTIAL';
             else newFreightStatus = 'UNPAID';
             updateOrder({ ...order, items: updatedItems, freightPaymentStatus: newFreightStatus });
         }
     });
     setEditingId(null);
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div><h2 className="text-3xl font-bold text-gray-800">Set Freight</h2><p className="text-gray-500">Select catalog.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{catalogs.map(c => {
                  const catProducts = products.filter(p => p.catalogId === c.id);
                  const freightSet = catProducts.filter(p => p.freightCharge > 0).length;
                  
                  return (
                  <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover-glow relative overflow-hidden">
                      <div className="flex mb-4"><div className="p-3 theme-bg-light theme-text rounded-lg"><Container size={24} /></div></div>
                      <h3 className="text-xl font-bold text-gray-800">{c.name}</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                          <div>
                              <p className="text-xs text-gray-400 font-medium uppercase">Total Items</p>
                              <p className="text-lg font-bold text-gray-800">{catProducts.length}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-400 font-medium uppercase">Freight Set</p>
                              <p className="text-lg font-bold text-gray-800">{freightSet} / {catProducts.length}</p>
                          </div>
                      </div>
                  </div>
              )})}</div>
          </div>
      );
  }

  const filteredProducts = products.filter(p => p.catalogId === activeCatalogId).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
      <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2"><button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft size={20} className="text-gray-600"/></button><h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name} Freight</h2></div>
          <div className="bg-white p-2 rounded-lg border flex items-center w-64 shadow-sm"><Search className="text-gray-400 mr-2" size={18} /><input className="flex-1 outline-none text-sm bg-white text-gray-800" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                  <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Product</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Unit Freight</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Action</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4"><div className="flex items-center"><img src={product.imageUrl} className="h-12 w-12 rounded-lg mr-4 object-cover"/><div><div className="font-bold text-gray-800 text-sm">{product.name}</div><div className="text-xs text-gray-500">{product.category}</div></div></div></td>
                              <td className="px-6 py-4">{editingId === product.id ? <div className="flex items-center"><span className="mr-2 font-bold text-gray-700">Ksh</span><input type="number" autoFocus className="w-32 p-2 border theme-border theme-ring focus:ring-2 rounded font-bold text-gray-900" value={tempFreight} onChange={(e) => setTempFreight(parseFloat(e.target.value)||0)} onKeyDown={(e) => e.key === 'Enter' && handleSaveFreight(product)}/></div> : <div className="text-sm font-bold text-gray-800">Ksh {product.freightCharge?.toLocaleString() || '0'}</div>}</td>
                              <td className="px-6 py-4">{editingId === product.id ? <div className="flex gap-2"><button onClick={() => handleSaveFreight(product)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold">Save</button><button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded text-xs font-bold">Cancel</button></div> : <button onClick={() => handleStartEdit(product)} className="flex items-center px-4 py-2 theme-bg-light theme-text rounded-lg border theme-border-light text-xs font-bold transition-all"><Edit2 size={14} className="mr-2"/> Set Freight</button>}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );
};

export default Freight;
