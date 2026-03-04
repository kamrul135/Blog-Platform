import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inkwell — A Modern Blog",
  description: "Discover stories, ideas, and expertise from writers on any topic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}
      >
        <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
          <Navbar />
          <main>{children}</main>
          <footer
            className="mt-20 py-10 text-center text-sm"
            style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
          >
            <p>© {new Date().getFullYear()} Inkwell &mdash; Made with ❤️ for writers everywhere.</p>
          </footer>
          </NotificationsProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
