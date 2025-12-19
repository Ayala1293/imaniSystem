
import { Catalog, Client, Order, PaymentTransaction, Product, ShopSettings, UserRole, User } from "../types";

let API_URL = 'http://127.0.0.1:5000/api';

/**
 * Normalizes MongoDB _id into string id for React.
 * Recursively processes arrays and nested objects (like Order Items).
 */
const mapId = (item: any): any => {
    if (!item || item === null) return item;
    if (Array.isArray(item)) return item.map(mapId);
    if (typeof item !== 'object') return item;

    const newItem = { ...item };
    
    // Convert top-level Mongo _id to string id
    if (newItem._id) {
        newItem.id = newItem._id.toString();
    }

    // Process nested Order items specifically
    if (newItem.items && Array.isArray(newItem.items)) {
        newItem.items = newItem.items.map((i: any) => {
            const mapped = { ...i };
            if (mapped._id) mapped.id = mapped._id.toString();
            if (mapped.productId && typeof mapped.productId === 'object') {
                mapped.productId = mapped.productId.toString();
            }
            return mapped;
        });
    }

    // Ensure common foreign keys are treated as strings
    const keysToStringify = ['catalogId', 'clientId', 'productId'];
    keysToStringify.forEach(key => {
        if (newItem[key] && typeof newItem[key] === 'object' && newItem[key] !== null) {
            newItem[key] = newItem[key].toString();
        }
    });

    return newItem;
};

const getHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const handleResponse = async (res: Response) => {
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        data = { message: text };
    }

    if (!res.ok) {
        if (res.status === 503) {
            throw new Error("DATABASE_SYNCING: Server is waking up, please wait.");
        }
        throw new Error(data.message || `API Error (${res.status})`);
    }
    return data;
};

export const api = {
    findActiveServer: async (): Promise<boolean> => {
        const candidates = [
            'http://127.0.0.1:5000/api',
            'http://localhost:5000/api',
            `http://${window.location.hostname}:5000/api`
        ];

        for (const candidate of candidates) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                const res = await fetch(`${candidate}/auth/init`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok || res.status === 503) {
                    API_URL = candidate;
                    return true;
                }
            } catch (e) {}
        }
        return false;
    },

    checkSystemInit: async () => handleResponse(await fetch(`${API_URL}/auth/init`)),
    
    login: async (username: string, password: string, role: UserRole) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        return mapId(await handleResponse(res));
    },

    register: async (name: string, username: string, password: string, role: UserRole) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, username, password, role })
        });
        return mapId(await handleResponse(res));
    },

    fetchUsers: async () => mapId(await handleResponse(await fetch(`${API_URL}/auth/users`, { headers: getHeaders() }))),
    deleteUser: async (id: string) => handleResponse(await fetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', headers: getHeaders() })),
    fetchSettings: async () => mapId(await handleResponse(await fetch(`${API_URL}/settings`))),
    fetchCatalogs: async () => mapId(await handleResponse(await fetch(`${API_URL}/catalogs`, { headers: getHeaders() }))),
    fetchProducts: async () => mapId(await handleResponse(await fetch(`${API_URL}/products`, { headers: getHeaders() }))),
    fetchClients: async () => mapId(await handleResponse(await fetch(`${API_URL}/clients`, { headers: getHeaders() }))),
    fetchOrders: async () => mapId(await handleResponse(await fetch(`${API_URL}/orders`, { headers: getHeaders() }))),
    fetchPayments: async () => mapId(await handleResponse(await fetch(`${API_URL}/payments`, { headers: getHeaders() }))),

    createCatalog: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/catalogs`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),
    updateCatalog: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/catalogs/${d.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(d) }))),
    deleteCatalog: async (id: string) => handleResponse(await fetch(`${API_URL}/catalogs/${id}`, { method: 'DELETE', headers: getHeaders() })),

    createProduct: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/products`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),
    updateProduct: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/products/${d.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(d) }))),
    updateProductStock: async (id: string, d: any) => mapId(await handleResponse(await fetch(`${API_URL}/products/${id}/stock`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),
    deleteProduct: async (id: string) => handleResponse(await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getHeaders() })),

    createClient: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/clients`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),
    updateClient: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/clients/${d.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(d) }))),
    createClientsBulk: async (d: any[]) => mapId(await handleResponse(await fetch(`${API_URL}/clients/bulk`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),

    createOrder: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/orders`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),
    updateOrder: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/orders/${d.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(d) }))),
    createPayment: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/payments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) }))),
    updateSettings: async (d: any) => mapId(await handleResponse(await fetch(`${API_URL}/settings`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(d) }))),
    importSystemData: async (d: any) => handleResponse(await fetch(`${API_URL}/settings/import`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(d) })),
    factoryReset: async () => handleResponse(await fetch(`${API_URL}/auth/factory-reset`, { method: 'POST', headers: getHeaders() }))
};
