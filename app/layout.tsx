import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import KeyboardShortcuts from "@/components/layout/KeyboardShortcuts";
import Toaster from "@/components/ui/Toaster";
import AgeGate from "@/components/gates/AgeGate";
import PreviewModalHost from "@/components/media/PreviewModalHost";
import ImageLightboxHost from "@/components/media/ImageLightboxHost";
import MediaContextMenuHost from "@/components/media/MediaContextMenuHost";
import ConfirmModalHost from "@/components/ui/ConfirmModalHost";

export const viewport: Viewport = {
  themeColor: "#060709",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "MovieVault",
    template: "%s · MovieVault",
  },
  description:
    "Cyberpunk Neo-Noir Media Vault — Unified personal vault for Movies, Series, and Adult JAV",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <AuthProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
                <TopBar />
                <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-12">
                  {children}
                </main>
              </div>
            </div>
            <BottomNav />
            <KeyboardShortcuts />
            <Toaster />
            <AgeGate />
            <PreviewModalHost />
            <ImageLightboxHost />
            <MediaContextMenuHost />
            <ConfirmModalHost />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}