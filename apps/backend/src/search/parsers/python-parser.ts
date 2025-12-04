/**
 * Python符号提取器
 *
 * 使用正则表达式提取Python代码中的符号
 * 提取类名、函数名、方法名等
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责符号提取
 * ECP-C2 (错误处理): 完善的try-catch和静默失败
 * ECP-B2 (KISS): 使用正则表达式，避免引入Python进程依赖
 */

/**
 * 从Python代码中提取符号
 *
 * 提取内容：
 * - 函数定义: def function_name(...)
 * - 类定义: class ClassName(...)
 * - 装饰器函数: @decorator
 *
 * @param content - 代码内容
 * @param filePath - 文件路径（用于错误日志）
 * @returns 符号名称数组
 *
 * ECP-C2 (错误处理): 解析失败时返回空数组
 */
export function extractPythonSymbols(
  content: string,
  filePath: string,
): string[] {
  const symbols: Set<string> = new Set();

  try {
    // 1. 提取类定义: class ClassName(...):
    const classPattern = /^\s*class\s+([A-Z][a-zA-Z0-9_]*)/gm;
    let match;
    while ((match = classPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 2. 提取函数定义: def function_name(...): 和 async def function_name(...):
    const functionPattern = /^\s*(?:async\s+)?def\s+([a-z_][a-zA-Z0-9_]*)/gm;
    while ((match = functionPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 3. 提取装饰器: @decorator
    const decoratorPattern = /^\s*@([a-z_][a-zA-Z0-9_]*)/gm;
    while ((match = decoratorPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 4. 提取全局变量（大写常量）: CONSTANT_NAME = ...
    const constantPattern = /^([A-Z][A-Z0-9_]*)\s*=/gm;
    while ((match = constantPattern.exec(content)) !== null) {
      symbols.add(match[1]);
    }

    // 5. 提取类方法（在class内部的def）
    // 这需要更复杂的解析，暂时跳过（由函数模式覆盖）
  } catch (error) {
    // 静默失败：解析错误不影响索引流程
    console.warn(
      `Failed to extract Python symbols from ${filePath}:`,
      error.message,
    );
  }

  return Array.from(symbols);
}
