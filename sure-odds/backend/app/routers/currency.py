"""
Currency rates + geo-detection endpoints.

GET /currency/rates  — returns USD conversion rates from environment settings
GET /geo             — returns visitor's detected country code from IP
"""
import logging
import httpx
from fastapi import APIRouter, Request

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["currency"])

# Supported currencies and their display metadata
CURRENCY_META = {
    "KES": {"name": "Kenyan Shilling",   "symbol": "KSh",  "country": "KE", "flag": "🇰🇪"},
    "TZS": {"name": "Tanzanian Shilling", "symbol": "TSh",  "country": "TZ", "flag": "🇹🇿"},
    "UGX": {"name": "Ugandan Shilling",   "symbol": "USh",  "country": "UG", "flag": "🇺🇬"},
    "NGN": {"name": "Nigerian Naira",     "symbol": "₦",    "country": "NG", "flag": "🇳🇬"},
    "GHS": {"name": "Ghanaian Cedi",      "symbol": "GH₵",  "country": "GH", "flag": "🇬🇭"},
    "ZAR": {"name": "South African Rand", "symbol": "R",    "country": "ZA", "flag": "🇿🇦"},
    "USD": {"name": "US Dollar",          "symbol": "$",    "country": "US", "flag": "🇺🇸"},
    "GBP": {"name": "British Pound",      "symbol": "£",    "country": "GB", "flag": "🇬🇧"},
    "EUR": {"name": "Euro",               "symbol": "€",    "country": "EU", "flag": "🇪🇺"},
}

# Country → currency mapping for display purposes
COUNTRY_CURRENCY: dict[str, str] = {
    "KE": "KES", "TZ": "TZS", "UG": "UGX",
    "NG": "NGN", "GH": "GHS", "ZA": "ZAR",
    "GB": "GBP", "US": "USD",
    # Europe
    "DE": "EUR", "FR": "EUR", "IT": "EUR", "ES": "EUR",
    "NL": "EUR", "BE": "EUR", "PT": "EUR", "AT": "EUR",
    # Fallback for other African / global markets
    "ET": "USD", "RW": "USD", "MZ": "USD", "ZM": "USD",
    "ZW": "USD", "CM": "USD", "SN": "USD", "CI": "USD",
}

# Approximate USD → local currency rates.
# KES, TZS, UGX are live from settings (admin-configurable via env vars).
# Others are hardcoded approximations for display-only — payments always use KES/TZS/UGX.
_STATIC_RATES: dict[str, float] = {
    "NGN": 1550.0,
    "GHS": 15.0,
    "ZAR": 18.5,
    "GBP": 0.79,
    "EUR": 0.92,
    "USD": 1.0,
}


def _all_rates() -> dict[str, float]:
    return {
        "KES": settings.USD_TO_KES_RATE,
        "TZS": settings.USD_TO_TZS_RATE,
        "UGX": settings.USD_TO_UGX_RATE,
        **_STATIC_RATES,
    }


@router.get("/currency/rates")
async def currency_rates():
    """
    Return USD-to-local conversion rates and currency metadata.
    KES/TZS/UGX rates are admin-configurable via environment variables.
    """
    rates = _all_rates()
    return {
        "base": "USD",
        "rates": rates,
        "meta": CURRENCY_META,
        "country_currency": COUNTRY_CURRENCY,
        "payment_currencies": {
            "paystack": "KES",
            "intasend": ["KES", "TZS", "UGX"],
        },
    }


@router.get("/geo")
async def geo_detect(request: Request):
    """
    Detect the visitor's country from their IP address.
    Uses ipapi.co (free, no API key needed for low volume).
    Falls back to KE if detection fails.
    """
    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "")
        or (request.client.host if request.client else "")
    )

    if not ip or ip in ("127.0.0.1", "::1", "localhost"):
        return {"country": "KE", "detected": False, "currency": "KES"}

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"https://ipapi.co/{ip}/json/")
            if resp.status_code == 200:
                data = resp.json()
                country = data.get("country_code", "KE")
                currency = COUNTRY_CURRENCY.get(country, "USD")
                return {"country": country, "detected": True, "currency": currency, "ip": ip}
    except Exception as e:
        logger.debug(f"Geo detection failed for {ip}: {e}")

    return {"country": "KE", "detected": False, "currency": "KES"}
