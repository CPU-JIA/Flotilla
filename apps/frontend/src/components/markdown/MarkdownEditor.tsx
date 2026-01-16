/**
 * MarkdownEditor Component
 *
 * Markdown editor with Write/Preview tabs
 *
 * ECP-A1: Single Responsibility - Handles markdown input with live preview
 * ECP-B1: DRY - Reuses MarkdownPreview component
 */

'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownPreview } from './MarkdownPreview'
import { useLanguage } from '@/contexts/language-context'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
  disabled = false,
}: MarkdownEditorProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
      <TabsList className="w-full justify-start border-b rounded-none">
        <TabsTrigger value="write">{t.issues.comments.writeTab}</TabsTrigger>
        <TabsTrigger value="preview">{t.issues.comments.previewTab}</TabsTrigger>
      </TabsList>

      <TabsContent value="write" className="mt-0">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="font-mono resize-none border-t-0 rounded-t-none focus-visible:ring-0"
        />
      </TabsContent>

      <TabsContent value="preview" className="mt-0">
        <div className="min-h-[240px] border rounded-b-md p-4">
          {value ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-muted-foreground italic">{t.issues.detail.noDescription}</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
