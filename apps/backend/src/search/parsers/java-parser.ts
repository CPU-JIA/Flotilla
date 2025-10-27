/**
 * Java符号提取器
 *
 * 使用正则表达式提取Java代码中的符号
 * 提取类名、接口名、方法名、注解等
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责符号提取
 * ECP-C2 (错误处理): 完善的try-catch和静默失败
 * ECP-B2 (KISS): 使用正则表达式,避免引入Java进程依赖
 */

/**
 * 从Java代码中提取符号
 *
 * 提取内容:
 * - 类定义: class ClassName
 * - 接口定义: interface InterfaceName
 * - 枚举定义: enum EnumName
 * - 方法定义: methodName(...)
 * - 注解: @Annotation
 * - 常量: CONSTANT_NAME
 *
 * @param content - 代码内容
 * @param filePath - 文件路径(用于错误日志)
 * @returns 符号名称数组
 *
 * ECP-C2 (错误处理): 解析失败时返回空数组
 */
export function extractJavaSymbols(
  content: string,
  filePath: string,
): string[] {
  const symbols: Set<string> = new Set();

  try {
    // 1. 提取类定义: class ClassName
    const classPattern =
      /(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+([A-Z][a-zA-Z0-9_]*)/gm;
    let match;
    while ((match = classPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 2. 提取接口定义: interface InterfaceName
    const interfacePattern =
      /(?:public|private|protected)?\s*interface\s+([A-Z][a-zA-Z0-9_]*)/gm;
    while ((match = interfacePattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 3. 提取枚举定义: enum EnumName
    const enumPattern =
      /(?:public|private|protected)?\s*enum\s+([A-Z][a-zA-Z0-9_]*)/gm;
    while ((match = enumPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 4. 提取方法定义: methodName(...)
    // 匹配格式: [modifiers] ReturnType methodName(...)
    const methodPattern =
      /(?:public|private|protected)?\s*(?:static|final|abstract|synchronized|native)?\s*(?:<[^>]+>)?\s*[\w<>[\]]+\s+([a-z][a-zA-Z0-9_]*)\s*\(/gm;
    while ((match = methodPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 5. 提取注解: @Annotation
    const annotationPattern = /@([A-Z][a-zA-Z0-9_]*)/gm;
    while ((match = annotationPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 6. 提取常量(static final大写变量): CONSTANT_NAME
    const constantPattern =
      /(?:public|private|protected)?\s*static\s+final\s+[\w<>[\]]+\s+([A-Z][A-Z0-9_]*)/gm;
    while ((match = constantPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }
  } catch (error) {
    // 静默失败:解析错误不影响索引流程
    console.warn(
      `Failed to extract Java symbols from ${filePath}:`,
      error.message,
    );
  }

  return Array.from(symbols);
}
