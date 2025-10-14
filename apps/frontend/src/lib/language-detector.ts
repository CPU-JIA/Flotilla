/**
 * 文件扩展名到Monaco Editor语言ID的映射
 * ECP-B1: DRY原则 - 统一的语言检测逻辑
 */

const extensionToLanguage: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Python
  '.py': 'python',

  // Java
  '.java': 'java',

  // C/C++
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',

  // C#
  '.cs': 'csharp',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // PHP
  '.php': 'php',

  // Ruby
  '.rb': 'ruby',

  // Swift
  '.swift': 'swift',

  // Kotlin
  '.kt': 'kotlin',

  // Scala
  '.scala': 'scala',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',

  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.vue': 'html',

  // Data formats
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',

  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',

  // Plain text
  '.txt': 'plaintext',

  // SQL
  '.sql': 'sql',

  // Protocol Buffers
  '.proto': 'protobuf',
}

/**
 * 根据文件名检测语言
 * @param filename - 文件名（包含扩展名）
 * @returns Monaco Editor语言ID
 */
export function detectLanguage(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  return extensionToLanguage[ext] || 'plaintext'
}
