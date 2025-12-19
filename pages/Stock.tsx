
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Product, DynamicAttribute } from '../types';
import { 
  CheckCircle, 
  Clock, 
  Search, 
  FolderOpen, 
  ArrowLeft, 
  Plus, 
  Layers, 
  AlertCircle, 
  ShoppingBag, 
  MinusCircle, 
  ChevronDown, 
  ListPlus, 
  X 
} from 'lucide-react';

const Stock = () => {
  const { catalogs, products, updateProductStock, orders } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockEntryForm, setStockEntryForm] = useState<Record<string, number>>({});

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const getVariantKey = (attributes: DynamicAttribute[] = []) => {
      if (!attributes || attributes.length === 0) return "Standard";
      // Ensure stable sorting for keys
      return attributes.slice()
        .sort((a, b) => (a.key || '').localeCompare(b.key || ''))
        .map(a => `${a.key}:${a.value}`)
        .join(', ');
  };

  const calculateStockStats = (product: Product) => {
      if (!product) return { totalOrdered: 0, totalArrived: 0, remainingToReceive: 0 };
      const orderedVariants: Record<string, number> = {};
      
      orders.forEach(o => {
          if (!o.items) return;
          o.items.forEach(i => { 
            // Crucial: Match ID as string to be Mongo-safe
            if(String(i.productId) === String(product.id)) { 
                const k = getVariantKey(i.selectedAttributes); 
                orderedVariants[k] = (orderedVariants[k] || 0) + (i.quantity || 0); 
            } 
          });
      });

      const totalOrdered = Object.values(orderedVariants).reduce((a, b) => a + b, 0);
      const stockCounts = product.stockCounts || {};
      const totalArrived = Object.values(stockCounts).reduce((a, b) => a + b, 0);
      return { totalOrdered, totalArrived, remainingToReceive: Math.max(0, totalOrdered - totalArrived) };
  };

  const openReceiveModal = (product: Product) => {
      setSelectedProduct(product);
      setStockEntryForm(product.stockCounts || {});
      setIsReceiveModalOpen(true);
  };

  const saveStockEntry = async () => {
      if (!selectedProduct) return;
      const totalStock = Object.values(stockEntryForm).reduce((a, b) => a + b, 0);
      await updateProductStock(selectedProduct.id, { 
          stockStatus: totalStock > 0 ? 'ARRIVED' : 'PENDING', 
          stockCounts: stockEntryForm 
      });
      setIsReceiveModalOpen(false); 
      setSelectedProduct(null);
  };

  const allExtras = useMemo(() => {
      const flatList: any[] = [];
      products.forEach(p => {
          const stats = calculateStockStats(p);
          const stock = p.stockCounts || {};
          Object.keys(stock).forEach(key => {
              // Logic: Find items in stock that were NOT ordered in this specific catalog context
              // (Simplification: Total Stock vs Total Orders across all time)
              const extra = Math.max(0, (stock[key] || 0) - (stats.totalOrdered || 0));
              if (extra > 0) flatList.push({ 
                  product: p, 
                  variant: key, 
                  count: extra, 
                  catalog: catalogs.find(c => c.id === p.catalogId)?.name || 'Unknown'
              });
          });
      });
      return flatList;
  }, [products, orders, catalogs]);

  const filteredGlobalExtras = globalSearch.trim() ? allExtras.filter(item => 
      (item.product.name || '').toLowerCase().includes(globalSearch.toLowerCase()) || 
      (item.variant || '').toLowerCase().includes(globalSearch.toLowerCase())
  ) : [];

  return (
      <div className="space-y-6 animate-fade-in">
          {!activeCatalogId ? (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Inventory Control</h2>
                        <p className="text-gray-500 font-medium">Verify monthly arrivals and check unallocated stock.</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="bg-white p-3 rounded-2xl border border-gray-200 flex items-center flex-1 md:w-96 shadow-sm focus-within:border-indigo-500 transition-all focus-within:ring-4 focus-within:ring-indigo-50">
                            <Search className="text-gray-400 mr-2" size={20} />
                            <input type="text" placeholder="Search Surplus Stock..." className="flex-1 outline-none text-sm bg-white font-bold text-gray-800" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                        </div>
                    </div>
                </div>

                {globalSearch ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-fade-in">
                        <div className="p-6 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs">Surplus / Extra Inventory Results</h3>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black uppercase tracking-tight">{filteredGlobalExtras.length} Results</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white text-gray-400 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr><th className="px-8 py-4 text-left">Item Details</th><th className="px-8 py-4 text-left">Source Catalog</th><th className="px-8 py-4 text-center">Unallocated Qty</th><th className="px-8 py-4 text-right">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredGlobalExtras.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <img src={item.product.imageUrl} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                                    <div>
                                                        <p className="font-black text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">{item.product.name}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.variant}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold text-gray-500 uppercase tracking-tighter">{item.catalog}</td>
                                            <td className="px-8 py-5 text-center"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-black text-xs">+{item.count}</span></td>
                                            <td className="px-8 py-5 text-right"><button onClick={() => openReceiveModal(item.product)} className="text-[10px] font-black theme-text uppercase tracking-widest border-b-2 border-transparent hover:border-indigo-600 transition-all">Adjust Level</button></td>
                                        </tr>
                                    ))}
                                    {filteredGlobalExtras.length === 0 && (
                                        <tr><td colSpan={4} className="py-20 text-center"><AlertCircle className="mx-auto text-gray-200 mb-2" size={48}/><p className="text-gray-400 font-bold">No surplus inventory matches your search.</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {catalogs.map(catalog => (
                            <div key={catalog.id} onClick={() => setActiveCatalogId(catalog.id)} className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                        <FolderOpen size={32} />
                                    </div>
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest shadow-sm ${catalog.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{catalog.status}</span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{catalog.name}</h3>
                                <p className="text-sm text-gray-400 font-medium">Verify shipment contents</p>
                                <div className="mt-10 pt-6 border-t border-gray-50 flex items-center justify-between">
                                   <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Arrival Deadline</p><p className="font-black text-gray-700">{new Date(catalog.closingDate).toLocaleDateString()}</p></div>
                                   <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 transition-all shadow-inner"><Plus className="text-gray-400 group-hover:text-white" size={20}/></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ) : (
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => setActiveCatalogId(null)} className="p-3 bg-white border rounded-2xl hover:bg-gray-50 shadow-sm transition-all"><ArrowLeft size={20} className="text-gray-600"/></button>
                    <div><h2 className="text-3xl font-black text-gray-900 tracking-tight">{activeCatalog?.name} Arrival Manifest</h2><p className="text-gray-500 font-medium italic">Compare orders vs received quantities.</p></div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                    <table className="w-full">
                        <thead className="bg-gray-50/80 border-b border-gray-100"><tr><th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Arrived Item</th><th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Total Sold</th><th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Verified Recv</th><th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.filter(p => p.catalogId === activeCatalogId).map(product => {
                                const stats = calculateStockStats(product);
                                return (
                                    <tr key={product.id} onClick={() => openReceiveModal(product)} className="hover:bg-indigo-50/20 transition-all cursor-pointer group">
                                        <td className="px-8 py-5"><div className="flex items-center"><img src={product.imageUrl} className="w-14 h-14 rounded-xl object-cover mr-5 shadow-sm group-hover:scale-105 transition-transform"/><div className="font-black text-gray-800 text-sm group-hover:text-indigo-600 transition-colors">{product.name}</div></div></td>
                                        <td className="px-8 py-5 text-center font-black text-gray-300 text-lg">{stats.totalOrdered}</td>
                                        <td className="px-8 py-5 text-center font-black text-indigo-600 text-lg">{stats.totalArrived}</td>
                                        <td className="px-8 py-5 text-right">
                                            {stats.totalArrived >= stats.totalOrdered && stats.totalOrdered > 0 ? (
                                                <div className="inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100"><CheckCircle size={14} className="mr-2"/> Perfect</div>
                                            ) : stats.totalArrived > 0 ? (
                                                <div className="inline-flex items-center px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">Partial ({stats.totalArrived})</div>
                                            ) : (
                                                <div className="inline-flex items-center px-4 py-1.5 bg-gray-50 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">Awaiting</div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {isReceiveModalOpen && selectedProduct && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                  <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden transform scale-100">
                      <div className="p-8 border-b bg-indigo-600 text-white flex justify-between items-center shadow-lg"><div className="space-y-1"><h3 className="text-2xl font-black leading-none">Arrival Verification</h3><p className="opacity-80 font-bold text-xs uppercase tracking-widest">{selectedProduct.name}</p></div><button onClick={() => setIsReceiveModalOpen(false)} className="bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-all"><X size={20}/></button></div>
                      <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar bg-gray-50/30">
                          {Object.entries(selectedProduct.stockCounts || {}).length === 0 ? (
                              <div className="text-center py-10 opacity-30"><AlertCircle size={48} className="mx-auto mb-2"/><p className="font-black text-xs uppercase">No variant counts initialized</p></div>
                          ) : (
                              Object.entries(selectedProduct.stockCounts || {}).map(([v, q]) => (
                                  <div key={v} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all">
                                      <div className="space-y-1"><span className="font-black text-gray-800 text-sm block leading-none">{v.split(', ').pop()}</span><span className="text-[10px] text-gray-400 font-bold uppercase block">{v.split(', ').slice(0, -1).join(', ') || 'Standard'}</span></div>
                                      <div className="flex items-center gap-4">
                                          <button onClick={() => setStockEntryForm({...stockEntryForm, [v]: Math.max(0, (stockEntryForm[v] || 0) - 1)})} className="w-8 h-8 flex items-center justify-center bg-gray-50 border rounded-lg shadow-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all font-black">-</button>
                                          <input type="number" className="w-12 text-center font-black text-lg outline-none bg-transparent text-indigo-600" value={stockEntryForm[v] || 0} onChange={(e) => setStockEntryForm({...stockEntryForm, [v]: parseInt(e.target.value) || 0})} />
                                          <button onClick={() => setStockEntryForm({...stockEntryForm, [v]: (stockEntryForm[v] || 0) + 1})} className="w-8 h-8 flex items-center justify-center bg-gray-50 border rounded-lg shadow-sm text-gray-400 hover:bg-green-50 hover:text-green-500 transition-all font-black">+</button>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                      <div className="p-8 bg-white border-t flex gap-4"><button onClick={() => setIsReceiveModalOpen(false)} className="flex-1 py-4 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all">Cancel</button><button onClick={saveStockEntry} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Confirm Quantities</button></div>
                  </div>
              </div>
          )}
      </div>
  );
};

export default Stock;
