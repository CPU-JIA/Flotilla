/**
 * 语言检测器
 *
 * 根据文件扩展名识别编程语言
 *
 * ECP-B1 (DRY): 集中管理扩展名到语言的映射
 * ECP-D3 (无魔法值): 使用常量对象定义映射关系
 */

/**
 * 可索引的文件扩展名列表
 *
 * ECP-D2 (注释规范): 解释为何选择这些类型
 */
export const INDEXABLE_EXTENSIONS = [
  // JavaScript/TypeScript
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',

  // Python
  '.py',
  '.pyi',

  // Java/Kotlin
  '.java',
  '.kt',
  '.kts',

  // Go
  '.go',

  // Rust
  '.rs',

  // C/C++
  '.c',
  '.h',
  '.cpp',
  '.cc',
  '.cxx',
  '.hpp',

  // C#
  '.cs',

  // Ruby
  '.rb',

  // PHP
  '.php',

  // Swift
  '.swift',

  // 配置文件
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.xml',
  '.properties',

  // 标记语言
  '.md',
  '.markdown',
  '.html',
  '.htm',

  // Shell脚本
  '.sh',
  '.bash',
  '.zsh',
  '.fish',

  // SQL
  '.sql',
];

/**
 * 排除的文件路径模式
 *
 * 这些路径下的文件不应被索引
 */
export const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /out\//,
  /\.next\//,
  /\.nuxt\//,
  /\.min\.(js|css)$/,
  /\.bundle\.(js|css)$/,
  /\.env$/,
  /\.key$/,
  /\.pem$/,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

/**
 * 扩展名到语言的映射
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Python
  '.py': 'python',
  '.pyi': 'python',

  // Java/Kotlin
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // C/C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',

  // C#
  '.cs': 'csharp',

  // Ruby
  '.rb': 'ruby',

  // PHP
  '.php': 'php',

  // Swift
  '.swift': 'swift',

  // 配置文件
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.xml': 'xml',
  '.properties': 'properties',

  // 标记语言
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.html': 'html',
  '.htm': 'html',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',

  // SQL
  '.sql': 'sql',
};

/**
 * 根据文件路径检测编程语言
 *
 * @param filePath - 文件路径
 * @returns 语言名称，未知则返回'unknown'
 *
 * ECP-B2 (KISS): 简单的扩展名匹配逻辑
 */
export function detectLanguage(filePath: string): string {
  const ext = getFileExtension(filePath);
  return EXTENSION_TO_LANGUAGE[ext] || 'unknown';
}

/**
 * 检查文件是否为可索引类型
 *
 * @param filePath - 文件路径
 * @returns 是否可索引
 *
 * ECP-C1 (输入验证): 检查路径是否匹配排除模式
 */
export function isIndexableFile(filePath: string): boolean {
  // 检查是否匹配排除模式
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  // 检查扩展名是否在可索引列表中
  const ext = getFileExtension(filePath);
  return INDEXABLE_EXTENSIONS.includes(ext);
}

/**
 * 获取文件扩展名（包含点号）
 *
 * @param filePath - 文件路径
 * @returns 扩展名，如'.ts'
 */
export function getFileExtension(filePath: string): string {
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return filePath.substring(lastDotIndex).toLowerCase();
}

/**
 * 获取文件名（不含路径）
 *
 * @param filePath - 文件路径
 * @returns 文件名
 */
export function getFileName(filePath: string): string {
  const lastSlashIndex = Math.max(
    filePath.lastIndexOf('/'),
    filePath.lastIndexOf('\\'),
  );
  return filePath.substring(lastSlashIndex + 1);
}
