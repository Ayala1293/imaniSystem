
export type UserRole = 'ADMIN' | 'ORDER_ENTRY';

export interface User {
  id: string;
  name: string;
  role: UserRole;
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

export interface AppState {
  currentUser: User | null;
  catalogs: Catalog[];
  products: Product[];
  clients: Client[];
  orders: Order[];
  payments: PaymentTransaction[];
}
