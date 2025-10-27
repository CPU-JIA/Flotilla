import {
  extractTypeScriptSymbols,
  extractSymbols,
} from './typescript-parser';

/**
 * TypeScript/JavaScript符号提取器单元测试
 *
 * 测试范围：
 * - extractTypeScriptSymbols(): AST解析和符号提取
 * - extractSymbols(): 语言路由器
 *
 * ECP-D1 (可测试性): 纯函数，易于测试
 * ECP-C2 (错误处理): 验证解析失败时的静默失败行为
 */
describe('typescript-parser', () => {
  describe('extractTypeScriptSymbols', () => {
    it('should extract class names', () => {
      const content = `
        class UserService {
          constructor() {}
        }
        class ProductService {}
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('UserService');
      expect(symbols).toContain('ProductService');
    });

    it('should extract function names', () => {
      const content = `
        function createUser() {}
        function deleteUser() {}
        async function updateUser() {}
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('createUser');
      expect(symbols).toContain('deleteUser');
      expect(symbols).toContain('updateUser');
    });

    it('should extract variable names', () => {
      const content = `
        const API_URL = 'https://api.example.com';
        let counter = 0;
        var legacyVar = 'old';
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('API_URL');
      expect(symbols).toContain('counter');
      expect(symbols).toContain('legacyVar');
    });

    it('should extract interface names', () => {
      const content = `
        interface User {
          id: string;
          name: string;
        }
        interface Product {}
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('User');
      expect(symbols).toContain('Product');
    });

    it('should extract type alias names', () => {
      const content = `
        type UserId = string;
        type UserRole = 'admin' | 'user';
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('UserId');
      expect(symbols).toContain('UserRole');
    });

    it('should extract enum names', () => {
      const content = `
        enum Status {
          Active = 'ACTIVE',
          Inactive = 'INACTIVE'
        }
        enum Color { Red, Green, Blue }
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('Status');
      expect(symbols).toContain('Color');
    });

    it('should extract method names from classes', () => {
      const content = `
        class UserService {
          createUser() {}
          deleteUser() {}
          async fetchUser() {}
        }
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('UserService');
      expect(symbols).toContain('createUser');
      expect(symbols).toContain('deleteUser');
      expect(symbols).toContain('fetchUser');
    });

    it('should extract property names from classes', () => {
      const content = `
        class User {
          id: string;
          name: string;
          private email: string;
        }
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toContain('User');
      expect(symbols).toContain('id');
      expect(symbols).toContain('name');
      expect(symbols).toContain('email');
    });

    it('should deduplicate symbols using Set', () => {
      const content = `
        const user = 'John';
        const user = 'Jane'; // Intentional redeclaration for test
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      // Should only contain 'user' once despite syntax error
      const userCount = symbols.filter((s) => s === 'user').length;
      expect(userCount).toBeLessThanOrEqual(1);
    });

    it('should handle JSX syntax for .tsx files', () => {
      const content = `
        const Button = () => <button>Click</button>;
        function App() {
          return <div><Button /></div>;
        }
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.tsx');

      expect(symbols).toContain('Button');
      expect(symbols).toContain('App');
    });

    it('should return empty array for syntax errors (silent failure)', () => {
      // Mock console.warn to verify error handling without polluting test output
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const content = `
        class {{{{{ invalid syntax
        function @#$%^
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      // Verify silent failure behavior
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBe(0);

      // Verify that warning was logged (error handling works correctly)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse TypeScript file'),
        expect.any(String),
      );

      warnSpy.mockRestore();
    });

    it('should handle empty file', () => {
      const symbols = extractTypeScriptSymbols('', 'test.ts');

      expect(symbols).toEqual([]);
    });

    it('should handle file with only comments', () => {
      const content = `
        // This is a comment
        /* Multi-line
           comment */
      `;

      const symbols = extractTypeScriptSymbols(content, 'test.ts');

      expect(symbols).toEqual([]);
    });

    it('should extract from complex real-world code', () => {
      const content = `
        import { Injectable } from '@nestjs/common';

        interface UserDto {
          id: string;
          name: string;
        }

        @Injectable()
        export class UserService {
          private readonly users: Map<string, UserDto>;

          constructor() {
            this.users = new Map();
          }

          async createUser(dto: UserDto): Promise<UserDto> {
            this.users.set(dto.id, dto);
            return dto;
          }

          findById(id: string): UserDto | undefined {
            return this.users.get(id);
          }
        }
      `;

      const symbols = extractTypeScriptSymbols(content, 'user.service.ts');

      expect(symbols).toContain('UserDto');
      expect(symbols).toContain('UserService');
      expect(symbols).toContain('users');
      expect(symbols).toContain('createUser');
      expect(symbols).toContain('findById');
    });
  });

  describe('extractSymbols', () => {
    it('should route TypeScript files to TypeScript parser', () => {
      const content = 'class User {}';
      const symbols = extractSymbols(content, 'typescript', 'test.ts');

      expect(symbols).toContain('User');
    });

    it('should route JavaScript files to TypeScript parser', () => {
      const content = 'function hello() {}';
      const symbols = extractSymbols(content, 'javascript', 'test.js');

      expect(symbols).toContain('hello');
    });

    it('should return empty array for unsupported languages', () => {
      const content = 'def hello():\n  pass';
      const symbols = extractSymbols(content, 'python', 'test.py');

      expect(symbols).toEqual([]);
    });

    it('should return empty array for unknown language', () => {
      const content = 'SELECT * FROM users;';
      const symbols = extractSymbols(content, 'sql', 'query.sql');

      expect(symbols).toEqual([]);
    });

    it('should handle empty content', () => {
      const symbols = extractSymbols('', 'typescript', 'test.ts');

      expect(symbols).toEqual([]);
    });
  });
});
