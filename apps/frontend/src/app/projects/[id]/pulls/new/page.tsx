'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import { apiRequest } from '@/lib/api'
import { CreatePullRequestDto } from '@/types/pull-request'

interface Branch {
  id: string
  name: string
}

export default function NewPullRequestPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const projectId = params.id as string

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sourceBranch, setSourceBranch] = useState('')
  const [targetBranch, setTargetBranch] = useState('main')
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBranches()
  }, [projectId])

  const fetchBranches = async () => {
    try {
      // TODO: Implement branch API endpoint
      // For now, use mock data
      setBranches([
        { id: '1', name: 'main' },
        { id: '2', name: 'develop' },
        { id: '3', name: 'feature/new-feature' },
      ])
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!title.trim()) {
      setError(t.pullRequests.create.titleRequired)
      return
    }

    if (!sourceBranch) {
      setError(t.pullRequests.create.sourceBranchRequired)
      return
    }

    if (!targetBranch) {
      setError(t.pullRequests.create.targetBranchRequired)
      return
    }

    if (sourceBranch === targetBranch) {
      setError(t.pullRequests.create.sameBranchError)
      return
    }

    try {
      setLoading(true)

      const dto: CreatePullRequestDto = {
        title: title.trim(),
        body: body.trim() || undefined,
        sourceBranch,
        targetBranch,
        projectId,
      }

      const pr = await apiRequest<{ number: number }>('/pull-requests', {
        method: 'POST',
        body: JSON.stringify(dto),
      })

      // Success - redirect to PR detail page
      router.push(`/projects/${projectId}/pulls/${pr.number}`)
    } catch (err) {
      console.error('Failed to create PR:', err)
      const error = err as Error
      setError(error.message || t.pullRequests.create.createFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/pulls`}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {t.pullRequests.backToPRs}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">{t.pullRequests.create.title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t.pullRequests.create.sourceBranchLabel}
            </label>
            <select
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              required
            >
              <option value="">{t.pullRequests.create.sourceBranchPlaceholder}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t.pullRequests.create.targetBranchLabel}
            </label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              required
            >
              <option value="">{t.pullRequests.create.targetBranchPlaceholder}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t.pullRequests.create.titleLabel}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.pullRequests.create.titlePlaceholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            required
            maxLength={500}
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t.pullRequests.create.bodyLabel}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.pullRequests.create.bodyPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[200px]"
            rows={10}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.pullRequests.create.bodyHelper}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.pullRequests.create.creating : t.pullRequests.create.createButton}
          </button>
          <Link
            href={`/projects/${projectId}/pulls`}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t.pullRequests.create.cancelButton}
          </Link>
        </div>
      </form>
    </div>
  )
}
