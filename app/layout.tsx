import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CheckIt — Human-powered AI detection",
  description: "A community-powered way to check whether an image was AI generated."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
