
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, CheckCircle, Package, Search, FileText, Printer, X, CreditCard, AlertTriangle, MessageSquare, Copy, RefreshCw, Truck, Box, User, Settings } from 'lucide-react';
import { Order, OrderItem, Product, Client, PaymentTransaction, DynamicAttribute } from '../types';
import { generateInvoiceMessage } from '../services/geminiService';

const Orders = () => {
  const { orders, clients, products, addOrder, updateOrder, addPayment, payments, catalogs } = useAppStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  
  // Search State for Main List
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  // Tabs State: UNPAID, PARTIAL, CLEARED_FOB, CLEARED_FREIGHT, DELIVERY
  const [activeTab, setActiveTab] = useState<'UNPAID' | 'PARTIAL' | 'CLEARED_FOB' | 'CLEARED_FREIGHT' | 'DELIVERY'>('UNPAID');

  // Invoice Modal State
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceType, setInvoiceType] = useState<'FOB' | 'FREIGHT'>('FOB');
  const [invoiceViewMode, setInvoiceViewMode] = useState<'VISUAL' | 'TEXT'>('VISUAL');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Client Detail View State
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone.includes(clientSearch)
  );

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';
  const getClient = (id: string) => clients.find(c => c.id === id);
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  // --- Cart & Order Logic ---

  // State to manage adding items inside drawer
  const [productToAdd, setProductToAdd] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState(1);
  const [itemAttributes, setItemAttributes] = useState<DynamicAttribute[]>([]);

  // When productToAdd changes, populate default attributes
  useEffect(() => {
    if (productToAdd) {
        const prod = products.find(p => p.id === productToAdd);
        if (prod && prod.attributes) {
            // Copy attributes from product to allow editing for this specific item order
            setItemAttributes([...prod.attributes]);
        } else {
            setItemAttributes([]);
        }
    } else {
        setItemAttributes([]);
    }
  }, [productToAdd, products]);

  const updateItemAttributeValue = (index: number, val: string) => {
      const newAttrs = [...itemAttributes];
      newAttrs[index].value = val;
      setItemAttributes(newAttrs);
  };
  
  const updateItemAttributeKey = (index: number, val: string) => {
      const newAttrs = [...itemAttributes];
      newAttrs[index].key = val;
      setItemAttributes(newAttrs);
  };

  const addItemAttribute = () => {
      setItemAttributes([...itemAttributes, { key: 'Option', value: '' }]);
  };

  const deleteItemAttribute = (index: number) => {
      setItemAttributes(itemAttributes.filter((_, i) => i !== index));
  };


  const addToCart = () => {
    if (!productToAdd) return;
    const product = products.find(p => p.id === productToAdd);
    if (!product) return;

    // Check if item with SAME product AND attributes exists
    // (Simple JSON stringify comparison for deep equality of attributes)
    const existingIndex = cartItems.findIndex(item => 
        item.productId === product.id && 
        JSON.stringify(item.selectedAttributes) === JSON.stringify(itemAttributes)
    );

    if (existingIndex >= 0) {
        const updatedCart = [...cartItems];
        updatedCart[existingIndex].quantity += qtyToAdd;
        updatedCart[existingIndex].fobTotal += (product.fobPrice * qtyToAdd);
        setCartItems(updatedCart);
    } else {
        const newItem: OrderItem = {
          id: Date.now().toString(),
          productId: product.id,
          quantity: qtyToAdd,
          fobTotal: product.fobPrice * qtyToAdd,
          freightTotal: 0,
          selectedAttributes: [...itemAttributes] // Clone current state
        };
        setCartItems([...cartItems, newItem]);
    }
    
    // Reset form but keep product selected for ease of adding variants? No, reset all.
    setProductToAdd('');
    setQtyToAdd(1);
    setItemAttributes([]);
  };

  const handleFinalizeOrder = () => {
    if (!selectedClient || cartItems.length === 0) return;

    const existingOrder = orders.find(o => 
        o.clientId === selectedClient.id && 
        !o.isLocked && 
        o.status !== 'DELIVERED'
    );

    if (existingOrder) {
        const updatedItems = [...existingOrder.items];
        cartItems.forEach(newItem => {
            // Merge logic strictly checks attributes now
            const existingItemIndex = updatedItems.findIndex(ei => 
                ei.productId === newItem.productId &&
                JSON.stringify(ei.selectedAttributes) === JSON.stringify(newItem.selectedAttributes)
            );

            if (existingItemIndex >= 0) {
                updatedItems[existingItemIndex] = {
                    ...updatedItems[existingItemIndex],
                    quantity: updatedItems[existingItemIndex].quantity + newItem.quantity,
                    fobTotal: updatedItems[existingItemIndex].fobTotal + newItem.fobTotal
                };
            } else {
                updatedItems.push(newItem);
            }
        });
        
        const newTotalCost = updatedItems.reduce((sum, i) => sum + i.fobTotal, 0);
        let newStatus = existingOrder.fobPaymentStatus;
        
        if (existingOrder.totalFobPaid > 0 && existingOrder.totalFobPaid < newTotalCost) {
            newStatus = 'PARTIAL';
        } else if (existingOrder.totalFobPaid >= newTotalCost) {
            newStatus = 'PAID';
        } else if (existingOrder.totalFobPaid === 0) {
            newStatus = 'UNPAID';
        }

        updateOrder({
            ...existingOrder,
            items: updatedItems,
            fobPaymentStatus: newStatus
        });
    } else {
        const newOrder: Order = {
            id: `ord-${Date.now()}`,
            clientId: selectedClient.id,
            orderDate: new Date().toISOString(),
            status: 'ARRIVED', // Default to Arrived/Pending
            fobPaymentStatus: 'UNPAID',
            freightPaymentStatus: 'UNPAID',
            totalFobPaid: 0,
            totalFreightPaid: 0,
            isLocked: false,
            items: cartItems
        };
        addOrder(newOrder);
    }

    setCartItems([]);
    setSelectedClient(null);
    setClientSearch('');
    setIsDrawerOpen(false);
  };

  // --- Payment Modal Logic ---

  const handleStatusChange = (order: Order, newStatus: string) => {
      if (newStatus === 'PAID_ACTION') {
          setPaymentOrder(order);
          setPaymentMessage('');
          setPaymentError('');
          setIsPaymentModalOpen(true);
      }
  };

  const processPayment = () => {
      if (!paymentOrder) return;

      // Extract Code and Amount
      const codeMatch = paymentMessage.match(/([A-Z0-9]{10})/);
      const amountMatch = paymentMessage.match(/Ksh([\d,]+(\.\d{2})?)/);

      if (codeMatch && amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          const transactionCode = codeMatch[1];

          // Check duplicate
          if (payments.some(p => p.transactionCode === transactionCode)) {
              setPaymentError('Transaction code already used.');
              return;
          }

          const payment: PaymentTransaction = {
            id: `pay-${Date.now()}`,
            transactionCode: transactionCode,
            amount: amount,
            payerName: getClientName(paymentOrder.clientId), // Assume matching client
            clientId: paymentOrder.clientId, // Link directly
            date: new Date().toISOString(),
            rawMessage: paymentMessage
          };

          addPayment(payment); 
          
          setIsPaymentModalOpen(false);
          setPaymentOrder(null);
      } else {
          setPaymentError('Invalid M-Pesa message format. Needs Code and Ksh Amount.');
      }
  };

  const handleDeliveryUpdate = (order: Order, newStatus: 'ARRIVED' | 'SHIPPED' | 'DELIVERED') => {
      updateOrder({
          ...order,
          status: newStatus
      });
  };

  const handleGenerateMessage = async () => {
    if (!invoiceOrder) return;
    setIsGeneratingMsg(true);
    const client = getClient(invoiceOrder.clientId);
    
    // Find Deadline: Look at first item -> product -> catalog -> closingDate
    let deadline = new Date().toISOString(); // Fallback
    if (invoiceOrder.items.length > 0) {
        const firstProdId = invoiceOrder.items[0].productId;
        const prod = products.find(p => p.id === firstProdId);
        if (prod) {
            const cat = catalogs.find(c => c.id === prod.catalogId);
            if (cat) {
                deadline = cat.closingDate;
            }
        }
    }

    if (client) {
        const msg = await generateInvoiceMessage(invoiceOrder, client, products, invoiceType, deadline);
        setGeneratedMessage(msg);
    }
    setIsGeneratingMsg(false);
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedMessage);
      alert("Message copied to clipboard!");
  };


  // --- Filter Logic ---

  const filteredOrders = orders.filter(order => {
      // 1. Search Filter - ENHANCED
      if (orderSearchTerm) {
          const term = orderSearchTerm.toLowerCase();
          const client = getClient(order.clientId);
          
          const clientMatch = 
            client?.name.toLowerCase().includes(term) || 
            client?.phone.includes(term);
          
          const idMatch = order.id.toLowerCase().includes(term);

          // NEW: Search inside items (Product Name)
          const itemMatch = order.items.some(item => {
              const p = products.find(prod => prod.id === item.productId);
              return p?.name.toLowerCase().includes(term);
          });

          // NEW: Search Status
          const statusMatch = order.status.toLowerCase().includes(term);

          if (!clientMatch && !idMatch && !itemMatch && !statusMatch) {
              return false;
          }
      }

      // 2. Tab Filter
      if (activeTab === 'UNPAID') {
          return order.fobPaymentStatus === 'UNPAID';
      } else if (activeTab === 'PARTIAL') {
          return order.fobPaymentStatus === 'PARTIAL';
      } else if (activeTab === 'CLEARED_FOB') {
          return order.fobPaymentStatus === 'PAID';
      } else if (activeTab === 'CLEARED_FREIGHT') {
          return order.freightPaymentStatus === 'PAID';
      } else if (activeTab === 'DELIVERY') {
          return true; // Show all active orders (filtered by search)
      }
      return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Running Orders</h2>
            <p className="text-sm text-gray-500">Manage monthly accumulated orders</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Main Order Search Bar */}
            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center shadow-sm flex-1 md:w-64">
                <Search className="text-gray-400 mr-2" size={18} />
                <input 
                    type="text" 
                    placeholder="Search client, phone, item, or status..." 
                    className="flex-1 outline-none text-sm text-black bg-white"
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                />
            </div>

            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all font-medium whitespace-nowrap"
            >
              <Plus size={18} className="mr-2" />
              New Order
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('UNPAID')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'UNPAID' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Unpaid Orders
          </button>
          <button 
            onClick={() => setActiveTab('PARTIAL')}
             className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'PARTIAL' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Pending (Partial)
          </button>
          <button 
            onClick={() => setActiveTab('CLEARED_FOB')}
             className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'CLEARED_FOB' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            FOB Cleared
          </button>
          <button 
            onClick={() => setActiveTab('CLEARED_FREIGHT')}
             className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'CLEARED_FREIGHT' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Freight Cleared
          </button>
          <button 
            onClick={() => setActiveTab('DELIVERY')}
             className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'DELIVERY' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Truck size={14} className="inline mr-1" /> Delivery Status
          </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                {activeTab === 'DELIVERY' ? (
                     <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Status</th>
                ) : (
                    <>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                    </>
                )}
                
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No orders found matching your search or in this category.</td></tr>
                ) : (
                    filteredOrders.map(order => {
                        const totalVal = order.items.reduce((acc, i) => acc + i.fobTotal + i.freightTotal, 0);
                        const balance = totalVal - order.totalFobPaid;
                        
                        return (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id.slice(-6)}</td>
                                <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                    <button 
                                        onClick={() => setViewingClientId(order.clientId)} 
                                        className="hover:text-blue-600 hover:bg-blue-50 px-2 py-1 -ml-2 rounded transition-colors text-left group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-gray-400 group-hover:text-blue-500"/>
                                            {getClientName(order.clientId)}
                                        </div>
                                        <div className="text-xs text-gray-500 pl-6">{getClient(order.clientId)?.phone}</div>
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                                </td>
                                
                                {activeTab === 'DELIVERY' ? (
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => handleDeliveryUpdate(order, 'ARRIVED')}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border ${order.status === 'ARRIVED' || order.status === 'CONFIRMED' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                            >
                                                Pending
                                            </button>
                                            <button 
                                                onClick={() => handleDeliveryUpdate(order, 'SHIPPED')}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border ${order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                            >
                                                Picked
                                            </button>
                                            <button 
                                                onClick={() => handleDeliveryUpdate(order, 'DELIVERED')}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                            >
                                                Delivered
                                            </button>
                                        </div>
                                    </td>
                                ) : (
                                    <>
                                        <td className="px-6 py-4">
                                            {activeTab === 'UNPAID' ? (
                                                <select 
                                                    className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-1 outline-none focus:ring-1 focus:ring-red-400 font-bold"
                                                    value="UNPAID"
                                                    onChange={(e) => handleStatusChange(order, e.target.value)}
                                                >
                                                    <option value="UNPAID">Unpaid</option>
                                                    <option value="PAID_ACTION">Pay Order...</option>
                                                </select>
                                            ) : activeTab === 'PARTIAL' ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded w-fit mb-1">Partial</span>
                                                    <span className="text-xs text-gray-500">Bal: Ksh {balance.toLocaleString()}</span>
                                                    <button 
                                                        onClick={() => handleStatusChange(order, 'PAID_ACTION')}
                                                        className="text-xs text-blue-600 hover:underline mt-1 text-left"
                                                    >
                                                        Add Payment
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${order.fobPaymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                                        FOB: {order.fobPaymentStatus}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${order.freightPaymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        Freight: {order.freightPaymentStatus}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">Ksh {totalVal.toLocaleString()}</td>
                                    </>
                                )}
                                
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => { setInvoiceOrder(order); setInvoiceViewMode('TEXT'); setGeneratedMessage(''); setInvoiceType('FOB'); }}
                                        className="text-xs flex items-center text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-2 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                                    >
                                        <MessageSquare size={12} className="mr-1"/> Invoice
                                    </button>
                                </td>
                            </tr>
                        )
                    })
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Client Detail Modal */}
      {viewingClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                {(() => {
                    const client = getClient(viewingClientId);
                    const clientOrders = orders.filter(o => o.clientId === viewingClientId);
                    
                    // Aggregate totals
                    const totalItems = clientOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
                    const totalFobCost = clientOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.fobTotal, 0), 0);
                    const totalFreightCost = clientOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.freightTotal, 0), 0);
                    const totalPaid = clientOrders.reduce((sum, o) => sum + o.totalFobPaid + o.totalFreightPaid, 0);
                    const balance = (totalFobCost + totalFreightCost) - totalPaid;

                    return (
                        <>
                            <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="bg-blue-500 p-2 rounded-full"><User size={20}/></div>
                                        <div>
                                            <h2 className="text-xl font-bold">{client?.name}</h2>
                                            <p className="text-blue-200 text-sm">{client?.phone}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setViewingClientId(null)} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="flex border-b border-gray-100 bg-gray-50">
                                <div className="flex-1 p-4 border-r border-gray-200 text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Items</p>
                                    <p className="text-xl font-bold text-slate-800">{totalItems}</p>
                                </div>
                                <div className="flex-1 p-4 border-r border-gray-200 text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
                                    <p className="text-xl font-bold text-slate-800">Ksh {(totalFobCost + totalFreightCost).toLocaleString()}</p>
                                </div>
                                <div className="flex-1 p-4 border-r border-gray-200 text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Paid</p>
                                    <p className="text-xl font-bold text-green-600">Ksh {totalPaid.toLocaleString()}</p>
                                </div>
                                <div className="flex-1 p-4 text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Balance</p>
                                    <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>Ksh {balance.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center"><Package size={16} className="mr-2"/> Consolidated Items (This Month)</h3>
                                <div className="space-y-2">
                                    {clientOrders.map(order => (
                                        <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">#{order.id.slice(-6)}</span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                                                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {order.status === 'SHIPPED' ? 'PICKED' : order.status === 'ARRIVED' || order.status === 'CONFIRMED' ? 'PENDING' : order.status}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</div>
                                            </div>
                                            <div className="space-y-1">
                                                {order.items.map((item, idx) => {
                                                    const attrs = item.selectedAttributes.map(a => `${a.key}: ${a.value}`).join(', ');
                                                    return (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <div className="text-gray-700">
                                                                {item.quantity} x {getProductName(item.productId)}
                                                                {attrs && <span className="text-xs text-gray-500 ml-2">({attrs})</span>}
                                                            </div>
                                                            <span className="font-medium">Ksh {(item.fobTotal + item.freightTotal).toLocaleString()}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {clientOrders.length === 0 && <p className="text-center text-gray-400 py-4">No active orders found.</p>}
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
                                <button onClick={() => setViewingClientId(null)} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">Close Details</button>
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {isPaymentModalOpen && paymentOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                  <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                      <div className="flex items-center">
                          <CreditCard className="mr-3" />
                          <div>
                              <h3 className="font-bold text-lg">Process Payment</h3>
                              <p className="text-blue-100 text-xs">{getClientName(paymentOrder.clientId)}</p>
                          </div>
                      </div>
                      <button onClick={() => setIsPaymentModalOpen(false)} className="text-blue-200 hover:text-white"><X /></button>
                  </div>
                  <div className="p-6">
                      <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-500">Total Order Value:</span>
                            <span className="font-bold">Ksh {paymentOrder.items.reduce((s,i) => s + i.fobTotal, 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-green-700">
                             <span>Already Paid:</span>
                             <span>Ksh {paymentOrder.totalFobPaid.toLocaleString()}</span>
                          </div>
                      </div>

                      <label className="block text-sm font-medium text-gray-700 mb-2">Paste M-Pesa Message</label>
                      <textarea 
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-gray-50 text-gray-800"
                        placeholder="e.g. QWE123456 Confirmed. Ksh5,000.00 sent to SHOP..."
                        value={paymentMessage}
                        onChange={(e) => setPaymentMessage(e.target.value)}
                      />
                      {paymentError && (
                          <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded flex items-center">
                              <AlertTriangle size={12} className="mr-1" /> {paymentError}
                          </div>
                      )}
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={processPayment}
                        disabled={!paymentMessage}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
                      >
                          Confirm & Update Status
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 overflow-y-auto">
              <div className={`bg-[#fcfcfc] shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${
                  invoiceViewMode === 'VISUAL' 
                  ? 'w-[800px] max-h-[95vh] rounded-xl' 
                  : 'w-full max-w-xl min-h-[500px] rounded-2xl'
              }`}>
                  
                  {/* Modal Controls */}
                  <div className="absolute top-4 right-4 flex gap-2 print:hidden z-10 bg-white/80 backdrop-blur rounded-full p-1 shadow-sm border border-gray-100">
                      {/* View Switcher */}
                      <div className="flex bg-gray-100 rounded-full p-1 mr-4">
                          <button onClick={() => setInvoiceViewMode('VISUAL')} className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${invoiceViewMode === 'VISUAL' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                             <FileText size={12} className="mr-1" /> Visual
                          </button>
                          <button onClick={() => { setInvoiceViewMode('TEXT'); if(!generatedMessage) handleGenerateMessage(); }} className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${invoiceViewMode === 'TEXT' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>
                             <MessageSquare size={12} className="mr-1" /> Text Message
                          </button>
                      </div>

                      {/* Invoice Type Switcher */}
                      <div className="flex bg-gray-100 rounded-full p-1 mr-2">
                          <button onClick={() => {setInvoiceType('FOB'); setGeneratedMessage('');}} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${invoiceType === 'FOB' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>FOB</button>
                          {(() => {
                              const isFobFullyPaid = invoiceOrder.fobPaymentStatus === 'PAID';
                              return (
                                <button 
                                    onClick={() => {if(isFobFullyPaid) { setInvoiceType('FREIGHT'); setGeneratedMessage(''); }}} 
                                    disabled={!isFobFullyPaid}
                                    title={!isFobFullyPaid ? "FOB must be fully paid before generating Freight Invoice" : ""}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                        invoiceType === 'FREIGHT' 
                                            ? 'bg-white shadow text-black' 
                                            : (!isFobFullyPaid ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-black')
                                    }`}
                                >
                                    Freight
                                </button>
                              );
                          })()}
                      </div>
                      
                      <div className="h-6 w-px bg-gray-300 mx-1 self-center"></div>

                      {invoiceViewMode === 'VISUAL' && (
                        <button onClick={() => window.print()} className="flex items-center px-3 py-1 bg-black text-white rounded-full hover:bg-gray-800 text-xs font-bold transition-colors">
                            <Printer size={14} className="mr-1"/> Print
                        </button>
                      )}
                      <button onClick={() => setInvoiceOrder(null)} className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-full hover:bg-red-50 hover:text-red-600 text-xs font-bold transition-colors">
                          <X size={14} className="mr-1"/> Close
                      </button>
                  </div>

                  {/* VISUAL INVOICE CONTENT */}
                  {invoiceViewMode === 'VISUAL' && (
                  <div className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col h-full text-black animate-fade-in scrollbar-thin">
                        {/* Header: Logo & Title */}
                        <div className="flex justify-between items-start mb-24">
                            <div className="text-8xl font-serif-display leading-none">&</div>
                            <div className="mt-4">
                                <h1 className="text-5xl font-serif-display uppercase tracking-widest">INVOICE</h1>
                            </div>
                        </div>

                        {/* Billed To Section */}
                        <div className="flex justify-between items-start mb-20">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4">BILLED TO:</h3>
                                <p className="text-lg font-medium">{getClientName(invoiceOrder.clientId)}</p>
                                <p className="text-gray-600 text-sm mt-1">{getClient(invoiceOrder.clientId)?.phone}</p>
                                <p className="text-gray-500 text-sm mt-1">Nairobi, Kenya</p>
                            </div>
                            <div className="text-right">
                                <div className="mb-2">
                                    <span className="text-gray-500 text-xs uppercase tracking-wider mr-6">Invoice No.</span>
                                    <span className="text-sm font-medium">{invoiceOrder.id.slice(-6).toUpperCase()}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs uppercase tracking-wider mr-6">Date</span>
                                    <span className="text-sm font-medium">{new Date(invoiceOrder.orderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-12 flex-grow">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-t border-b border-black">
                                        <th className="py-3 text-left text-xs font-bold uppercase tracking-wider w-1/2">Item</th>
                                        <th className="py-3 text-center text-xs font-bold uppercase tracking-wider">Quantity</th>
                                        <th className="py-3 text-right text-xs font-bold uppercase tracking-wider">Unit Price</th>
                                        <th className="py-3 text-right text-xs font-bold uppercase tracking-wider">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceOrder.items.map(item => {
                                        const product = products.find(p => p.id === item.productId);
                                        const lineTotal = invoiceType === 'FOB' ? item.fobTotal : item.freightTotal;
                                        const unitPrice = lineTotal / item.quantity;
                                        
                                        if(invoiceType === 'FREIGHT' && lineTotal === 0) return null;

                                        return (
                                            <tr key={item.id} className="border-b border-gray-200">
                                                <td className="py-5 pr-4">
                                                    <p className="font-medium text-sm">{product?.name}</p>
                                                    {item.selectedAttributes.length > 0 && (
                                                      <p className="text-xs text-gray-500 mt-1">{item.selectedAttributes.map(a => `${a.key}: ${a.value}`).join(', ')}</p>
                                                    )}
                                                </td>
                                                <td className="py-5 text-center text-sm">{item.quantity}</td>
                                                <td className="py-5 text-right text-sm">Ksh {unitPrice.toLocaleString()}</td>
                                                <td className="py-5 text-right text-sm">Ksh {lineTotal.toLocaleString()}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals & Footer */}
                        <div>
                            <div className="flex justify-end mb-16">
                                <div className="w-64">
                                    {(() => {
                                        const subtotal = invoiceOrder.items.reduce((s, i) => s + (invoiceType === 'FOB' ? i.fobTotal : i.freightTotal), 0);
                                        const paid = invoiceType === 'FOB' ? invoiceOrder.totalFobPaid : invoiceOrder.totalFreightPaid;
                                        const balance = Math.max(0, subtotal - paid);

                                        return (
                                            <>
                                                <div className="flex justify-between py-2 text-sm">
                                                    <span className="font-bold">Subtotal</span>
                                                    <span>Ksh {subtotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between py-2 text-sm text-gray-500">
                                                    <span>Tax (0%)</span>
                                                    <span>$0</span>
                                                </div>
                                                <div className="flex justify-between py-4 border-t border-black mt-2">
                                                    <span className="text-xl font-bold">Total</span>
                                                    <span className="text-xl font-bold">Ksh {subtotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between py-2 text-sm font-bold mt-2 border-t border-gray-200">
                                                    <span>Balance Due</span>
                                                    <span>Ksh {balance.toLocaleString()}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                  </div>
                  )}

                  {/* AI TEXT MESSAGE CONTENT */}
                  {invoiceViewMode === 'TEXT' && (
                      <div className="p-8 flex flex-col h-full items-center justify-center bg-gray-50 animate-fade-in mt-12">
                          <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
                              <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                        <MessageSquare size={16} />
                                    </div>
                                    <span className="font-medium">WhatsApp Invoice Generator</span>
                                  </div>
                              </div>
                              <div className="p-6 bg-[#efe7dd] min-h-[350px] flex flex-col">
                                  {isGeneratingMsg ? (
                                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
                                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                          <p className="text-sm font-medium">Drafting message with AI...</p>
                                      </div>
                                  ) : (
                                      <>
                                        <textarea 
                                            className="flex-1 w-full bg-white rounded-lg p-4 shadow-sm text-sm text-gray-800 border-none outline-none resize-none font-sans leading-relaxed"
                                            value={generatedMessage}
                                            onChange={(e) => setGeneratedMessage(e.target.value)}
                                            placeholder="Click generate to create the invoice message..."
                                        />
                                        <div className="mt-4 flex gap-2">
                                            <button 
                                                onClick={handleGenerateMessage}
                                                className="flex-1 flex items-center justify-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow font-medium text-sm"
                                            >
                                                <RefreshCw size={16} className="mr-2"/> Regenerate
                                            </button>
                                            <button 
                                                onClick={copyToClipboard}
                                                disabled={!generatedMessage}
                                                className="flex-1 flex items-center justify-center py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#20bd5a] transition-colors shadow font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Copy size={16} className="mr-2"/> Copy Text
                                            </button>
                                            <button 
                                                onClick={() => setInvoiceOrder(null)}
                                                className="px-4 flex items-center justify-center py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors shadow font-medium text-sm"
                                            >
                                                <X size={16} className="mr-1"/> Close
                                            </button>
                                        </div>
                                      </>
                                  )}
                              </div>
                              <div className="bg-white p-3 text-xs text-center text-gray-400">
                                  AI-generated content. Review before sending.
                              </div>
                          </div>
                      </div>
                  )}

              </div>
          </div>
      )}

      {/* Slide-over Drawer for New Order */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Create / Update Order</h3>
              <p className="text-sm text-gray-500">Add items to client order.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Client Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Client</label>
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Name or Phone (e.g. +254...)"
                        value={clientSearch}
                        onChange={(e) => {
                            setClientSearch(e.target.value);
                            setShowClientDropdown(true);
                            if(selectedClient) setSelectedClient(null);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                    />
                </div>
                
                {showClientDropdown && clientSearch && (
                    <div className="absolute w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-10">
                        {filteredClients.length > 0 ? filteredClients.map(c => (
                            <div 
                                key={c.id} 
                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                onClick={() => {
                                    setSelectedClient(c);
                                    setClientSearch(`${c.name} (${c.phone})`);
                                    setShowClientDropdown(false);
                                }}
                            >
                                <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.phone}</p>
                            </div>
                        )) : (
                            <div className="p-3 text-sm text-gray-400">No clients found</div>
                        )}
                    </div>
                )}
              </div>

              {/* Add Items Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center"><Package size={16} className="mr-2"/> Add Item</h4>
                <div className="space-y-3">
                    <select 
                        className="w-full p-2 border border-gray-300 rounded outline-none text-black bg-white shadow-sm"
                        value={productToAdd}
                        onChange={(e) => setProductToAdd(e.target.value)}
                    >
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Ksh {p.fobPrice})</option>)}
                    </select>
                    
                    {productToAdd && (
                        <div className="p-3 bg-white rounded border border-gray-100 space-y-2">
                             <div className="flex justify-between items-center">
                                 <label className="text-xs font-bold text-gray-500 uppercase">Product Variables</label>
                                 <button onClick={addItemAttribute} className="text-xs text-blue-600 hover:text-blue-800 flex items-center"><Plus size={10} className="mr-1"/> Add Variable</button>
                             </div>
                             {itemAttributes.map((attr, idx) => (
                                 <div key={idx} className="flex gap-2 items-center mb-2">
                                     <input 
                                         className="w-20 p-1 border border-gray-300 rounded text-xs text-gray-800 bg-white font-medium"
                                         value={attr.key}
                                         onChange={(e) => updateItemAttributeKey(idx, e.target.value)}
                                         placeholder="Name"
                                     />
                                     <input 
                                        className="flex-1 p-1 border border-gray-300 rounded text-sm text-gray-800 bg-white"
                                        placeholder="Value"
                                        value={attr.value}
                                        onChange={(e) => updateItemAttributeValue(idx, e.target.value)}
                                     />
                                     <button onClick={() => deleteItemAttribute(idx)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                 </div>
                             ))}
                             {itemAttributes.length === 0 && <p className="text-xs text-gray-400 italic">No variables defined.</p>}
                        </div>
                    )}

                    <div className="flex gap-2 items-center">
                        <label className="text-sm text-gray-600 font-medium">Qty:</label>
                        <input 
                            type="number" 
                            min="1" 
                            className="w-24 p-2 border border-gray-300 rounded outline-none text-black bg-white shadow-sm font-bold"
                            value={qtyToAdd}
                            onChange={(e) => setQtyToAdd(parseInt(e.target.value))}
                        />
                        <button 
                            disabled={!productToAdd}
                            onClick={addToCart}
                            className="flex-1 bg-gray-800 text-white rounded hover:bg-black disabled:opacity-50 py-2 font-medium"
                        >
                            Add to List
                        </button>
                    </div>
                </div>
              </div>

              {/* Cart List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Current Addition Summary</h4>
                {cartItems.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">No new items added.</p>
                ) : (
                    cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded shadow-sm">
                            <div>
                                <p className="font-medium text-sm text-gray-800">{getProductName(item.productId)}</p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                {item.selectedAttributes.length > 0 && (
                                    <p className="text-xs text-blue-600 mt-1">{item.selectedAttributes.map(a => `${a.key}: ${a.value}`).join(', ')}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-sm">Ksh {item.fobTotal.toLocaleString()}</span>
                                <button 
                                    onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {selectedClient && orders.find(o => o.clientId === selectedClient.id && !o.isLocked) && (
                    <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                        Note: This client has an existing open order. These items will be merged into it.
                    </div>
                )}
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={() => setIsDrawerOpen(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
              <button 
                onClick={handleFinalizeOrder}
                disabled={!selectedClient || cartItems.length === 0}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
              >
                Confirm Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
