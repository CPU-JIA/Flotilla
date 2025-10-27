/**
 * MeiliSearch索引文档结构
 *
 * 代表一个被索引的代码文件
 *
 * ECP-B3 (命名清晰): 字段命名清晰描述数据含义
 * ECP-D2 (注释规范): 注释解释字段用途
 */
export interface CodeDocument {
  // ============ 唯一标识 ============
  /**
   * 文档唯一ID
   * 格式: file_{fileId}_{commitId}
   * 示例: file_cm123_cm456
   */
  id: string;

  // ============ 核心搜索内容 ============
  /**
   * 文件完整内容
   * 限制: 最大1MB，超过则截断
   */
  content: string;

  /**
   * 文件名
   * 示例: user.service.ts
   */
  fileName: string;

  /**
   * 文件完整路径
   * 示例: src/users/user.service.ts
   */
  filePath: string;

  /**
   * 代码符号数组
   * 包含: 类名、函数名、接口名、变量名等
   * 示例: ["UserService", "createUser", "findById"]
   */
  symbols: string[];

  // ============ 关联信息 ============
  /**
   * 所属项目ID
   */
  projectId: string;

  /**
   * 项目名称（用于显示）
   */
  projectName: string;

  /**
   * 所属仓库ID
   */
  repositoryId: string;

  /**
   * 分支名称
   * 示例: main
   */
  branchName: string;

  // ============ 文件元数据 ============
  /**
   * 编程语言
   * 示例: typescript, javascript, python
   */
  language: string;

  /**
   * 文件扩展名
   * 示例: .ts, .js, .py
   */
  extension: string;

  /**
   * 文件大小（字节）
   */
  size: number;

  /**
   * 总行数
   */
  lineCount: number;

  /**
   * MIME类型
   * 示例: text/plain, application/json
   */
  mimeType: string;

  // ============ Git信息 ============
  /**
   * 提交ID（数据库主键）
   */
  commitId: string;

  /**
   * 提交信息
   */
  commitMessage: string;

  /**
   * Git commit hash
   * 示例: a1b2c3d4...
   */
  commitHash: string;

  /**
   * 作者ID（数据库主键）
   */
  authorId: string;

  /**
   * 作者名称（用于显示）
   */
  authorName: string;

  /**
   * 最后修改时间（Unix时间戳）
   * 用于排序
   */
  lastModified: number;

  // ============ 搜索优化 ============
  /**
   * 内容预览（前500字符）
   * 用于列表显示
   */
  contentPreview: string;

  /**
   * 高亮片段（可选）
   * MeiliSearch返回的匹配高亮
   */
  highlights?: HighlightSegment[];
}

/**
 * 高亮片段接口
 *
 * 描述搜索匹配的具体位置
 */
export interface HighlightSegment {
  /**
   * 行号（1-based）
   */
  lineNumber: number;

  /**
   * 行内容
   */
  lineContent: string;

  /**
   * 高亮起始列（0-based）
   */
  startColumn: number;

  /**
   * 高亮结束列（0-based）
   */
  endColumn: number;
}

/**
 * 索引任务进度接口
 *
 * 用于跟踪批量索引进度
 */
export interface IndexJobProgress {
  /**
   * 任务ID
   */
  jobId: string;

  /**
   * 项目ID
   */
  projectId: string;

  /**
   * 总文件数
   */
  totalFiles: number;

  /**
   * 已索引文件数
   */
  indexedFiles: number;

  /**
   * 失败文件数
   */
  failedFiles: number;

  /**
   * 任务状态
   */
  status: 'running' | 'completed' | 'failed';

  /**
   * 开始时间
   */
  startedAt: Date;

  /**
   * 预计完成时间（可选）
   */
  estimatedCompletionAt?: Date;
}
