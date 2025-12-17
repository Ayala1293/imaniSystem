
import { useAppStore } from '../store';
import { DollarSign, Package, ShoppingBag, Truck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard = () => {
  const { orders, products, payments } = useAppStore();

  // KPIs
  const totalOrders = orders.length;
  const activeMonthRevenueFOB = orders.reduce((sum, order) => {
    return sum + order.items.reduce((isum, item) => isum + item.fobTotal, 0);
  }, 0);
  
  const pendingShipments = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED').length;

  // Chart Data Preparation
  const data = [
    { name: 'Week 1', orders: 4, revenue: 1200 },
    { name: 'Week 2', orders: 7, revenue: 2100 },
    { name: 'Week 3', orders: 5, revenue: 1800 },
    { name: 'Week 4', orders: 9, revenue: 2800 },
  ];

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
      <div className={`p-4 rounded-full ${color} mr-4`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Executive Dashboard</h2>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Monthly Orders" value={totalOrders} icon={ShoppingBag} color="bg-blue-500" />
        <StatCard title="Est. FOB Revenue" value={`$${activeMonthRevenueFOB.toLocaleString()}`} icon={DollarSign} color="bg-green-500" />
        <StatCard title="Active Shipments" value={pendingShipments} icon={Truck} color="bg-orange-500" />
        <StatCard title="Product Catalog" value={products.length} icon={Package} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Order Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  cursor={{fill: '#f3f4f6'}}
                />
                <Legend />
                <Bar dataKey="orders" name="Orders Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Payments</h3>
            <div className="space-y-4">
                {payments.slice(-4).reverse().map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-3"></div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{p.payerName}</p>
                                <p className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span className="font-bold text-green-600">+${p.amount}</span>
                    </div>
                ))}
                {payments.length === 0 && <p className="text-gray-400 text-sm">No recent payments recorded.</p>}
            </div>
            <button className="w-full mt-6 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors">
                View All Transactions
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
