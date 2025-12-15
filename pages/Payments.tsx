
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { CreditCard, Calendar, ArrowLeft } from 'lucide-react';

const Payments = () => {
  const { payments, catalogs, orders, products } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  // --- Filter Logic ---
  // Get all client IDs who have an order containing items from the active catalog
  const relevantClientIds = new Set<string>();
  if (activeCatalogId) {
      orders.forEach(order => {
          const hasItemInCatalog = order.items.some(item => {
              const prod = products.find(p => p.id === item.productId);
              return prod?.catalogId === activeCatalogId;
          });
          if (hasItemInCatalog) {
              relevantClientIds.add(order.clientId);
          }
      });
  }

  // Filter payments from those clients
  const filteredPayments = activeCatalogId 
    ? payments.filter(p => p.clientId && relevantClientIds.has(p.clientId))
    : [];

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div>
                  <h2 className="text-3xl font-bold text-gray-800">Payment History</h2>
                  <p className="text-gray-500">Select a catalog month to view payments from clients associated with that shipment.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalogs.map(catalog => (
                      <div 
                          key={catalog.id} 
                          onClick={() => setActiveCatalogId(catalog.id)}
                          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                                  <CreditCard size={24} />
                              </div>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                                  {new Date(catalog.closingDate).toLocaleDateString()}
                              </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{catalog.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 mb-4">
                              <Calendar size={14} className="mr-2" />
                              <span>Deadline: {new Date(catalog.closingDate).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                             Click to view logs
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

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
                <h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name} Payments</h2>
                <p className="text-sm text-gray-500">Transaction logs for clients in this cycle.</p>
            </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-700">Transaction Logs</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white">
                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Payer Name</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Reference Message</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredPayments.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No relevant payments found for clients in this catalog.</td></tr>
                        ) : (
                            filteredPayments.slice().reverse().map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.date).toLocaleDateString()} {new Date(p.date).toLocaleTimeString()}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.payerName}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-blue-600 bg-blue-50 w-fit rounded">{p.transactionCode}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={p.rawMessage}>{p.rawMessage}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">+Ksh {p.amount.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Payments;
