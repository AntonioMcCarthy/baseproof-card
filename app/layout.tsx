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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
