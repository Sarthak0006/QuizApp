import axios from "axios";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Read CSRF cookie
function getXsrf() {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
}

export const api = axios.create({
    baseURL: API,
    withCredentials: true,
});

// Attach CSRF for unsafe methods
api.interceptors.request.use((config) => {
    const method = (config.method || "get").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        config.headers = config.headers ?? {};
        (config.headers as any)["x-xsrf-token"] = getXsrf();
    }
    return config;
});

// 401 → refresh once → retry queue
let isRefreshing = false;
let queue: { resolve: (v: any) => void; reject: (e: any) => void; cfg: any }[] = [];

function flushQueue(err: any, ok: boolean) {
    queue.forEach(p => ok ? p.resolve(api(p.cfg)) : p.reject(err));
    queue = [];
}

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const cfg = error.config;
        if (error.response?.status === 401 && !cfg._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => queue.push({ resolve, reject, cfg }));
            }
            cfg._retry = true;
            isRefreshing = true;
            try {
                await api.post("/api/auth/refresh", {}, { headers: { "x-xsrf-token": getXsrf() } });
                flushQueue(null, true);
                return api(cfg);
            } catch (e) {
                flushQueue(e, false);
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);
