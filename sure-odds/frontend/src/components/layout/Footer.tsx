import Link from "next/link";
import { Zap, Twitter, Instagram, Send, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-darker border-t border-brand-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-white fill-white" />
              </div>
              <span className="text-white font-black text-xl tracking-tight">
                SURE<span className="text-brand-red">ODDS</span>
              </span>
            </Link>
            <p className="text-brand-muted text-xs leading-relaxed mb-3">
              Data-driven sports predictions backed by AI and historical data. We show probabilities, not promises.
            </p>
            <div className="flex items-start gap-1.5 text-brand-muted text-xs mb-4">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span>Calea Floreasca 169A, Sector 1<br />014459 Bucharest, Romania</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://twitter.com/sureodds_pro"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-brand-card border border-brand-border rounded flex items-center justify-center text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://instagram.com/sureodds_pro"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-brand-card border border-brand-border rounded flex items-center justify-center text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://t.me/sureodds_pro"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-brand-card border border-brand-border rounded flex items-center justify-center text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </a>
              <a
                href="mailto:info@sureodds.pro"
                className="w-8 h-8 bg-brand-card border border-brand-border rounded flex items-center justify-center text-brand-muted hover:text-white hover:border-gray-500 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Today's Predictions", href: "/predictions" },
                { label: "Results & Track Record", href: "/results" },
                { label: "🔥 Bundles", href: "/bundles" },
                { label: "Buy Pick Credits", href: "/packages" },
                { label: "Pricing", href: "/pricing" },
                { label: "Affiliate Program", href: "/partner" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-brand-muted text-xs hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Support</h4>
            <ul className="space-y-2.5">
              {[
                { label: "How It Works", href: "/#how-it-works" },
                { label: "FAQ", href: "/#faq" },
                { label: "Contact Us", href: "mailto:info@sureodds.pro" },
                { label: "Telegram Community", href: "https://t.me/sureodds_pro" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-brand-muted text-xs hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Responsible Gambling", href: "/responsible" },
                { label: "Cookie Policy", href: "/cookies" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-brand-muted text-xs hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-brand-border pt-6">
          <p className="text-[11px] text-brand-muted leading-relaxed mb-4">
            <strong className="text-gray-500">Disclaimer:</strong> Sure Odds provides data-driven predictions for informational purposes only. We do not encourage or promote gambling. Predictions are not guarantees. Always gamble responsibly and in accordance with local laws. Must be 18+ to use this service.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-brand-muted text-xs">
              &copy; {year} SureOdds &mdash; Bucharest, Romania. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-brand-muted text-xs">
                <span className="w-2 h-2 rounded-full bg-brand-green inline-block" />
                All systems operational
              </div>
              <span className="flex items-center gap-1.5 text-brand-muted text-xs">
                <span>Powered by</span>
                <span className="font-bold text-brand-red">SuperSport</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
