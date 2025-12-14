
import { Product, Client, Order, User, PaymentTransaction, Catalog } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'System Admin', role: 'ADMIN' },
  { id: 'u2', name: 'Sales Staff', role: 'ORDER_ENTRY' },
];

export const INITIAL_CATALOGS: Catalog[] = [
  {
    id: 'cat1',
    name: 'August Imports 2024',
    closingDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), // 10 days from now
    status: 'OPEN',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    catalogId: 'cat1',
    name: 'Industrial Stand Mixer',
    description: 'Heavy duty 10L mixer for commercial bakeries.',
    imageUrl: 'https://picsum.photos/200/200?random=1',
    attributes: [
      { key: 'Capacity', value: '10L' },
      { key: 'Voltage', value: '220V' },
      { key: 'Color', value: 'Silver' }
    ],
    fobPrice: 15000.00,
    freightCharge: 4500.00,
    category: 'Kitchenware'
  },
  {
    id: 'p2',
    catalogId: 'cat1',
    name: 'Wireless Noise Canceling Headphones',
    description: 'Premium audio with 40h battery life.',
    imageUrl: 'https://picsum.photos/200/200?random=2',
    attributes: [
      { key: 'Color', value: 'Black' },
      { key: 'Connectivity', value: 'Bluetooth 5.3' }
    ],
    fobPrice: 3500.00,
    freightCharge: 500.00,
    category: 'Electronics'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Jane Doe', phone: '+254712345678', email: 'jane@example.com' },
  { id: 'c2', name: 'John Smith', phone: '+254722000000', email: 'john@example.com' },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    clientId: 'c1',
    orderDate: new Date().toISOString(),
    status: 'ARRIVED',
    fobPaymentStatus: 'PARTIAL',
    freightPaymentStatus: 'UNPAID',
    totalFobPaid: 5000,
    totalFreightPaid: 0,
    isLocked: false,
    items: [
      {
        id: 'i1',
        productId: 'p1',
        quantity: 1,
        fobTotal: 15000.00,
        freightTotal: 4500.00,
        selectedAttributes: [{ key: 'Voltage', value: '220V' }]
      }
    ]
  }
];

export const INITIAL_PAYMENTS: PaymentTransaction[] = [
  {
    id: 'pay1',
    transactionCode: 'QWE123456',
    amount: 5000,
    payerName: 'JANE DOE',
    date: new Date().toISOString(),
    clientId: 'c1',
    rawMessage: 'QWE123456 Confirmed. Ksh5,000.00 sent to SHOP. 2023-10-01'
  }
];
