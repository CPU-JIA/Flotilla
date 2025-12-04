import { extractPythonSymbols } from './python-parser';

/**
 * Python符号提取器单元测试
 *
 * 测试范围：
 * - 提取类定义 (class ClassName)
 * - 提取函数定义 (def function_name)
 * - 提取装饰器 (@decorator)
 * - 提取常量 (CONSTANT_NAME = ...)
 * - 错误处理（静默失败）
 *
 * ECP-D1 (可测试性): 纯函数，易于测试
 * ECP-C2 (错误处理): 验证解析失败时的静默失败行为
 */
describe('python-parser', () => {
  describe('extractPythonSymbols', () => {
    it('should extract class names', () => {
      const content = `
class UserService:
    def __init__(self):
        pass

class ProductService(BaseService):
    """Product service with inheritance"""
    pass
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('UserService');
      expect(symbols).toContain('ProductService');
    });

    it('should extract function names', () => {
      const content = `
def create_user():
    pass

def delete_user(user_id):
    return True

async def update_user_async(user_id, data):
    """Async function example"""
    pass
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('create_user');
      expect(symbols).toContain('delete_user');
      expect(symbols).toContain('update_user_async');
    });

    it('should extract decorators', () => {
      const content = `
@app.route('/api/users')
@login_required
def get_users():
    pass

@staticmethod
def helper_method():
    pass

@property
def full_name(self):
    return self.name
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('app');
      expect(symbols).toContain('login_required');
      expect(symbols).toContain('staticmethod');
      expect(symbols).toContain('property');
      expect(symbols).toContain('get_users');
      expect(symbols).toContain('helper_method');
      expect(symbols).toContain('full_name');
    });

    it('should extract constants (uppercase variables)', () => {
      const content = `
API_URL = "https://api.example.com"
MAX_RETRIES = 3
DATABASE_CONFIG = {"host": "localhost"}
ENABLE_LOGGING = True
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('API_URL');
      expect(symbols).toContain('MAX_RETRIES');
      expect(symbols).toContain('DATABASE_CONFIG');
      expect(symbols).toContain('ENABLE_LOGGING');
    });

    it('should extract class methods', () => {
      const content = `
class UserRepository:
    def find_by_id(self, user_id):
        pass

    def save(self, user):
        return user

    @classmethod
    def create_table(cls):
        pass
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('UserRepository');
      expect(symbols).toContain('find_by_id');
      expect(symbols).toContain('save');
      expect(symbols).toContain('create_table');
      expect(symbols).toContain('classmethod');
    });

    it('should handle mixed indentation levels', () => {
      const content = `
def outer_function():
    def inner_function():
        pass
    return inner_function

class OuterClass:
    class InnerClass:
        pass
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('outer_function');
      expect(symbols).toContain('inner_function');
      expect(symbols).toContain('OuterClass');
      expect(symbols).toContain('InnerClass');
    });

    it('should not extract lowercase variables (only UPPERCASE constants)', () => {
      const content = `
lowercase_var = "not a constant"
CamelCaseVar = "also not extracted"
UPPERCASE_CONST = "this is extracted"
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).not.toContain('lowercase_var');
      expect(symbols).not.toContain('CamelCaseVar');
      expect(symbols).toContain('UPPERCASE_CONST');
    });

    it('should not extract function names starting with uppercase', () => {
      const content = `
def ValidFunctionName():
    pass

def _private_function():
    pass

class ValidClassName:
    pass
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      // Functions must start with lowercase letter or underscore
      expect(symbols).not.toContain('ValidFunctionName');
      expect(symbols).toContain('_private_function');
      expect(symbols).toContain('ValidClassName');
    });

    it('should deduplicate symbols', () => {
      const content = `
def process_data():
    pass

def process_data():  # Duplicate function name
    pass

API_KEY = "key1"
API_KEY = "key2"  # Duplicate constant
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      // Each symbol should appear only once (Set deduplication)
      const processDataCount = symbols.filter(
        (s) => s === 'process_data',
      ).length;
      const apiKeyCount = symbols.filter((s) => s === 'API_KEY').length;

      expect(processDataCount).toBe(1);
      expect(apiKeyCount).toBe(1);
    });

    it('should handle complex decorators with arguments', () => {
      const content = `
@app.route('/api/users/<int:user_id>', methods=['GET', 'POST'])
@cache.memoize(timeout=60)
def get_user(user_id):
    pass
      `;

      const symbols = extractPythonSymbols(content, 'test.py');

      expect(symbols).toContain('app');
      expect(symbols).toContain('cache');
      expect(symbols).toContain('get_user');
    });

    it('should return empty array for invalid Python syntax (silent failure)', () => {
      const invalidContent = `
def broken_function(
    # Missing closing parenthesis
class InvalidClass
    # Missing colon
      `;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const symbols = extractPythonSymbols(invalidContent, 'test.py');

      // Should not throw error, returns partial results or empty
      expect(Array.isArray(symbols)).toBe(true);

      // Console.warn should NOT be called for regex-based extraction
      // (Regex is fault-tolerant, unlike AST parsing)
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should extract symbols from realistic Python module', () => {
      const content = `
"""
User authentication module
"""
from typing import Optional
import hashlib

SECRET_KEY = "super-secret-key"
MAX_LOGIN_ATTEMPTS = 5

@dataclass
class User:
    """User model"""
    id: int
    username: str

    def verify_password(self, password: str) -> bool:
        return hashlib.sha256(password.encode()).hexdigest()

def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate user credentials"""
    pass

@lru_cache(maxsize=128)
def get_user_permissions(user_id: int):
    pass
      `;

      const symbols = extractPythonSymbols(content, 'realistic.py');

      expect(symbols).toContain('SECRET_KEY');
      expect(symbols).toContain('MAX_LOGIN_ATTEMPTS');
      expect(symbols).toContain('dataclass');
      expect(symbols).toContain('User');
      expect(symbols).toContain('verify_password');
      expect(symbols).toContain('authenticate_user');
      expect(symbols).toContain('lru_cache');
      expect(symbols).toContain('get_user_permissions');
    });

    it('should handle empty file', () => {
      const symbols = extractPythonSymbols('', 'empty.py');
      expect(symbols).toEqual([]);
    });

    it('should handle file with only comments', () => {
      const content = `
# This is a comment
"""
This is a docstring
"""
# Another comment
      `;

      const symbols = extractPythonSymbols(content, 'comments.py');
      expect(symbols).toEqual([]);
    });
  });
});
