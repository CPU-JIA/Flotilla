/**
 * File Validator Unit Tests
 *
 * 测试覆盖：
 * 1. 文件名安全处理（路径遍历、特殊字符、长度限制）
 * 2. 可执行文件黑名单
 * 3. 文件类型白名单
 * 4. MIME类型魔数验证
 * 5. 文件伪装攻击检测
 * 6. 文件大小限制
 */

import {
  validateFileUpload,
  sanitizeFileName,
  isExecutableFile,
  getFileCategory,
  isExtensionAllowed,
  FileCategory,
} from './file-validator.util';
import { BadRequestException } from '@nestjs/common';

/**
 * 创建模拟的 Multer 文件对象
 */
function createMockFile(
  filename: string,
  mimeType: string,
  size: number,
  buffer: Buffer,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: mimeType,
    size,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };
}

/**
 * 创建特定文件类型的魔数签名
 */
function createFileSignature(type: string): Buffer {
  const signatures: Record<string, number[]> = {
    // PNG
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    // JPEG
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    // GIF
    gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    // PDF
    pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
    // ZIP
    zip: [0x50, 0x4b, 0x03, 0x04],
    // EXE (Windows)
    exe: [0x4d, 0x5a],
    // 文本文件（无特定签名）
    text: [0x48, 0x65, 0x6c, 0x6c, 0x6f], // "Hello"
  };

  const signature = signatures[type] || signatures.text;
  const buffer = Buffer.alloc(8192);
  signature.forEach((byte, index) => {
    buffer[index] = byte;
  });
  return buffer;
}

describe('FileValidator', () => {
  describe('sanitizeFileName', () => {
    it('应该移除路径遍历字符', () => {
      expect(sanitizeFileName('../../../etc/passwd')).toBe('etcpasswd');
      expect(sanitizeFileName('..\\..\\windows\\system32\\config')).toBe(
        'windowssystem32config',
      );
    });

    it('应该移除绝对路径标记', () => {
      expect(sanitizeFileName('/etc/passwd')).toBe('etcpasswd');
      expect(sanitizeFileName('C:\\Windows\\System32')).toBe('WindowsSystem32');
    });

    it('应该移除危险字符', () => {
      expect(sanitizeFileName('file<script>.js')).toBe('file_script_.js');
      expect(sanitizeFileName('file|pipe>.txt')).toBe('file_pipe_.txt');
      expect(sanitizeFileName('file:colon*.doc')).toBe('file_colon_.doc');
    });

    it('应该移除控制字符', () => {
      const filenameWithControlChars = 'file\x00\x01\x1f.txt';
      expect(sanitizeFileName(filenameWithControlChars)).toBe('file.txt');
    });

    it('应该限制文件名长度', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFileName(longName, 255);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });

    it('应该保留有效的文件名', () => {
      expect(sanitizeFileName('valid-file_name.txt')).toBe(
        'valid-file_name.txt',
      );
      expect(sanitizeFileName('文件名.jpg')).toBe('文件名.jpg');
    });

    it('应该抛出异常当文件名无效或为空', () => {
      expect(() => sanitizeFileName('')).toThrow(BadRequestException);
      expect(() => sanitizeFileName('...')).toThrow(BadRequestException);
      expect(() => sanitizeFileName(null as any)).toThrow(BadRequestException);
    });
  });

  describe('isExecutableFile', () => {
    it('应该检测Windows可执行文件', () => {
      expect(isExecutableFile('malware.exe')).toBe(true);
      expect(isExecutableFile('library.dll')).toBe(true);
      expect(isExecutableFile('script.bat')).toBe(true);
      expect(isExecutableFile('command.cmd')).toBe(true);
      expect(isExecutableFile('malicious.vbs')).toBe(true);
      expect(isExecutableFile('installer.msi')).toBe(true);
    });

    it('应该检测Unix/Linux可执行文件', () => {
      expect(isExecutableFile('script.sh')).toBe(true);
      expect(isExecutableFile('script.bash')).toBe(true);
      expect(isExecutableFile('program.bin')).toBe(true);
      expect(isExecutableFile('app.run')).toBe(true);
    });

    it('应该检测macOS可执行文件', () => {
      expect(isExecutableFile('installer.dmg')).toBe(true);
      expect(isExecutableFile('package.pkg')).toBe(true);
    });

    it('应该检测PowerShell脚本', () => {
      expect(isExecutableFile('script.ps1')).toBe(true);
      expect(isExecutableFile('module.psm1')).toBe(true);
    });

    it('不应该将普通文件标记为可执行', () => {
      expect(isExecutableFile('document.pdf')).toBe(false);
      expect(isExecutableFile('image.png')).toBe(false);
      expect(isExecutableFile('script.js')).toBe(false);
      expect(isExecutableFile('code.py')).toBe(false);
    });
  });

  describe('getFileCategory', () => {
    it('应该正确分类图片文件', () => {
      expect(getFileCategory('photo.jpg')).toBe(FileCategory.IMAGE);
      expect(getFileCategory('icon.png')).toBe(FileCategory.IMAGE);
      expect(getFileCategory('animation.gif')).toBe(FileCategory.IMAGE);
      expect(getFileCategory('logo.svg')).toBe(FileCategory.IMAGE);
    });

    it('应该正确分类文档文件', () => {
      expect(getFileCategory('report.pdf')).toBe(FileCategory.DOCUMENT);
      expect(getFileCategory('document.docx')).toBe(FileCategory.DOCUMENT);
      expect(getFileCategory('spreadsheet.xlsx')).toBe(FileCategory.DOCUMENT);
      expect(getFileCategory('notes.txt')).toBe(FileCategory.DOCUMENT);
      expect(getFileCategory('readme.md')).toBe(FileCategory.DOCUMENT);
    });

    it('应该正确分类代码文件', () => {
      expect(getFileCategory('script.js')).toBe(FileCategory.CODE);
      expect(getFileCategory('component.tsx')).toBe(FileCategory.CODE);
      expect(getFileCategory('program.py')).toBe(FileCategory.CODE);
      expect(getFileCategory('Main.java')).toBe(FileCategory.CODE);
      expect(getFileCategory('style.css')).toBe(FileCategory.CODE);
      expect(getFileCategory('config.json')).toBe(FileCategory.CODE);
    });

    it('应该正确分类归档文件', () => {
      expect(getFileCategory('archive.zip')).toBe(FileCategory.ARCHIVE);
      expect(getFileCategory('backup.tar')).toBe(FileCategory.ARCHIVE);
      expect(getFileCategory('compressed.gz')).toBe(FileCategory.ARCHIVE);
    });

    it('应该将未知类型标记为OTHER', () => {
      expect(getFileCategory('unknown.xyz')).toBe(FileCategory.OTHER);
    });
  });

  describe('isExtensionAllowed', () => {
    it('应该允许白名单中的文件类型', () => {
      expect(isExtensionAllowed('image.png', [FileCategory.IMAGE])).toBe(true);
      expect(isExtensionAllowed('document.pdf', [FileCategory.DOCUMENT])).toBe(
        true,
      );
      expect(isExtensionAllowed('script.js', [FileCategory.CODE])).toBe(true);
    });

    it('应该拒绝不在白名单中的文件类型', () => {
      expect(isExtensionAllowed('image.png', [FileCategory.DOCUMENT])).toBe(
        false,
      );
      expect(isExtensionAllowed('archive.zip', [FileCategory.IMAGE])).toBe(
        false,
      );
    });

    it('应该允许多个类别', () => {
      expect(
        isExtensionAllowed('image.png', [
          FileCategory.IMAGE,
          FileCategory.DOCUMENT,
        ]),
      ).toBe(true);
      expect(
        isExtensionAllowed('document.pdf', [
          FileCategory.IMAGE,
          FileCategory.DOCUMENT,
        ]),
      ).toBe(true);
    });
  });

  describe('validateFileUpload - 正常文件', () => {
    it('应该验证通过有效的PNG图片', async () => {
      const buffer = createFileSignature('png');
      const file = createMockFile('photo.png', 'image/png', 1024, buffer);

      // 注意：file-type库需要完整的文件签名才能识别，测试中使用简化签名
      // 禁用严格MIME检查来测试其他验证逻辑
      const result = await validateFileUpload(file, { strictMimeCheck: false });

      expect(result.valid).toBe(true);
      expect(result.sanitizedFileName).toBe('photo.png');
      expect(result.category).toBe(FileCategory.IMAGE);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证通过有效的JPEG图片', async () => {
      const buffer = createFileSignature('jpeg');
      const file = createMockFile('photo.jpg', 'image/jpeg', 2048, buffer);

      const result = await validateFileUpload(file, { strictMimeCheck: false });

      expect(result.valid).toBe(true);
      expect(result.sanitizedFileName).toBe('photo.jpg');
      expect(result.category).toBe(FileCategory.IMAGE);
    });

    it('应该验证通过PDF文档', async () => {
      const buffer = createFileSignature('pdf');
      const file = createMockFile(
        'report.pdf',
        'application/pdf',
        5120,
        buffer,
      );

      const result = await validateFileUpload(file, { strictMimeCheck: false });

      expect(result.valid).toBe(true);
      expect(result.category).toBe(FileCategory.DOCUMENT);
    });

    it('应该验证通过文本文件（无魔数签名）', async () => {
      const buffer = Buffer.from('console.log("Hello World");', 'utf-8');
      const file = createMockFile('script.js', 'text/javascript', 27, buffer);

      const result = await validateFileUpload(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe(FileCategory.CODE);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFileUpload - 攻击向量', () => {
    it('应该拒绝可执行文件', async () => {
      const buffer = createFileSignature('exe');
      const file = createMockFile(
        'malware.exe',
        'application/x-msdownload',
        1024,
        buffer,
      );

      // 禁用严格MIME检查，测试可执行文件黑名单功能
      const result = await validateFileUpload(file, { strictMimeCheck: false });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('禁止上传可执行文件类型')),
      ).toBe(true);
    });

    it('应该拒绝批处理文件', async () => {
      const buffer = Buffer.from('@echo off\ndel /f /s /q C:\\*', 'utf-8');
      const file = createMockFile(
        'malicious.bat',
        'application/bat',
        50,
        buffer,
      );

      const result = await validateFileUpload(file, { strictMimeCheck: false });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('禁止上传可执行文件类型')),
      ).toBe(true);
    });

    it('应该检测文件伪装攻击（EXE伪装成PNG）', async () => {
      const buffer = createFileSignature('exe');
      const file = createMockFile('fake.png', 'image/png', 1024, buffer);

      // 启用严格MIME检查来测试伪装检测
      const result = await validateFileUpload(file, { strictMimeCheck: true });

      expect(result.valid).toBe(false);
      // 文件无法被识别为任何类型，MIME验证失败
      expect(
        result.errors.some((e) => e.includes('MIME') || e.includes('无法检测')),
      ).toBe(true);
    });

    it('应该检测文件伪装攻击（ZIP伪装成JPG）', async () => {
      const buffer = createFileSignature('zip');
      const file = createMockFile('fake.jpg', 'image/jpeg', 2048, buffer);

      const result = await validateFileUpload(file, { strictMimeCheck: true });

      expect(result.valid).toBe(false);
      // ZIP被正确检测，与声明的JPEG不匹配
      expect(
        result.errors.some(
          (e) => e.includes('MIME类型不匹配') || e.includes('无法检测'),
        ),
      ).toBe(true);
    });

    it('应该拒绝超大文件', async () => {
      const buffer = Buffer.alloc(1024);
      const file = createMockFile(
        'huge.pdf',
        'application/pdf',
        200 * 1024 * 1024,
        buffer,
      );

      const result = await validateFileUpload(file, {
        maxFileSize: 100 * 1024 * 1024,
        strictMimeCheck: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('文件大小超过限制'))).toBe(
        true,
      );
    });

    it('应该处理路径遍历攻击', async () => {
      const buffer = createFileSignature('text');
      const file = createMockFile(
        '../../../etc/passwd',
        'text/plain',
        100,
        buffer,
      );

      const result = await validateFileUpload(file);

      expect(result.sanitizedFileName).toBe('etcpasswd');
      expect(result.sanitizedFileName).not.toContain('..');
      expect(result.sanitizedFileName).not.toContain('/');
    });

    it('应该拒绝超长文件名', async () => {
      const longName = 'a'.repeat(300) + '.txt';
      const buffer = Buffer.from('test', 'utf-8');
      const file = createMockFile(longName, 'text/plain', 4, buffer);

      const result = await validateFileUpload(file, {
        maxFileNameLength: 255,
      });

      expect(result.sanitizedFileName.length).toBeLessThanOrEqual(255);
    });

    it('应该拒绝不在白名单中的文件类型', async () => {
      const buffer = createFileSignature('zip');
      const file = createMockFile(
        'archive.zip',
        'application/zip',
        1024,
        buffer,
      );

      const result = await validateFileUpload(file, {
        allowedCategories: [FileCategory.IMAGE, FileCategory.DOCUMENT],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不允许的文件类型'))).toBe(
        true,
      );
    });

    it('应该在禁用归档时拒绝ZIP文件', async () => {
      const buffer = createFileSignature('zip');
      const file = createMockFile(
        'archive.zip',
        'application/zip',
        1024,
        buffer,
      );

      const result = await validateFileUpload(file, {
        allowArchives: false,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('归档文件'))).toBe(true);
    });

    it('应该警告归档文件需要病毒扫描', async () => {
      const buffer = createFileSignature('zip');
      const file = createMockFile(
        'archive.zip',
        'application/zip',
        1024,
        buffer,
      );

      const result = await validateFileUpload(file, {
        allowArchives: true,
        allowedCategories: [FileCategory.ARCHIVE],
        strictMimeCheck: false,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('病毒扫描'))).toBe(true);
    });
  });

  describe('validateFileUpload - 边界情况', () => {
    it('应该处理空buffer', async () => {
      const buffer = Buffer.alloc(0);
      const file = createMockFile('empty.txt', 'text/plain', 0, buffer);

      const result = await validateFileUpload(file);

      // 空文件应该通过验证（0字节文件是合法的）
      expect(result.valid).toBe(true);
    });

    it('应该处理文件名编码问题', async () => {
      const buffer = Buffer.from('测试内容', 'utf-8');
      // 模拟Multer的Latin1编码
      const latinEncodedName = Buffer.from('中文文件.txt', 'utf-8').toString(
        'latin1',
      );
      const file = createMockFile(latinEncodedName, 'text/plain', 12, buffer);

      const result = await validateFileUpload(file);

      expect(result.valid).toBe(true);
      // 文件名应该被正确解码和清理
      expect(result.sanitizedFileName).toBeTruthy();
    });

    it('应该处理SVG文件（无魔数签名）', async () => {
      const buffer = Buffer.from('<svg></svg>', 'utf-8');
      const file = createMockFile('icon.svg', 'image/svg+xml', 11, buffer);

      const result = await validateFileUpload(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe(FileCategory.IMAGE);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该处理Markdown文件', async () => {
      const buffer = Buffer.from('# Readme\n\nThis is a test.', 'utf-8');
      const file = createMockFile('README.md', 'text/markdown', 26, buffer);

      const result = await validateFileUpload(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe(FileCategory.DOCUMENT);
    });
  });

  describe('validateFileUpload - 配置选项', () => {
    it('应该使用自定义文件大小限制', async () => {
      const buffer = Buffer.alloc(1024);
      const file = createMockFile('file.txt', 'text/plain', 10 * 1024, buffer);

      const result = await validateFileUpload(file, {
        maxFileSize: 5 * 1024, // 5KB限制
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('文件大小超过限制'))).toBe(
        true,
      );
    });

    it('应该使用自定义文件名长度限制', async () => {
      const longName = 'a'.repeat(200) + '.txt';
      const buffer = Buffer.from('test', 'utf-8');
      const file = createMockFile(longName, 'text/plain', 4, buffer);

      const result = await validateFileUpload(file, {
        maxFileNameLength: 100,
      });

      expect(result.sanitizedFileName.length).toBeLessThanOrEqual(100);
    });

    it('应该在非严格模式下允许MIME不匹配', async () => {
      const buffer = createFileSignature('png');
      const file = createMockFile('file.png', 'image/jpeg', 1024, buffer);

      const result = await validateFileUpload(file, {
        strictMimeCheck: false,
      });

      // 非严格模式下，MIME不匹配不应导致失败
      expect(result.valid).toBe(true);
    });
  });
});
