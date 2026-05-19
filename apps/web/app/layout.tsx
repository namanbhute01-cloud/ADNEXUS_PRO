import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata = {
  title: "VAART-E CMS",
  description: "Control center for display units, campaigns, media, and live screen playback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans text-foreground">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
