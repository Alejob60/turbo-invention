import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Twin AI Infrastructure | ColombiaTI',
  description: 'Infraestructura automatizada para agentes de IA con pagos en USDC',
}

export default function RootLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return (
   <html lang="es">
     <body className={inter.className}>{children}</body>
    </html>
 )
}
