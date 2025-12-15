
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Product, Order, Client, PaymentTransaction, OrderItem, Catalog } from './types';
import { MOCK_USERS, INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_ORDERS, INITIAL_PAYMENTS, INITIAL_CATALOGS } from './constants';

interface AppContextType extends AppState {
  login: (userId: string) => void;
  logout: () => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // In a real app, these would utilize a database or API service
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>(INITIAL_CATALOGS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [payments, setPayments] = useState<PaymentTransaction[]>(INITIAL_PAYMENTS);

  // Navigation State
  const [currentView, setCurrentView] = useState('orders');
  const [pendingOrderClientId, setPendingOrderClientId] = useState<string | null>(null);

  // Load user from session if available
  useEffect(() => {
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
      const user = MOCK_USERS.find(u => u.id === storedUserId);
      if (user) setCurrentUser(user);
    }
  }, []);

  const login = (userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', user.id);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
  };

  const addCatalog = (catalog: Catalog) => {
    setCatalogs(prev => [catalog, ...prev]);
  };

  const updateCatalog = (catalog: Catalog) => {
    setCatalogs(prev => prev.map(c => c.id === catalog.id ? catalog : c));
  };

  const deleteCatalog = (id: string) => {
    // Note: In production, check for existing products before deleting
    setCatalogs(prev => prev.filter(c => c.id !== id));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const updateClient = (client: Client) => {
      setClients(prev => prev.map(c => c.id === client.id ? client : c));
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
  };

  const updateOrder = (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
  };

  const addPayment = (payment: PaymentTransaction) => {
    setPayments(prev => [...prev, payment]);
    
    let matchedClientId = payment.clientId;

    if (!matchedClientId) {
       const foundClient = clients.find(c => payment.payerName.toLowerCase().includes(c.name.toLowerCase()));
       if (foundClient) matchedClientId = foundClient.id;
    }

    if (matchedClientId) {
        // Find latest open order
        setOrders(prevOrders => {
            return prevOrders.map(order => {
                if (order.clientId === matchedClientId && !order.isLocked && order.status !== 'DELIVERED') {
                    // Update this order
                    const fobCost = order.items.reduce((sum, i) => sum + i.fobTotal, 0);
                    const freightCost = order.items.reduce((sum, i) => sum + i.freightTotal, 0);
                    
                    let paymentRemaining = payment.amount;
                    
                    // 1. Pay FOB First
                    let newTotalFobPaid = order.totalFobPaid;
                    if (newTotalFobPaid < fobCost) {
                        const neededForFob = fobCost - newTotalFobPaid;
                        const contribution = Math.min(paymentRemaining, neededForFob);
                        newTotalFobPaid += contribution;
                        paymentRemaining -= contribution;
                    }

                    // 2. Pay Freight Second (if FOB is cleared or money left)
                    let newTotalFreightPaid = order.totalFreightPaid;
                    if (paymentRemaining > 0 && newTotalFobPaid >= fobCost) {
                        newTotalFreightPaid += paymentRemaining;
                    }

                    // Determine Statuses
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

  return (
    <AppContext.Provider value={{
      currentUser,
      catalogs,
      products,
      clients,
      orders,
      payments,
      login,
      logout,
      addCatalog,
      updateCatalog,
      deleteCatalog,
      addProduct,
      updateProduct,
      deleteProduct,
      addClient,
      updateClient,
      addOrder,
      updateOrder,
      addPayment,
      currentView,
      setCurrentView,
      pendingOrderClientId,
      setPendingOrderClientId
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
