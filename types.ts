
export type UserRole = 'ADMIN' | 'ORDER_ENTRY';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  passwordHash?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  recordedBy: string;
}

export interface DynamicAttribute {
  key: string;
  value: string;
}

export interface Catalog {
  id: string;
  name: string;
  closingDate: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export interface Product {
  id: string;
  catalogId: string;
  name: string;
  description: string;
  imageUrl: string;
  attributes: DynamicAttribute[];
  fobPrice: number;
  freightCharge: number;
  category: string;
  minStockLevel?: number; // New: Alert threshold
  stockStatus?: 'PENDING' | 'ARRIVED';
  stockCounts?: Record<string, number>;
  stockSold?: Record<string, number>;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  balance?: number; // Total debt/credit
}

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'ARRIVED' | 'DELIVERED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  fobTotal: number;
  freightTotal: number;
  selectedAttributes: DynamicAttribute[];
}

export interface Order {
  id: string;
  clientId: string;
  items: OrderItem[];
  orderDate: string;
  status: OrderStatus;
  fobPaymentStatus: PaymentStatus;
  freightPaymentStatus: PaymentStatus;
  totalFobPaid: number;
  totalFreightPaid: number;
  isLocked: boolean;
}

export interface PaymentTransaction {
  id: string;
  transactionCode: string;
  amount: number;
  payerName: string;
  date: string;
  clientId?: string;
  rawMessage: string;
}

export interface ThemePalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

export interface ShopSettings {
  shopName: string;
  phoneNumbers: string[];
  logoUrl: string;
  fobPaybill: string;
  fobAccountNumber: string;
  freightPaybill: string;
  freightAccountNumber: string;
  theme: ThemePalette;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  catalogs: Catalog[];
  products: Product[];
  clients: Client[];
  orders: Order[];
  payments: PaymentTransaction[];
  expenses: Expense[]; // New: Expense tracking
  shopSettings: ShopSettings;
  currentView: string;
  setCurrentView: (view: string) => void;
  pendingOrderClientId: string | null;
  setPendingOrderClientId: (id: string | null) => void;
  hasUsers: boolean | null;
  isOffline: boolean;
}
