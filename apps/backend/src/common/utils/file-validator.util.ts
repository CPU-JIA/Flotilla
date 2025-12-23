/**
 * File Upload Security Validator
 *
 * 防护措施:
 * - CWE-434: Unrestricted Upload of File with Dangerous Type
 * - CWE-22: Path Traversal
 * - OWASP A01:2021 - Broken Access Control
 *
 * ECP-A1: 单一职责 - 仅负责文件安全验证
 * ECP-C1: 防御性编程 - 多层验证机制
 */

import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

/**
 * 文件类型分类
 */
export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  CODE = 'code',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  maxFileSize?: number; // 字节
  maxFileNameLength?: number; // 字符
  allowedCategories?: FileCategory[];
  strictMimeCheck?: boolean; // 严格MIME验证（必须匹配魔数）
  allowArchives?: boolean; // 是否允许归档文件（需要额外扫描）
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  sanitizedFileName: string;
  detectedMimeType: string | null;
  declaredMimeType: string;
  category: FileCategory;
  warnings: string[];
  errors: string[];
}

/**
 * 文件类型白名单配置
 * ECP-D3: 无魔法字符串 - 所有配置都是常量
 */
const FILE_TYPE_WHITELIST: Record<FileCategory, Set<string>> = {
  [FileCategory.IMAGE]: new Set([
    // 常见图片格式
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'ico',
    'bmp',
    'tiff',
    'tif',
  ]),
  [FileCategory.DOCUMENT]: new Set([
    // 文档格式
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'md',
    'rtf',
    'odt',
    'ods',
    'odp',
    'csv',
    'tsv',
  ]),
  [FileCategory.CODE]: new Set([
    // 编程语言
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'jsonc',
    'py',
    'pyw',
    'pyi',
    'java',
    'class',
    'jar',
    'cpp',
    'cxx',
    'cc',
    'c',
    'h',
    'hpp',
    'hxx',
    'cs',
    'csx',
    'go',
    'mod',
    'sum',
    'rs',
    'toml',
    'php',
    'phtml',
    'rb',
    'rake',
    'gemspec',
    'swift',
    'kt',
    'kts',
    'scala',
    'sc',
    'r',
    'rmd',
    'lua',
    'pl',
    'pm',
    'vim',
    // 脚本语言（非可执行）
    'sql',
    'graphql',
    'prisma',
    // Web相关
    'html',
    'htm',
    'xhtml',
    'css',
    'scss',
    'sass',
    'less',
    'styl',
    'vue',
    'svelte',
    // 配置文件
    'xml',
    'yaml',
    'yml',
    'ini',
    'cfg',
    'conf',
    'env',
    'properties',
    'gitignore',
    'dockerignore',
    'editorconfig',
    'proto',
    'graphqls',
  ]),
  [FileCategory.ARCHIVE]: new Set([
    // 压缩归档（需要额外扫描）
    'zip',
    'tar',
    'gz',
    'tgz',
    'bz2',
    'xz',
    '7z',
    'rar',
  ]),
  [FileCategory.OTHER]: new Set([
    // 其他安全类型
    'log',
    'lock',
  ]),
};

/**
 * 可执行文件黑名单
 * ECP-C1: 防御性编程 - 明确禁止危险文件类型
 *
 * 注意：.js/.jse 不在此列表，因为它们是Web开发的合法源代码文件
 * 如果需要阻止Node.js脚本，应在应用层额外验证
 */
const EXECUTABLE_BLACKLIST = new Set([
  // Windows可执行文件
  'exe',
  'dll',
  'bat',
  'cmd',
  'com',
  'pif',
  'scr',
  'vbs',
  'vbe',
  'jse',
  'wsf',
  'wsh',
  'msi',
  'msp',
  'cpl',
  'gadget',
  'hta',
  'inf',
  'reg',
  // Unix/Linux可执行文件
  'sh',
  'bash',
  'zsh',
  'fish',
  'ksh',
  'csh',
  'run',
  'bin',
  'app',
  'command',
  // macOS
  'dmg',
  'pkg',
  'mpkg',
  'app',
  // Linux包管理
  'deb',
  'rpm',
  'snap',
  'flatpak',
  'appimage',
  // 其他脚本
  'ps1',
  'ps2',
  'psm1',
  'psd1', // PowerShell
  'applescript',
  'scpt', // AppleScript
  'jar',
  'war',
  'ear', // Java可执行
]);

/**
 * MIME类型到扩展名的映射（用于SVG等特殊类型）
 * 注意：此映射表保留供未来扩展使用（如自动扩展名检测）
 */

const _MIME_TO_EXTENSION: Record<string, string> = {
  'image/svg+xml': 'svg',
  'application/json': 'json',
  'application/xml': 'xml',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
  'text/css': 'css',
  'application/javascript': 'js',
  'application/typescript': 'ts',
};

/**
 * 默认验证选项
 */
const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFileNameLength: 255,
  allowedCategories: [
    FileCategory.IMAGE,
    FileCategory.DOCUMENT,
    FileCategory.CODE,
    FileCategory.OTHER,
  ],
  strictMimeCheck: true,
  allowArchives: true,
};

/**
 * 文件名安全处理
 * ECP-C1: 防御性编程 - 防止路径遍历和特殊字符攻击
 *
 * 处理内容：
 * 1. 移除路径遍历字符（../, ..\）
 * 2. 移除绝对路径标记（/, \, C:）
 * 3. 移除控制字符
 * 4. 移除危险字符（<, >, |, :, ", ?, *）
 * 5. 限制文件名长度
 *
 * @param fileName 原始文件名
 * @param maxLength 最大长度
 * @returns 安全的文件名
 */
export function sanitizeFileName(
  fileName: string,
  maxLength: number = 255,
): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new BadRequestException('无效的文件名');
  }

  // 移除路径分隔符和路径遍历（完全删除，不替换）
  let sanitized = fileName
    .replace(/\.\./g, '') // 移除 ..
    .replace(/[/\\]/g, '') // 删除路径分隔符
    .replace(/^[a-zA-Z]:/g, ''); // 移除Windows盘符

  // 移除控制字符（ASCII 0-31）
  // eslint-disable-next-line no-control-regex -- Intentionally removing control characters for security
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // 移除危险字符
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

  // 移除前后空格和点
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

  // 限制长度（保留扩展名）
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const baseName = path.basename(sanitized, ext);
    const maxBaseLength = maxLength - ext.length - 1;
    sanitized = baseName.substring(0, maxBaseLength) + ext;
  }

  // 确保文件名不为空
  if (!sanitized || sanitized.length === 0) {
    throw new BadRequestException('文件名无效或为空');
  }

  return sanitized;
}

/**
 * 检查是否为可执行文件
 *
 * @param fileName 文件名
 * @returns 是否为可执行文件
 */
export function isExecutableFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  return EXECUTABLE_BLACKLIST.has(ext);
}

/**
 * 根据扩展名确定文件类别
 *
 * @param fileName 文件名
 * @returns 文件类别
 */
export function getFileCategory(fileName: string): FileCategory {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');

  for (const [category, extensions] of Object.entries(FILE_TYPE_WHITELIST)) {
    if (extensions.has(ext)) {
      return category as FileCategory;
    }
  }

  return FileCategory.OTHER;
}

/**
 * 检查文件扩展名是否在白名单中
 *
 * @param fileName 文件名
 * @param allowedCategories 允许的文件类别
 * @returns 是否允许
 */
export function isExtensionAllowed(
  fileName: string,
  allowedCategories: FileCategory[],
): boolean {
  const category = getFileCategory(fileName);

  if (!allowedCategories.includes(category)) {
    return false;
  }

  return true;
}

/**
 * MIME类型魔数验证
 * 使用file-type库检测文件的真实类型
 *
 * @param buffer 文件buffer
 * @returns 检测到的MIME类型，如果无法检测则返回null
 */
export async function detectMimeType(buffer: Buffer): Promise<string | null> {
  try {
    // 动态导入 file-type (ESM模块)
    const { fileTypeFromBuffer } = await import('file-type');
    const fileType = await fileTypeFromBuffer(buffer);
    return fileType?.mime || null;
  } catch (_error) {
    // file-type可能抛出错误，返回null表示无法检测
    return null;
  }
}

/**
 * 验证MIME类型一致性
 *
 * @param declaredMime 声明的MIME类型
 * @param detectedMime 检测到的MIME类型
 * @param fileName 文件名（用于特殊类型处理）
 * @returns 是否一致
 */
export function validateMimeConsistency(
  declaredMime: string,
  detectedMime: string | null,
  fileName: string,
): { valid: boolean; warning?: string } {
  // 特殊处理：文本文件和某些格式无法通过魔数检测
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  const textExtensions = new Set([
    'txt',
    'md',
    'json',
    'xml',
    'html',
    'css',
    'js',
    'ts',
    'jsx',
    'tsx',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'go',
    'rs',
    'php',
    'rb',
    'swift',
    'yaml',
    'yml',
    'toml',
    'ini',
    'conf',
    'sql',
    'sh',
    'bash',
  ]);

  const svgExtensions = new Set(['svg']);

  // 文本文件和SVG允许无法检测MIME
  if (detectedMime === null) {
    if (textExtensions.has(ext)) {
      return {
        valid: true,
        warning: '文本文件无法通过魔数验证，已通过扩展名验证',
      };
    }
    if (svgExtensions.has(ext) && declaredMime === 'image/svg+xml') {
      return {
        valid: true,
        warning: 'SVG文件无法通过魔数验证，已通过扩展名验证',
      };
    }
    return {
      valid: false,
      warning: '无法检测文件类型，可能是不支持的格式或损坏的文件',
    };
  }

  // 比较MIME类型（忽略参数，如charset）
  const declaredBase = declaredMime.split(';')[0].trim().toLowerCase();
  const detectedBase = detectedMime.split(';')[0].trim().toLowerCase();

  if (declaredBase === detectedBase) {
    return { valid: true };
  }

  // 某些MIME类型有别名，需要特殊处理
  const mimeAliases: Record<string, Set<string>> = {
    'image/jpeg': new Set(['image/jpg']),
    'image/jpg': new Set(['image/jpeg']),
    'application/zip': new Set(['application/x-zip-compressed']),
  };

  if (
    mimeAliases[declaredBase]?.has(detectedBase) ||
    mimeAliases[detectedBase]?.has(declaredBase)
  ) {
    return { valid: true };
  }

  return {
    valid: false,
    warning: `MIME类型不匹配：声明为 ${declaredBase}，实际检测为 ${detectedBase}`,
  };
}

/**
 * 主文件上传验证函数
 *
 * ECP-C1: 防御性编程 - 多层验证
 * ECP-C2: 系统化错误处理
 *
 * 验证流程：
 * 1. 文件名安全处理
 * 2. 文件大小检查
 * 3. 可执行文件黑名单检查
 * 4. 文件扩展名白名单检查
 * 5. MIME类型魔数验证
 * 6. MIME一致性验证
 *
 * @param file Express.Multer.File 对象
 * @param options 验证选项
 * @returns 验证结果
 * @throws BadRequestException 如果验证失败
 */
export async function validateFileUpload(
  file: Express.Multer.File,
  options: ValidationOptions = {},
): Promise<ValidationResult> {
  // 合并选项
  const opts: Required<ValidationOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  // 步骤1: 文件名安全处理
  let sanitizedFileName: string;
  try {
    // 修复文件名编码（Multer使用Latin1，需转换为UTF-8）
    const originalFilename = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    sanitizedFileName = sanitizeFileName(
      originalFilename,
      opts.maxFileNameLength,
    );
  } catch (error) {
    errors.push(error.message || '文件名处理失败');
    return {
      valid: false,
      sanitizedFileName: '',
      detectedMimeType: null,
      declaredMimeType: file.mimetype,
      category: FileCategory.OTHER,
      warnings,
      errors,
    };
  }

  // 步骤2: 文件大小检查
  if (file.size > opts.maxFileSize) {
    errors.push(
      `文件大小超过限制 ${opts.maxFileSize / 1024 / 1024}MB（当前: ${(file.size / 1024 / 1024).toFixed(2)}MB）`,
    );
  }

  // 步骤3: 可执行文件黑名单检查
  if (isExecutableFile(sanitizedFileName)) {
    errors.push(`禁止上传可执行文件类型: ${path.extname(sanitizedFileName)}`);
  }

  // 步骤4: 文件类型白名单检查
  const category = getFileCategory(sanitizedFileName);

  // 归档文件需要额外处理
  if (category === FileCategory.ARCHIVE && !opts.allowArchives) {
    errors.push('当前配置不允许上传归档文件');
  }

  if (!isExtensionAllowed(sanitizedFileName, opts.allowedCategories)) {
    errors.push(
      `不允许的文件类型: ${path.extname(sanitizedFileName)}（类别: ${category}）`,
    );
  }

  // 步骤5: MIME类型魔数验证
  let detectedMimeType: string | null = null;
  try {
    detectedMimeType = await detectMimeType(file.buffer);
  } catch (_error) {
    warnings.push('MIME类型检测失败');
  }

  // 步骤6: MIME一致性验证
  if (opts.strictMimeCheck) {
    const mimeValidation = validateMimeConsistency(
      file.mimetype,
      detectedMimeType,
      sanitizedFileName,
    );

    if (!mimeValidation.valid) {
      if (mimeValidation.warning) {
        // 某些情况下仅警告，不阻止上传
        const ext = path
          .extname(sanitizedFileName)
          .toLowerCase()
          .replace('.', '');
        const allowedWithoutMime = new Set([
          'txt',
          'md',
          'json',
          'xml',
          'html',
          'css',
          'js',
          'ts',
          'svg',
          'yaml',
          'yml',
          'toml',
          'sh',
        ]);

        if (allowedWithoutMime.has(ext)) {
          warnings.push(mimeValidation.warning);
        } else {
          errors.push(mimeValidation.warning);
        }
      }
    } else if (mimeValidation.warning) {
      warnings.push(mimeValidation.warning);
    }
  }

  // 归档文件警告
  if (category === FileCategory.ARCHIVE && opts.allowArchives) {
    warnings.push('归档文件已上传，建议在解压前进行病毒扫描');
  }

  const valid = errors.length === 0;

  return {
    valid,
    sanitizedFileName,
    detectedMimeType,
    declaredMimeType: file.mimetype,
    category,
    warnings,
    errors,
  };
}

/**
 * 简化的验证函数（抛出异常）
 *
 * @param file Express.Multer.File 对象
 * @param options 验证选项
 * @returns 安全的文件名
 * @throws BadRequestException 如果验证失败
 */
export async function validateFileUploadOrThrow(
  file: Express.Multer.File,
  options: ValidationOptions = {},
): Promise<string> {
  const result = await validateFileUpload(file, options);

  if (!result.valid) {
    throw new BadRequestException({
      message: '文件验证失败',
      errors: result.errors,
      warnings: result.warnings,
    });
  }

  // 记录警告（如果有）
  if (result.warnings.length > 0) {
    console.warn('File upload warnings:', result.warnings);
  }

  return result.sanitizedFileName;
}
