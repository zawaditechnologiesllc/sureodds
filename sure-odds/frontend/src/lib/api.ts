import axios from "axios";

// In production (Vercel), NEXT_PUBLIC_API_URL points to the Render backend.
// In development (Replit), we use /api-proxy which Next.js rewrites to localhost:8000.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api-proxy";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const isAdminCall = config.url?.startsWith("/admin");
    if (isAdminCall) {
      // Admin calls use the stored password as x-admin-key
      const adminToken = sessionStorage.getItem("admin_token");
      if (adminToken) config.headers["x-admin-key"] = adminToken;
    } else {
      // Regular calls use the logged-in user's bearer token
      const token = localStorage.getItem("access_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Admin session helpers
export const saveAdminToken = (token: string) => {
  if (typeof window !== "undefined") sessionStorage.setItem("admin_token", token);
};
export const clearAdminToken = () => {
  if (typeof window !== "undefined") sessionStorage.removeItem("admin_token");
};
export const getStoredAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("admin_token");
};

// Verify admin credentials with backend and store token on success
export const adminLogin = async (email: string, password: string): Promise<void> => {
  await api.post("/admin/token", { email, password });
  saveAdminToken(password);
};

// Legacy aliases
export const saveAdminKey = saveAdminToken;
export const clearAdminKey = clearAdminToken;
export const getStoredAdminKey = getStoredAdminToken;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const fetchFixtures = async (date?: string, leagueId?: number, status?: string) => {
  const params: Record<string, string | number> = {};
  if (date) params.date = date;
  if (leagueId) params.league_id = leagueId;
  if (status) params.status = status;
  const res = await api.get("/fixtures", { params });
  return res.data;
};

export const testApiConnection = async () => {
  const res = await api.get("/test-api");
  return res.data;
};

// ─── Predictions ───────────────────────────────────────────────────────────────

export const fetchPredictions = async (date?: string, leagueId?: number) => {
  const params: Record<string, string | number> = {};
  if (date) params.date = date;
  if (leagueId) params.league_id = leagueId;
  const res = await api.get("/predictions", { params });
  return res.data;
};

export const fetchHighConfidencePicks = async () => {
  const res = await api.get("/high-confidence-picks");
  return res.data;
};

export const unlockPick = async (fixtureId: number) => {
  const res = await api.post("/unlock-pick", { fixture_id: fixtureId });
  return res.data;
};

// ─── Results ───────────────────────────────────────────────────────────────────

export const fetchResults = async (date?: string, leagueId?: number) => {
  const params: Record<string, string | number> = {};
  if (date) params.date = date;
  if (leagueId) params.league_id = leagueId;
  const res = await api.get("/results", { params });
  return res.data;
};

// ─── User ──────────────────────────────────────────────────────────────────────

export const fetchUserProfile = async () => {
  const res = await api.get("/users/me");
  return res.data;
};

export const fetchUserCredits = async () => {
  const res = await api.get("/user-credits");
  return res.data;
};

// ─── Packages ──────────────────────────────────────────────────────────────────

export const fetchPackages = async () => {
  const res = await api.get("/packages");
  return res.data;
};

// ─── Paystack ──────────────────────────────────────────────────────────────────

export const fetchPaymentStatus = async () => {
  const res = await api.get("/paystack/status");
  return res.data;
};

export const initializePayment = async (packageId: number, email: string, callbackUrl?: string) => {
  const res = await api.post("/paystack/initialize", {
    package_id: packageId,
    email,
    callback_url: callbackUrl,
  });
  return res.data;
};

export const verifyPayment = async (reference: string) => {
  const res = await api.get(`/paystack/verify?reference=${reference}`);
  return res.data;
};

// ─── Referrals ─────────────────────────────────────────────────────────────────

export const fetchReferralStats = async () => {
  const res = await api.get("/referrals/stats");
  return res.data;
};

// ─── Admin ─────────────────────────────────────────────────────────────────────

export const fetchAdminUsers = async () => {
  const res = await api.get("/admin/users");
  return res.data;
};

export const fetchAdminPredictions = async () => {
  const res = await api.get("/admin/predictions");
  return res.data;
};

export const fetchAdminStats = async () => {
  const res = await api.get("/admin/stats");
  return res.data;
};

export const fetchApiStatus = async () => {
  const res = await api.get("/admin/api-status");
  return res.data;
};

export const triggerUpdateFixtures = async () => {
  const res = await api.post("/admin/run-update");
  return res.data;
};

export const triggerRunPredictions = async () => {
  const res = await api.post("/admin/run-predictions");
  return res.data;
};

export const triggerUpdateResults = async () => {
  const res = await api.post("/admin/run-results");
  return res.data;
};

// ─── Bundles ────────────────────────────────────────────────────────────────

export const fetchBundles = async () => {
  const res = await api.get("/bundles");
  return res.data;
};

export const fetchBundle = async (bundleId: string) => {
  const res = await api.get(`/bundles/${bundleId}`);
  return res.data;
};

export const purchaseBundle = async (bundleId: string, email: string, callbackUrl?: string) => {
  const res = await api.post(`/bundles/${bundleId}/purchase`, {
    email,
    callback_url: callbackUrl,
  });
  return res.data;
};

export const verifyBundlePayment = async (reference: string) => {
  const res = await api.get(`/bundles/verify/payment?reference=${reference}`);
  return res.data;
};

// ─── Admin — Bundles ─────────────────────────────────────────────────────────

export const fetchAdminBundles = async () => {
  const res = await api.get("/admin/bundles");
  return res.data;
};

export const generateBundle = async (tier: string) => {
  const res = await api.post(`/admin/bundles/generate/${tier}`);
  return res.data;
};

export const activateBundle = async (bundleId: string) => {
  const res = await api.post(`/admin/bundles/${bundleId}/activate`);
  return res.data;
};

export const deactivateBundle = async (bundleId: string) => {
  const res = await api.post(`/admin/bundles/${bundleId}/deactivate`);
  return res.data;
};
