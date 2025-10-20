import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flotilla - 我们构建共识',
  description: '基于Raft共识算法的云原生开发平台。让分布式团队像分布式系统一样可靠。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}

