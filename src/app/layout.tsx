import type { ReactNode } from "react"
import { Tektur } from 'next/font/google'
import "./globals.css";

const tektur = Tektur({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export default function RootLayout({ children, }:{children: ReactNode}) {
  return (
    <html lang="en">
      <body
        className={tektur.className}>
        {children}
      </body>
    </html>
  );
}
