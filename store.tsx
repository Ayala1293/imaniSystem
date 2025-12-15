
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Product, Order, Client, PaymentTransaction, Catalog, ShopSettings, AuthLog, UserRole } from './types';
import { INITIAL_SHOP_SETTINGS, INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_ORDERS, INITIAL_CATALOGS, INITIAL_PAYMENTS } from './constants';
import { api } from './services/api';

interface AppContextType extends AppState {
  hasUsers: boolean;
  isLoading: boolean;
  isOffline: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{success: boolean, message: string}>;
  logout: () => void;
  registerUser: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  changePassword: (oldPass: string, newPass: string) => Promise<{success: boolean, message: string}>;
  requestPasswordReset: (email: string) => Promise<{success: boolean, message: string}>;
  resetPassword: (token: string, newPass: string) => Promise<{success: boolean, message: string}>;
  
  addCatalog: (catalog: Partial<Catalog>) => void;
  updateCatalog: (catalog: Catalog) => void;
  deleteCatalog: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  addPayment: (payment: PaymentTransaction) => void;
  updateShopSettings: (settings: ShopSettings) => void;
  importData: (jsonData: string | object) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasUsers, setHasUsers] = useState(true); 
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Data State
  const [users, setUsers] = useState<User[]>([]); 
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings>(INITIAL_SHOP_SETTINGS);

  // Navigation State
  const [currentView, setCurrentView] = useState('orders');
  const [pendingOrderClientId, setPendingOrderClientId] = useState<string | null>(null);

  // Initialize App
  useEffect(() => {
    let mounted = true;
    const init = async () => {
        try {
            // Check if backend is alive and if it has users
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); 
            
            let initStatus;
            try {
                initStatus = await api.checkSystemInit(controller.signal);
            } catch (err) {
                throw new Error("Backend Unreachable");
            } finally {
                clearTimeout(timeoutId);
            }

            if(!mounted) return;

            setHasUsers(initStatus.hasUsers);
            
            // Fetch Global Settings
            const settings = await api.fetchSettings();
            setShopSettings(settings);

            const token = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('currentUser');
            
            if (token && storedUser) {
                const userObj = JSON.parse(storedUser);
                setCurrentUser(userObj);
                await refreshData();
            }
            setIsOffline(false);
        } catch (e) {
            if(!mounted) return;
            console.warn("Backend unavailable, switching to Offline Mode.");
            setIsOffline(true);
            setHasUsers(true);
            
            // Load Mock Data
            setShopSettings(INITIAL_SHOP_SETTINGS);
            setCatalogs(INITIAL_CATALOGS);
            setProducts(INITIAL_PRODUCTS);
            setClients(INITIAL_CLIENTS);
            setOrders(INITIAL_ORDERS);
            setPayments(INITIAL_PAYMENTS);
            
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser));
            }
        }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const refreshData = async () => {
      setIsLoading(true);
      try {
          const [catRes, prodRes, cliRes, ordRes, payRes] = await Promise.all([
              api.fetchCatalogs(),
              api.fetchProducts(),
              api.fetchClients(),
              api.fetchOrders(),
              api.fetchPayments()
          ]);
          setCatalogs(catRes);
          setProducts(prodRes);
          setClients(cliRes);
          setOrders(ordRes);
          setPayments(payRes);
      } catch (err) {
          console.error("Failed to fetch data", err);
      } finally {
          setIsLoading(false);
      }
  };

  const login = async (email: string, password: string, role: UserRole) => {
    if (isOffline) {
        if (email.includes('shop.com')) {
             const mockUser = { id: 'offline-u1', name: 'Offline Admin', email, role };
             localStorage.setItem('currentUser', JSON.stringify(mockUser));
             setCurrentUser(mockUser);
             return { success: true, message: 'Offline Mode: Logged in' };
        }
        return { success: false, message: 'Offline Mode: Use any @shop.com email' };
    }

    try {
        const data = await api.login(email, password, role);
        localStorage.setItem('authToken', data.token);
        const user = { id: data._id, name: data.name, email: data.email, role: data.role };
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
        await refreshData();
        return { success: true, message: 'Login successful' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setOrders([]);
    setProducts([]);
  };

  const registerUser = async (name: string, email: string, password: string, role: UserRole) => {
      if (isOffline) return false;
      try {
          const data = await api.register(name, email, password, role);
          if (!currentUser) {
             localStorage.setItem('authToken', data.token);
             const user = { id: data._id, name: data.name, email: data.email, role: data.role };
             localStorage.setItem('currentUser', JSON.stringify(user));
             setCurrentUser(user);
             await refreshData();
          }
          return true;
      } catch (err) {
          console.error(err);
          return false;
      }
  };

  // --- CRUD WRAPPERS ---

  const addCatalog = async (catalog: Partial<Catalog>) => {
      if (isOffline) { setCatalogs(prev => [{...catalog, id: `mock-${Date.now()}`} as Catalog, ...prev]); return; }
      try { const newCat = await api.createCatalog(catalog); setCatalogs(prev => [newCat, ...prev]); } catch (e) { alert("Action failed"); }
  };

  const updateCatalog = async (catalog: Catalog) => {
      if (isOffline) { setCatalogs(prev => prev.map(c => c.id === catalog.id ? catalog : c)); return; }
      try { const updated = await api.updateCatalog(catalog); setCatalogs(prev => prev.map(c => c.id === updated.id ? updated : c)); } catch (e) { alert("Action failed"); }
  };

  const deleteCatalog = (id: string) => { console.warn("Not implemented"); };

  const addProduct = async (product: Product) => {
      if (isOffline) { setProducts(prev => [...prev, product]); return; }
      try { const newProd = await api.createProduct(product); setProducts(prev => [...prev, newProd]); } catch (e) { alert("Action failed"); }
  };

  const updateProduct = async (product: Product) => {
      if (isOffline) { setProducts(prev => prev.map(p => p.id === product.id ? product : p)); return; }
      try { const updated = await api.updateProduct(product); setProducts(prev => prev.map(p => p.id === updated.id ? updated : p)); } catch (e) { alert("Action failed"); }
  };

  const deleteProduct = async (id: string) => {
      if (isOffline) { setProducts(prev => prev.filter(p => p.id !== id)); return; }
      try { await api.deleteProduct(id); setProducts(prev => prev.filter(p => p.id !== id)); } catch (e) { alert("Action failed"); }
  };

  const addClient = async (client: Client) => {
      if (isOffline) { setClients(prev => [...prev, client]); return; }
      try { const newClient = await api.createClient(client); setClients(prev => [...prev, newClient]); } catch (e) { alert("Action failed"); }
  };

  const updateClient = (client: Client) => { /* Placeholder */ };

  const addOrder = async (order: Order) => {
      if (isOffline) { setOrders(prev => [...prev, order]); return; }
      try { const newOrder = await api.createOrder(order); setOrders(prev => [...prev, newOrder]); } catch (e) { alert("Action failed"); }
  };

  const updateOrder = async (order: Order) => {
      if (isOffline) { setOrders(prev => prev.map(o => o.id === order.id ? order : o)); return; }
      try { const updated = await api.updateOrder(order); setOrders(prev => prev.map(o => o.id === updated.id ? updated : o)); } catch (e) { alert("Action failed"); }
  };

  const addPayment = async (payment: PaymentTransaction) => {
      if (isOffline) { setPayments(prev => [...prev, payment]); return; }
      try { 
          const newPay = await api.createPayment(payment); 
          setPayments(prev => [...prev, newPay]);
          const updatedOrders = await api.fetchOrders();
          setOrders(updatedOrders);
      } catch (e) { alert("Action failed"); }
  };

  const updateShopSettings = async (settings: ShopSettings) => {
      if (isOffline) { setShopSettings(settings); return; }
      try { const updated = await api.updateSettings(settings); setShopSettings(updated); } catch (e) { alert("Action failed"); }
  };

  const changePassword = async () => ({ success: true, message: "Demo: Password changed" });
  const requestPasswordReset = async () => ({ success: true, message: "Demo: Reset sent" });
  const resetPassword = async () => ({ success: true, message: "Demo: Password reset" });
  
  const importData = async (jsonData: string | object) => {
      if (isOffline) {
          alert("Cannot import data in Offline Mode. Please connect backend.");
          return false;
      }
      try {
          let data;
          if (typeof jsonData === 'string') {
            data = JSON.parse(jsonData);
          } else {
            data = jsonData;
          }
          await api.importSystemData(data);
          await refreshData();
          return true;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, hasUsers, isLoading, isOffline, authLogs, catalogs, products, clients, orders, payments, shopSettings,
      login, logout, registerUser, changePassword, requestPasswordReset, resetPassword,
      addCatalog, updateCatalog, deleteCatalog, addProduct, updateProduct, deleteProduct,
      addClient, updateClient, addOrder, updateOrder, addPayment, updateShopSettings,
      currentView, setCurrentView, pendingOrderClientId, setPendingOrderClientId, importData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
