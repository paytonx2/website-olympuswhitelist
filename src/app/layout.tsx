import type { Metadata } from "next";
import Link from "next/link";
import { Cinzel, IBM_Plex_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Monogram } from "@/components/greek";
import { SERVER_NAME } from "@/lib/constants";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const serifThai = Noto_Serif_Thai({ variable: "--font-serif-thai", subsets: ["thai"], weight: ["500", "600", "700"] });
const thai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: `${SERVER_NAME} · Whitelist`, template: `%s · ${SERVER_NAME}` },
  description: "ระบบส่ง Whitelist ของเซิร์ฟเวอร์ OLYMPUS ACADEMY",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${cinzel.variable} ${serifThai.variable} ${thai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 bg-panel">
          <div className="meander" />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <Monogram className="h-9 w-9" />
              <div>
                <p className="display text-sm font-semibold text-ink">{SERVER_NAME}</p>
                <p className="text-xs text-muted">FiveM Roleplay · Whitelist Portal</p>
              </div>
            </div>
            <nav className="flex gap-6 text-sm text-muted">
              <Link href="/" className="hover:text-gold">ภาพรวม</Link>
              <Link href="/submit" className="hover:text-gold">ส่ง Whitelist</Link>
              <Link href="/my" className="hover:text-gold">My Whitelist</Link>
            </nav>
            <p className="text-xs text-muted">© {new Date().getFullYear()} {SERVER_NAME}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
