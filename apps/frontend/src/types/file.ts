export interface ProjectFile {
  id: string
  projectId: string
  name: string
  path: string
  size: number
  mimeType: string
  type: 'file' | 'folder'
  folder: string | null
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export interface FilesListResponse {
  files: ProjectFile[]
  total: number
  page: number
  pageSize: number
  totalSize: number
}

export interface CreateFolderRequest {
  projectId: string
  name: string
  parentPath: string
}
