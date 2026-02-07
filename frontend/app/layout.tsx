import type { Metadata } from "next";
import { Inter, Outfit, Montserrat, Kalam } from 'next/font/google';
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['400', '500', '600', '700']
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
});

export const metadata: Metadata = {
  title: "Evolvia - AI-Powered Learning Platform",
  description: "Interactive, adaptive, and personalized learning experience for hard and soft skills.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${kalam.variable}`}>
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans bg-background text-foreground antialiased selection:bg-primary/20`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Sidebar />
          <div className="pl-[256px] min-h-screen transition-all duration-300" id="main-content">
            <Topbar />
            <main className="p-8 pb-32">
              {children}
            </main>
          </div>

          {/* Script to handle sidebar padding dynamically */}
          <script dangerouslySetInnerHTML={{
            __html: `
            const observer = new MutationObserver((mutations) => {
              const sidebar = document.querySelector('aside');
              const main = document.querySelector('#main-content');
              if (sidebar && main) {
                main.style.paddingLeft = sidebar.offsetWidth + 'px';
              }
            });
            const sidebar = document.querySelector('aside');
            if (sidebar) observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
          `}} />
        </ThemeProvider>
      </body>
    </html>
  );
}
