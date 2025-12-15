
import { Catalog, Client, Order, PaymentTransaction, Product, ShopSettings, UserRole } from "../types";

const API_URL = 'http://localhost:5000/api';

// Helper to handle MongoDB _id to frontend id mapping
const mapId = (item: any) => {
    if (!item) return item;
    if (Array.isArray(item)) return item.map(mapId);
    if (item._id) {
        return { ...item, id: item._id };
    }
    return item;
};

const getHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorMessage = res.statusText;
        try {
            const text = await res.text();
            try {
                const json = JSON.parse(text);
                errorMessage = json.message || errorMessage;
            } catch {
                if (text && text.length < 500) errorMessage = text;
            }
        } catch {
            // Ignore body read error
        }
        throw new Error(errorMessage || `Request failed with status ${res.status}`);
    }
    return res.json();
};

export const api = {
    // Auth
    checkSystemInit: async (signal?: AbortSignal): Promise<{ hasUsers: boolean }> => {
        const res = await fetch(`${API_URL}/auth/init`, { signal });
        return handleResponse(res);
    },

    login: async (email: string, password: string, role: UserRole) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const data = await handleResponse(res);
        return mapId(data);
    },
    
    register: async (name: string, email: string, password: string, role: UserRole) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await handleResponse(res);
        return mapId(data);
    },

    // Data Fetching
    fetchSettings: async () => mapId(await handleResponse(await fetch(`${API_URL}/settings`))),
    fetchCatalogs: async () => mapId(await handleResponse(await fetch(`${API_URL}/catalogs`, { headers: getHeaders() }))),
    fetchProducts: async () => mapId(await handleResponse(await fetch(`${API_URL}/products`, { headers: getHeaders() }))),
    fetchClients: async () => mapId(await handleResponse(await fetch(`${API_URL}/clients`, { headers: getHeaders() }))),
    fetchOrders: async () => mapId(await handleResponse(await fetch(`${API_URL}/orders`, { headers: getHeaders() }))),
    fetchPayments: async () => mapId(await handleResponse(await fetch(`${API_URL}/payments`, { headers: getHeaders() }))),

    // Mutations
    createCatalog: async (data: Partial<Catalog>) => mapId(await handleResponse(await fetch(`${API_URL}/catalogs`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    updateCatalog: async (data: Catalog) => mapId(await handleResponse(await fetch(`${API_URL}/catalogs/${data.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),

    createProduct: async (data: Product) => mapId(await handleResponse(await fetch(`${API_URL}/products`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    updateProduct: async (data: Product) => mapId(await handleResponse(await fetch(`${API_URL}/products/${data.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),
    deleteProduct: async (id: string) => await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getHeaders() }),

    createClient: async (data: Client) => mapId(await handleResponse(await fetch(`${API_URL}/clients`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),

    createOrder: async (data: Order) => mapId(await handleResponse(await fetch(`${API_URL}/orders`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    updateOrder: async (data: Order) => mapId(await handleResponse(await fetch(`${API_URL}/orders/${data.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),

    createPayment: async (data: PaymentTransaction) => mapId(await handleResponse(await fetch(`${API_URL}/payments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),

    updateSettings: async (data: ShopSettings) => mapId(await handleResponse(await fetch(`${API_URL}/settings`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),

    // Bulk Import
    importSystemData: async (data: any) => {
        const res = await fetch(`${API_URL}/settings/import`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    }
};
