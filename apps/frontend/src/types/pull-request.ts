/**
 * Pull Request System Types
 * Frontend type definitions matching backend Prisma models
 */

export enum PRState {
  OPEN = 'OPEN',
  MERGED = 'MERGED',
  CLOSED = 'CLOSED',
}

export enum ReviewState {
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  COMMENTED = 'COMMENTED',
}

export enum MergeStrategy {
  MERGE = 'merge',
  SQUASH = 'squash',
  REBASE = 'rebase',
}

export interface User {
  id: string
  username: string
  email?: string
  avatar?: string | null
}

export interface PullRequest {
  id: string
  projectId: string
  number: number
  title: string
  body?: string | null
  sourceBranch: string
  targetBranch: string
  state: PRState
  authorId: string
  mergedAt?: string | null
  mergedBy?: string | null
  mergeCommit?: string | null
  closedAt?: string | null
  createdAt: string
  updatedAt: string

  // Relations
  author: User
  merger?: User | null
  project?: {
    id: string
    name: string
  }
  reviews?: PRReview[]
  comments?: PRComment[]
  events?: PREvent[]
  _count?: {
    comments: number
    reviews: number
  }
}

export interface PRReview {
  id: string
  pullRequestId: string
  reviewerId: string
  state: ReviewState
  body?: string | null
  createdAt: string
  updatedAt: string

  // Relations
  reviewer: User
}

export interface PRComment {
  id: string
  pullRequestId: string
  authorId: string
  body: string
  filePath?: string | null
  lineNumber?: number | null
  commitHash?: string | null
  createdAt: string
  updatedAt: string

  // Relations
  author: User
}

export interface PREvent {
  id: string
  pullRequestId: string
  actorId: string
  event: string // 'opened', 'closed', 'merged', 'reviewed', etc.
  metadata?: Record<string, unknown>
  createdAt: string

  // Relations
  actor: User
}

export interface GitDiff {
  files: GitDiffFile[]
  summary: {
    totalFiles: number
    totalAdditions: number
    totalDeletions: number
  }
}

export interface GitDiffFile {
  path: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
  patch?: string
}

// API Request DTOs
export interface CreatePullRequestDto {
  title: string
  body?: string
  sourceBranch: string
  targetBranch: string
  projectId: string
}

export interface UpdatePullRequestDto {
  title?: string
  body?: string
}

export interface MergePullRequestDto {
  strategy?: MergeStrategy
  commitMessage?: string
}

export interface CreateReviewDto {
  state: ReviewState
  body?: string
}

export interface CreateCommentDto {
  body: string
  filePath?: string
  lineNumber?: number
  commitHash?: string
}
