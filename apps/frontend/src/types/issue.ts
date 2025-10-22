export interface Issue {
  id: string;
  projectId: string;
  number: number;
  title: string;
  body?: string;
  state: 'OPEN' | 'CLOSED';
  authorId: string;
  assigneeIds: string[];
  labelIds: string[];
  milestoneId?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  author?: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  milestone?: {
    id: string;
    title: string;
    description?: string;
    state: 'OPEN' | 'CLOSED';
    dueDate?: string;
  };
  labels?: Label[];
  _count?: {
    comments: number;
  };
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string; // Hex color
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  state: 'OPEN' | 'CLOSED';
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    issues: number;
  };
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
}

export interface IssueQueryParams {
  page?: number;
  limit?: number;
  state?: 'OPEN' | 'CLOSED';
  assignee?: string;
  labels?: string;
  milestone?: string;
  search?: string;
}

export interface IssuesResponse {
  data: Issue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateIssueDto {
  title: string;
  body?: string;
  assigneeIds?: string[];
  labelIds?: string[];
  milestoneId?: string;
}

export interface UpdateIssueDto {
  title?: string;
  body?: string;
  assigneeIds?: string[];
  labelIds?: string[];
  milestoneId?: string;
  state?: 'OPEN' | 'CLOSED';
}
