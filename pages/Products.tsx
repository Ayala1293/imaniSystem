
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Product, Catalog } from '../types';
import { Plus, Search, Sparkles, Trash2, Edit, Upload, FolderOpen, Calendar, ArrowLeft, History, Archive, Settings } from 'lucide-react';
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
  
  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form States
  const [productFormData, setProductFormData] = useState<Partial<Product>>({
    name: '',
    category: '',
    imageUrl: '',
    fobPrice: 0,
    freightCharge: 0,
    description: '',
    attributes: []
  });
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const [catalogFormData, setCatalogFormData] = useState<Partial<Catalog>>({
    name: '',
    closingDate: '',
    status: 'OPEN'
  });

  // --- Helpers ---
  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  // --- AI & Image Handlers ---

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
      reader.onloadend = () => {
        setProductFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Attribute Logic ---
  const addAttribute = () => {
      if(newAttrKey) {
          setProductFormData(prev => ({
              ...prev,
              attributes: [...(prev.attributes || []), { key: newAttrKey, value: newAttrValue }]
          }));
          setNewAttrKey('');
          setNewAttrValue('');
      }
  };

  const removeAttribute = (index: number) => {
      setProductFormData(prev => ({
          ...prev,
          attributes: prev.attributes?.filter((_, i) => i !== index)
      }));
  };

  // --- Catalog Logic ---

  const openCatalogModal = (catalog?: Catalog) => {
    if (catalog) {
        setCatalogFormData(catalog);
    } else {
        // Default closing date 30 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        
        setCatalogFormData({ 
            name: '', 
            closingDate: defaultDate.toISOString().split('T')[0],
            status: 'OPEN'
        });
    }
    setIsCatalogModalOpen(true);
  };

  const handleSaveCatalog = () => {
    if (!catalogFormData.name || !catalogFormData.closingDate) return;

    if (catalogFormData.id) {
        // Update
        updateCatalog(catalogFormData as Catalog);
    } else {
        // Add
        const newCatalog: Catalog = {
            id: `cat-${Date.now()}`,
            name: catalogFormData.name,
            closingDate: catalogFormData.closingDate,
            status: 'OPEN',
            createdAt: new Date().toISOString()
        };
        addCatalog(newCatalog);
    }
    setIsCatalogModalOpen(false);
  };

  // --- Product Logic ---

  const openProductModal = (product?: Product) => {
      if (product) {
          setProductFormData({ ...product });
      } else {
          setProductFormData({ 
              name: '', category: '', imageUrl: '', fobPrice: 0, freightCharge: 0, description: '', attributes: [] 
          });
      }
      setNewAttrKey('');
      setNewAttrValue('');
      setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
      if(window.confirm("Are you sure you want to delete this product?")) {
          deleteProduct(id);
      }
  }

  const handleSaveProduct = () => {
    if (!productFormData.name || !productFormData.fobPrice || !activeCatalogId) return;
    
    const finalImage = productFormData.imageUrl || `https://picsum.photos/200/200?random=${Date.now()}`;

    if (productFormData.id) {
        // Edit mode
        const updatedProduct = { ...productFormData, imageUrl: finalImage } as Product;
        updateProduct(updatedProduct);

        // PROPAGATE PRICE CHANGES (Existing logic)
        orders.forEach(order => {
            if (order.isLocked || order.status === 'DELIVERED') return;
            const hasItem = order.items.some(i => i.productId === updatedProduct.id);
            if (hasItem) {
                const updatedItems = order.items.map(item => {
                    if (item.productId === updatedProduct.id) {
                        return { ...item, fobTotal: updatedProduct.fobPrice * item.quantity };
                    }
                    return item;
                });
                
                const newTotalCost = updatedItems.reduce((sum, i) => sum + i.fobTotal, 0);
                let newStatus = order.fobPaymentStatus;
                if (order.totalFobPaid > 0 && order.totalFobPaid < newTotalCost) newStatus = 'PARTIAL';
                else if (order.totalFobPaid >= newTotalCost && newTotalCost > 0) newStatus = 'PAID';
                else if (order.totalFobPaid === 0) newStatus = 'UNPAID';

                updateOrder({ ...order, items: updatedItems, fobPaymentStatus: newStatus });
            }
        });
    } else {
        // Add mode
        const newProduct: Product = {
            ...productFormData as Product,
            id: Date.now().toString(),
            catalogId: activeCatalogId,
            imageUrl: finalImage
        };
        addProduct(newProduct);
    }
    setIsProductModalOpen(false);
  };

  const handleImportProduct = (historicalProduct: Product) => {
      if (!activeCatalogId) return;
      
      const newProduct: Product = {
          ...historicalProduct,
          id: `imp-${Date.now()}`,
          catalogId: activeCatalogId
      };
      
      addProduct(newProduct);
      setIsImportModalOpen(false);
      alert(`${newProduct.name} added to ${activeCatalog?.name}`);
  };

  // --- Filtering ---
  
  // View 1: List Catalogs
  if (!activeCatalogId) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Monthly Catalogs</h2>
                    <p className="text-gray-500">Manage monthly imports and payment deadlines.</p>
                </div>
                {currentUser?.role === 'ADMIN' && (
                    <button 
                        onClick={() => openCatalogModal()}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all font-medium"
                    >
                        <Plus size={18} className="mr-2" />
                        Add Monthly Catalog
                    </button>
                )}
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
                            {catalog.status === 'CLOSED' && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">CLOSED</span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                            <Calendar size={14} className="mr-2" />
                            <span>Deadline: {new Date(catalog.closingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                            {products.filter(p => p.catalogId === catalog.id).length} Products
                        </div>
                    </div>
                ))}
            </div>

            {/* Catalog Modal */}
            {isCatalogModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">{catalogFormData.id ? 'Edit Catalog' : 'New Monthly Catalog'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Name</label>
                                <input 
                                    className="w-full p-2 border border-gray-300 rounded text-gray-800" 
                                    placeholder="e.g. September Imports"
                                    value={catalogFormData.name}
                                    onChange={e => setCatalogFormData({...catalogFormData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date (Invoice Deadline)</label>
                                <input 
                                    type="date"
                                    className="w-full p-2 border border-gray-300 rounded text-gray-800" 
                                    value={catalogFormData.closingDate ? new Date(catalogFormData.closingDate).toISOString().split('T')[0] : ''}
                                    onChange={e => setCatalogFormData({...catalogFormData, closingDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setIsCatalogModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleSaveCatalog} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  // View 2: Inside a Catalog
  const currentCatalogProducts = products.filter(p => p.catalogId === activeCatalogId);
  const currentProductNames = new Set(currentCatalogProducts.map(p => p.name.toLowerCase().trim()));

  const filteredProducts = currentCatalogProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get unique products from OTHER catalogs for the import feature
  const historyProducts = Array.from(new Map(
      products
        .filter(p => p.catalogId !== activeCatalogId) // Exclude current catalog
        .map(p => [p.name, p]) // Deduplicate by name to get unique list of past items
    ).values())
    .filter(p => !currentProductNames.has(p.name.toLowerCase().trim())) // Filter out items already in current catalog
    .filter(p => p.name.toLowerCase().includes(importSearchTerm.toLowerCase()));

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
            <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name}</h2>
                <button 
                    onClick={() => openCatalogModal(activeCatalog)}
                    className="text-gray-400 hover:text-blue-600"
                >
                    <Edit size={16} />
                </button>
            </div>
            <p className="text-sm text-gray-500">
                Closing Date: <span className="font-bold">{new Date(activeCatalog?.closingDate || '').toLocaleDateString()}</span> (Used in Invoices)
            </p>
          </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center w-64 shadow-sm">
            <Search className="text-gray-400 mr-2" size={18} />
            <input 
            type="text" 
            placeholder="Search products..." 
            className="flex-1 outline-none text-sm text-black bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        {currentUser?.role === 'ADMIN' && (
          <div className="flex gap-2">
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 shadow-sm transition-all"
              >
                <History size={18} className="mr-2" />
                Import from History
              </button>
              <button 
                onClick={() => openProductModal()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all"
              >
                <Plus size={18} className="mr-2" />
                Add Product
              </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group relative">
            
            {currentUser?.role === 'ADMIN' && (
                <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openProductModal(product)} className="p-2 bg-white/90 rounded-full shadow hover:text-blue-600"><Edit size={14}/></button>
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
                  <p className="text-sm font-bold text-blue-600">Ksh {product.fobPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between">
                <h3 className="text-xl font-bold text-gray-800">{productFormData.id ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Name</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800" 
                            value={productFormData.name}
                            onChange={e => setProductFormData({...productFormData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Category</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800" 
                            value={productFormData.category}
                            onChange={e => setProductFormData({...productFormData, category: e.target.value})}
                        />
                    </div>
                </div>

                {/* Dynamic Attributes Section */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase flex items-center">
                        <Settings size={12} className="mr-1"/> Dynamic Variables
                    </label>
                    <div className="space-y-2 mb-2">
                        {productFormData.attributes?.map((attr, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{attr.key}</span>
                                <span className="text-xs text-gray-600 flex-1">{attr.value}</span>
                                <button onClick={() => removeAttribute(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            placeholder="Variable (e.g. Size)" 
                            className="w-1/3 p-2 text-xs border border-gray-300 rounded outline-none text-gray-800 bg-white"
                            value={newAttrKey}
                            onChange={(e) => setNewAttrKey(e.target.value)}
                        />
                        <input 
                            placeholder="Default Value (e.g. S, M, L)" 
                            className="flex-1 p-2 text-xs border border-gray-300 rounded outline-none text-gray-800 bg-white"
                            value={newAttrValue}
                            onChange={(e) => setNewAttrValue(e.target.value)}
                        />
                        <button 
                            type="button"
                            onClick={addAttribute}
                            className="p-2 bg-slate-800 text-white rounded hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!newAttrKey}
                        >
                            <Plus size={14}/>
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Add variables like Size, Volume, or Color options.</p>
                </div>

                {/* Image Picker */}
                <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Product Image</label>
                     <div className="flex gap-2">
                        <div className="flex-1 relative">
                             <div className="relative border border-gray-300 rounded-lg bg-gray-50 p-2 flex items-center hover:bg-gray-100 transition-colors">
                                <Upload size={16} className="text-gray-500 mr-2" />
                                <span className="text-sm text-gray-500">Choose from device...</span>
                                <input 
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    onChange={handleImageUpload}
                                />
                             </div>
                        </div>
                     </div>
                     {productFormData.imageUrl && (
                         <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                             <img src={productFormData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                         </div>
                     )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Description</label>
                        <button 
                            onClick={handleGenerateDescription}
                            disabled={isGenerating || !productFormData.name}
                            className="text-xs flex items-center text-purple-600 font-semibold hover:text-purple-800 disabled:opacity-50"
                        >
                            {isGenerating ? 'Thinking...' : <><Sparkles size={12} className="mr-1" /> AI Write</>}
                        </button>
                    </div>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none h-20 text-sm text-gray-800"
                        value={productFormData.description}
                        onChange={e => setProductFormData({...productFormData, description: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">FOB Price (Ksh)</label>
                    <input 
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800" 
                        value={productFormData.fobPrice}
                        onChange={e => setProductFormData({...productFormData, fobPrice: parseFloat(e.target.value)})}
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button 
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium text-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveProduct}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm"
                >
                    Save Product
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Import History Modal */}
      {isImportModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Import from History</h3>
                        <p className="text-sm text-gray-500">Reuse products from previous catalogs.</p>
                    </div>
                    <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex bg-white border border-gray-200 rounded-lg items-center px-3 py-2">
                        <Search className="text-gray-400 mr-2" size={18}/>
                        <input 
                            className="flex-1 outline-none text-sm text-black bg-white"
                            placeholder="Search past products..."
                            value={importSearchTerm}
                            onChange={(e) => setImportSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {historyProducts.length === 0 ? (
                        <p className="text-center text-gray-400 mt-10">No matching historical products found (or all matches already exist in current catalog).</p>
                    ) : (
                        historyProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-blue-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <img src={p.imageUrl} className="w-12 h-12 rounded object-cover bg-gray-100" alt={p.name}/>
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{p.name}</p>
                                        <p className="text-xs text-gray-500">{p.category} • Last FOB: Ksh {p.fobPrice}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleImportProduct(p)}
                                    className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                                >
                                    Add to Catalog
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
         </div>
      )}

      {/* Edit Catalog Modal reused */}
      {isCatalogModalOpen && activeCatalogId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Edit Catalog Details</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Name</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded text-gray-800" 
                            value={catalogFormData.name}
                            onChange={e => setCatalogFormData({...catalogFormData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date (Invoice Deadline)</label>
                        <input 
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded text-gray-800" 
                            value={catalogFormData.closingDate ? new Date(catalogFormData.closingDate).toISOString().split('T')[0] : ''}
                            onChange={e => setCatalogFormData({...catalogFormData, closingDate: e.target.value})}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => setIsCatalogModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={handleSaveCatalog} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Products;
