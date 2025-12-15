
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, CheckCircle, Package, Search, FileText, Printer, X, CreditCard, AlertTriangle, MessageSquare, Copy, RefreshCw, Truck, Box, User, Settings, Lock, ShoppingCart, Calendar, ArrowLeft, ArrowRight, Wallet, ShoppingBag, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Order, OrderItem, Product, Client, PaymentTransaction, DynamicAttribute } from '../types';
import { generateInvoiceMessage } from '../services/geminiService';

const Orders = () => {
  const { orders, clients, products, addOrder, updateOrder, addPayment, payments, catalogs, pendingOrderClientId, setPendingOrderClientId, shopSettings } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'UNPAID' | 'PARTIAL' | 'CLEARED_FOB' | 'CLEARED_FREIGHT' | 'DELIVERY'>('UNPAID');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceType, setInvoiceType] = useState<'FOB' | 'FREIGHT'>('FOB');
  const [invoiceViewMode, setInvoiceViewMode] = useState<'VISUAL' | 'TEXT'>('VISUAL');
  const [includeOrderId, setIncludeOrderId] = useState(true);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentContext, setPaymentContext] = useState<'FOB' | 'FREIGHT'>('FOB');
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const [productToAdd, setProductToAdd] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState(1);
  const [itemAttributes, setItemAttributes] = useState<DynamicAttribute[]>([]);

  // Drawer Step State
  const [orderStep, setOrderStep] = useState<1 | 2>(1);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  useEffect(() => {
      if (pendingOrderClientId) {
          if (!activeCatalogId) setActiveCatalogId(catalogs.find(c => c.status === 'OPEN')?.id || catalogs[0]?.id || null);
          const client = clients.find(c => c.id === pendingOrderClientId);
          if (client) { setSelectedClient(client); setClientSearch(client.name); setIsDrawerOpen(true); }
          setPendingOrderClientId(null);
      }
  }, [pendingOrderClientId, catalogs]);

  // Effect to regenerate text message when options change (if in text mode)
  useEffect(() => {
    if (invoiceViewMode === 'TEXT' && invoiceOrder) {
        handleGenerateMessage();
    }
  }, [includeOrderId]);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch));
  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';
  const getClient = (id: string) => clients.find(c => c.id === id);
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  const parseOptions = (valString: string): string[] => {
      const rangeMatch = valString.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          if (!isNaN(start) && !isNaN(end) && start < end) { const arr = []; for(let i=start; i<=end; i++) arr.push(i.toString()); return arr; }
      }
      if (valString.includes(',')) return valString.split(',').map(s => s.trim()).filter(s => s.length > 0);
      return [valString];
  }

  useEffect(() => {
    if (productToAdd) {
        const prod = products.find(p => p.id === productToAdd);
        if (prod && prod.attributes) setItemAttributes(prod.attributes.map(attr => ({ key: attr.key, value: parseOptions(attr.value)[0] })));
        else setItemAttributes([]);
    } else setItemAttributes([]);
  }, [productToAdd]);

  const updateItemAttributeValue = (index: number, val: string) => {
      const newAttrs = [...itemAttributes]; newAttrs[index].value = val; setItemAttributes(newAttrs);
  };
  
  const addToCart = () => {
    if (!productToAdd) return;
    const product = products.find(p => p.id === productToAdd);
    if (!product) return;
    const existingIndex = cartItems.findIndex(item => item.productId === product.id && JSON.stringify(item.selectedAttributes) === JSON.stringify(itemAttributes));
    if (existingIndex >= 0) {
        const updatedCart = [...cartItems]; updatedCart[existingIndex].quantity += qtyToAdd; updatedCart[existingIndex].fobTotal += (product.fobPrice * qtyToAdd); setCartItems(updatedCart);
    } else {
        setCartItems([...cartItems, { id: Date.now().toString(), productId: product.id, quantity: qtyToAdd, fobTotal: product.fobPrice * qtyToAdd, freightTotal: 0, selectedAttributes: [...itemAttributes] }]);
    }
    setProductToAdd(''); setQtyToAdd(1); setItemAttributes([]);
  };

  const handleFinalizeOrder = () => {
    if (!selectedClient || cartItems.length === 0) return;
    const existingOrder = orders.find(o => o.clientId === selectedClient.id && !o.isLocked && o.status !== 'DELIVERED' && o.items.some(i => products.find(prod => prod.id === i.productId)?.catalogId === activeCatalogId));
    if (existingOrder) {
        const updatedItems = [...existingOrder.items];
        cartItems.forEach(newItem => {
            const existingItemIndex = updatedItems.findIndex(ei => ei.productId === newItem.productId && JSON.stringify(ei.selectedAttributes) === JSON.stringify(newItem.selectedAttributes));
            if (existingItemIndex >= 0) updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], quantity: updatedItems[existingItemIndex].quantity + newItem.quantity, fobTotal: updatedItems[existingItemIndex].fobTotal + newItem.fobTotal };
            else updatedItems.push(newItem);
        });
        const newTotalCost = updatedItems.reduce((sum, i) => sum + i.fobTotal, 0);
        let newStatus = existingOrder.fobPaymentStatus;
        if (existingOrder.totalFobPaid > 0 && existingOrder.totalFobPaid < newTotalCost) newStatus = 'PARTIAL'; else if (existingOrder.totalFobPaid >= newTotalCost && newTotalCost > 0) newStatus = 'PAID'; else if (existingOrder.totalFobPaid === 0) newStatus = 'UNPAID';
        updateOrder({ ...existingOrder, items: updatedItems, fobPaymentStatus: newStatus });
    } else {
        addOrder({ id: `ord-${Date.now()}`, clientId: selectedClient.id, orderDate: new Date().toISOString(), status: 'ARRIVED', fobPaymentStatus: 'UNPAID', freightPaymentStatus: 'UNPAID', totalFobPaid: 0, totalFreightPaid: 0, isLocked: false, items: cartItems });
    }
    resetDrawer();
  };

  const resetDrawer = () => {
      setCartItems([]); setSelectedClient(null); setClientSearch(''); setIsDrawerOpen(false); setOrderStep(1);
  };

  const initiatePayment = (order: Order, type: 'FOB' | 'FREIGHT') => { setPaymentOrder(order); setPaymentContext(type); setPaymentMessage(''); setPaymentError(''); setIsPaymentModalOpen(true); };

  const processPayment = () => {
      if (!paymentOrder) return;
      const codeMatch = paymentMessage.match(/([A-Z0-9]{10})/); const amountMatch = paymentMessage.match(/Ksh([\d,]+(\.\d{2})?)/);
      if (codeMatch && amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(/,/g, '')); const transactionCode = codeMatch[1];
          if (payments.some(p => p.transactionCode === transactionCode)) { setPaymentError('Code already used.'); return; }
          addPayment({ id: `pay-${Date.now()}`, transactionCode, amount, payerName: getClientName(paymentOrder.clientId), clientId: paymentOrder.clientId, date: new Date().toISOString(), rawMessage: paymentMessage }); 
          setIsPaymentModalOpen(false); setPaymentOrder(null);
      } else setPaymentError('Invalid format.');
  };

  const handleDeliveryUpdate = (order: Order, newStatus: 'ARRIVED' | 'SHIPPED' | 'DELIVERED') => updateOrder({ ...order, status: newStatus });

  const handleOpenInvoice = (order: Order, type: 'FOB' | 'FREIGHT') => {
      if (type === 'FREIGHT' && !order.items.some(item => products.find(prod => prod.id === item.productId)?.stockStatus === 'ARRIVED')) { alert("No arrived items for Freight Invoice."); return; }
      setInvoiceOrder(order); setInvoiceType(type); setInvoiceViewMode('VISUAL'); setGeneratedMessage(''); setIncludeOrderId(true);
  };

  const handleGenerateMessage = async () => {
    if (!invoiceOrder) return;
    setIsGeneratingMsg(true);
    const client = getClient(invoiceOrder.clientId);
    let deadline = new Date().toISOString(); 
    if (invoiceOrder.items.length > 0) { const prod = products.find(p => p.id === invoiceOrder.items[0].productId); if (prod) deadline = catalogs.find(c => c.id === prod.catalogId)?.closingDate || deadline; }
    if (client) {
        const filteredItems = invoiceOrder.items.filter(item => invoiceType === 'FOB' ? true : products.find(prod => prod.id === item.productId)?.stockStatus === 'ARRIVED');
        const msg = await generateInvoiceMessage({ ...invoiceOrder, items: filteredItems }, client, products, invoiceType, deadline, shopSettings);
        const finalMsg = includeOrderId ? `Order ID: ${invoiceOrder.id.slice(-6).toUpperCase()}\n${msg}` : msg;
        setGeneratedMessage(finalMsg);
    }
    setIsGeneratingMsg(false);
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedMessage);
      alert("Copied to clipboard!");
  };

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div><h2 className="text-3xl font-bold text-gray-800">Running Orders</h2><p className="text-gray-500">Select a catalog.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{catalogs.map(catalog => {
                  const catalogOrders = orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.catalogId === catalog.id));
                  const totalClients = new Set(catalogOrders.map(o => o.clientId)).size;
                  const estimatedFOB = catalogOrders.reduce((acc, o) => acc + o.items.filter(i => products.find(p => p.id === i.productId)?.catalogId === catalog.id).reduce((s,i) => s + i.fobTotal, 0), 0);
                  
                  return (
                  <div key={catalog.id} onClick={() => setActiveCatalogId(catalog.id)} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover-glow relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4"><div className="p-3 theme-bg-light theme-text rounded-lg"><ShoppingCart size={24} /></div><span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">{new Date(catalog.closingDate).toLocaleDateString()}</span></div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                          <div>
                              <p className="text-xs text-gray-400 font-medium uppercase">Orders</p>
                              <p className="text-lg font-bold text-gray-800">{catalogOrders.length}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-400 font-medium uppercase">Active Clients</p>
                              <p className="text-lg font-bold text-gray-800">{totalClients}</p>
                          </div>
                          <div className="col-span-2">
                              <p className="text-xs text-gray-400 font-medium uppercase">Est. Revenue</p>
                              <p className="text-lg font-bold theme-text">Ksh {estimatedFOB.toLocaleString()}</p>
                          </div>
                      </div>
                  </div>
              )})}</div>
          </div>
      );
  }

  const filteredOrders = orders.filter(order => order.items.some(item => products.find(p => p.id === item.productId)?.catalogId === activeCatalogId)).filter(order => {
      if (orderSearchTerm) {
          const term = orderSearchTerm.toLowerCase();
          const client = getClient(order.clientId);
          if (!(client?.name.toLowerCase().includes(term) || client?.phone.includes(term) || order.id.toLowerCase().includes(term))) return false;
      }
      if (activeTab === 'UNPAID') return order.fobPaymentStatus === 'UNPAID';
      if (activeTab === 'PARTIAL') return order.fobPaymentStatus === 'PARTIAL';
      if (activeTab === 'CLEARED_FOB') return order.fobPaymentStatus === 'PAID';
      if (activeTab === 'CLEARED_FREIGHT') return order.freightPaymentStatus === 'PAID';
      return true;
  });

  const catalogProducts = products.filter(p => p.catalogId === activeCatalogId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2"><button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={20} className="text-gray-600"/></button><h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name} Orders</h2></div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 w-full md:w-auto"></div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="bg-white p-2 rounded-lg border flex items-center shadow-sm flex-1 md:w-80"><Search className="text-gray-400 mr-2" size={18} /><input type="text" placeholder="Search..." className="flex-1 outline-none text-sm text-gray-900 bg-white" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)}/></div>
            <button onClick={() => setIsDrawerOpen(true)} className="flex items-center justify-center px-6 py-2 theme-bg text-white rounded-lg shadow-lg font-medium whitespace-nowrap"><Plus size={18} className="mr-2" /> New Order</button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
          {['UNPAID', 'PARTIAL', 'CLEARED_FOB', 'CLEARED_FREIGHT', 'DELIVERY'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === tab ? 'theme-border theme-text' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab.replace('_', ' ')}</button>
          ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Order ID</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Client</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Items</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Status / Action</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">Action</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => {
                    const totalVal = order.items.reduce((acc, i) => acc + i.fobTotal + i.freightTotal, 0);
                    const isPickedOrDelivered = order.status === 'SHIPPED' || order.status === 'DELIVERED';
                    const hasArrivedItems = order.items.some(i => products.find(p => p.id === i.productId)?.stockStatus === 'ARRIVED');
                    
                    return (
                        <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                            <td className="px-6 py-4 text-sm"><button onClick={() => setViewingClientId(order.clientId)} className="hover:theme-text font-medium text-gray-800">{getClientName(order.clientId)}</button></td>
                            <td className="px-6 py-4 text-sm text-gray-600">{order.items.reduce((sum, i) => sum + i.quantity, 0)} items</td>
                            <td className="px-6 py-4">
                                {activeTab === 'UNPAID' ? <button onClick={() => initiatePayment(order, 'FOB')} className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">Pay FOB...</button> : 
                                 activeTab === 'CLEARED_FOB' ? <div className="flex flex-col gap-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 w-fit">FOB Cleared</span>{order.freightPaymentStatus !== 'PAID' && <button onClick={() => initiatePayment(order, 'FREIGHT')} className="flex items-center px-2 py-1 theme-bg-light theme-text text-xs font-bold rounded w-fit"><Plus size={10} className="mr-1"/> Freight Pay</button>}</div> :
                                 activeTab === 'DELIVERY' ? <div className="flex items-center space-x-2"><button onClick={() => handleDeliveryUpdate(order, 'ARRIVED')} className={`px-2 py-1 text-xs border ${order.status === 'ARRIVED' ? 'bg-yellow-100' : ''} text-gray-800`}>Pending</button><button onClick={() => handleDeliveryUpdate(order, 'SHIPPED')} className={`px-2 py-1 text-xs border ${order.status === 'SHIPPED' ? 'bg-blue-100' : ''} text-gray-800`}>Picked</button></div> :
                                 <span className="text-xs font-bold theme-text">Total: Ksh {totalVal.toLocaleString()}</span>}
                            </td>
                            <td className="px-6 py-4">
                                {isPickedOrDelivered ? <span className="text-xs text-gray-400 font-medium flex items-center"><Lock size={12} className="mr-1"/> Completed</span> : 
                                <div className="flex flex-col gap-2">
                                    {/* Logic based on activeTab */}
                                    
                                    {/* Default / Unpaid / Partial: Show FOB Invoice */}
                                    {['UNPAID', 'PARTIAL'].includes(activeTab) && (
                                        <button onClick={() => handleOpenInvoice(order, 'FOB')} className="text-xs flex items-center justify-center theme-text theme-bg-light px-3 py-1.5 rounded font-medium"><MessageSquare size={12} className="mr-1"/> FOB Invoice</button>
                                    )}

                                    {/* Cleared FOB: Show Freight Invoice Only (if arrived) */}
                                    {activeTab === 'CLEARED_FOB' && (
                                        <>
                                            {hasArrivedItems ? (
                                                <button onClick={() => handleOpenInvoice(order, 'FREIGHT')} className="text-xs flex items-center justify-center theme-text theme-bg-light px-3 py-1.5 rounded font-medium"><MessageSquare size={12} className="mr-1"/> Freight Invoice</button>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">Freight Inv. (Pending Arrival)</span>
                                            )}
                                        </>
                                    )}

                                    {/* Cleared Freight: No Invoice Buttons */}
                                    {activeTab === 'CLEARED_FREIGHT' && (
                                        <span className="text-xs text-green-600 font-bold flex items-center"><CheckCircle size={12} className="mr-1"/> Fully Paid</span>
                                    )}

                                    {/* Delivery: No Freight Buttons */}
                                    {activeTab === 'DELIVERY' && (
                                         <button onClick={() => handleOpenInvoice(order, 'FOB')} className="text-xs flex items-center justify-center theme-text theme-bg-light px-3 py-1.5 rounded font-medium"><MessageSquare size={12} className="mr-1"/> Receipt / FOB Inv</button>
                                    )}
                                </div>}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
            </table>
        </div>
      </div>
      
      {/* ... Modals and Popups remain unchanged ... */}
      {viewingClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 flex justify-between items-start" style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}><div><h2 className="text-xl font-bold">{getClient(viewingClientId)?.name}</h2><p className="text-blue-200 text-sm">{getClient(viewingClientId)?.phone}</p></div><button onClick={() => setViewingClientId(null)} className="p-2 hover:bg-white/20 rounded-full"><X size={20}/></button></div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">{orders.filter(o => o.clientId === viewingClientId).map(order => (<div key={order.id} className="bg-white border rounded p-4 shadow-sm mb-2"><p className="font-bold text-gray-800">Order #{order.id.slice(-6)}</p><p className="text-xs text-gray-500">{order.items.length} items</p></div>))}</div>
            </div>
        </div>
      )}

      {isPaymentModalOpen && paymentOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                   <div className="p-6 flex justify-between items-center theme-bg text-white"><div className="flex items-center"><CreditCard className="mr-3" /><div><h3 className="font-bold text-lg">Process Payment</h3><p className="opacity-90 text-xs">For {paymentContext}</p></div></div><button onClick={() => setIsPaymentModalOpen(false)}><X /></button></div>
                  <div className="p-6"><textarea className="w-full h-32 p-3 border rounded-lg theme-ring focus:ring-2 outline-none text-sm font-mono text-gray-900" placeholder="Paste M-Pesa Message..." value={paymentMessage} onChange={(e) => setPaymentMessage(e.target.value)}/>{paymentError && <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded flex items-center"><AlertTriangle size={12} className="mr-1" /> {paymentError}</div>}</div>
                  <div className="p-6 bg-gray-50 border-t flex justify-end gap-3"><button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button><button onClick={processPayment} disabled={!paymentMessage} className="px-6 py-2 theme-bg text-white font-bold rounded-lg shadow-md disabled:opacity-50">Confirm</button></div>
              </div>
          </div>
      )}

      {invoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 overflow-y-auto">
               <div className={`bg-[#fcfcfc] shadow-2xl overflow-hidden flex flex-col relative transition-all ${invoiceViewMode === 'VISUAL' ? 'w-[800px] max-h-[95vh] rounded-xl' : 'w-full max-w-xl min-h-[500px] rounded-2xl'}`}>
                  
                  {/* Controls Header */}
                  <div className="absolute top-4 right-4 flex flex-wrap gap-2 print:hidden z-10 bg-white/80 backdrop-blur rounded-full p-1.5 shadow-sm border border-gray-200">
                      <button 
                        onClick={() => setIncludeOrderId(!includeOrderId)} 
                        className={`flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-colors ${includeOrderId ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-transparent'}`}
                      >
                        {includeOrderId ? <CheckCircle size={12} className="mr-1"/> : <span className="mr-1 w-3 h-3 rounded-full border border-gray-400 inline-block"/>}
                        ID
                      </button>

                      <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>

                      <div className="flex bg-gray-100 rounded-full p-1">
                          <button onClick={() => setInvoiceViewMode('VISUAL')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${invoiceViewMode === 'VISUAL' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Visual</button>
                          <button onClick={() => { setInvoiceViewMode('TEXT'); if(!generatedMessage) handleGenerateMessage(); }} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${invoiceViewMode === 'TEXT' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Text</button>
                      </div>
                      
                      {invoiceViewMode === 'VISUAL' && <button onClick={() => window.print()} className="flex items-center px-3 py-1 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800"><Printer size={14} className="mr-1"/> Print</button>}
                      
                      <button onClick={() => setInvoiceOrder(null)} className="flex items-center px-3 py-1 bg-red-500 text-white hover:bg-red-600 rounded-full text-xs font-bold transition-colors ml-2 shadow-md"><X size={14} className="mr-1"/> Close</button>
                  </div>

                  {invoiceViewMode === 'VISUAL' && (
                  <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col h-full text-black">
                        <div className="flex justify-between items-start mb-24">{shopSettings.logoUrl ? <img src={shopSettings.logoUrl} alt="Logo" className="h-20 object-contain" /> : <div className="text-8xl">&</div>}<div className="mt-4 text-right"><h1 className="text-5xl font-serif-display uppercase tracking-widest theme-text">{invoiceType} INVOICE</h1>{includeOrderId && <p className="text-lg font-bold text-gray-500 mt-1 tracking-wider">#{invoiceOrder.id.slice(-6).toUpperCase()}</p>}<p className="text-sm font-bold mt-2">{shopSettings.shopName}</p><p className="text-xs text-gray-500">{shopSettings.phoneNumbers.join(' / ')}</p></div></div>
                        <div className="mb-12 flex-grow">
                            <table className="w-full"><thead><tr className="border-t border-b border-black"><th className="py-3 text-left w-1/2">Item</th><th className="py-3 text-center">Qty</th><th className="py-3 text-right">Total</th></tr></thead><tbody>{invoiceOrder.items.map(item => { const product = products.find(p => p.id === item.productId); const lineTotal = invoiceType === 'FOB' ? item.fobTotal : item.freightTotal; if(invoiceType === 'FREIGHT' && (product?.stockStatus !== 'ARRIVED' || lineTotal === 0)) return null; return (<tr key={item.id} className="border-b border-gray-200"><td className="py-5 pr-4"><p className="font-medium text-sm">{product?.name}</p><p className="text-xs text-gray-500">{item.selectedAttributes.map(a => `${a.key}:${a.value}`).join(' ')}</p></td><td className="py-5 text-center text-sm">{item.quantity}</td><td className="py-5 text-right text-sm">Ksh {lineTotal.toLocaleString()}</td></tr>)})}</tbody></table>
                        </div>
                        <div className="border-t-2 border-gray-100 pt-6"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500">Paybill</p><p className="font-bold">{invoiceType === 'FOB' ? shopSettings.fobPaybill : shopSettings.freightPaybill}</p></div><div><p className="text-gray-500">Account No</p><p className="font-bold">{(invoiceType === 'FOB' ? shopSettings.fobAccountNumber : shopSettings.freightAccountNumber)}</p></div></div></div>
                  </div>
                  )}
                  {invoiceViewMode === 'TEXT' && (
                      <div className="p-8 flex flex-col h-full items-center justify-center bg-gray-50 mt-12">
                          <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border">
                               <div className="bg-[#075e54] text-white p-4 flex items-center gap-2"><MessageSquare size={16} /><span className="font-medium">WhatsApp Invoice</span></div>
                              <div className="p-6 bg-[#efe7dd] min-h-[350px] flex flex-col">
                                  {isGeneratingMsg ? <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div><p className="text-sm">Drafting...</p></div> : <><textarea className="flex-1 w-full bg-white rounded-lg p-4 shadow-sm text-sm border-none outline-none resize-none text-gray-900" value={generatedMessage} onChange={(e) => setGeneratedMessage(e.target.value)}/><div className="mt-4 flex gap-2"><button onClick={handleGenerateMessage} className="flex-1 flex items-center justify-center py-2 theme-bg text-white rounded-lg font-medium text-sm"><RefreshCw size={16} className="mr-2"/> Regenerate</button><button onClick={copyToClipboard} className="flex-1 flex items-center justify-center py-2 bg-[#25D366] text-white rounded-lg font-medium text-sm"><Copy size={16} className="mr-2"/> Copy</button></div></>}
                              </div>
                          </div>
                      </div>
                  )}
               </div>
          </div>
      )}
      
      {/* Drawer Component remains unchanged */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in">
             <div className="p-6 theme-bg text-white flex justify-between items-center shadow-md">
                <div>
                    <h3 className="text-2xl font-bold">New Order</h3>
                    <p className="text-sm opacity-90">{activeCatalog?.name}</p>
                </div>
                <button onClick={resetDrawer} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
            </div>
             <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="px-6 pt-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedClient ? 'theme-bg text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                        <span className={`text-sm font-medium ${selectedClient ? 'text-gray-800' : 'text-gray-400'}`}>Client</span>
                        <div className="w-10 h-0.5 bg-gray-200 mx-1"></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedClient ? 'bg-white border-2 theme-border theme-text' : 'bg-gray-200 text-gray-500'}`}>2</div>
                        <span className={`text-sm font-medium ${selectedClient ? 'text-gray-800' : 'text-gray-400'}`}>Items</span>
                    </div>
                </div>
                 <div className="px-6 pb-6 space-y-6">
                    <div className={`bg-white p-5 rounded-xl shadow-sm border transition-all ${!selectedClient ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100 opacity-60 hover:opacity-100'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-800 flex items-center"><User size={18} className="mr-2 theme-text"/> Customer</h4>
                            {selectedClient && <button onClick={() => setSelectedClient(null)} className="text-xs text-blue-600 font-bold hover:underline">Change</button>}
                        </div>
                        {!selectedClient ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                <input className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900" placeholder="Search name or phone..." value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }} onFocus={() => setShowClientDropdown(true)} autoFocus />
                                {showClientDropdown && clientSearch && (
                                    <div className="absolute w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-2 max-h-60 overflow-y-auto z-20">
                                        {filteredClients.map(c => (
                                            <div key={c.id} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors" onClick={() => { setSelectedClient(c); setClientSearch(c.name); setShowClientDropdown(false); }}><p className="font-bold text-gray-800">{c.name}</p><p className="text-xs text-gray-500">{c.phone}</p></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center p-3 bg-green-50 border border-green-100 rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold mr-3">{selectedClient.name.charAt(0)}</div>
                                <div><p className="font-bold text-gray-800">{selectedClient.name}</p><p className="text-xs text-gray-500">{selectedClient.phone}</p></div>
                                <CheckCircle className="ml-auto text-green-500" size={20}/>
                            </div>
                        )}
                    </div>
                     {selectedClient && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center"><Package size={18} className="mr-2 theme-text"/> Add Product</h4>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <select className="w-full p-3 mb-3 border border-gray-300 rounded-lg bg-white outline-none focus:border-blue-500 font-medium text-gray-900" value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)}>
                                            <option value="">-- Select a Product --</option>
                                            {catalogProducts.map(p => <option key={p.id} value={p.id}>{p.name} - Ksh {p.fobPrice.toLocaleString()}</option>)}
                                        </select>
                                        {productToAdd && (
                                            <div className="space-y-3 pl-1">
                                                {itemAttributes.map((attr, idx) => { 
                                                    const product = products.find(p => p.id === productToAdd); 
                                                    const options = parseOptions(product?.attributes.find(a => a.key === attr.key)?.value || ''); 
                                                    return (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <span className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wide">{attr.key}</span>
                                                            <div className="flex-1 relative">
                                                                <select 
                                                                    value={attr.value} 
                                                                    onChange={(e) => updateItemAttributeValue(idx, e.target.value)}
                                                                    className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                                                >
                                                                    {options.map((opt, i) => (
                                                                        <option key={i} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                                                    <ChevronDown size={14} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                                                    <span className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wide">Quantity</span>
                                                    <div className="flex items-center bg-white border border-gray-300 rounded-lg">
                                                        <button onClick={() => setQtyToAdd(Math.max(1, qtyToAdd - 1))} className="px-3 py-2 hover:bg-gray-100 text-gray-600 border-r border-gray-300">-</button>
                                                        <input type="number" min="1" className="w-16 text-center p-2 font-bold outline-none text-gray-900" value={qtyToAdd} onChange={(e) => setQtyToAdd(parseInt(e.target.value) || 1)}/>
                                                        <button onClick={() => setQtyToAdd(qtyToAdd + 1)} className="px-3 py-2 hover:bg-gray-100 text-gray-600 border-l border-gray-300">+</button>
                                                    </div>
                                                    <button disabled={!productToAdd} onClick={addToCart} className="flex-1 ml-4 theme-bg py-3 rounded-lg font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Add to Cart</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {cartItems.length > 0 && (
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center"><h4 className="font-bold text-gray-800 flex items-center"><ShoppingBag size={18} className="mr-2 text-gray-500"/> Order Summary</h4><span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{cartItems.length} Items</span></div>
                                    <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                                        {cartItems.map((item, idx) => (
                                            <div key={idx} className="p-4 flex justify-between items-start hover:bg-gray-50 transition-colors">
                                                <div className="flex-1 pr-4">
                                                    <p className="font-bold text-gray-800 text-sm">{getProductName(item.productId)}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">{item.selectedAttributes.map((a, i) => (<span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{a.value}</span>))}</div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900 text-sm">Ksh {item.fobTotal.toLocaleString()}</p>
                                                    <div className="flex items-center justify-end gap-2 mt-1"><span className="text-xs text-gray-500">x{item.quantity}</span><button onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center"><span className="text-gray-500 font-medium">Total Estimate</span><span className="text-xl font-bold theme-text">Ksh {cartItems.reduce((acc, item) => acc + item.fobTotal, 0).toLocaleString()}</span></div>
                                </div>
                            )}
                        </div>
                    )}
                 </div>
             </div>
             <div className="p-4 bg-white border-t border-gray-200 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button onClick={resetDrawer} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">Cancel</button>
                <button onClick={handleFinalizeOrder} disabled={!selectedClient || cartItems.length === 0} className="flex-[2] py-3 theme-bg text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center"><CheckCircle className="mr-2" size={20}/> Confirm Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
