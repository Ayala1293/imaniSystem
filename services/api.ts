
import { Catalog, Client, Order, PaymentTransaction, Product, ShopSettings, UserRole, User } from "../types";

// Default to 127.0.0.1 but allow runtime switching if localhost is preferred by the OS
let API_URL = 'http://127.0.0.1:5000/api';

// Helper to handle MongoDB _id to frontend id mapping
const mapId = (item: any): any => {
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
        // Handle 503 specifically (DB connecting)
        if (res.status === 503) {
            throw new Error("Database Syncing... (503)");
        }

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

// Safe wrapper to catch connection refused / network errors
const safeFetch = async (url: string, options?: RequestInit) => {
    try {
        const res = await fetch(url, options);
        return res;
    } catch (error: any) {
        // Classify Network Errors
        const isNetworkError = 
            error.name === 'TypeError' && 
            (error.message === 'Failed to fetch' || 
             error.message.includes('NetworkError') || 
             error.message.includes('Network request failed') || 
             error.message.includes('Connection refused'));

        if (isNetworkError) {
             throw new Error('NETWORK_ERROR: Cannot reach server.');
        }
        throw error;
    }
};

export const api = {
    // Discovery: Tries to find if the backend is on 127.0.0.1 or localhost
    findActiveServer: async (): Promise<boolean> => {
        const candidates = [
            'http://127.0.0.1:5000/api',
            'http://localhost:5000/api'
        ];

        for (const candidate of candidates) {
            try {
                // We use a short timeout for discovery
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500);
                
                // Just check root or init to see if it responds
                const res = await fetch(`${candidate}/auth/init`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.status !== 404) { // 200 or 503 means server is there
                    API_URL = candidate;
                    console.log(`[API] Connected to backend at ${API_URL}`);
                    return true;
                }
            } catch (e) {
                // Continue to next candidate
            }
        }
        return false;
    },

    // Auth
    checkSystemInit: async (signal?: AbortSignal): Promise<{ hasUsers: boolean }> => {
        const res = await safeFetch(`${API_URL}/auth/init`, { signal });
        return handleResponse(res);
    },

    login: async (username: string, password: string, role: UserRole) => {
        const res = await safeFetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        const data = await handleResponse(res);
        return mapId(data);
    },
    
    register: async (name: string, username: string, password: string, role: UserRole) => {
        const res = await safeFetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(), // IMPORTANT: Send token now to allow admin to create users
            body: JSON.stringify({ name, username, password, role })
        });
        const data = await handleResponse(res);
        return mapId(data);
    },

    fetchUsers: async (): Promise<User[]> => {
        const res = await safeFetch(`${API_URL}/auth/users`, { headers: getHeaders() });
        return mapId(await handleResponse(res));
    },

    deleteUser: async (id: string) => {
        const res = await safeFetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', headers: getHeaders() });
        return handleResponse(res);
    },
    
    factoryReset: async () => {
        const res = await safeFetch(`${API_URL}/auth/factory-reset`, { method: 'POST' });
        return handleResponse(res);
    },

    // Data Fetching
    fetchSettings: async () => mapId(await handleResponse(await safeFetch(`${API_URL}/settings`))),
    fetchCatalogs: async () => mapId(await handleResponse(await safeFetch(`${API_URL}/catalogs`, { headers: getHeaders() }))),
    fetchProducts: async () => mapId(await handleResponse(await safeFetch(`${API_URL}/products`, { headers: getHeaders() }))),
    fetchClients: async () => mapId(await handleResponse(await safeFetch(`${API_URL}/clients`, { headers: getHeaders() }))),
    fetchOrders: async () => mapId(await handleResponse(await safeFetch(`${API_URL}/orders`, { headers: getHeaders() }))),
    fetchPayments: async () => mapId(await handleResponse(await safeFetch(`${API_URL}/payments`, { headers: getHeaders() }))),

    // Mutations
    createCatalog: async (data: Partial<Catalog>) => mapId(await handleResponse(await safeFetch(`${API_URL}/catalogs`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    updateCatalog: async (data: Catalog) => mapId(await handleResponse(await safeFetch(`${API_URL}/catalogs/${data.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),

    createProduct: async (data: Product) => mapId(await handleResponse(await safeFetch(`${API_URL}/products`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    updateProduct: async (data: Product) => mapId(await handleResponse(await safeFetch(`${API_URL}/products/${data.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),
    // CHANGED TO POST TO AVOID CORS/PATCH ISSUES
    updateProductStock: async (id: string, data: Partial<Product>) => mapId(await handleResponse(await safeFetch(`${API_URL}/products/${id}/stock`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    deleteProduct: async (id: string) => await safeFetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getHeaders() }),

    createClient: async (data: Client) => mapId(await handleResponse(await safeFetch(`${API_URL}/clients`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    createClientsBulk: async (data: Partial<Client>[]) => mapId(await handleResponse(await safeFetch(`${API_URL}/clients/bulk`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),

    createOrder: async (data: Order) => mapId(await handleResponse(await safeFetch(`${API_URL}/orders`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),
    updateOrder: async (data: Order) => mapId(await handleResponse(await safeFetch(`${API_URL}/orders/${data.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),

    createPayment: async (data: PaymentTransaction) => mapId(await handleResponse(await safeFetch(`${API_URL}/payments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }))),

    updateSettings: async (data: ShopSettings) => mapId(await handleResponse(await safeFetch(`${API_URL}/settings`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }))),

    // Bulk Import
    importSystemData: async (data: any) => {
        const res = await safeFetch(`${API_URL}/settings/import`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    }
};
