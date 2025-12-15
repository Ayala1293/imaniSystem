
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Product, DynamicAttribute } from '../types';
import { ClipboardCheck, CheckCircle, Clock, Search, FolderOpen, ArrowLeft, Plus, X, Layers, AlertCircle, ShoppingBag, MinusCircle } from 'lucide-react';

const Stock = () => {
  const { catalogs, products, updateProduct, orders } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ARRIVALS' | 'EXTRAS'>('ARRIVALS');
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSellExtraModalOpen, setIsSellExtraModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockEntryForm, setStockEntryForm] = useState<Record<string, number>>({});
  const [sellVariantKey, setSellVariantKey] = useState('');
  const [sellQty, setSellQty] = useState(1);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const getVariantKey = (attributes: DynamicAttribute[]) => attributes.length ? attributes.slice().sort((a, b) => a.key.localeCompare(b.key)).map(a => `${a.key}:${a.value}`).join(', ') : "Standard";

  const getOrderedVariants = (productId: string) => {
      const variantTotals: Record<string, number> = {};
      orders.forEach(order => order.items.forEach(item => {
          if (item.productId === productId) {
              const key = getVariantKey(item.selectedAttributes);
              variantTotals[key] = (variantTotals[key] || 0) + item.quantity;
          }
      }));
      return variantTotals;
  };

  const openReceiveModal = (product: Product) => {
      setSelectedProduct(product);
      setStockEntryForm(product.stockCounts || {});
      setIsReceiveModalOpen(true);
  };

  const handleStockEntryChange = (variantKey: string, qty: number) => setStockEntryForm(prev => ({ ...prev, [variantKey]: qty }));

  const saveStockEntry = () => {
      if (!selectedProduct) return;
      const totalStock = Object.values(stockEntryForm).reduce((a, b) => a + b, 0);
      updateProduct({ ...selectedProduct, stockStatus: totalStock > 0 ? 'ARRIVED' : 'PENDING', stockCounts: stockEntryForm });
      setIsReceiveModalOpen(false); setSelectedProduct(null);
  };

  const openSellModal = (product: Product, variantKey: string) => {
      setSelectedProduct(product); setSellVariantKey(variantKey); setSellQty(1); setIsSellExtraModalOpen(true);
  }

  const confirmSellExtra = () => {
      if (!selectedProduct || !sellVariantKey) return;
      const currentSold = selectedProduct.stockSold || {};
      updateProduct({ ...selectedProduct, stockSold: { ...currentSold, [sellVariantKey]: (currentSold[sellVariantKey] || 0) + sellQty } });
      setIsSellExtraModalOpen(false); setSelectedProduct(null);
  }

  const calculateStockStats = (product: Product) => {
      const orderedVariants = getOrderedVariants(product.id);
      const totalOrdered = Object.values(orderedVariants).reduce((a, b) => a + b, 0);
      const stockCounts = product.stockCounts || {};
      const totalArrived = Object.values(stockCounts).reduce((a, b) => a + b, 0);
      const stockSold = product.stockSold || {};
      const totalSold = Object.values(stockSold).reduce((a,b) => a+b, 0);
      const extras = Math.max(0, totalArrived - totalOrdered - totalSold);
      return { totalOrdered, totalArrived, remainingToReceive: Math.max(0, totalOrdered - totalArrived), extras, orderedVariants, stockCounts, stockSold };
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div><h2 className="text-3xl font-bold text-gray-800">Stock Taking</h2><p className="text-gray-500">Select a catalog month.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalogs.map(catalog => {
                      const catProducts = products.filter(p => p.catalogId === catalog.id);
                      const arrivedCount = catProducts.filter(p => p.stockStatus === 'ARRIVED').length;
                      
                      return (
                      <div key={catalog.id} onClick={() => setActiveCatalogId(catalog.id)} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover-glow relative overflow-hidden">
                          <div className="flex justify-between items-start mb-4"><div className="p-3 theme-bg-light theme-text rounded-lg transition-colors"><FolderOpen size={24} /></div><span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">{new Date(catalog.closingDate).toLocaleDateString()}</span></div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                          
                          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                              <div><p className="text-xs text-gray-400 font-medium uppercase">Total Products</p><p className="text-lg font-bold text-gray-800">{catProducts.length}</p></div>
                              <div><p className="text-xs text-gray-400 font-medium uppercase">Arrived</p><p className="text-lg font-bold text-green-600">{arrivedCount}</p></div>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      );
  }

  const currentCatalogProducts = products.filter(p => p.catalogId === activeCatalogId);
  const filteredProducts = currentCatalogProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const extraProducts = currentCatalogProducts.map(p => ({ product: p, ...calculateStockStats(p) })).filter(item => item.extras > 0);

  // ... (Rest of component remains mostly same)
  return (
      <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={20} className="text-gray-600"/></button>
            <div><h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name} Stock</h2><p className="text-sm text-gray-500">Manage arrival status.</p></div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
             <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center w-full md:w-64 shadow-sm"><Search className="text-gray-400 mr-2" size={18} /><input type="text" placeholder="Search stock..." className="flex-1 outline-none text-sm bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
             <div className="flex bg-gray-200 p-1 rounded-lg">
                 <button onClick={() => setActiveTab('ARRIVALS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'ARRIVALS' ? 'bg-white shadow theme-text' : 'text-gray-600'}`}>Arrivals</button>
                 <button onClick={() => setActiveTab('EXTRAS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${activeTab === 'EXTRAS' ? 'bg-white shadow text-purple-600' : 'text-gray-600'}`}><Layers size={14} className="mr-2"/> Extras {extraProducts.length > 0 && `(${extraProducts.length})`}</button>
             </div>
          </div>

          {activeTab === 'ARRIVALS' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Product</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Ordered</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Arrived</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Action</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(product => {
                            const stats = calculateStockStats(product);
                            return (
                                <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${product.stockStatus === 'ARRIVED' ? 'bg-green-50/30' : ''}`}>
                                    <td className="px-6 py-4"><div className="flex items-center"><img src={product.imageUrl} className="w-10 h-10 rounded object-cover mr-3"/><div><p className="font-bold text-gray-800 text-sm">{product.name}</p><p className="text-xs text-gray-500">{product.category}</p></div></div></td>
                                    <td className="px-6 py-4 text-center"><span className="font-bold text-gray-700">{stats.totalOrdered}</span></td>
                                    <td className="px-6 py-4 text-center">{stats.totalArrived > 0 ? <div className="flex flex-col items-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1" /> {stats.totalArrived} Arrived</span>{stats.remainingToReceive > 0 && <span className="text-[10px] text-red-500 mt-1">{stats.remainingToReceive} Missing</span>}</div> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock size={12} className="mr-1" /> Pending</span>}</td>
                                    <td className="px-6 py-4 text-right"><button onClick={() => openReceiveModal(product)} className="px-4 py-2 theme-bg rounded-lg text-xs font-bold shadow-sm">Receive Stock...</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          )}

          {activeTab === 'EXTRAS' && (
            <div className="bg-purple-50 rounded-xl border border-purple-100 overflow-hidden">
                <div className="p-4 bg-purple-100 border-b border-purple-200 flex items-center justify-between"><div className="flex items-center"><Layers size={18} className="mr-2 text-purple-700"/><h3 className="font-bold text-purple-900">Surplus Inventory</h3></div></div>
                <table className="w-full">
                    <thead className="bg-white/50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-purple-800">Product</th><th className="px-6 py-4 text-left text-xs font-semibold text-purple-800">Variant</th><th className="px-6 py-4 text-center text-xs font-semibold text-purple-800">Available</th><th className="px-6 py-4 text-right text-xs font-semibold text-purple-800">Manage</th></tr></thead>
                    <tbody className="divide-y divide-purple-200/50">
                        {extraProducts.map(({ product, orderedVariants, stockCounts, stockSold }) => {
                            const allKeys = new Set([...Object.keys(stockCounts), ...Object.keys(orderedVariants)]);
                            return Array.from(allKeys).map(key => {
                                const availableExtra = Math.max(0, (stockCounts[key]||0) - (orderedVariants[key]||0) - (stockSold[key]||0));
                                if (availableExtra <= 0) return null;
                                return (
                                    <tr key={`${product.id}-${key}`} className="bg-white hover:bg-purple-50">
                                        <td className="px-6 py-4 font-bold text-gray-800 text-sm">{product.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{key}</td>
                                        <td className="px-6 py-4 text-center"><span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-200 text-purple-800">{availableExtra}</span></td>
                                        <td className="px-6 py-4 text-right"><button onClick={() => openSellModal(product, key)} className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold shadow-sm flex items-center ml-auto"><ShoppingBag size={12} className="mr-1"/> Sell / Remove</button></td>
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
          )}
          
          {isReceiveModalOpen && selectedProduct && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                      <div className="p-6 border-b flex justify-between"><div><h3 className="text-xl font-bold">Receive Stock</h3><p className="text-sm text-gray-500">{selectedProduct.name}</p></div><button onClick={() => setIsReceiveModalOpen(false)} className="text-gray-400">X</button></div>
                      <div className="p-6 flex-1 overflow-y-auto space-y-4">
                          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex items-start"><AlertCircle size={16} className="mr-2 mt-0.5" /><p>Enter actual arrival counts.</p></div>
                          {Object.entries(calculateStockStats(selectedProduct).orderedVariants).map(([variant, orderedQty]) => (
                              <div key={variant} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex-1"><p className="font-bold text-sm">{variant}</p><p className="text-xs text-gray-500">Ordered: {orderedQty}</p></div>
                                  <input type="number" min="0" className="w-20 p-2 border rounded text-center font-bold theme-ring focus:ring-2 outline-none" value={stockEntryForm[variant]??''} onChange={(e) => handleStockEntryChange(variant, parseInt(e.target.value)||0)} placeholder="0"/>
                              </div>
                          ))}
                          {!Object.keys(calculateStockStats(selectedProduct).orderedVariants).length && <div className="flex items-center justify-between p-3 border rounded-lg"><div className="flex-1"><p className="font-bold text-sm">Standard</p></div><input type="number" min="0" className="w-20 p-2 border rounded text-center font-bold theme-ring focus:ring-2 outline-none" value={stockEntryForm['Standard']??''} onChange={(e) => handleStockEntryChange('Standard', parseInt(e.target.value)||0)} placeholder="0"/></div>}
                      </div>
                      <div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setIsReceiveModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button><button onClick={saveStockEntry} className="px-6 py-2 theme-bg rounded-lg shadow-md font-bold">Save Inventory</button></div>
                  </div>
              </div>
          )}

          {isSellExtraModalOpen && selectedProduct && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
                      <div className="p-6 border-b"><h3 className="text-xl font-bold">Sell Extra</h3><p className="text-sm text-gray-500">{selectedProduct.name}</p></div>
                      <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">How many units to remove?</p>
                        <div className="flex items-center gap-4 justify-center">
                            <button onClick={() => setSellQty(Math.max(1, sellQty - 1))} className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm transition-colors"><MinusCircle size={24}/></button>
                            <span className="text-3xl font-bold text-gray-800 w-16 text-center">{sellQty}</span>
                            <button onClick={() => setSellQty(sellQty + 1)} className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm transition-colors"><Plus size={24}/></button>
                        </div>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-b-xl flex gap-3"><button onClick={() => setIsSellExtraModalOpen(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button><button onClick={confirmSellExtra} className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-lg shadow-md">Confirm</button></div>
                  </div>
              </div>
          )}
      </div>
  );
};

export default Stock;
