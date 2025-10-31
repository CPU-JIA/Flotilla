'use client'

/**
 * Create Pull Request Page
 * ECP-D1: Testability - Form fields match E2E test selectors
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Branch {
  name: string
  commit: {
    oid: string
    message: string
  }
}

export default function CreatePullRequestPage() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sourceBranch, setSourceBranch] = useState('')
  const [targetBranch, setTargetBranch] = useState('main')
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function fetchBranches() {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(
        `http://localhost:4000/api/git/${projectId}/branches`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        const branchList = data.branches || []
        setBranches(branchList)
        if (branchList.length > 0) {
          const featureBranch = branchList.find((b: Branch) => b.name === 'feature-branch')
          if (featureBranch) {
            setSourceBranch(featureBranch.name)
          } else {
            setSourceBranch(branchList[0].name)
          }
        }
      } else {
        console.error('Failed to fetch branches:', response.status, await response.text())
        // Set default branch even if API fails to avoid permanently disabled button
        setTargetBranch('main')
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err)
      // Set default to avoid permanently disabled button
      setTargetBranch('main')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError(t.pullRequests.create.titleRequired)
      return
    }

    if (!sourceBranch) {
      setError('Please select a source branch')
      return
    }

    if (sourceBranch === targetBranch) {
      setError(t.pullRequests.create.sameBranchError)
      return
    }

    try {
      setCreating(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch('http://localhost:4000/api/pull-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          title,
          body,
          sourceBranch,
          targetBranch,
        }),
      })

      if (response.ok) {
        const pr = await response.json()
        router.push(`/projects/${projectId}/pulls/${pr.number}`)
      } else {
        const errorData = await response.json()
        setError(errorData.message || t.pullRequests.create.createFailed)
      }
    } catch {
      setError(t.pullRequests.create.createFailed)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">{t.pullRequests.create.title}</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-600 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="title">{t.pullRequests.create.titleLabel}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.pullRequests.create.titlePlaceholder}
            required
          />
        </div>

        <div>
          <Label htmlFor="body">{t.pullRequests.create.bodyLabel}</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t.pullRequests.create.bodyPlaceholder}
            rows={10}
          />
          <p className="text-sm text-muted-foreground mt-1">
            {t.pullRequests.create.bodyHelper}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sourceBranch">
              {t.pullRequests.create.sourceBranchLabel}
            </Label>
            <select
              id="sourceBranch"
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="targetBranch">
              {t.pullRequests.create.targetBranchLabel}
            </Label>
            <select
              id="targetBranch"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={creating || loading || !sourceBranch}>
            {creating
              ? t.pullRequests.create.creating
              : loading
                ? 'Loading branches...'
                : t.pullRequests.create.createButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            {t.pullRequests.create.cancelButton}
          </Button>
        </div>
      </form>
    </div>
  )
}
