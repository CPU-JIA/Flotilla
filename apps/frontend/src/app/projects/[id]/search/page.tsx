'use client'

/**
 * Project-Scoped Code Search Page
 * Route: /projects/[id]/search
 *
 * Features:
 * - Scoped search within a specific project
 * - Reuses global search components
 * - Auto-applies projectId filter
 * - Shows project breadcrumb navigation
 *
 * ECP-B1: DRY - 复用全局搜索组件
 */

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Loader2, FileSearch } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResultItem } from '@/components/search/SearchResultItem'
import { SearchFilters } from '@/components/search/SearchFilters'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { SearchResult, SearchFilters as SearchFiltersType } from '@/types/search'
import type { Project } from '@/types/project'

const DEFAULT_FILTERS: SearchFiltersType = {
  languages: [],
  extensions: [],
  branches: [],
  sort: 'relevance',
}

function ProjectSearchPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.id as string

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState<SearchFiltersType>(DEFAULT_FILTERS)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  // Track if initial search has been performed
  const hasInitialized = useRef(false)

  const ITEMS_PER_PAGE = 20

  // Fetch project info
  useEffect(() => {
    async function fetchProject() {
      try {
        const projectData = await api.projects.getById(projectId)
        setProject(projectData)
      } catch (err) {
        console.error('Failed to fetch project:', err)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  // Perform search (with projectId filter)
  const performSearch = useCallback(
    async (searchQuery: string, offset = 0, append = false) => {
      if (!searchQuery.trim()) {
        setResult(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await api.search.search({
          query: searchQuery,
          projectId, // Auto-apply project filter
          language: filters.languages.length > 0 ? filters.languages : undefined,
          extension: filters.extensions.length > 0 ? filters.extensions : undefined,
          sort: filters.sort,
          offset,
          limit: ITEMS_PER_PAGE,
        })

        if (append && result) {
          setResult({
            ...response,
            hits: [...result.hits, ...response.hits],
          })
        } else {
          setResult(response)
        }

        // Update URL
        const params = new URLSearchParams()
        params.set('q', searchQuery)
        router.replace(`/projects/${projectId}/search?${params.toString()}`, {
          scroll: false,
        })
      } catch (err) {
        console.error('Search failed:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        setResult(null)
      } finally {
        setIsLoading(false)
      }
    },
    [projectId, filters, result, router]
  )

  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)
      setPage(0)
      performSearch(newQuery, 0, false)
    },
    [performSearch]
  )

  const handleFilterChange = useCallback(
    (newFilters: SearchFiltersType) => {
      setFilters(newFilters)
      setPage(0)
      if (query.trim()) {
        performSearch(query, 0, false)
      }
    },
    [query, performSearch]
  )

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1
    const offset = nextPage * ITEMS_PER_PAGE
    setPage(nextPage)
    performSearch(query, offset, true)
  }, [page, query, performSearch])

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(0)
    if (query.trim()) {
      performSearch(query, 0, false)
    }
  }, [query, performSearch])

  // Initial search from URL - only run once on mount
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const urlQuery = searchParams.get('q')
    if (urlQuery && urlQuery.trim()) {
      setQuery(urlQuery)
      performSearch(urlQuery, 0, false)
    }
  }, [searchParams, performSearch])

  const hasMore = result && result.hits.length < result.totalHits

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        {project ? (
          <>
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-foreground"
            >
              {project.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Search</span>
          </>
        ) : (
          <span>Search</span>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {project ? `Search in ${project.name}` : 'Project Search'}
        </h1>
        <p className="text-muted-foreground">
          Search code, files, and symbols in this project
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          placeholder={`Search in ${project?.name || 'project'}...`}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
            className="sticky top-4"
          />
        </aside>

        {/* Search Results */}
        <main className="lg:col-span-3 space-y-4">
          {/* Results Header */}
          {result && !isLoading && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {result.totalHits} {result.totalHits === 1 ? 'result' : 'results'}{' '}
                found
                {result.processingTimeMs && (
                  <span className="ml-2">({result.processingTimeMs}ms)</span>
                )}
              </span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && page === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Empty State - No Query */}
          {!query.trim() && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Start searching</h3>
              <p className="text-muted-foreground max-w-md">
                Enter a search query to find code, files, and symbols in{' '}
                {project?.name || 'this project'}.
              </p>
            </div>
          )}

          {/* Empty State - No Results */}
          {query.trim() && result && result.hits.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground max-w-md">
                Try adjusting your search query or filters. Make sure the file is
                indexed.
              </p>
            </div>
          )}

          {/* Results List */}
          {result && result.hits.length > 0 && (
            <>
              <div className="space-y-3">
                {result.hits.map(hit => (
                  <SearchResultItem key={hit.id} hit={hit} query={query} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="min-w-[200px]"
                  >
                    {isLoading && page > 0 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${result.totalHits - result.hits.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ProjectSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <ProjectSearchPageContent />
    </Suspense>
  )
}
