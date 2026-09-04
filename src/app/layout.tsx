import type { ReactNode } from "react"
import { Sono } from "next/font/google"
import "./globals.css";

const sono = Sono(
  {
    subsets : ["latin"],
    axes    : ["MONO"],
    variable: "--font-sono",
  }
);

export default function RootLayout(
  { 
    children, 
  }:{
    children: ReactNode
  }) {
  return (
    <html lang="en" className={ sono.variable }>
      <body> { children } </body>
    </html>
  );
}
