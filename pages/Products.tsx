
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Product, Catalog } from '../types';
import { Plus, Search, Sparkles, Trash2, Edit, Upload, FolderOpen, Calendar, ArrowLeft, History, Settings, Lock, Edit2, ListPlus, Unlock } from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';

const Products = () => {
  const { 
    products, 
    addProduct, 
    currentUser, 
    updateProduct, 
    deleteProduct, 
    orders, 
    updateOrder,
    catalogs,
    addCatalog,
    updateCatalog
  } = useAppStore();

  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    name: '', category: '', imageUrl: '', fobPrice: 0, freightCharge: 0, description: '', attributes: []
  });
  
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [singleOptionInput, setSingleOptionInput] = useState('');

  const [catalogFormData, setCatalogFormData] = useState<Partial<Catalog>>({
    name: '', closingDate: '', status: 'OPEN'
  });

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const handleGenerateDescription = async () => {
    if (!productFormData.name) return;
    setIsGenerating(true);
    const attrString = productFormData.attributes?.map(a => `${a.key}: ${a.value}`).join(', ') || '';
    const desc = await generateProductDescription(productFormData.name, attrString);
    setProductFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProductFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  // Helper to parse ranges for preview
  const parseOptions = (valString: string): string[] => {
      const rangeMatch = valString.trim().match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          if (!isNaN(start) && !isNaN(end) && start < end) { 
              const arr = []; 
              // Limit to reasonable amount to prevent browser crash on huge numbers
              if(end - start > 100) return [valString];
              for(let i=start; i<=end; i++) arr.push(i.toString()); 
              return arr; 
          }
      }
      if (valString.includes(',')) return valString.split(',').map(s => s.trim()).filter(s => s.length > 0);
      return valString ? [valString] : [];
  };

  const addAttribute = () => {
      if(newAttrKey && newAttrValue) {
          // Check if key already exists to append
          const existingIndex = productFormData.attributes?.findIndex(a => a.key.toLowerCase().trim() === newAttrKey.toLowerCase().trim()) ?? -1;
          
          if (existingIndex >= 0) {
              const updatedAttributes = [...(productFormData.attributes || [])];
              const existingValue = updatedAttributes[existingIndex].value;
              // Clean up existing value if it ends with a comma
              const cleanExisting = existingValue.trim().endsWith(',') ? existingValue.trim().slice(0, -1) : existingValue.trim();
              
              updatedAttributes[existingIndex] = {
                  ...updatedAttributes[existingIndex],
                  value: cleanExisting ? `${cleanExisting}, ${newAttrValue}` : newAttrValue
              };
              setProductFormData(prev => ({ ...prev, attributes: updatedAttributes }));
          } else {
              setProductFormData(prev => ({ ...prev, attributes: [...(prev.attributes || []), { key: newAttrKey, value: newAttrValue }] }));
          }
          setNewAttrKey(''); setNewAttrValue(''); setSingleOptionInput('');
      }
  };

  const editAttribute = (index: number) => {
      const attr = productFormData.attributes![index];
      setNewAttrKey(attr.key); setNewAttrValue(attr.value);
      // We don't remove it immediately anymore to allow for "appending" workflow, 
      // but if they click save it will update the existing key match or add new if key changed.
      // actually, for specific edit button, let's remove it so they can fully redefine it if needed.
      const newAttrs = [...(productFormData.attributes || [])];
      newAttrs.splice(index, 1);
      setProductFormData({ ...productFormData, attributes: newAttrs });
  };

  const removeAttribute = (index: number) => setProductFormData(prev => ({ ...prev, attributes: prev.attributes?.filter((_, i) => i !== index) }));

  const appendSingleOption = () => {
      if (!singleOptionInput.trim()) return;
      let current = newAttrValue.trim();
      if (current.endsWith(',')) current = current.slice(0, -1);
      const toAdd = singleOptionInput.trim();
      setNewAttrValue(current.length > 0 ? `${current}, ${toAdd}` : toAdd);
      setSingleOptionInput('');
  };

  const openCatalogModal = (catalog?: Catalog) => {
    if (catalog) {
        setCatalogFormData(catalog);
    } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        setCatalogFormData({ name: '', closingDate: defaultDate.toISOString().split('T')[0], status: 'OPEN' });
    }
    setIsCatalogModalOpen(true);
  };

  const handleSaveCatalog = () => {
    if (!catalogFormData.name || !catalogFormData.closingDate) return;
    if (catalogFormData.id) {
        updateCatalog(catalogFormData as Catalog);
    } else {
        // Do NOT send 'id'. Let DB generate it.
        addCatalog({ 
            name: catalogFormData.name, 
            closingDate: catalogFormData.closingDate, 
            status: 'OPEN', 
            createdAt: new Date().toISOString() 
        });
    }
    setIsCatalogModalOpen(false);
  };

  const handleToggleCatalogStatus = (e: React.MouseEvent, catalog: Catalog) => {
    e.stopPropagation();
    const isClosing = catalog.status === 'OPEN';
    
    if (isClosing) {
        if (!window.confirm(`Are you sure you want to CLOSE "${catalog.name}"? \n\nThis will lock all associated orders and prevent price changes.`)) return;
    } else {
        if (!window.confirm(`Re-open catalog "${catalog.name}"?`)) return;
    }

    updateCatalog({ ...catalog, status: isClosing ? 'CLOSED' : 'OPEN' });

    if (isClosing) {
        orders.filter(o => o.items.some(i => products.find(prod => prod.id === i.productId)?.catalogId === catalog.id))
              .forEach(order => !order.isLocked && updateOrder({...order, isLocked: true}));
    }
  };

  const openProductModal = (product?: Product) => {
      setProductFormData(product ? { ...product } : { name: '', category: '', imageUrl: '', fobPrice: 0, freightCharge: 0, description: '', attributes: [] });
      setNewAttrKey(''); setNewAttrValue(''); setSingleOptionInput('');
      setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => window.confirm("Delete product?") && deleteProduct(id);

  const handleSaveProduct = () => {
    if (!productFormData.name || !productFormData.fobPrice || !activeCatalogId) return;
    const finalImage = productFormData.imageUrl || `https://picsum.photos/200/200?random=${Date.now()}`;
    if (productFormData.id) {
        const updatedProduct = { ...productFormData, imageUrl: finalImage } as Product;
        updateProduct(updatedProduct);
        orders.forEach(order => {
            if (order.isLocked || order.status === 'DELIVERED') return;
            const hasItem = order.items.some(i => i.productId === updatedProduct.id);
            if (hasItem) {
                const updatedItems = order.items.map(item => item.productId === updatedProduct.id ? { ...item, fobTotal: updatedProduct.fobPrice * item.quantity } : item);
                const newTotal = updatedItems.reduce((sum, i) => sum + i.fobTotal, 0);
                let newStatus = order.fobPaymentStatus;
                if (order.totalFobPaid > 0 && order.totalFobPaid < newTotal) newStatus = 'PARTIAL';
                else if (order.totalFobPaid >= newTotal && newTotal > 0) newStatus = 'PAID';
                else if (order.totalFobPaid === 0) newStatus = 'UNPAID';
                updateOrder({ ...order, items: updatedItems, fobPaymentStatus: newStatus });
            }
        });
    } else {
        // Do NOT send manual ID for products either if we can avoid it, but for now products might be less strict. 
        // Best practice: remove id.
        addProduct({ 
            ...productFormData as Product, 
            catalogId: activeCatalogId, 
            imageUrl: finalImage, 
            stockCounts: {} 
        });
    }
    setIsProductModalOpen(false);
  };

  const handleImportProduct = (historicalProduct: Product) => {
      if (!activeCatalogId) return;
      
      // Explicitly remove system fields that might cause "Duplicate ID" errors on the backend
      const { id, ...rest } = historicalProduct;
      // @ts-ignore - _id might exist in the runtime object even if not in type
      const { _id, createdAt, updatedAt, __v, ...cleanProduct } = rest as any;

      addProduct({ 
          ...cleanProduct, 
          catalogId: activeCatalogId, 
          stockCounts: {}, 
          stockSold: {},
          stockStatus: 'PENDING'
      } as Product);
      setIsImportModalOpen(false);
  };

  // Preview options logic
  const previewOptions = parseOptions(newAttrValue);

  if (!activeCatalogId) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div><h2 className="text-3xl font-bold text-gray-800">Product Catalog</h2><p className="text-gray-500">Manage monthly imports.</p></div>
                {currentUser?.role === 'ADMIN' && (
                    <button onClick={() => openCatalogModal()} className="flex items-center px-6 py-3 theme-bg rounded-lg shadow-lg transition-all font-medium">
                        <Plus size={18} className="mr-2" /> Add Monthly Catalog
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogs.map(catalog => {
                    const prodCount = products.filter(p => p.catalogId === catalog.id).length;
                    const catOrders = orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.catalogId === catalog.id));
                    const itemsSold = catOrders.reduce((acc, o) => acc + o.items.filter(i => products.find(p => p.id === i.productId)?.catalogId === catalog.id).reduce((s,i) => s + i.quantity, 0), 0);
                    
                    return (
                    <div key={catalog.id} onClick={() => setActiveCatalogId(catalog.id)} className="bg-white p-6 rounded-xl border border-gray-100 cursor-pointer group hover-glow relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 theme-bg-light rounded-lg"><FolderOpen size={24} className="theme-text"/></div>
                            {currentUser?.role === 'ADMIN' ? (
                                <button 
                                    onClick={(e) => handleToggleCatalogStatus(e, catalog)}
                                    className={`px-3 py-1 text-xs font-bold rounded flex items-center transition-colors border ${
                                        catalog.status === 'CLOSED' 
                                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                    }`}
                                    title={catalog.status === 'CLOSED' ? "Click to Re-open" : "Click to Close Catalog"}
                                >
                                    {catalog.status === 'CLOSED' ? <><Lock size={12} className="mr-1"/> CLOSED</> : <><Unlock size={12} className="mr-1"/> OPEN</>}
                                </button>
                            ) : (
                                catalog.status === 'CLOSED' 
                                ? <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">CLOSED</span> 
                                : <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">OPEN</span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mb-6"><Calendar size={14} className="mr-2" /><span>Deadline: {new Date(catalog.closingDate).toLocaleDateString()}</span></div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                            <div><p className="text-xs text-gray-400">Products</p><p className="font-bold text-gray-800">{prodCount}</p></div>
                            <div><p className="text-xs text-gray-400">Total Sold Units</p><p className="font-bold text-gray-800">{itemsSold}</p></div>
                        </div>
                    </div>
                )})}
            </div>
            {isCatalogModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">{catalogFormData.id ? 'Edit Catalog' : 'New Monthly Catalog'}</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Catalog Name</label><input className="w-full p-2 border border-gray-300 rounded theme-ring focus:ring-2 outline-none text-gray-900" value={catalogFormData.name} onChange={e => setCatalogFormData({...catalogFormData, name: e.target.value})}/></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label><input type="date" className="w-full p-2 border border-gray-300 rounded theme-ring focus:ring-2 outline-none text-gray-900" value={catalogFormData.closingDate ? new Date(catalogFormData.closingDate).toISOString().split('T')[0] : ''} onChange={e => setCatalogFormData({...catalogFormData, closingDate: e.target.value})}/></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsCatalogModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleSaveCatalog} className="px-4 py-2 theme-bg rounded shadow text-white">Save Catalog</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  const currentCatalogProducts = products.filter(p => p.catalogId === activeCatalogId);
  const currentProductNames = new Set(currentCatalogProducts.map(p => p.name.toLowerCase().trim()));
  const isCatalogClosed = activeCatalog?.status === 'CLOSED';
  const filteredProducts = currentCatalogProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()));
  const historyProducts = Array.from(new Map(products.filter(p => p.catalogId !== activeCatalogId).map(p => [p.name, p])).values()).filter(p => !currentProductNames.has(p.name.toLowerCase().trim())).filter(p => p.name.toLowerCase().includes(importSearchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
          <button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={20} className="text-gray-600"/></button>
          <div>
            <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name}</h2>
                {activeCatalog?.status === 'OPEN' && <button onClick={() => openCatalogModal(activeCatalog)} className="text-gray-400 hover:text-gray-600"><Edit size={16} /></button>}
                {activeCatalog?.status === 'CLOSED' && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded flex items-center"><Lock size={10} className="mr-1"/> CLOSED</span>}
            </div>
            <p className="text-sm text-gray-500">Closing Date: <span className="font-bold">{new Date(activeCatalog?.closingDate || '').toLocaleDateString()}</span></p>
          </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center w-64 shadow-sm">
            <Search className="text-gray-400 mr-2" size={18} />
            <input type="text" placeholder="Search products..." className="flex-1 outline-none text-sm bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {currentUser?.role === 'ADMIN' && !isCatalogClosed && (
          <div className="flex gap-2">
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center px-4 py-2 bg-white theme-text border theme-border-light rounded-lg hover:bg-gray-50 shadow-sm transition-all"><History size={18} className="mr-2" /> Import</button>
              <button onClick={() => openProductModal()} className="flex items-center px-4 py-2 theme-bg text-white rounded-lg shadow-md transition-all"><Plus size={18} className="mr-2" /> Add Product</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group relative hover-glow">
            {currentUser?.role === 'ADMIN' && !isCatalogClosed && (
                <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openProductModal(product)} className="p-2 bg-white/90 rounded-full shadow theme-text"><Edit size={14}/></button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="p-2 bg-white/90 rounded-full shadow hover:text-red-600"><Trash2 size={14}/></button>
                </div>
            )}
            <div className="h-32 overflow-hidden relative">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                 <p className="text-xs text-white font-bold truncate">{product.category}</p>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-bold text-gray-900 mb-1 leading-tight h-10 line-clamp-2">{product.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-2 h-8">{product.description}</p>
              <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-400">FOB</p>
                  <p className="text-sm font-bold theme-text">Ksh {product.fobPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between"><h3 className="text-xl font-bold text-gray-800">{productFormData.id ? 'Edit Product' : 'Add New Product'}</h3><button onClick={() => setIsProductModalOpen(false)} className="text-gray-400">✕</button></div>
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">NAME</label><input className="w-full p-2 border rounded theme-ring focus:ring-2 outline-none" value={productFormData.name} onChange={e => setProductFormData({...productFormData, name: e.target.value})}/></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">CATEGORY</label><input className="w-full p-2 border rounded theme-ring focus:ring-2 outline-none" value={productFormData.category} onChange={e => setProductFormData({...productFormData, category: e.target.value})}/></div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center"><Settings size={12} className="mr-1"/> DYNAMIC VARIABLES</label>
                    <div className="space-y-2 mb-3">
                        {productFormData.attributes?.map((attr, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-gray-100 shadow-sm group">
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{attr.key}</span>
                                <span className="text-xs text-gray-600 flex-1 truncate">{attr.value}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => editAttribute(idx)} className="theme-text p-1"><Edit2 size={12}/></button><button onClick={() => removeAttribute(idx)} className="text-red-400 p-1"><Trash2 size={12}/></button></div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex gap-2 mb-2">
                            <input placeholder="Name (e.g. Size)" className="w-1/3 p-2 text-xs border rounded outline-none" value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)}/>
                            <input placeholder="Values (e.g. 34-46 OR Red, Blue)" className="flex-1 p-2 text-xs border rounded outline-none" value={newAttrValue} onChange={(e) => setNewAttrValue(e.target.value)}/>
                        </div>
                        
                        {/* Preview for Ranges */}
                        {newAttrValue && (
                            <div className="mb-2 p-2 bg-blue-50 text-[10px] text-blue-700 rounded border border-blue-100">
                                <span className="font-bold">Preview: </span>
                                {previewOptions.slice(0, 10).join(', ')}
                                {previewOptions.length > 10 && ` ... (+${previewOptions.length - 10} more)`}
                            </div>
                        )}

                        <div className="flex gap-2 items-center"><ListPlus size={14} className="text-gray-400"/><input placeholder="Add single option..." className="flex-1 p-1.5 text-xs border rounded outline-none" value={singleOptionInput} onChange={(e) => setSingleOptionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && appendSingleOption()}/><button type="button" onClick={appendSingleOption} disabled={!singleOptionInput} className="text-xs theme-text font-bold">Add</button></div>
                        <button type="button" onClick={addAttribute} className="w-full mt-3 p-2 bg-slate-800 text-white rounded hover:bg-black text-xs font-bold flex justify-center items-center" disabled={!newAttrKey || !newAttrValue}><Plus size={12} className="mr-1"/> Save Variable</button>
                    </div>
                </div>
                <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1">IMAGE</label>
                     <div className="relative border border-gray-300 rounded-lg bg-gray-50 p-2 flex items-center hover:bg-gray-100"><Upload size={16} className="text-gray-500 mr-2" /><span className="text-sm text-gray-500">Choose from device...</span><input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload}/></div>
                     {productFormData.imageUrl && <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border"><img src={productFormData.imageUrl} className="w-full h-full object-cover" /></div>}
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1"><label className="block text-xs font-bold text-gray-500">DESCRIPTION</label><button onClick={handleGenerateDescription} disabled={isGenerating || !productFormData.name} className="text-xs flex items-center text-purple-600 font-bold">{isGenerating ? 'Thinking...' : <><Sparkles size={12} className="mr-1" /> AI Write</>}</button></div>
                    <textarea className="w-full p-2 border rounded theme-ring focus:ring-2 outline-none h-20 text-sm" value={productFormData.description} onChange={e => setProductFormData({...productFormData, description: e.target.value})}/>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">FOB PRICE</label><input type="number" className="w-full p-2 border rounded theme-ring focus:ring-2 outline-none text-sm" value={productFormData.fobPrice} onChange={e => setProductFormData({...productFormData, fobPrice: parseFloat(e.target.value)})}/></div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium text-sm">Cancel</button>
                <button onClick={handleSaveProduct} className="px-4 py-2 theme-bg rounded-lg shadow-sm font-medium text-sm">Save Product</button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center"><div><h3 className="text-xl font-bold">Import History</h3></div><button onClick={() => setIsImportModalOpen(false)} className="text-gray-400">✕</button></div>
                <div className="p-4 bg-gray-50 border-b"><div className="flex bg-white border rounded-lg items-center px-3 py-2"><Search className="text-gray-400 mr-2" size={18}/><input className="flex-1 outline-none text-sm" placeholder="Search..." value={importSearchTerm} onChange={(e) => setImportSearchTerm(e.target.value)}/></div></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {historyProducts.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-blue-50"><div className="flex items-center gap-4"><img src={p.imageUrl} className="w-12 h-12 rounded object-cover"/><div><p className="font-bold text-sm">{p.name}</p><p className="text-xs text-gray-500">{p.category} • Ksh {p.fobPrice}</p></div></div><button onClick={() => handleImportProduct(p)} className="px-3 py-1 bg-white theme-text border theme-border rounded text-xs font-bold hover:theme-bg hover:text-white transition-all">Add</button></div>
                    ))}
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Products;
