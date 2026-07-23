import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BaseProof Card",
  description: "Mint and update your onchain identity card."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="6a61c75c078f6baf9ef3047f" />
        <meta
          name="talentapp:project_verification"
          content="19c1a0e7252ea68e7ae6932c8c321e4359cf50c2d7cc420a5caf8d05a23d10259411cf9714013b0b7fd022fa5996b8fc4067501cf5f3955c55e3a1a9359dcfdb"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
