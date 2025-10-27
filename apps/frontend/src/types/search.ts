/**
 * Code Search 类型定义
 *
 * 对应Backend DTO:
 * - SearchQueryDto (apps/backend/src/search/dto/search-query.dto.ts)
 * - SearchResultDto (apps/backend/src/search/dto/search-result.dto.ts)
 *
 * ECP-B3: 清晰的命名约定
 */

/**
 * 搜索结果项（单个文件）
 */
export interface SearchHit {
  id: string;
  projectId: string;
  repositoryId: string;
  branchName: string;
  filePath: string;
  fileName: string;
  content: string;
  language: string;
  extension: string;
  size: number;
  lineCount: number;
  lastModified: string;
  commitHash: string;
  commitMessage?: string;
  authorId: string;
  symbols?: string[];

  // MeiliSearch metadata
  _formatted?: {
    fileName?: string;
    filePath?: string;
    content?: string;
    symbols?: string[];
  };
}

/**
 * 搜索响应
 */
export interface SearchResult {
  hits: SearchHit[];
  totalHits: number;
  offset: number;
  limit: number;
  processingTimeMs: number;
  query: string;
}

/**
 * 搜索查询参数
 */
export interface SearchQuery {
  query: string;
  projectId?: string;
  language?: string[];
  extension?: string[];
  branchName?: string;
  repositoryId?: string;
  offset?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'size';
}

/**
 * 索引状态
 */
export interface IndexStatus {
  projectId: string;
  totalFiles: number;
  indexedFiles: number;
  failedFiles: number;
  lastIndexedAt?: string;
  isIndexing: boolean;
}

/**
 * 重索引响应
 */
export interface ReindexResponse {
  projectId: string;
  message: string;
  estimatedTime?: string;
}

/**
 * 搜索过滤器状态
 */
export interface SearchFilters {
  languages: string[];
  extensions: string[];
  branches: string[];
  sort: 'relevance' | 'date' | 'size';
}

/**
 * 支持的编程语言列表（对应Backend language-detector.ts）
 */
export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'java',
  'cpp',
  'c',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'csharp',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'sql',
  'shell',
  'dockerfile',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * 常用文件扩展名分组
 */
export const EXTENSION_GROUPS = {
  'Web Frontend': ['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss', '.vue'],
  'Backend': ['.py', '.java', '.go', '.rs', '.rb', '.php', '.cs'],
  'Config': ['.json', '.yaml', '.yml', '.toml', '.env'],
  'Documentation': ['.md', '.mdx', '.txt'],
  'Database': ['.sql', '.prisma'],
  'System': ['.sh', '.bash', '.zsh', '.dockerfile'],
} as const;
