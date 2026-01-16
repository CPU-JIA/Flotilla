import { DocsSidebar } from '@/components/layout/docs-sidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <DocsSidebar />
      <main className="flex-1 max-w-4xl mx-auto">{children}</main>
    </div>
  )
}
