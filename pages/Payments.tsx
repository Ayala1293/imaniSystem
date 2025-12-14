import React from 'react';
import { useAppStore } from '../store';

const Payments = () => {
  const { payments } = useAppStore();

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Payment History</h2>
        <p className="text-gray-500">View all recorded M-Pesa transactions. To add a new payment, use the <strong>Running Orders</strong> section.</p>

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
                        {payments.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No payments recorded yet.</td></tr>
                        ) : (
                            payments.slice().reverse().map(p => (
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