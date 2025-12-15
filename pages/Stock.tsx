
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Product, DynamicAttribute } from '../types';
import { ClipboardCheck, CheckCircle, Clock, Search, FolderOpen, ArrowLeft, AlertTriangle, Plus, X, Layers, AlertCircle, ShoppingBag, MinusCircle } from 'lucide-react';

const Stock = () => {
  const { catalogs, products, updateProduct, orders } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'ARRIVALS' | 'EXTRAS'>('ARRIVALS');

  // Modal State for Receiving Stock
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSellExtraModalOpen, setIsSellExtraModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockEntryForm, setStockEntryForm] = useState<Record<string, number>>({});
  
  // Sell Extra State
  const [sellVariantKey, setSellVariantKey] = useState('');
  const [sellQty, setSellQty] = useState(1);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  // --- Logic Helpers ---

  // Helper to generate a standardized key from attributes
  const getVariantKey = (attributes: DynamicAttribute[]) => {
      if (!attributes || attributes.length === 0) return "Standard";
      // Sort to ensure "Color: Red, Size: 40" is same as "Size: 40, Color: Red"
      return attributes
          .slice()
          .sort((a, b) => a.key.localeCompare(b.key))
          .map(a => `${a.key}:${a.value}`)
          .join(', ');
  };

  // Get total Ordered Quantity per variant for a product
  const getOrderedVariants = (productId: string) => {
      const variantTotals: Record<string, number> = {};
      
      orders.forEach(order => {
          order.items.forEach(item => {
              if (item.productId === productId) {
                  const key = getVariantKey(item.selectedAttributes);
                  variantTotals[key] = (variantTotals[key] || 0) + item.quantity;
              }
          });
      });
      return variantTotals;
  };

  // --- Modal Handlers ---

  const openReceiveModal = (product: Product) => {
      setSelectedProduct(product);
      // Pre-fill with existing stock counts or 0
      setStockEntryForm(product.stockCounts || {});
      setIsReceiveModalOpen(true);
  };

  const handleStockEntryChange = (variantKey: string, qty: number) => {
      setStockEntryForm(prev => ({
          ...prev,
          [variantKey]: qty
      }));
  };

  const saveStockEntry = () => {
      if (!selectedProduct) return;

      const totalStock = Object.values(stockEntryForm).reduce((a, b) => a + b, 0);
      const newStatus = totalStock > 0 ? 'ARRIVED' : 'PENDING';

      updateProduct({
          ...selectedProduct,
          stockStatus: newStatus,
          stockCounts: stockEntryForm
      });

      setIsReceiveModalOpen(false);
      setSelectedProduct(null);
  };

  // Sell Extra Handlers
  const openSellModal = (product: Product, variantKey: string) => {
      setSelectedProduct(product);
      setSellVariantKey(variantKey);
      setSellQty(1);
      setIsSellExtraModalOpen(true);
  }

  const confirmSellExtra = () => {
      if (!selectedProduct || !sellVariantKey) return;
      
      const currentSold = selectedProduct.stockSold || {};
      const newSoldTotal = (currentSold[sellVariantKey] || 0) + sellQty;
      
      updateProduct({
          ...selectedProduct,
          stockSold: {
              ...currentSold,
              [sellVariantKey]: newSoldTotal
          }
      });
      
      setIsSellExtraModalOpen(false);
      setSelectedProduct(null);
  }

  // --- Calculations for Display ---

  const calculateStockStats = (product: Product) => {
      const orderedVariants = getOrderedVariants(product.id);
      const totalOrdered = Object.values(orderedVariants).reduce((a, b) => a + b, 0);
      
      const stockCounts = product.stockCounts || {};
      const totalArrived = Object.values(stockCounts).reduce((a, b) => a + b, 0);

      const remainingToReceive = Math.max(0, totalOrdered - totalArrived);
      
      // Extras Logic: Arrived - Sold - Ordered
      const stockSold = product.stockSold || {};
      
      // We calculate surplus per variant to be precise, but for total summary:
      // Total Extras = Total Arrived - Total Sold - Total Ordered
      // NOTE: This simple math assumes you only sell extras. 
      const totalSold = Object.values(stockSold).reduce((a,b) => a+b, 0);
      const extras = Math.max(0, totalArrived - totalOrdered - totalSold);

      return { totalOrdered, totalArrived, remainingToReceive, extras, orderedVariants, stockCounts, stockSold };
  };

  // --- Filtering ---

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div>
                  <h2 className="text-3xl font-bold text-gray-800">Stock Taking</h2>
                  <p className="text-gray-500">Select a catalog month to manage stock arrival and extras.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalogs.map(catalog => (
                      <div 
                          key={catalog.id} 
                          onClick={() => setActiveCatalogId(catalog.id)}
                          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                  <FolderOpen size={24} />
                              </div>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                                  {new Date(catalog.closingDate).toLocaleDateString()}
                              </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                          <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                              <span>{products.filter(p => p.catalogId === catalog.id).length} Products</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const currentCatalogProducts = products.filter(p => p.catalogId === activeCatalogId);
  const filteredProducts = currentCatalogProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extras Filtering
  // Only show products that have actual surplus remaining
  const extraProducts = currentCatalogProducts.map(p => {
      const stats = calculateStockStats(p);
      return { product: p, ...stats };
  }).filter(item => item.extras > 0);


  return (
      <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <button 
                onClick={() => setActiveCatalogId(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
                <ArrowLeft size={20} className="text-gray-600"/>
            </button>
            <div>
                <h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name} Stock</h2>
                <p className="text-sm text-gray-500">Manage arrival status and identify extras.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
             <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center w-full md:w-64 shadow-sm">
                <Search className="text-gray-400 mr-2" size={18} />
                <input 
                    type="text" 
                    placeholder="Search stock..." 
                    className="flex-1 outline-none text-sm text-black bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             {/* Tab Switcher */}
             <div className="flex bg-gray-200 p-1 rounded-lg">
                 <button 
                    onClick={() => setActiveTab('ARRIVALS')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'ARRIVALS' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
                 >
                     Arrivals Check
                 </button>
                 <button 
                    onClick={() => setActiveTab('EXTRAS')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${activeTab === 'EXTRAS' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}`}
                 >
                     <Layers size={14} className="mr-2"/> Extras {extraProducts.length > 0 && `(${extraProducts.length})`}
                 </button>
             </div>
          </div>

          {activeTab === 'ARRIVALS' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Total Ordered</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Confirmed Arrival</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(product => {
                            const stats = calculateStockStats(product);
                            const isArrived = product.stockStatus === 'ARRIVED';
                            
                            return (
                                <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${isArrived ? 'bg-green-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover mr-3 bg-gray-100" />
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{product.name}</p>
                                                <p className="text-xs text-gray-500">{product.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-gray-700">{stats.totalOrdered}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {stats.totalArrived > 0 ? (
                                            <div className="flex flex-col items-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                                    <CheckCircle size={12} className="mr-1" /> {stats.totalArrived} Arrived
                                                </span>
                                                {stats.remainingToReceive > 0 && (
                                                    <span className="text-[10px] text-red-500 mt-1">{stats.remainingToReceive} Missing</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <Clock size={12} className="mr-1" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => openReceiveModal(product)}
                                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                                        >
                                            Receive Stock...
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No products found in this catalog.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          )}

          {activeTab === 'EXTRAS' && (
            <div className="bg-purple-50 rounded-xl border border-purple-100 overflow-hidden">
                <div className="p-4 bg-purple-100 border-b border-purple-200 flex items-center justify-between">
                    <div className="flex items-center">
                        <Layers size={18} className="mr-2 text-purple-700"/>
                        <h3 className="font-bold text-purple-900">Surplus Inventory (Extras)</h3>
                    </div>
                    <span className="text-xs text-purple-600">Items arrived but not ordered</span>
                </div>
                <table className="w-full">
                    <thead className="bg-white/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 uppercase">Product</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-purple-800 uppercase">Variant</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-purple-800 uppercase">Available Extra</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-purple-800 uppercase">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-200/50">
                        {extraProducts.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-purple-400">No extra items found.</td></tr>
                        ) : (
                            extraProducts.map(({ product, orderedVariants, stockCounts, stockSold }) => {
                                // Calculate extra per variant
                                const allKeys = new Set([...Object.keys(stockCounts), ...Object.keys(orderedVariants)]);
                                const variantsWithExtras: { key: string, extra: number }[] = [];
                                
                                allKeys.forEach(key => {
                                    const ordered = orderedVariants[key] || 0;
                                    const arrived = stockCounts[key] || 0;
                                    const sold = stockSold[key] || 0;
                                    const availableExtra = Math.max(0, arrived - ordered - sold);
                                    
                                    if (availableExtra > 0) {
                                        variantsWithExtras.push({ key, extra: availableExtra });
                                    }
                                });

                                if (variantsWithExtras.length === 0) return null;

                                return variantsWithExtras.map((v, idx) => (
                                    <tr key={`${product.id}-${idx}`} className="bg-white hover:bg-purple-50">
                                        <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {v.key}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-200 text-purple-800">
                                                {v.extra}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => openSellModal(product, v.key)}
                                                className="px-3 py-1.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center ml-auto"
                                            >
                                                <ShoppingBag size={12} className="mr-1"/> Sell / Remove
                                            </button>
                                        </td>
                                    </tr>
                                ));
                            })
                        )}
                    </tbody>
                </table>
            </div>
          )}
          
          {/* Stock Receive Modal */}
          {isReceiveModalOpen && selectedProduct && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">Receive Stock</h3>
                            <p className="text-sm text-gray-500">{selectedProduct.name}</p>
                          </div>
                          <button onClick={() => setIsReceiveModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                      </div>
                      
                      <div className="p-6 flex-1 overflow-y-auto">
                          <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800 flex items-start">
                              <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                              <p>Enter the exact number of items that arrived for each ordered variant. If an item arrived that wasn't ordered, add it using "Add New Variant".</p>
                          </div>

                          <div className="space-y-4">
                              {/* List existing order variants first */}
                              {Object.entries(calculateStockStats(selectedProduct).orderedVariants).map(([variant, orderedQty]) => (
                                  <div key={variant} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                                      <div className="flex-1">
                                          <p className="font-bold text-sm text-gray-800">{variant}</p>
                                          <p className="text-xs text-gray-500">Ordered: {orderedQty}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <label className="text-xs font-bold text-gray-500 uppercase">Arrived:</label>
                                          <input 
                                              type="number" 
                                              min="0"
                                              className="w-20 p-2 border border-blue-300 rounded text-center font-bold text-gray-800 focus:ring-2 focus:ring-blue-200 outline-none"
                                              value={stockEntryForm[variant] !== undefined ? stockEntryForm[variant] : ''}
                                              onChange={(e) => handleStockEntryChange(variant, parseInt(e.target.value) || 0)}
                                              placeholder="0"
                                          />
                                      </div>
                                  </div>
                              ))}

                              {/* Allow adding generic counts if no variants ordered or manual add */}
                              {Object.keys(calculateStockStats(selectedProduct).orderedVariants).length === 0 && (
                                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                                      <div className="flex-1">
                                          <p className="font-bold text-sm text-gray-800">Standard / No Variant</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <label className="text-xs font-bold text-gray-500 uppercase">Arrived:</label>
                                          <input 
                                              type="number" 
                                              min="0"
                                              className="w-20 p-2 border border-blue-300 rounded text-center font-bold text-gray-800 focus:ring-2 focus:ring-blue-200 outline-none"
                                              value={stockEntryForm['Standard'] || ''}
                                              onChange={(e) => handleStockEntryChange('Standard', parseInt(e.target.value) || 0)}
                                              placeholder="0"
                                          />
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                          <button onClick={() => setIsReceiveModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                          <button 
                            onClick={saveStockEntry} 
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700"
                          >
                              Save Inventory
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Sell/Remove Extra Modal */}
          {isSellExtraModalOpen && selectedProduct && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-fade-in">
                      <div className="p-6 border-b border-gray-100">
                          <h3 className="text-xl font-bold text-gray-800">Sell / Remove Extra</h3>
                          <p className="text-sm text-gray-500">{selectedProduct.name} ({sellVariantKey})</p>
                      </div>
                      <div className="p-6 space-y-4">
                          <p className="text-sm text-gray-600">How many units are you removing from the extras pile?</p>
                          <div className="flex items-center gap-4 justify-center">
                              <button onClick={() => setSellQty(Math.max(1, sellQty - 1))} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"><MinusCircle size={20}/></button>
                              <span className="text-2xl font-bold text-gray-800 w-12 text-center">{sellQty}</span>
                              <button onClick={() => setSellQty(sellQty + 1)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"><Plus size={20}/></button>
                          </div>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-b-xl flex gap-3">
                          <button onClick={() => setIsSellExtraModalOpen(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                          <button onClick={confirmSellExtra} className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md">Confirm</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};

export default Stock;
