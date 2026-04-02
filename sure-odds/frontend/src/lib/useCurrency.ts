"use client";

import { useState, useEffect } from "react";
import { api } from "./api";

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  meta: Record<string, { name: string; symbol: string; country: string; flag: string }>;
  country_currency: Record<string, string>;
}

interface GeoResult {
  country: string;
  detected: boolean;
  currency: string;
}

interface UseCurrencyResult {
  /** ISO currency code for the detected locale, e.g. "KES" */
  currency: string;
  /** Country code, e.g. "KE" */
  country: string;
  /** Symbol for local currency, e.g. "KSh" */
  symbol: string;
  /** Flag emoji */
  flag: string;
  /** Convert a USD amount to the local currency amount (number) */
  toLocal: (usdAmount: number) => number;
  /** Format a USD price as "KSh 1,300" or "$10.00" etc */
  formatPrice: (usdAmount: number) => string;
  /** True while rates / geo are loading */
  loading: boolean;
}

const FALLBACK: UseCurrencyResult = {
  currency: "KES",
  country: "KE",
  symbol: "KSh",
  flag: "🇰🇪",
  toLocal: (usd) => Math.round(usd * 130),
  formatPrice: (usd) => `KSh ${Math.round(usd * 130).toLocaleString()}`,
  loading: false,
};

let _cachedResult: UseCurrencyResult | null = null;
let _fetching = false;
const _listeners: Array<(r: UseCurrencyResult) => void> = [];

async function loadCurrencyData(): Promise<UseCurrencyResult> {
  try {
    const [ratesRes, geoRes] = await Promise.allSettled([
      api.get<CurrencyRates>("/currency/rates"),
      fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) })
        .then((r) => r.json())
        .catch(() => null),
    ]);

    const ratesData: CurrencyRates | null =
      ratesRes.status === "fulfilled" ? ratesRes.value.data : null;

    let country = "KE";
    let currency = "KES";

    if (geoRes.status === "fulfilled" && geoRes.value?.country_code) {
      country = geoRes.value.country_code;
      if (ratesData?.country_currency) {
        currency = ratesData.country_currency[country] ?? "USD";
      }
    }

    if (!ratesData) return FALLBACK;

    const rate = ratesData.rates[currency] ?? 1;
    const meta = ratesData.meta[currency] ?? { symbol: "$", flag: "🌍", name: currency };

    return {
      currency,
      country,
      symbol: meta.symbol,
      flag: meta.flag,
      toLocal: (usd) => Math.round(usd * rate),
      formatPrice: (usd) => {
        const localAmount = Math.round(usd * rate);
        if (currency === "USD") return `$${usd.toFixed(2)}`;
        if (currency === "GBP") return `£${usd.toFixed(2)}`;
        if (currency === "EUR") return `€${(usd * rate).toFixed(2)}`;
        return `${meta.symbol} ${localAmount.toLocaleString()}`;
      },
      loading: false,
    };
  } catch {
    return FALLBACK;
  }
}

/** 
 * Hook that returns the user's detected local currency and formatting helpers.
 * Results are cached in memory so only one network call per page load.
 */
export function useCurrency(): UseCurrencyResult {
  const [result, setResult] = useState<UseCurrencyResult>(
    _cachedResult ?? { ...FALLBACK, loading: true }
  );

  useEffect(() => {
    if (_cachedResult) {
      setResult(_cachedResult);
      return;
    }

    _listeners.push(setResult);

    if (!_fetching) {
      _fetching = true;
      loadCurrencyData().then((r) => {
        _cachedResult = r;
        _fetching = false;
        _listeners.forEach((fn) => fn(r));
        _listeners.length = 0;
      });
    }

    return () => {
      const idx = _listeners.indexOf(setResult);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  }, []);

  return result;
}
