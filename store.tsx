
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Product, Order, Client, PaymentTransaction, Catalog, ShopSettings, UserRole, Expense } from './types';
import { INITIAL_SHOP_SETTINGS, INITIAL_CATALOGS, INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_ORDERS, INITIAL_PAYMENTS, MOCK_USERS } from './constants';

interface AppContextType extends AppState {
  login: (username: string, password: string, role: UserRole) => Promise<{success: boolean, message: string}>;
  logout: () => void;
  registerUser: (name: string, username: string, password: string, role: UserRole) => Promise<{success: boolean, message: string}>;
  deleteUser: (id: string) => Promise<boolean>;
  addCatalog: (catalog: Partial<Catalog>) => void;
  updateCatalog: (catalog: Catalog) => void;
  deleteCatalog: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  updateProductStock: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => void;
  addClient: (client: Client) => void;
  addClientsBulk: (clients: Partial<Client>[]) => Promise<number>;
  updateClient: (client: Client) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  addPayment: (payment: PaymentTransaction) => void;
  updateShopSettings: (settings: ShopSettings) => void;
  importData: (data: any) => Promise<boolean>;
  factoryReset: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getLocal = (key: string, fallback: any) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(getLocal('currentUser', null));
  const [users, setUsers] = useState<User[]>(getLocal('users', MOCK_USERS));
  const [catalogs, setCatalogs] = useState<Catalog[]>(getLocal('catalogs', INITIAL_CATALOGS));
  const [products, setProducts] = useState<Product[]>(getLocal('products', INITIAL_PRODUCTS));
  const [clients, setClients] = useState<Client[]>(getLocal('clients', INITIAL_CLIENTS));
  const [orders, setOrders] = useState<Order[]>(getLocal('orders', INITIAL_ORDERS));
  const [payments, setPayments] = useState<PaymentTransaction[]>(getLocal('payments', INITIAL_PAYMENTS));
  const [shopSettings, setShopSettings] = useState<ShopSettings>(getLocal('shopSettings', INITIAL_SHOP_SETTINGS));
  const [expenses, setExpenses] = useState<Expense[]>(getLocal('expenses', []));
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [pendingOrderClientId, setPendingOrderClientId] = useState<string | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean | null>(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleConnectivity = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleConnectivity);
    window.addEventListener('offline', handleConnectivity);
    return () => {
      window.removeEventListener('online', handleConnectivity);
      window.removeEventListener('offline', handleConnectivity);
    };
  }, []);

  useEffect(() => { localStorage.setItem('currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('catalogs', JSON.stringify(catalogs)); }, [catalogs]);
  useEffect(() => { localStorage.setItem('products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('shopSettings', JSON.stringify(shopSettings)); }, [shopSettings]);
  useEffect(() => { localStorage.setItem('expenses', JSON.stringify(expenses)); }, [expenses]);

  const login = async (username: string, password: string, role: UserRole) => {
    const user = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.role === role &&
      (u.passwordHash === password || u.id === 'u1') // Standard check, u1 is admin override for dev
    );

    if (user) {
      setCurrentUser(user);
      return { success: true, message: 'Login successful' };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const registerUser = async (name: string, username: string, pass: string, role: UserRole) => {
    const newUser = { 
      id: Math.random().toString(36).substr(2, 9), 
      name, 
      username, 
      role,
      passwordHash: pass // Store password for local check
    };
    setUsers([...users, newUser]);
    return { success: true, message: 'User registered' };
  };

  const deleteUser = async (id: string) => {
    if (id === 'u1') return false; // Protect system admin
    setUsers(users.filter(u => u.id !== id));
    return true;
  };

  const addCatalog = (catalog: Partial<Catalog>) => {
    const newCat = { ...catalog, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() } as Catalog;
    setCatalogs([newCat, ...catalogs]);
  };

  const updateCatalog = (catalog: Catalog) => {
    setCatalogs(catalogs.map(c => c.id === catalog.id ? catalog : c));
  };

  const deleteCatalog = (id: string) => {
    setCatalogs(catalogs.filter(c => c.id !== id));
  };

  const addProduct = (product: Product) => {
    const newProd = { ...product, id: Math.random().toString(36).substr(2, 9) };
    setProducts([...products, newProd]);
  };

  const updateProduct = (product: Product) => {
    setProducts(products.map(p => p.id === product.id ? product : p));
  };

  const updateProductStock = async (id: string, updates: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addClient = (client: Client) => {
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) };
    setClients([...clients, newClient]);
  };

  const updateClient = (client: Client) => {
    setClients(clients.map(c => c.id === client.id ? client : c));
  };

  const addClientsBulk = async (newClients: Partial<Client>[]) => {
    const clientsWithIds = newClients.map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) } as Client));
    setClients([...clients, ...clientsWithIds]);
    return clientsWithIds.length;
  };

  const addOrder = (order: Order) => {
    const newOrder = { ...order, id: Math.random().toString(36).substr(2, 9) };
    setOrders([...orders, newOrder]);
  };

  const updateOrder = (order: Order) => {
    setOrders(orders.map(o => o.id === order.id ? order : o));
  };

  const addPayment = (payment: PaymentTransaction) => {
    const newPay = { ...payment, id: Math.random().toString(36).substr(2, 9) };
    setPayments([...payments, newPay]);
  };

  const updateShopSettings = (settings: ShopSettings) => {
    setShopSettings(settings);
  };

  const importData = async (data: any) => {
    if (data.catalogs) setCatalogs(data.catalogs);
    if (data.products) setProducts(data.products);
    if (data.clients) setClients(data.clients);
    if (data.orders) setOrders(data.orders);
    if (data.payments) setPayments(data.payments);
    if (data.shopSettings) setShopSettings(data.shopSettings);
    return true;
  };

  const factoryReset = async () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, hasUsers, catalogs, products, clients, orders, payments, expenses, shopSettings,
      login, logout, registerUser, deleteUser, addCatalog, updateCatalog, deleteCatalog, addProduct, 
      updateProduct, updateProductStock, deleteProduct, addClient, updateClient, addClientsBulk, 
      addOrder, updateOrder, addPayment, updateShopSettings, currentView, setCurrentView, 
      pendingOrderClientId, setPendingOrderClientId, importData, factoryReset, isOffline
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within an AppProvider');
  return context;
};
