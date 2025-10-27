import {
  isIndexableFile,
  detectLanguage,
  getFileExtension,
  getFileName,
} from './language-detector';

/**
 * 语言检测器单元测试
 *
 * 测试范围：
 * - isIndexableFile(): 文件类型过滤（扩展名匹配 + 排除模式）
 * - detectLanguage(): 语言识别
 * - getFileExtension(): 扩展名提取
 * - getFileName(): 文件名提取
 *
 * ECP-D1 (可测试性): 纯函数，易于测试
 */
describe('language-detector', () => {
  describe('isIndexableFile', () => {
    it('should return true for TypeScript files', () => {
      expect(isIndexableFile('src/user.service.ts')).toBe(true);
      expect(isIndexableFile('components/Button.tsx')).toBe(true);
    });

    it('should return true for JavaScript files', () => {
      expect(isIndexableFile('index.js')).toBe(true);
      expect(isIndexableFile('App.jsx')).toBe(true);
      expect(isIndexableFile('module.mjs')).toBe(true);
      expect(isIndexableFile('script.cjs')).toBe(true);
    });

    it('should return true for configuration files', () => {
      expect(isIndexableFile('package.json')).toBe(true);
      expect(isIndexableFile('config.yaml')).toBe(true);
      expect(isIndexableFile('settings.toml')).toBe(true);
    });

    it('should return true for markup files', () => {
      expect(isIndexableFile('README.md')).toBe(true);
      expect(isIndexableFile('index.html')).toBe(true);
    });

    it('should return false for files in node_modules', () => {
      expect(isIndexableFile('node_modules/lib/index.js')).toBe(false);
      expect(isIndexableFile('path/node_modules/package/file.ts')).toBe(false);
    });

    it('should return false for files in dist/build directories', () => {
      expect(isIndexableFile('dist/bundle.js')).toBe(false);
      expect(isIndexableFile('build/output.js')).toBe(false);
      expect(isIndexableFile('out/main.js')).toBe(false);
    });

    it('should return false for minified files', () => {
      expect(isIndexableFile('vendor.min.js')).toBe(false);
      expect(isIndexableFile('styles.min.css')).toBe(false);
      expect(isIndexableFile('bundle.bundle.js')).toBe(false);
    });

    it('should return false for lock files', () => {
      expect(isIndexableFile('package-lock.json')).toBe(false);
      expect(isIndexableFile('yarn.lock')).toBe(false);
      expect(isIndexableFile('pnpm-lock.yaml')).toBe(false);
    });

    it('should return false for sensitive files', () => {
      expect(isIndexableFile('.env')).toBe(false);
      expect(isIndexableFile('private.key')).toBe(false);
      expect(isIndexableFile('cert.pem')).toBe(false);
    });

    it('should return false for unsupported file extensions', () => {
      expect(isIndexableFile('image.png')).toBe(false);
      expect(isIndexableFile('video.mp4')).toBe(false);
      expect(isIndexableFile('document.pdf')).toBe(false);
    });

    it('should return false for Git directory files', () => {
      expect(isIndexableFile('.git/config')).toBe(false);
      expect(isIndexableFile('path/.git/HEAD')).toBe(false);
    });
  });

  describe('detectLanguage', () => {
    it('should detect TypeScript', () => {
      expect(detectLanguage('file.ts')).toBe('typescript');
      expect(detectLanguage('component.tsx')).toBe('typescript');
    });

    it('should detect JavaScript', () => {
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('App.jsx')).toBe('javascript');
      expect(detectLanguage('module.mjs')).toBe('javascript');
    });

    it('should detect Python', () => {
      expect(detectLanguage('main.py')).toBe('python');
      expect(detectLanguage('types.pyi')).toBe('python');
    });

    it('should detect Java', () => {
      expect(detectLanguage('Main.java')).toBe('java');
    });

    it('should detect Go', () => {
      expect(detectLanguage('server.go')).toBe('go');
    });

    it('should detect Rust', () => {
      expect(detectLanguage('lib.rs')).toBe('rust');
    });

    it('should detect C/C++', () => {
      expect(detectLanguage('main.c')).toBe('c');
      expect(detectLanguage('utils.cpp')).toBe('cpp');
      expect(detectLanguage('header.h')).toBe('c');
      expect(detectLanguage('header.hpp')).toBe('cpp');
    });

    it('should detect configuration languages', () => {
      expect(detectLanguage('package.json')).toBe('json');
      expect(detectLanguage('config.yaml')).toBe('yaml');
      expect(detectLanguage('settings.toml')).toBe('toml');
      expect(detectLanguage('app.xml')).toBe('xml');
    });

    it('should detect markup languages', () => {
      expect(detectLanguage('README.md')).toBe('markdown');
      expect(detectLanguage('index.html')).toBe('html');
    });

    it('should detect shell scripts', () => {
      expect(detectLanguage('script.sh')).toBe('shell');
      expect(detectLanguage('setup.bash')).toBe('shell');
    });

    it('should return "unknown" for unsupported extensions', () => {
      expect(detectLanguage('file.xyz')).toBe('unknown');
      expect(detectLanguage('image.png')).toBe('unknown');
    });

    it('should return "unknown" for files without extension', () => {
      expect(detectLanguage('Makefile')).toBe('unknown');
      expect(detectLanguage('README')).toBe('unknown');
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension with dot', () => {
      expect(getFileExtension('file.ts')).toBe('.ts');
      expect(getFileExtension('script.js')).toBe('.js');
      expect(getFileExtension('config.yaml')).toBe('.yaml');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('file.test.ts')).toBe('.ts');
      expect(getFileExtension('bundle.min.js')).toBe('.js');
    });

    it('should handle paths with directories', () => {
      expect(getFileExtension('src/utils/file.ts')).toBe('.ts');
      expect(getFileExtension('/absolute/path/file.py')).toBe('.py');
    });

    it('should convert extension to lowercase', () => {
      expect(getFileExtension('FILE.TS')).toBe('.ts');
      expect(getFileExtension('Script.JS')).toBe('.js');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('Makefile')).toBe('');
      expect(getFileExtension('README')).toBe('');
    });

    it('should handle dot at the start of filename', () => {
      expect(getFileExtension('.gitignore')).toBe('.gitignore');
      expect(getFileExtension('.env')).toBe('.env');
    });
  });

  describe('getFileName', () => {
    it('should extract filename from path with forward slashes', () => {
      expect(getFileName('src/utils/file.ts')).toBe('file.ts');
      expect(getFileName('path/to/script.js')).toBe('script.js');
    });

    it('should extract filename from path with backslashes', () => {
      expect(getFileName('src\\utils\\file.ts')).toBe('file.ts');
      expect(getFileName('C:\\Windows\\System32\\cmd.exe')).toBe('cmd.exe');
    });

    it('should handle mixed slashes', () => {
      expect(getFileName('path/to\\file.ts')).toBe('file.ts');
    });

    it('should return the filename if no path separators', () => {
      expect(getFileName('file.ts')).toBe('file.ts');
      expect(getFileName('README.md')).toBe('README.md');
    });

    it('should handle empty path', () => {
      expect(getFileName('')).toBe('');
    });

    it('should handle path ending with separator', () => {
      expect(getFileName('path/to/')).toBe('');
      expect(getFileName('path\\to\\')).toBe('');
    });
  });
});
