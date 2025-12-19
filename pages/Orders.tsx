
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
  Plus, Search, Trash2, CheckCircle, Package, 
  Printer, X, CreditCard, MessageSquare, 
  RefreshCw, ShoppingBag, ArrowLeft, ChevronDown 
} from 'lucide-react';
import { Order, OrderItem, Client, Product } from '../types';
import { generateInvoiceMessage } from '../services/geminiService';

const Orders = () => {
  const { 
    orders, clients, products, addOrder, updateOrder, 
    catalogs, addPayment, shopSettings 
  } = useAppStore();

  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'UNPAID' | 'CLEARED' | 'DELIVERY'>('UNPAID');

  // Order Search
  const [orderQuery, setOrderQuery] = useState('');

  // Cart Local State
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);
  const catalogProds = useMemo(() => products.filter(p => p.catalogId === activeCatalogId), [products, activeCatalogId]);

  const handleAddToCart = () => {
    const product = products.find(p => p.id === selectedProdId);
    if (!product) return;

    const attributes = Object.entries(selectedAttrs).map(([k, v]) => ({ key: k, value: v }));
    const item: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      quantity: selectedQty,
      fobTotal: product.fobPrice * selectedQty,
      freightTotal: 0,
      selectedAttributes: attributes
    };

    setCartItems([...cartItems, item]);
    setSelectedProdId('');
    setSelectedQty(1);
    setSelectedAttrs({});
  };

  const handleCreateOrder = () => {
    if (!selectedClient || cartItems.length === 0) return;
    addOrder({
      clientId: selectedClient.id,
      items: cartItems,
      orderDate: new Date().toISOString(),
      status: 'SHIPPED',
      fobPaymentStatus: 'UNPAID',
      freightPaymentStatus: 'UNPAID',
      totalFobPaid: 0,
      totalFreightPaid: 0,
      isLocked: false
    } as Order);
    setIsDrawerOpen(false);
    setCartItems([]);
    setSelectedClient(null);
  };

  if (!activeCatalogId) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-black text-gray-900">Monthly Orders</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {catalogs.map(c => (
            <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-xl transition-all cursor-pointer group">
              <div className="p-3 theme-bg-light theme-text rounded-xl w-fit mb-4"><ShoppingBag size={24}/></div>
              <h3 className="text-xl font-bold">{c.name}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase mt-2">Open for pre-orders</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter(o => {
    const isThisCatalog = o.items.some(i => products.find(p => p.id === i.productId)?.catalogId === activeCatalogId);
    if (!isThisCatalog) return false;
    
    const clientName = clients.find(c => c.id === o.clientId)?.name.toLowerCase() || '';
    if (!clientName.includes(orderQuery.toLowerCase())) return false;

    if (activeTab === 'UNPAID') return o.fobPaymentStatus !== 'PAID';
    if (activeTab === 'CLEARED') return o.fobPaymentStatus === 'PAID';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setActiveCatalogId(null)} className="p-3 bg-white border rounded-xl hover:bg-gray-50"><ArrowLeft size={20}/></button>
        <div><h2 className="text-3xl font-black text-gray-900">{activeCatalog?.name}</h2><p className="text-sm text-gray-400 font-medium">Monitoring sales performance.</p></div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative"><Search className="absolute left-4 top-3.5 text-gray-400" size={20}/><input placeholder="Search client name..." className="w-full pl-12 p-3 border rounded-xl shadow-sm" value={orderQuery} onChange={e => setOrderQuery(e.target.value)} /></div>
        <button onClick={() => setIsDrawerOpen(true)} className="px-6 py-3 theme-bg rounded-xl font-bold shadow-lg flex items-center"><Plus className="mr-2"/> New Order</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b">
          <button onClick={() => setActiveTab('UNPAID')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest ${activeTab === 'UNPAID' ? 'theme-text border-b-2 theme-border' : 'text-gray-400'}`}>Pending Payment</button>
          <button onClick={() => setActiveTab('CLEARED')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest ${activeTab === 'CLEARED' ? 'theme-text border-b-2 theme-border' : 'text-gray-400'}`}>Cleared Orders</button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50"><tr className="text-left"><th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Client</th><th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Items</th><th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Total FOB</th><th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-800">{clients.find(c => c.id === o.clientId)?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{o.items.length} units</td>
                <td className="px-6 py-4 font-black theme-text">Ksh {o.items.reduce((s,i) => s + i.fobTotal, 0).toLocaleString()}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button className="p-2 theme-bg-light theme-text rounded-lg"><MessageSquare size={16}/></button>
                  <button className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Printer size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 theme-bg text-white flex justify-between items-center">
              <div><h3 className="text-xl font-black">New Sale Entry</h3><p className="text-xs opacity-80">{activeCatalog?.name}</p></div>
              <button onClick={() => setIsDrawerOpen(false)}><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Select Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                  <input placeholder="Search name..." className="w-full pl-10 p-3 border rounded-xl" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                  {clientSearch && !selectedClient && (
                    <div className="absolute top-14 w-full bg-white border shadow-xl rounded-xl z-10">
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                        <div key={c.id} className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0" onClick={() => { setSelectedClient(c); setClientSearch(c.name); }}>
                          <p className="font-bold text-sm">{c.name}</p><p className="text-xs text-gray-400">{c.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <select className="w-full p-3 border rounded-xl mb-4" value={selectedProdId} onChange={e => setSelectedProdId(e.target.value)}>
                  <option value="">Select Product...</option>
                  {catalogProds.map(p => <option key={p.id} value={p.id}>{p.name} - Ksh {p.fobPrice.toLocaleString()}</option>)}
                </select>
                {selectedProdId && (
                  <div className="space-y-4">
                    {products.find(p => p.id === selectedProdId)?.attributes.map(attr => (
                      <div key={attr.key} className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-gray-400 w-16">{attr.key}</span>
                        <select className="flex-1 p-2 border rounded-lg text-xs" value={selectedAttrs[attr.key] || ''} onChange={e => setSelectedAttrs({...selectedAttrs, [attr.key]: e.target.value})}>
                          <option value="">Select...</option>
                          {attr.value.split(',').map(v => <option key={v} value={v.trim()}>{v.trim()}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="flex gap-4">
                      <input type="number" className="w-20 p-2 border rounded-xl font-bold text-center" value={selectedQty} onChange={e => setSelectedQty(parseInt(e.target.value)||1)} />
                      <button onClick={handleAddToCart} className="flex-1 theme-bg py-3 rounded-xl font-bold">Add to Order</button>
                    </div>
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3 bg-gray-50 border-b flex justify-between font-bold text-xs uppercase text-gray-400"><span>Cart Items</span><span>FOB Price</span></div>
                  <div className="divide-y">
                    {cartItems.map(i => (
                      <div key={i.id} className="p-3 flex justify-between items-center">
                        <div><p className="font-bold text-sm">{products.find(p => p.id === i.productId)?.name}</p><p className="text-[10px] text-gray-400">{i.quantity} units • {i.selectedAttributes.map(a => a.value).join(', ')}</p></div>
                        <div className="flex items-center gap-3"><span className="font-bold text-sm">Ksh {i.fobTotal.toLocaleString()}</span><button onClick={() => setCartItems(cartItems.filter(ci => ci.id !== i.id))} className="text-red-500"><Trash2 size={14}/></button></div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-indigo-50 flex justify-between items-center"><span className="font-bold theme-text">Total</span><span className="text-lg font-black theme-text">Ksh {cartItems.reduce((s,i) => s + i.fobTotal, 0).toLocaleString()}</span></div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex gap-4 bg-gray-50">
              <button onClick={() => setIsDrawerOpen(false)} className="flex-1 py-4 text-gray-500 font-bold bg-white border rounded-xl">Cancel</button>
              <button onClick={handleCreateOrder} disabled={!selectedClient || cartItems.length === 0} className="flex-[2] py-4 theme-bg rounded-xl font-black shadow-lg flex justify-center items-center"><CheckCircle className="mr-2"/> Finalize Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
