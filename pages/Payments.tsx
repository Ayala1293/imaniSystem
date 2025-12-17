
import { useState } from 'react';
import { useAppStore } from '../store';
import { CreditCard, ArrowLeft } from 'lucide-react';

const Payments = () => {
  const { payments, catalogs, orders, products } = useAppStore();
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);

  const activeCatalog = catalogs.find(c => c.id === activeCatalogId);

  const relevantClientIds = new Set<string>();
  if (activeCatalogId) {
      orders.forEach(order => {
          if (order.items.some(item => products.find(p => p.id === item.productId)?.catalogId === activeCatalogId)) {
              relevantClientIds.add(order.clientId);
          }
      });
  }

  const filteredPayments = activeCatalogId ? payments.filter(p => p.clientId && relevantClientIds.has(p.clientId)) : [];

  if (!activeCatalogId) {
      return (
          <div className="space-y-6">
              <div><h2 className="text-3xl font-bold text-gray-800">Payments</h2><p className="text-gray-500">Select catalog.</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{catalogs.map(c => {
                   // Calculate approximate payments for this catalog (based on orders in it)
                   // Note: This is an estimation for display since payments aren't directly linked to catalogs, but to orders/clients
                   let estTotal = 0;
                   const catOrders = orders.filter(o => o.items.some(i => products.find(p => p.id === i.productId)?.catalogId === c.id));
                   const catClients = new Set(catOrders.map(o => o.clientId));
                   // Filter payments from clients active in this catalog
                   const catPayments = payments.filter(p => p.clientId && catClients.has(p.clientId));
                   estTotal = catPayments.reduce((acc, p) => acc + p.amount, 0);

                   return (
                  <div key={c.id} onClick={() => setActiveCatalogId(c.id)} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover-glow relative overflow-hidden">
                      <div className="flex mb-4"><div className="p-3 theme-bg-light theme-text rounded-lg"><CreditCard size={24} /></div></div>
                      <h3 className="text-xl font-bold text-gray-800">{c.name}</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                          <div><p className="text-xs text-gray-400 font-medium uppercase">Transactions</p><p className="text-lg font-bold text-gray-800">{catPayments.length}</p></div>
                          <div><p className="text-xs text-gray-400 font-medium uppercase">Total Value</p><p className="text-lg font-bold text-green-600">~Ksh {estTotal.toLocaleString()}</p></div>
                      </div>
                  </div>
              )})}</div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4 mb-2"><button onClick={() => setActiveCatalogId(null)} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft size={20} className="text-gray-600"/></button><h2 className="text-3xl font-bold text-gray-800">{activeCatalog?.name} Payments</h2></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-700">Logs</h3></div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white"><tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b"><th className="px-6 py-4">Date</th><th className="px-6 py-4">Payer</th><th className="px-6 py-4">Code</th><th className="px-6 py-4 text-right">Amount</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredPayments.slice().reverse().map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.payerName}</td>
                                <td className="px-6 py-4 text-sm font-mono text-gray-700 bg-gray-100 w-fit rounded px-2">{p.transactionCode}</td>
                                <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">+Ksh {p.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Payments;
