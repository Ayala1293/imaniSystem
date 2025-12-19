
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Product, Catalog } from '../types';
import { 
  Plus, Search, Trash2, Edit, Upload, FolderOpen, 
  Calendar, ArrowLeft, X, Sparkles, 
  Save, RefreshCw 
} from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';

const Products = () => {
  const { 
    products, addProduct, currentUser, updateProduct, 
    catalogs, addCatalog 
  } = useAppStore();

  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', category: '', imageUrl: '', fobPrice: 0, freightCharge: 0, 
    description: '', attributes: [], stockCounts: {}
  });

  const [catalogForm, setCatalogForm] = useState<Partial<Catalog>>({
    name: '', closingDate: '', status: 'OPEN'
  });

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const variants = useMemo(() => {
    const attrs = productForm.attributes || [];
    if (attrs.length === 0) return ["Standard"];
    
    const valid = attrs.filter(a => a.key && a.value);
    if (valid.length === 0) return ["Standard"];

    const options = valid.map(a => a.value.split(',').map(s => s.trim()).filter(Boolean));
    
    const combinations = options.reduce((acc, current) => {
      const results: string[] = [];
      acc.forEach(a => {
        current.forEach(c => {
          results.push(a === "" ? c : `${a}, ${c}`);
        });
      });
      return results;
    }, [""]);

    return combinations.map(combo => {
      const parts = combo.split(', ').filter(Boolean);
      return parts.map((p, i) => `${valid[i].key}:${p}`).join(', ');
    });
  }, [productForm.attributes]);

  const handleSaveProduct = () => {
    if (!productForm.name || !activeCatalogId) return;
    const finalStock = { ...(productForm.stockCounts || {}) };
    variants.forEach(v => { if (!(v in finalStock)) finalStock[v] = 0; });

    if (productForm.id) {
      updateProduct({ ...productForm } as Product);
    } else {
      addProduct({ 
        ...productForm as Product, 
        catalogId: activeCatalogId, 
        stockCounts: finalStock,
        stockSold: {},
        stockStatus: 'PENDING'
      });
    }
    setIsProductModalOpen(false);
  };

  const handleAiGenerate = async () => {
    if (!productForm.name) return;
    setIsGeneratingAi(true);
    const attrs = (productForm.attributes || []).map(a => `${a.key}:${a.value}`).join(', ');
    const desc = await generateProductDescription(productForm.name, attrs);
    setProductForm(prev => ({ ...prev, description: desc }));
    setIsGeneratingAi(false);
  };

  if (!activeCatalogId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div><h2 className="text-3xl font-black text-gray-900">Import Catalogs</h2><p className="text-gray-500 font-medium">Group products by monthly shipment.</p></div>
          {currentUser?.role === 'ADMIN' && (
            <button onClick={() => { setCatalogForm({ name: '', closingDate: '', status: 'OPEN' }); setIsCatalogModalOpen(true); }} className="px-6 py-3 theme-bg rounded-xl shadow-lg font-bold flex items-center"><Plus className="mr-2" size={20}/> New Month</button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {catalogs.map(c => (
            <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FolderOpen size={24}/></div>
                <span className={`px-2 py-1 text-[10px] font-black rounded ${c.status === 'CLOSED' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{c.status}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{c.name}</h3>
              <p className="text-xs text-gray-400 font-bold flex items-center"><Calendar size={12} className="mr-1"/> {new Date(c.closingDate).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
        {isCatalogModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6">Create Catalog</h3>
              <div className="space-y-4">
                <input placeholder="Name (e.g. June Shipments)" className="w-full p-3 border rounded-xl" value={catalogForm.name || ''} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} />
                <input type="date" className="w-full p-3 border rounded-xl" value={catalogForm.closingDate || ''} onChange={e => setCatalogForm({...catalogForm, closingDate: e.target.value})} />
                <button onClick={() => { addCatalog(catalogForm as any); setIsCatalogModalOpen(false); }} className="w-full theme-bg py-4 rounded-xl font-bold mt-4 shadow-lg">Save Catalog</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filtered = products.filter(p => p.catalogId === activeCatalogId && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveCatalogId(null)} className="p-3 bg-white border rounded-xl hover:bg-gray-50"><ArrowLeft size={20}/></button>
        <div><h2 className="text-3xl font-black text-gray-900">{activeCatalog?.name}</h2><p className="text-sm text-gray-400 font-medium">Managing items for this import month.</p></div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative"><Search className="absolute left-4 top-3.5 text-gray-400" size={20}/><input placeholder="Search products..." className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <button onClick={() => { setProductForm({ name: '', attributes: [], fobPrice: 0, stockCounts: {} }); setIsProductModalOpen(true); }} className="px-6 py-3 theme-bg rounded-xl font-bold shadow-lg flex items-center"><Plus className="mr-2"/> Add Product</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={() => { setProductForm(p); setIsProductModalOpen(true); }}>
            <div className="h-40 overflow-hidden bg-gray-100">
              <img src={p.imageUrl || 'https://picsum.photos/400/300'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div className="p-4">
              <h4 className="font-bold text-gray-800 line-clamp-2 h-10 mb-2">{p.name}</h4>
              <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-400">FOB</span><span className="text-lg font-black theme-text">Ksh {p.fobPrice.toLocaleString()}</span></div>
            </div>
          </div>
        ))}
      </div>

      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black">{productForm.id ? 'Edit' : 'Add'} Product</h3><p className="text-xs text-gray-400 font-bold uppercase">Configure details and stock</p></div><button onClick={() => setIsProductModalOpen(false)}><X/></button></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                  {productForm.imageUrl ? <img src={productForm.imageUrl} className="w-full h-full object-contain" /> : <Upload className="text-gray-300" size={40}/>}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                    const reader = new FileReader();
                    reader.onload = (evt) => setProductForm({...productForm, imageUrl: evt.target?.result as string});
                    reader.readAsDataURL(e.target.files![0]);
                  }} />
                </div>
                <input placeholder="Product Name" className="w-full p-3 border rounded-xl font-bold" value={productForm.name || ''} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="FOB" type="number" className="w-full p-3 border rounded-xl font-bold" value={productForm.fobPrice || 0} onChange={e => setProductForm({...productForm, fobPrice: parseFloat(e.target.value)||0})} />
                  <input placeholder="Freight" type="number" className="w-full p-3 border rounded-xl font-bold" value={productForm.freightCharge || 0} onChange={e => setProductForm({...productForm, freightCharge: parseFloat(e.target.value)||0})} />
                </div>
              </div>

              <div className="lg:border-x lg:px-8 space-y-4">
                <div className="flex justify-between items-center mb-2"><h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Variation Attributes</h4><button onClick={() => setProductForm({...productForm, attributes: [...(productForm.attributes||[]), {key: '', value: ''}]})} className="p-1 theme-bg rounded-lg"><Plus size={16}/></button></div>
                {(productForm.attributes || []).map((attr, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-xl space-y-2 relative">
                    <button onClick={() => setProductForm({...productForm, attributes: productForm.attributes?.filter((_, i) => i !== idx)})} className="absolute -top-1 -right-1 bg-white shadow rounded-full p-1 text-red-500"><X size={10}/></button>
                    <input placeholder="Attribute (e.g. Size)" className="w-full p-2 border rounded-lg text-xs font-black uppercase" value={attr.key} onChange={e => {
                      const copy = [...(productForm.attributes || [])];
                      copy[idx].key = e.target.value;
                      setProductForm({...productForm, attributes: copy});
                    }} />
                    <input placeholder="Values (Red,Blue...)" className="w-full p-2 border rounded-lg text-xs" value={attr.value} onChange={e => {
                      const copy = [...(productForm.attributes || [])];
                      copy[idx].value = e.target.value;
                      setProductForm({...productForm, attributes: copy});
                    }} />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Initial Stock Counts</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {variants.map(v => (
                    <div key={v} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-[10px] font-bold text-gray-500 truncate w-2/3">{v}</span>
                      <input type="number" className="w-16 p-1 border rounded text-xs font-black text-center" value={productForm.stockCounts?.[v] || 0} onChange={e => setProductForm({...productForm, stockCounts: {...(productForm.stockCounts||{}), [v]: parseInt(e.target.value)||0}})} />
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-gray-400">AI Assistance</span><button onClick={handleAiGenerate} disabled={isGeneratingAi} className="text-[10px] font-bold theme-text flex items-center">{isGeneratingAi ? <RefreshCw className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>} Generate Description</button></div>
                  <textarea placeholder="Product description..." className="w-full p-3 border rounded-xl text-xs h-24" value={productForm.description || ''} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t flex gap-4"><button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl">Cancel</button><button onClick={handleSaveProduct} className="flex-[2] py-4 theme-bg rounded-2xl font-black shadow-xl flex justify-center items-center"><Save className="mr-2"/> Save Changes</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
