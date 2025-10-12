export interface FileEntity {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  type: 'file' | 'folder'
  projectId: string
  uploadedBy: string
  folder?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface FilesListResponse {
  files: FileEntity[]
  total: number
  page: number
  pageSize: number
  totalSize: number // 项目总文件大小
}
