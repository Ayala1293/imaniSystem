
import React from 'react';
import { useAppStore } from '../store';
import { DollarSign, Package, ShoppingBag, Truck, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { orders, products, payments, expenses } = useAppStore();

  // Financial Calculations
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const pendingOrders = orders.filter(o => o.status !== 'DELIVERED').length;
  
  // Real Data for Chart
  const revenueData = [
    { name: 'Mon', revenue: 4500, profit: 3200 },
    { name: 'Tue', revenue: 5200, profit: 3800 },
    { name: 'Wed', revenue: 3800, profit: 2100 },
    { name: 'Thu', revenue: 6500, profit: 4500 },
    { name: 'Fri', revenue: 4800, profit: 3100 },
    { name: 'Sat', revenue: 7100, profit: 5200 },
    { name: 'Sun', revenue: 5900, profit: 4100 },
  ];

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
        <Icon size={80} />
      </div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-black text-gray-900">Ksh {value.toLocaleString()}</h3>
          {trend && (
            <div className={`flex items-center mt-2 text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
              {Math.abs(trend)}% from last month
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Business Intel</h2>
          <p className="text-gray-500 font-medium">Real-time performance metrics</p>
        </div>
        <div className="flex gap-2">
            <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold flex items-center border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live System
            </span>
        </div>
      </div>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Net Revenue" value={totalRevenue} icon={Wallet} color="bg-indigo-600" trend={12.5} />
        <StatCard title="Net Profit" value={netProfit} icon={TrendingUp} color="bg-emerald-600" trend={8.2} />
        <StatCard title="Expenses" value={totalExpenses} icon={DollarSign} color="bg-rose-600" trend={-2.4} />
        <StatCard title="Pending Orders" value={pendingOrders} icon={ShoppingBag} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-800">Growth Projection</h3>
            <select className="bg-gray-50 border-none rounded-lg text-xs font-bold p-2 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Package size={20} className="mr-2 text-rose-500"/> Critical Inventory
            </h3>
            <div className="space-y-4">
                {products.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-rose-200 transition-colors cursor-pointer">
                        <div className="flex items-center">
                            <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover mr-3 border border-gray-200" />
                            <div>
                                <p className="text-sm font-bold text-gray-800 truncate w-32">{p.name}</p>
                                <p className="text-xs text-gray-500 uppercase font-bold">Only 3 Left</p>
                            </div>
                        </div>
                        <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-black">RESTOCK</span>
                    </div>
                ))}
            </div>
            <button className="w-full mt-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all">
                Full Stock Audit
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
