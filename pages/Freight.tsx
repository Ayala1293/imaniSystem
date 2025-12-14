
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Container, Edit2, Search, Save, AlertCircle } from 'lucide-react';
import { Product } from '../types';

const Freight = () => {
  const { products, updateProduct, orders, updateOrder } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempFreight, setTempFreight] = useState<number>(0);

  const handleStartEdit = (product: Product) => {
      setEditingId(product.id);
      setTempFreight(product.freightCharge || 0);
  };

  const handleSaveFreight = (product: Product) => {
     if (tempFreight < 0) return;

     // 1. Update the Product Catalog with new default freight
     const updatedProduct = { ...product, freightCharge: tempFreight };
     updateProduct(updatedProduct);

     // 2. Propagate this change to all active (non-delivered, non-locked) orders
     // This automates the "Set Freight" process for running orders
     orders.forEach(order => {
         // Respect the 'isLocked' flag. Do not change prices for closed months/orders.
         if (order.status === 'DELIVERED' || order.isLocked) return; 

         const hasItem = order.items.some(i => i.productId === product.id);
         if (hasItem) {
             const updatedItems = order.items.map(item => {
                 if (item.productId === product.id) {
                     return {
                         ...item,
                         freightTotal: tempFreight * item.quantity
                     };
                 }
                 return item;
             });
             
             // Recalculate Freight Payment Status
             const newFreightTotal = updatedItems.reduce((sum, i) => sum + i.freightTotal, 0);
             let newFreightStatus = order.freightPaymentStatus;
             
             if (order.totalFreightPaid >= newFreightTotal && newFreightTotal > 0) {
                 newFreightStatus = 'PAID';
             } else if (order.totalFreightPaid > 0) {
                 newFreightStatus = 'PARTIAL';
             } else {
                 newFreightStatus = 'UNPAID';
             }

             updateOrder({ 
                 ...order, 
                 items: updatedItems,
                 freightPaymentStatus: newFreightStatus
             });
         }
     });

     setEditingId(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
                <div className="flex items-center text-blue-800 mb-2">
                    <Container className="mr-3" size={28}/>
                    <h2 className="text-3xl font-bold">Set Product Freight</h2>
                </div>
                <p className="text-gray-500 max-w-2xl">
                    Define freight charges per unit for each product. 
                    Updating a product here will automatically recalculate freight totals for all currently active running orders.
                </p>
            </div>
            
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
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Product Details</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Current Unit Freight</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredProducts.length === 0 ? (
                          <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">No products found.</td></tr>
                      ) : (
                          filteredProducts.map(product => (
                              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center">
                                          <div className="h-12 w-12 rounded-lg border border-gray-200 overflow-hidden mr-4 bg-gray-100">
                                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                          </div>
                                          <div>
                                              <div className="font-bold text-gray-800 text-sm">{product.name}</div>
                                              <div className="text-xs text-gray-500">{product.category}</div>
                                          </div>
                                      </div>
                                  </td>
                                  
                                  <td className="px-6 py-4">
                                      {editingId === product.id ? (
                                          <div className="flex items-center">
                                            <span className="text-sm font-bold text-gray-500 mr-2">Ksh</span>
                                            <input 
                                                type="number" 
                                                autoFocus
                                                className="w-32 p-2 border border-blue-400 rounded focus:ring-2 focus:ring-blue-200 outline-none font-bold text-gray-800"
                                                value={tempFreight}
                                                onChange={(e) => setTempFreight(parseFloat(e.target.value) || 0)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveFreight(product)}
                                            />
                                          </div>
                                      ) : (
                                          <div className="text-sm font-bold text-gray-700">
                                              Ksh {product.freightCharge?.toLocaleString() || '0'}
                                          </div>
                                      )}
                                  </td>

                                  <td className="px-6 py-4">
                                      {editingId === product.id ? (
                                          <div className="flex gap-2">
                                              <button 
                                                onClick={() => handleSaveFreight(product)}
                                                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-bold shadow-sm"
                                              >
                                                  <Save size={14} className="mr-1"/> Save
                                              </button>
                                              <button 
                                                onClick={() => setEditingId(null)}
                                                className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 text-xs font-bold"
                                              >
                                                  Cancel
                                              </button>
                                          </div>
                                      ) : (
                                          <button 
                                            onClick={() => handleStartEdit(product)}
                                            className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all"
                                          >
                                              <Edit2 size={14} className="mr-2"/> Set Freight
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg flex items-start text-blue-800 text-sm border border-blue-100">
              <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
              <p>
                  <strong>Note:</strong> Changing a freight charge here will update the unit cost for this product in the catalog. 
                  It will also automatically recalculate the Total Freight amount for all active orders that contain this item. 
                  Confirmed or Delivered orders are not affected.
              </p>
          </div>
      </div>
  );
};

export default Freight;
