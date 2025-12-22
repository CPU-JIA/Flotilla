'use client'

/**
 * Global Code Search Page
 * Route: /search
 *
 * Features:
 * - Real-time code search across all accessible projects
 * - Advanced filters (language, file type, branch)
 * - Pagination with infinite scroll
 * - Search results with syntax highlighting
 *
 * ECP-A1: Single Responsibility - 页面只负责组合组件和状态管理
 * ECP-C1: Defensive Programming - 错误处理和加载状态
 */

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResultItem } from '@/components/search/SearchResultItem'
import { SearchFilters } from '@/components/search/SearchFilters'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, Search as SearchIcon, FileSearch } from 'lucide-react'
import { api } from '@/lib/api'
import type { SearchResult, SearchFilters as SearchFiltersType } from '@/types/search'

const DEFAULT_FILTERS: SearchFiltersType = {
  languages: [],
  extensions: [],
  branches: [],
  sort: 'relevance',
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState<SearchFiltersType>(DEFAULT_FILTERS)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  // Track if initial search has been performed
  const hasInitialized = useRef(false)

  const ITEMS_PER_PAGE = 20

  // Perform search
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
          language: filters.languages.length > 0 ? filters.languages : undefined,
          extension: filters.extensions.length > 0 ? filters.extensions : undefined,
          sort: filters.sort,
          offset,
          limit: ITEMS_PER_PAGE,
        })

        if (append && result) {
          // Append results for infinite scroll
          setResult({
            ...response,
            hits: [...result.hits, ...response.hits],
          })
        } else {
          setResult(response)
        }

        // Update URL with query
        const params = new URLSearchParams()
        params.set('q', searchQuery)
        router.replace(`/search?${params.toString()}`, { scroll: false })
      } catch (err) {
        console.error('Search failed:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        setResult(null)
      } finally {
        setIsLoading(false)
      }
    },
    [filters, result, router]
  )

  // Handle search query change
  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)
      setPage(0)
      performSearch(newQuery, 0, false)
    },
    [performSearch]
  )

  // Handle filter change
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

  // Handle load more
  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1
    const offset = nextPage * ITEMS_PER_PAGE
    setPage(nextPage)
    performSearch(query, offset, true)
  }, [page, query, performSearch])

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(0)
    if (query.trim()) {
      performSearch(query, 0, false)
    }
  }, [query, performSearch])

  // Initial search from URL params - only run once on mount
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <SearchIcon className="h-8 w-8" />
          Code Search
        </h1>
        <p className="text-muted-foreground">
          Search across all your projects and repositories
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          placeholder="Search code, files, symbols..."
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
                {result.totalHits} {result.totalHits === 1 ? 'result' : 'results'} found
                {result.processingTimeMs && (
                  <span className="ml-2">
                    ({result.processingTimeMs}ms)
                  </span>
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
                Enter a search query to find code, files, and symbols across all your
                projects. Use Cmd+K to focus the search bar.
              </p>
            </div>
          )}

          {/* Empty State - No Results */}
          {query.trim() && result && result.hits.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground max-w-md">
                Try adjusting your search query or filters. Make sure the file is indexed
                and you have access to the project.
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

export default function SearchPage() {
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
      <SearchPageContent />
    </Suspense>
  )
}
