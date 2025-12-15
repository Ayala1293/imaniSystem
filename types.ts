
export type UserRole = 'ADMIN' | 'ORDER_ENTRY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string; // Optional only for legacy mock data, required in production
  resetToken?: string;
  resetTokenExpiry?: string; // ISO Date
}

export interface AuthLog {
  id: string;
  timestamp: string;
  email: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'RESET_REQUEST';
  details?: string;
}

export interface DynamicAttribute {
  key: string;
  value: string;
}

export interface Catalog {
  id: string;
  name: string; // e.g., "September Imports"
  closingDate: string; // ISO Date, serves as payment deadline
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export interface Product {
  id: string;
  catalogId: string; // Link to specific monthly catalog
  name: string;
  description: string;
  imageUrl: string;
  attributes: DynamicAttribute[];
  fobPrice: number;
  freightCharge: number;
  category: string;
  stockStatus?: 'PENDING' | 'ARRIVED'; // General status
  stockCounts?: Record<string, number>; // Granular stock: { "Color:Red": 45, "Color:Blue": 10 }
  stockSold?: Record<string, number>; // Tracks extras that have been sold/removed
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'ARRIVED' | 'DELIVERED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  fobTotal: number;
  freightTotal: number;
  selectedAttributes: DynamicAttribute[]; // e.g. which color they picked
}

export interface Order {
  id: string;
  clientId: string;
  items: OrderItem[];
  orderDate: string; // ISO Date
  status: OrderStatus;
  fobPaymentStatus: PaymentStatus;
  freightPaymentStatus: PaymentStatus;
  totalFobPaid: number;
  totalFreightPaid: number;
  isLocked: boolean; // Locked after month closes
}

export interface PaymentTransaction {
  id: string; // Internal ID
  transactionCode: string; // M-Pesa Code
  amount: number;
  payerName: string;
  date: string;
  clientId?: string; // Linked client
  rawMessage: string;
}

export interface ThemePalette {
  name: string;
  primary: string;   // Main button color, Sidebar selected
  secondary: string; // Sidebar background
  accent: string;    // Highlights
  text: string;      // Sidebar text
}

export interface ShopSettings {
  shopName: string;
  phoneNumbers: string[]; // Changed to array
  logoUrl: string;
  fobPaybill: string;
  fobAccountNumber: string; // Changed from Format to Number
  freightPaybill: string;
  freightAccountNumber: string; // Changed from Format to Number
  theme: ThemePalette;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  authLogs: AuthLog[];
  catalogs: Catalog[];
  products: Product[];
  clients: Client[];
  orders: Order[];
  payments: PaymentTransaction[];
  shopSettings: ShopSettings;
  
  // Navigation & UI State
  currentView: string;
  setCurrentView: (view: string) => void;
  pendingOrderClientId: string | null;
  setPendingOrderClientId: (id: string | null) => void;
}