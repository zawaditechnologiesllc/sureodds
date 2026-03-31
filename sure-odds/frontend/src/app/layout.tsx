import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "Sure Odds — Sports Prediction Platform",
  description:
    "Data-driven sports predictions with confidence ratings. Predictions, not bets.",
  keywords: "sports predictions, football predictions, sure odds, betting tips",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Sure Odds",
    description: "Data-driven sports predictions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111111",
              color: "#ffffff",
              border: "1px solid #222222",
            },
          }}
        />
      </body>
    </html>
  );
}
