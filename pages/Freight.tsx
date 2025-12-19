
import { useState } from 'react';
import { useAppStore } from '../store';
import { Container, Edit2, Search, ArrowLeft, CheckCircle, Save, X } from 'lucide-react';
import { Product } from '../types';

const Freight = () => {
  const { products, updateProduct, orders, updateOrder, catalogs } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempFreight, setTempFreight] = useState<number>(0);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const handleStartEdit = (product: Product) => { 
    setEditingId(product.id); 
    setTempFreight(product.freightCharge || 0); 
  };

  const handleSaveFreight = async (product: Product) => {
     if (tempFreight < 0) return;
     
     try {
         // Create local deep copy for update
         const updatedProduct = { ...product, freightCharge: tempFreight };
         
         // 1. Update Product Unit Freight
         await updateProduct(updatedProduct);

         // 2. Cascade update to all affected orders
         const affectedOrders = orders.filter(order => 
             !order.isLocked && 
             order.status !== 'DELIVERED' && 
             order.items.some(i => i.productId === product.id)
         );

         for (const order of affectedOrders) {
             const updatedItems = order.items.map(item => 
                 item.productId === product.id 
                    ? { ...item, freightTotal: tempFreight * item.quantity } 
                    : item
             );
             
             const newFreightTotal = updatedItems.reduce((sum, i) => sum + i.freightTotal, 0);
             let newFreightStatus = order.freightPaymentStatus;
             
             if (order.totalFreightPaid >= newFreightTotal && newFreightTotal > 0) {
                 newFreightStatus = 'PAID';
             } else if (order.totalFreightPaid > 0) {
                 newFreightStatus = 'PARTIAL';
             } else {
                 newFreightStatus = 'UNPAID';
             }
             
             await updateOrder({ 
                 ...order, 
                 items: updatedItems, 
                 freightPaymentStatus: newFreightStatus 
             });
         }
         
         setEditingId(null);
     } catch (err) {
         console.error("Critical Freight Update Error:", err);
         alert("Failed to synchronize freight charges with existing orders.");
     }
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-6 animate-fade-in">
              <div><h2 className="text-3xl font-black text-gray-900 tracking-tight">Set Freight</h2><p className="text-gray-500 font-medium">Select a catalog to configure shipping charges.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogs.map(c => {
                    const catProducts = products.filter(p => p.catalogId === c.id);
                    const freightSet = catProducts.filter(p => p.freightCharge > 0).length;
                    return (
                        <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group hover-glow relative overflow-hidden">
                            <div className="flex mb-6"><div className="p-4 theme-bg-light theme-text rounded-2xl group-hover:theme-bg group-hover:text-white transition-colors"><Container size={28} /></div></div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">{c.name}</h3>
                            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">Total Items</p><p className="font-black text-gray-800">{catProducts.length}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">Set Progress</p><p className={`font-black ${freightSet === catProducts.length ? 'text-green-600' : 'text-amber-500'}`}>{freightSet} / {catProducts.length}</p></div>
                            </div>
                        </div>
                    );
                })}
              </div>
          </div>
      );
  }

  const filteredProducts = products.filter(p => p.catalogId === activeCatalogId).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
      <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-2">
              <button onClick={() => setActiveCatalogId(null)} className="p-3 bg-white border rounded-xl hover:bg-gray-50 shadow-sm transition-all"><ArrowLeft size={20} className="text-gray-600"/></button>
              <div><h2 className="text-3xl font-black text-gray-900 tracking-tight">{activeCatalog?.name} Freight</h2><p className="text-sm text-gray-500 font-medium">Define unit shipping costs per item.</p></div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center w-full md:w-80 group">
              <Search className="text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input className="flex-1 outline-none text-sm font-bold bg-white text-gray-800" placeholder="Search catalog items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr><th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th><th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Freight</th><th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-8 py-5">
                                  <div className="flex items-center">
                                      <img src={product.imageUrl} className="h-14 w-14 rounded-xl mr-5 object-cover shadow-sm"/>
                                      <div>
                                          <div className="font-black text-gray-900 text-sm">{product.name}</div>
                                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{product.category}</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-5">
                                  {editingId === product.id ? (
                                      <div className="flex items-center gap-2">
                                          <span className="font-black text-gray-400">Ksh</span>
                                          <input 
                                            type="number" 
                                            autoFocus 
                                            className="w-32 p-3 bg-white border border-indigo-500 rounded-xl outline-none font-black text-indigo-600 shadow-inner" 
                                            value={tempFreight} 
                                            onChange={(e) => setTempFreight(parseFloat(e.target.value)||0)} 
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveFreight(product)}
                                          />
                                      </div>
                                  ) : (
                                      <div className="text-lg font-black text-gray-800">Ksh {product.freightCharge?.toLocaleString() || '0'}</div>
                                  )}
                              </td>
                              <td className="px-8 py-5 text-right">
                                  {editingId === product.id ? (
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => handleSaveFreight(product)} className="p-3 bg-green-500 text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"><Save size={18}/></button>
                                          <button onClick={() => setEditingId(null)} className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all"><X size={18}/></button>
                                      </div>
                                  ) : (
                                      <button onClick={() => handleStartEdit(product)} className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-700 hover:border-indigo-500 hover:theme-text transition-all shadow-sm">
                                          <Edit2 size={14} className="mr-2"/> Configure Cost
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );
};

export default Freight;
