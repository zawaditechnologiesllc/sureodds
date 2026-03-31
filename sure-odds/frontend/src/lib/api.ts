import axios from "axios";

// In production (Vercel), NEXT_PUBLIC_API_URL points to the Render backend.
// In development (Replit), we use /api-proxy which Next.js rewrites to localhost:8000.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api-proxy";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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

// ─── IntaSend (M-Pesa) ───────────────────────────────────────────────────────

export const initializeMpesa = async (packageId: number, phone: string, email: string) => {
  const res = await api.post("/intasend/mpesa/initialize", {
    package_id: packageId,
    phone_number: phone,
    email,
  });
  return res.data;
};

export const checkMpesaStatus = async (invoiceId: string, packageId: number) => {
  const res = await api.get(`/intasend/mpesa/status?invoice_id=${invoiceId}&package_id=${packageId}`);
  return res.data;
};

// ─── Paystack Mobile Money (M-Pesa / Airtel via Paystack) ────────────────────

export const initializeMobileMoneyPaystack = async (
  packageId: number,
  email: string,
  phone: string,
  provider: string
) => {
  const res = await api.post("/paystack/mobile-money/initialize", {
    package_id: packageId,
    email,
    phone,
    provider,
  });
  return res.data;
};

export const checkMobileMoneyStatusPaystack = async (reference: string, packageId: number) => {
  const res = await api.get(`/paystack/mobile-money/status?reference=${reference}&package_id=${packageId}`);
  return res.data;
};

// ─── Partners ────────────────────────────────────────────────────────────────

export const submitPartnerApplication = async (form: {
  name: string;
  email: string;
  platform: string;
  handle: string;
  followers: string;
  website?: string;
  why: string;
}) => {
  const res = await api.post("/partners/apply", form);
  return res.data;
};

export const fetchAdminPartners = async () => {
  const res = await api.get("/admin/partners");
  return res.data;
};

export const approvePartner = async (appId: string) => {
  const res = await api.post(`/admin/partners/${appId}/approve`);
  return res.data;
};

export const rejectPartner = async (appId: string) => {
  const res = await api.post(`/admin/partners/${appId}/reject`);
  return res.data;
};

// ─── Partner Dashboard ────────────────────────────────────────────────────────

export const fetchPartnerStatus = async () => {
  const res = await api.get("/partner-dashboard/status");
  return res.data;
};

export const fetchPartnerStats = async () => {
  const res = await api.get("/partner-dashboard/stats");
  return res.data;
};

export const fetchPartnerPayoutSettings = async () => {
  const res = await api.get("/partner-dashboard/payout-settings");
  return res.data;
};

export const savePartnerPayoutSettings = async (settings: {
  method: string;
  usdt_address?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_swift?: string;
  bank_country?: string;
}) => {
  const res = await api.post("/partner-dashboard/payout-settings", settings);
  return res.data;
};

export const trackReferralClick = async (referralCode: string) => {
  try {
    await api.post("/partner-dashboard/track-click", { referral_code: referralCode });
  } catch {
    // Silent — tracking is non-critical
  }
};

// ─── Admin — Targeted day refresh ────────────────────────────────────────────

export const triggerTodayRefresh = async () => {
  const res = await api.post("/admin/run-today");
  return res.data;
};

export const triggerTomorrowRefresh = async () => {
  const res = await api.post("/admin/run-tomorrow");
  return res.data;
};

// ─── Admin — Payments ─────────────────────────────────────────────────────────

export const fetchAdminPayments = async () => {
  const res = await api.get("/admin/payments");
  return res.data;
};

export const confirmAdminPayment = async (reference: string) => {
  const res = await api.post(`/admin/payments/${reference}/confirm`);
  return res.data;
};

// ─── Admin — Notifications ────────────────────────────────────────────────────

export const fetchAdminNotifications = async () => {
  const res = await api.get("/admin/notifications");
  return res.data;
};

export const createAdminNotification = async (data: {
  title: string;
  message: string;
  target: string;
}) => {
  const res = await api.post("/admin/notifications", data);
  return res.data;
};

export const deleteAdminNotification = async (id: number) => {
  const res = await api.delete(`/admin/notifications/${id}`);
  return res.data;
};

export const toggleAdminNotification = async (id: number) => {
  const res = await api.patch(`/admin/notifications/${id}/toggle`);
  return res.data;
};

// ─── User Notifications ───────────────────────────────────────────────────────

export const fetchMyNotifications = async () => {
  const res = await api.get("/users/notifications");
  return res.data;
};

// ─── Admin — Finance ─────────────────────────────────────────────────────────

export const fetchAdminFinanceSummary = async () => {
  const res = await api.get("/admin/finance/summary");
  return res.data;
};

export const fetchAdminFinanceTransactions = async (status?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const res = await api.get("/admin/finance/transactions", { params });
  return res.data;
};

export const fetchAdminFinanceEarnings = async () => {
  const res = await api.get("/admin/finance/earnings");
  return res.data;
};

export const markEarningPaid = async (earningId: number) => {
  const res = await api.post(`/admin/finance/earnings/${earningId}/pay`);
  return res.data;
};

export const bulkMarkEarningsPaid = async (earningIds: number[]) => {
  const res = await api.post("/admin/finance/earnings/bulk-pay", { earning_ids: earningIds });
  return res.data;
};
