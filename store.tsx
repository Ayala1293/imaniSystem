
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Product, Order, Client, PaymentTransaction, Catalog, ShopSettings, AuthLog, UserRole } from './types';
import { INITIAL_SHOP_SETTINGS } from './constants';
import { api } from './services/api';

interface AppContextType extends AppState {
  hasUsers: boolean | null;
  isLoading: boolean;
  isOffline: boolean;
  systemError: string | null;
  login: (username: string, password: string, role: UserRole) => Promise<{success: boolean, message: string}>;
  logout: () => void;
  registerUser: (name: string, username: string, password: string, role: UserRole) => Promise<{success: boolean, message: string}>;
  deleteUser: (id: string) => Promise<boolean>;
  changePassword: (oldPass: string, newPass: string) => Promise<{success: boolean, message: string}>;
  requestPasswordReset: (username: string) => Promise<{success: boolean, message: string}>;
  resetPassword: (token: string, newPass: string) => Promise<{success: boolean, message: string}>;
  factoryReset: () => Promise<void>;

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
  importData: (jsonData: string | object) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null); // Initialized to null
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Data State
  const [users, setUsers] = useState<User[]>([]); 
  const [authLogs] = useState<AuthLog[]>([]);
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
            let serverFound = false;
            for(let i=0; i<5; i++) {
                serverFound = await api.findActiveServer();
                if(serverFound) break;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!serverFound) {
                throw new Error("Cannot connect to server. Ensure the backend is running on port 5000.");
            }

            let initStatus;
            let attempts = 0;
            let lastErrorMsg = "";
            
            while(attempts < 15) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); 
                    initStatus = await api.checkSystemInit(controller.signal);
                    clearTimeout(timeoutId);
                    if (initStatus) break; 
                } catch(e: any) {
                    lastErrorMsg = e.message;
                    if (e.message.includes("NETWORK_ERROR")) {
                         throw new Error("Backend server connection lost.");
                    }
                    attempts++;
                    await new Promise(r => setTimeout(r, 2000)); 
                }
            }
            
            if (!initStatus) {
                if (lastErrorMsg.includes("503") || lastErrorMsg.includes("Database")) {
                    throw new Error("Database Server Unavailable. Ensure 'mongod' is running.");
                } else {
                    throw new Error("Backend not responding correctly.");
                }
            }

            if(!mounted) return;

            setHasUsers(initStatus.hasUsers);
            const settings = await api.fetchSettings();
            setShopSettings(settings);

            const token = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('currentUser');
            
            if (token && storedUser) {
                const userObj = JSON.parse(storedUser);
                try {
                    await api.fetchCatalogs();
                    setCurrentUser(userObj);
                    await refreshData();
                } catch (e) {
                    logout();
                }
            }
            setIsOffline(false);
            setSystemError(null);

        } catch (e: any) {
            if(!mounted) return;
            console.error("Critical System Error:", e);
            setIsOffline(true); 
            // In error case, assume we might have users to allow retry, or just block.
            // Leaving hasUsers as null or setting true prevents forcing Setup mode in error state.
            setHasUsers(true); 
            
            let msg = e.message || "System unavailable.";
            if (msg.includes("Failed to fetch")) msg = "Cannot connect to server. Check Port 5000.";

            setSystemError(msg);
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
          
          // Fetch users only if admin
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser && JSON.parse(storedUser).role === 'ADMIN') {
              try {
                  const usersRes = await api.fetchUsers();
                  setUsers(usersRes);
              } catch (e) {
                  console.warn("Could not fetch users (might not be admin)");
              }
          }
      } catch (err) {
          console.error("Failed to fetch data", err);
      } finally {
          setIsLoading(false);
      }
  };

  const login = async (username: string, password: string, role: UserRole) => {
    if (isOffline) {
        return { success: false, message: systemError || 'System Offline' };
    }

    try {
        const data = await api.login(username, password, role);
        localStorage.setItem('authToken', data.token);
        const user = { id: data._id, name: data.name, username: data.username, role: data.role };
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

  const registerUser = async (name: string, username: string, password: string, role: UserRole) => {
      if (isOffline) return { success: false, message: "System offline" };
      try {
          const data = await api.register(name, username, password, role);
          // If this was the first user (setup), auto login
          if (!currentUser) {
             localStorage.setItem('authToken', data.token);
             const user = { id: data._id, name: data.name, username: data.username, role: data.role };
             localStorage.setItem('currentUser', JSON.stringify(user));
             setCurrentUser(user);
             // CRITICAL: Update hasUsers to true so App.tsx doesn't bounce back to Setup
             setHasUsers(true); 
             await refreshData();
          } else {
             // If added by admin, refresh list
             const usersRes = await api.fetchUsers();
             setUsers(usersRes);
          }
          return { success: true, message: "User created successfully" };
      } catch (err: any) {
          return { success: false, message: err.message };
      }
  };

  const deleteUser = async (id: string) => {
      try {
          await api.deleteUser(id);
          setUsers(prev => prev.filter(u => u.id !== id));
          return true;
      } catch (e: any) {
          alert(e.message);
          return false;
      }
  };
  
  const factoryReset = async () => {
      await api.factoryReset();
      window.location.reload();
  };

  // --- CRUD WRAPPERS ---

  const addCatalog = async (catalog: Partial<Catalog>) => {
      if (isOffline) return;
      try { 
          const newCat = await api.createCatalog(catalog); 
          setCatalogs(prev => [newCat, ...prev]); 
      } catch (e: any) { 
          alert(`Catalog Creation Failed: ${e.message}`); 
      }
  };

  const updateCatalog = async (catalog: Catalog) => {
      if (isOffline) return;
      try { 
          const updated = await api.updateCatalog(catalog); 
          setCatalogs(prev => prev.map(c => c.id === updated.id ? updated : c)); 
      } catch (e: any) { 
          alert(`Update Failed: ${e.message}`); 
      }
  };

  const deleteCatalog = (_id: string) => { console.warn("Not implemented"); };

  const addProduct = async (product: Product) => {
      if (isOffline) return;
      try { const newProd = await api.createProduct(product); setProducts(prev => [...prev, newProd]); } catch (e: any) { alert(`Product Creation Failed: ${e.message}`); }
  };

  const updateProduct = async (product: Product) => {
      if (isOffline) return;
      try { const updated = await api.updateProduct(product); setProducts(prev => prev.map(p => p.id === updated.id ? updated : p)); } catch (e) { alert("Action failed"); }
  };
  
  const updateProductStock = async (id: string, updates: Partial<Product>) => {
      if (isOffline) return;
      try { 
          const updated = await api.updateProductStock(id, updates); 
          setProducts(prev => prev.map(p => p.id === updated.id ? updated : p)); 
      } catch (e: any) { 
          alert(`Stock Update Failed: ${e.message}`); 
      }
  };

  const deleteProduct = async (id: string) => {
      if (isOffline) return;
      try { await api.deleteProduct(id); setProducts(prev => prev.filter(p => p.id !== id)); } catch (e) { alert("Action failed"); }
  };

  const addClient = async (client: Client) => {
      if (isOffline) return;
      try { const newClient = await api.createClient(client); setClients(prev => [...prev, newClient]); } catch (e: any) { alert(`Client Creation Failed: ${e.message}`); }
  };
  
  const addClientsBulk = async (newClients: Partial<Client>[]) => {
      if (isOffline) return 0;
      try {
          const result = await api.createClientsBulk(newClients);
          if (Array.isArray(result)) {
              setClients(prev => [...prev, ...result]);
              return result.length;
          } else if (result && result.insertedCount) {
              const updatedClients = await api.fetchClients();
              setClients(updatedClients);
              return result.insertedCount;
          }
          return 0;
      } catch(e: any) {
          alert(`Import Failed: ${e.message}`);
          return 0;
      }
  };

  const updateClient = (_client: Client) => { /* Placeholder */ };

  const addOrder = async (order: Order) => {
      if (isOffline) return;
      try { const newOrder = await api.createOrder(order); setOrders(prev => [...prev, newOrder]); } catch (e) { alert("Action failed"); }
  };

  const updateOrder = async (order: Order) => {
      if (isOffline) return;
      try { const updated = await api.updateOrder(order); setOrders(prev => prev.map(o => o.id === updated.id ? updated : o)); } catch (e) { alert("Action failed"); }
  };

  const addPayment = async (payment: PaymentTransaction) => {
      if (isOffline) return;
      try { 
          const newPay = await api.createPayment(payment); 
          setPayments(prev => [...prev, newPay]);
          const updatedOrders = await api.fetchOrders();
          setOrders(updatedOrders);
      } catch (e) { alert("Action failed"); }
  };

  const updateShopSettings = async (settings: ShopSettings) => {
      if (isOffline) return;
      try { const updated = await api.updateSettings(settings); setShopSettings(updated); } catch (e) { alert("Action failed"); }
  };

  const changePassword = async (_oldPass: string, _newPass: string) => ({ success: true, message: "Demo: Password changed" });
  const requestPasswordReset = async (_username: string) => ({ success: true, message: "Demo: Reset sent" });
  const resetPassword = async (_token: string, _newPass: string) => ({ success: true, message: "Demo: Password reset" });
  
  const importData = async (jsonData: string | object) => {
      if (isOffline) return false;
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
      currentUser, users, hasUsers, isLoading, isOffline, systemError, authLogs, catalogs, products, clients, orders, payments, shopSettings,
      login, logout, registerUser, deleteUser, changePassword, requestPasswordReset, resetPassword, factoryReset,
      addCatalog, updateCatalog, deleteCatalog, addProduct, updateProduct, updateProductStock, deleteProduct,
      addClient, updateClient, addClientsBulk, addOrder, updateOrder, addPayment, updateShopSettings,
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
