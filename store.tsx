
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Product, Order, Client, PaymentTransaction, OrderItem, Catalog, ShopSettings, AuthLog, UserRole } from './types';
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_ORDERS, INITIAL_PAYMENTS, INITIAL_CATALOGS, INITIAL_SHOP_SETTINGS } from './constants';
// @ts-ignore
import bcrypt from 'bcryptjs';

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<{success: boolean, message: string}>;
  logout: () => void;
  registerUser: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  changePassword: (oldPass: string, newPass: string) => Promise<{success: boolean, message: string}>;
  requestPasswordReset: (email: string) => Promise<{success: boolean, message: string}>;
  resetPassword: (token: string, newPass: string) => Promise<{success: boolean, message: string}>;
  
  addCatalog: (catalog: Catalog) => void;
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
  importData: (jsonData: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for local storage persistence
const getPersistedState = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const setPersistedState = <T,>(key: string, value: T) => {
  try {
    const stringified = JSON.stringify(value);
    if (localStorage.getItem(key) === stringified) return;
    localStorage.setItem(key, stringified);
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize state from localStorage or fallback to constants
  const [users, setUsers] = useState<User[]>(() => getPersistedState('users', []));
  const [authLogs, setAuthLogs] = useState<AuthLog[]>(() => getPersistedState('authLogs', []));
  
  const [catalogs, setCatalogs] = useState<Catalog[]>(() => getPersistedState('catalogs', INITIAL_CATALOGS));
  const [products, setProducts] = useState<Product[]>(() => getPersistedState('products', INITIAL_PRODUCTS));
  const [clients, setClients] = useState<Client[]>(() => getPersistedState('clients', INITIAL_CLIENTS));
  const [orders, setOrders] = useState<Order[]>(() => getPersistedState('orders', INITIAL_ORDERS));
  const [payments, setPayments] = useState<PaymentTransaction[]>(() => getPersistedState('payments', INITIAL_PAYMENTS));
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => getPersistedState('shopSettings', INITIAL_SHOP_SETTINGS));

  // Navigation State
  const [currentView, setCurrentView] = useState('orders');
  const [pendingOrderClientId, setPendingOrderClientId] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // If no users exist, create default admin
    const initAuth = async () => {
        if (users.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('password123', salt);
            const defaultAdmin: User = {
                id: 'admin-1',
                name: 'System Admin',
                email: 'admin@shop.com',
                role: 'ADMIN',
                passwordHash: hash
            };
            setUsers([defaultAdmin]);
        }
    };
    initAuth();
  }, [users.length]);

  // --- AUTHENTICATION LOGIC ---

  const logAuthEvent = (email: string, action: AuthLog['action'], details?: string) => {
    const newLog: AuthLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        email,
        action,
        details
    };
    setAuthLogs(prev => [newLog, ...prev]);
  };

  const login = async (email: string, password: string): Promise<{success: boolean, message: string}> => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
        logAuthEvent(email, 'LOGIN_FAILED', 'User not found');
        return { success: false, message: 'Invalid email or password.' };
    }

    if (!user.passwordHash) {
        // Legacy mock user support - should not happen in prod
        return { success: false, message: 'Legacy account. Please contact support.' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (isMatch) {
        setCurrentUser(user);
        localStorage.setItem('currentUserId', user.id);
        logAuthEvent(email, 'LOGIN_SUCCESS');
        return { success: true, message: 'Login successful' };
    } else {
        logAuthEvent(email, 'LOGIN_FAILED', 'Incorrect password');
        return { success: false, message: 'Invalid email or password.' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
  };

  const registerUser = async (name: string, email: string, password: string, role: UserRole): Promise<boolean> => {
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return false;
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      const newUser: User = {
          id: `u-${Date.now()}`,
          name,
          email,
          role,
          passwordHash: hash
      };
      
      setUsers(prev => [...prev, newUser]);
      return true;
  };

  const changePassword = async (oldPass: string, newPass: string): Promise<{success: boolean, message: string}> => {
      if (!currentUser || !currentUser.passwordHash) return { success: false, message: "Not logged in" };

      const isMatch = await bcrypt.compare(oldPass, currentUser.passwordHash);
      if (!isMatch) return { success: false, message: "Current password incorrect." };

      if (newPass.length < 6) return { success: false, message: "Password must be at least 6 characters." };

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPass, salt);

      const updatedUser = { ...currentUser, passwordHash: hash };
      
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      logAuthEvent(currentUser.email, 'PASSWORD_CHANGE');
      
      return { success: true, message: "Password updated successfully." };
  };

  const requestPasswordReset = async (email: string): Promise<{success: boolean, message: string}> => {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { success: false, message: "If that email exists, a code has been sent." }; // Security: Don't reveal user existence

      // Generate random token
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 15); // 15 mins expiry

      const updatedUser = { ...user, resetToken: token, resetTokenExpiry: expiry.toISOString() };
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

      logAuthEvent(email, 'RESET_REQUEST');

      // SIMULATION: Since we have no backend email server, we show the code in an alert
      // In production, this would be: await sendEmail(email, token);
      console.log(`[SIMULATED EMAIL] To: ${email}, Code: ${token}`);
      
      return { success: true, message: `SIMULATION: Your reset code is ${token}` };
  };

  const resetPassword = async (token: string, newPass: string): Promise<{success: boolean, message: string}> => {
      const user = users.find(u => u.resetToken === token);
      
      if (!user || !user.resetTokenExpiry) {
          return { success: false, message: "Invalid code." };
      }

      if (new Date() > new Date(user.resetTokenExpiry)) {
          return { success: false, message: "Code expired." };
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPass, salt);

      const updatedUser: User = { 
          ...user, 
          passwordHash: hash, 
          resetToken: undefined, 
          resetTokenExpiry: undefined 
      };

      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      return { success: true, message: "Password reset successful. Please login." };
  };

  // --- DATA SYNC & PERSISTENCE ---

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        switch (e.key) {
          case 'users': setUsers(parsed); break;
          case 'authLogs': setAuthLogs(parsed); break;
          case 'catalogs': setCatalogs(parsed); break;
          case 'products': setProducts(parsed); break;
          case 'clients': setClients(parsed); break;
          case 'orders': setOrders(parsed); break;
          case 'payments': setPayments(parsed); break;
          case 'shopSettings': setShopSettings(parsed); break;
        }
      } catch (err) {
        console.error("Failed to sync state from storage event", err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => setPersistedState('users', users), [users]);
  useEffect(() => setPersistedState('authLogs', authLogs), [authLogs]);
  useEffect(() => setPersistedState('catalogs', catalogs), [catalogs]);
  useEffect(() => setPersistedState('products', products), [products]);
  useEffect(() => setPersistedState('clients', clients), [clients]);
  useEffect(() => setPersistedState('orders', orders), [orders]);
  useEffect(() => setPersistedState('payments', payments), [payments]);
  useEffect(() => setPersistedState('shopSettings', shopSettings), [shopSettings]);

  // Load user from session if available
  useEffect(() => {
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
      const user = users.find(u => u.id === storedUserId);
      if (user) setCurrentUser(user);
    }
  }, [users]); // Re-run if users load later

  // Standard CRUD...
  const addCatalog = (catalog: Catalog) => setCatalogs(prev => [catalog, ...prev]);
  const updateCatalog = (catalog: Catalog) => setCatalogs(prev => prev.map(c => c.id === catalog.id ? catalog : c));
  const deleteCatalog = (id: string) => setCatalogs(prev => prev.filter(c => c.id !== id));
  const addProduct = (product: Product) => setProducts(prev => [...prev, product]);
  const updateProduct = (product: Product) => setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  const deleteProduct = (productId: string) => setProducts(prev => prev.filter(p => p.id !== productId));
  const addClient = (client: Client) => setClients(prev => [...prev, client]);
  const updateClient = (client: Client) => setClients(prev => prev.map(c => c.id === client.id ? client : c));
  const addOrder = (order: Order) => setOrders(prev => [...prev, order]);
  const updateOrder = (order: Order) => setOrders(prev => prev.map(o => o.id === order.id ? order : o));
  const updateShopSettings = (settings: ShopSettings) => setShopSettings(settings);

  const addPayment = (payment: PaymentTransaction) => {
    setPayments(prev => [...prev, payment]);
    let matchedClientId = payment.clientId;
    if (!matchedClientId) {
       const foundClient = clients.find(c => payment.payerName.toLowerCase().includes(c.name.toLowerCase()));
       if (foundClient) matchedClientId = foundClient.id;
    }
    if (matchedClientId) {
        setOrders(prevOrders => {
            return prevOrders.map(order => {
                if (order.clientId === matchedClientId && !order.isLocked && order.status !== 'DELIVERED') {
                    const fobCost = order.items.reduce((sum, i) => sum + i.fobTotal, 0);
                    const freightCost = order.items.reduce((sum, i) => sum + i.freightTotal, 0);
                    let paymentRemaining = payment.amount;
                    let newTotalFobPaid = order.totalFobPaid;
                    if (newTotalFobPaid < fobCost) {
                        const neededForFob = fobCost - newTotalFobPaid;
                        const contribution = Math.min(paymentRemaining, neededForFob);
                        newTotalFobPaid += contribution;
                        paymentRemaining -= contribution;
                    }
                    let newTotalFreightPaid = order.totalFreightPaid;
                    if (paymentRemaining > 0 && newTotalFobPaid >= fobCost) {
                        newTotalFreightPaid += paymentRemaining;
                    }
                    let newFobStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'PARTIAL';
                    if (newTotalFobPaid >= fobCost && fobCost > 0) newFobStatus = 'PAID';
                    else if (newTotalFobPaid === 0) newFobStatus = 'UNPAID';
                    let newFreightStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'PARTIAL';
                    if (newTotalFreightPaid >= freightCost && freightCost > 0) newFreightStatus = 'PAID';
                    else if (newTotalFreightPaid === 0) newFreightStatus = 'UNPAID';
                    return {
                        ...order,
                        totalFobPaid: newTotalFobPaid,
                        totalFreightPaid: newTotalFreightPaid,
                        fobPaymentStatus: newFobStatus,
                        freightPaymentStatus: newFreightStatus
                    };
                }
                return order;
            });
        });
    }
  };

  const importData = async (jsonData: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonData);
        if (!data || typeof data !== 'object') return false;
        if (Array.isArray(data.catalogs)) setCatalogs(data.catalogs);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.clients)) setClients(data.clients);
        if (Array.isArray(data.orders)) setOrders(data.orders);
        if (Array.isArray(data.payments)) setPayments(data.payments);
        if (data.shopSettings && typeof data.shopSettings === 'object') setShopSettings(data.shopSettings);
        if (Array.isArray(data.users)) setUsers(data.users); // Import users too for backups
        return true;
    } catch (error) {
        console.error("Import failed", error);
        return false;
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, authLogs, catalogs, products, clients, orders, payments, shopSettings,
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
