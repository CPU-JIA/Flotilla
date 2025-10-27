import { extractJavaSymbols } from './java-parser';

/**
 * Java符号提取器单元测试
 *
 * 测试范围：
 * - 提取类定义 (class ClassName)
 * - 提取接口定义 (interface InterfaceName)
 * - 提取枚举定义 (enum EnumName)
 * - 提取方法定义 (methodName(...))
 * - 提取注解 (@Annotation)
 * - 提取常量 (static final CONSTANT_NAME)
 * - 错误处理(静默失败)
 *
 * ECP-D1 (可测试性): 纯函数，易于测试
 * ECP-C2 (错误处理): 验证解析失败时的静默失败行为
 */
describe('java-parser', () => {
  describe('extractJavaSymbols', () => {
    it('should extract class names', () => {
      const content = `
public class UserService {
    public UserService() {}
}

class ProductService {
    // Package-private class
}

public final class ImmutableValue {
}

public abstract class AbstractRepository {
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('UserService');
      expect(symbols).toContain('ProductService');
      expect(symbols).toContain('ImmutableValue');
      expect(symbols).toContain('AbstractRepository');
    });

    it('should extract interface names', () => {
      const content = `
public interface UserRepository {
    User findById(Long id);
}

interface ProductRepository {
    List<Product> findAll();
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('UserRepository');
      expect(symbols).toContain('ProductRepository');
    });

    it('should extract enum names', () => {
      const content = `
public enum UserRole {
    ADMIN, USER, GUEST
}

enum OrderStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    CANCELLED
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('UserRole');
      expect(symbols).toContain('OrderStatus');
    });

    it('should extract method names', () => {
      const content = `
public class UserService {
    public User findById(Long id) {
        return null;
    }

    private void validateUser(User user) {
    }

    protected static List<User> getAllUsers() {
        return new ArrayList<>();
    }

    public synchronized void updateUser(User user) {
    }
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('UserService');
      expect(symbols).toContain('findById');
      expect(symbols).toContain('validateUser');
      expect(symbols).toContain('getAllUsers');
      expect(symbols).toContain('updateUser');
    });

    it('should extract annotations', () => {
      const content = `
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Override
    public String toString() {
        return username;
    }
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('Entity');
      expect(symbols).toContain('Table');
      expect(symbols).toContain('Id');
      expect(symbols).toContain('GeneratedValue');
      expect(symbols).toContain('Column');
      expect(symbols).toContain('Override');
      expect(symbols).toContain('User');
      expect(symbols).toContain('toString');
    });

    it('should extract constants (static final)', () => {
      const content = `
public class Constants {
    public static final String API_URL = "https://api.example.com";
    public static final int MAX_RETRY_COUNT = 3;
    private static final long TIMEOUT_MS = 5000L;
    static final boolean DEBUG_MODE = true;
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('Constants');
      expect(symbols).toContain('API_URL');
      expect(symbols).toContain('MAX_RETRY_COUNT');
      expect(symbols).toContain('TIMEOUT_MS');
      expect(symbols).toContain('DEBUG_MODE');
    });

    it('should extract methods with generic types', () => {
      const content = `
public class GenericRepository<T> {
    public List<T> findAll() {
        return new ArrayList<>();
    }

    public Optional<T> findById(Long id) {
        return Optional.empty();
    }

    public <R> R transform(Function<T, R> mapper) {
        return null;
    }
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('GenericRepository');
      expect(symbols).toContain('findAll');
      expect(symbols).toContain('findById');
      expect(symbols).toContain('transform');
    });

    it('should handle inner classes', () => {
      const content = `
public class OuterClass {
    private String outerField;

    public void outerMethod() {
    }

    public static class InnerStaticClass {
        public void innerMethod() {
        }
    }

    private class InnerClass {
        void privateInnerMethod() {
        }
    }
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      expect(symbols).toContain('OuterClass');
      expect(symbols).toContain('outerMethod');
      expect(symbols).toContain('InnerStaticClass');
      expect(symbols).toContain('innerMethod');
      expect(symbols).toContain('InnerClass');
      expect(symbols).toContain('privateInnerMethod');
    });

    it('should not extract method names starting with uppercase', () => {
      const content = `
public class Example {
    public void ValidMethodName() {  // Invalid Java naming
    }

    public void normalMethod() {
    }

    public class ValidClassName {
    }
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      // Methods must start with lowercase
      expect(symbols).not.toContain('ValidMethodName');
      expect(symbols).toContain('normalMethod');
      expect(symbols).toContain('Example');
      expect(symbols).toContain('ValidClassName');
    });

    it('should deduplicate symbols', () => {
      const content = `
public class User {
}

public class User {  // Duplicate class (compile error in real Java)
}

@Override
public void method() {
}

@Override
public void anotherMethod() {
}
      `;

      const symbols = extractJavaSymbols(content, 'test.java');

      // Each symbol should appear only once
      const userCount = symbols.filter((s) => s === 'User').length;
      const overrideCount = symbols.filter((s) => s === 'Override').length;

      expect(userCount).toBe(1);
      expect(overrideCount).toBe(1);
    });

    it('should extract symbols from realistic Java class', () => {
      const content = `
package com.example.service;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserService {
    private static final String DEFAULT_ROLE = "USER";
    private static final int MAX_LOGIN_ATTEMPTS = 5;

    private final UserRepository repository;

    @Autowired
    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    @Cacheable("users")
    public Optional<User> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = false)
    public User createUser(UserDTO dto) {
        User user = new User();
        user.setUsername(dto.getUsername());
        return repository.save(user);
    }

    private void validateUser(User user) {
        if (user.getUsername() == null) {
            throw new ValidationException("Username required");
        }
    }

    public enum UserStatus {
        ACTIVE, INACTIVE, BANNED
    }
}
      `;

      const symbols = extractJavaSymbols(content, 'UserService.java');

      // Annotations
      expect(symbols).toContain('Service');
      expect(symbols).toContain('Transactional');
      expect(symbols).toContain('Autowired');
      expect(symbols).toContain('Cacheable');

      // Class
      expect(symbols).toContain('UserService');

      // Constants
      expect(symbols).toContain('DEFAULT_ROLE');
      expect(symbols).toContain('MAX_LOGIN_ATTEMPTS');

      // Methods
      expect(symbols).toContain('findById');
      expect(symbols).toContain('createUser');
      expect(symbols).toContain('validateUser');

      // Enum
      expect(symbols).toContain('UserStatus');
    });

    it('should handle empty file', () => {
      const symbols = extractJavaSymbols('', 'empty.java');
      expect(symbols).toEqual([]);
    });

    it('should handle file with only comments', () => {
      const content = `
// This is a comment
/* Multi-line comment
   spanning multiple lines
*/
/** Javadoc comment */
      `;

      const symbols = extractJavaSymbols(content, 'comments.java');
      expect(symbols).toEqual([]);
    });

    it('should return empty array for syntax errors (silent failure)', () => {
      const invalidContent = `
public class BrokenClass {
    public void methodWithoutClosing(
    // Missing closing parenthesis and brace
      `;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const symbols = extractJavaSymbols(invalidContent, 'test.java');

      // Should not throw error, regex extracts what it can
      expect(Array.isArray(symbols)).toBe(true);

      // Console.warn should NOT be called for regex-based extraction
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
