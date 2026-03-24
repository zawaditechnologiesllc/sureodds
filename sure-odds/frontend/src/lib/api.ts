import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const fetchPredictions = async (date?: string, leagueId?: number) => {
  const params: Record<string, string | number> = {};
  if (date) params.date = date;
  if (leagueId) params.league_id = leagueId;
  const res = await api.get("/predictions", { params });
  return res.data;
};

export const fetchResults = async (date?: string, leagueId?: number) => {
  const params: Record<string, string | number> = {};
  if (date) params.date = date;
  if (leagueId) params.league_id = leagueId;
  const res = await api.get("/results", { params });
  return res.data;
};

export const fetchReferralStats = async () => {
  const res = await api.get("/referrals/stats");
  return res.data;
};

export const fetchUserProfile = async () => {
  const res = await api.get("/users/me");
  return res.data;
};

export const fetchPaymentStatus = async () => {
  const res = await api.get("/paystack/status");
  return res.data;
};

export const fetchPaymentPlans = async () => {
  const res = await api.get("/paystack/plans");
  return res.data;
};

export const initializePayment = async (plan: string, callbackUrl?: string) => {
  const res = await api.post("/paystack/initialize", { plan, callback_url: callbackUrl });
  return res.data;
};

export const verifyPayment = async (reference: string) => {
  const res = await api.post("/paystack/verify", { reference });
  return res.data;
};

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
