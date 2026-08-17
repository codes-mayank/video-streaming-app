import { Geist, Geist_Mono } from "next/font/google";
import SessionKeepAlive from "@/components/auth/sessionkeepalive";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "WeTube",
  description: "Watch and share videos on WeTube",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem("theme");
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                document.documentElement.classList.toggle(
                  "dark",
                  savedTheme === "dark" || (!savedTheme && prefersDark)
                );
              } catch {}
            `,
          }}
        />
      </head>
      <body className="h-full overflow-hidden min-h-full flex flex-col">
        <SessionKeepAlive />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
