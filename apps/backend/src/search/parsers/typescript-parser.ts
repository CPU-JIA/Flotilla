import { parse, TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { extractPythonSymbols } from './python-parser';
import { extractJavaSymbols } from './java-parser';

/**
 * TypeScript/JavaScript符号提取器
 *
 * 使用@typescript-eslint/typescript-estree解析AST
 * 提取类名、函数名、接口名、变量名等符号
 *
 * ECP-A1 (SOLID): 单一职责 - 只负责符号提取
 * ECP-C2 (错误处理): 完善的try-catch和静默失败
 */

/**
 * 从TypeScript/JavaScript代码中提取符号
 *
 * @param content - 代码内容
 * @param filePath - 文件路径（用于错误日志）
 * @returns 符号名称数组
 *
 * ECP-C2 (错误处理): 解析失败时返回空数组，不抛出异常
 */
export function extractTypeScriptSymbols(
  content: string,
  filePath: string,
): string[] {
  const symbols: Set<string> = new Set();

  try {
    // 解析为AST
    const ast = parse(content, {
      loc: false,
      range: false,
      tokens: false,
      comment: false,
      jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
      // 容错模式：即使有语法错误也尽量解析
      errorOnUnknownASTType: false,
    });

    // 遍历AST提取符号
    traverseAst(ast, symbols);
  } catch (_error) {
    // 静默失败：解析错误不影响索引流程
    // 返回空数组，调用方会索引纯文本内容
    // 已移除 console.warn（ECP 禁止项）- 解析失败会返回空数组
  }

  return Array.from(symbols);
}

/**
 * 遍历AST提取符号
 *
 * @param node - AST节点
 * @param symbols - 符号集合（使用Set去重）
 *
 * ECP-B2 (KISS): 直接遍历AST，无过度抽象
 */
function traverseAst(node: TSESTree.Node | null, symbols: Set<string>): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  // 提取不同类型的符号
  switch (node.type) {
    // 类声明
    case AST_NODE_TYPES.ClassDeclaration:
      if (node.id?.name) {
        symbols.add(node.id.name);
      }
      break;

    // 函数声明
    case AST_NODE_TYPES.FunctionDeclaration:
      if (node.id?.name) {
        symbols.add(node.id.name);
      }
      break;

    // 变量声明
    case AST_NODE_TYPES.VariableDeclarator:
      if (node.id?.type === AST_NODE_TYPES.Identifier) {
        symbols.add(node.id.name);
      }
      break;

    // 接口声明
    case AST_NODE_TYPES.TSInterfaceDeclaration:
      if (node.id?.name) {
        symbols.add(node.id.name);
      }
      break;

    // 类型别名
    case AST_NODE_TYPES.TSTypeAliasDeclaration:
      if (node.id?.name) {
        symbols.add(node.id.name);
      }
      break;

    // 枚举声明
    case AST_NODE_TYPES.TSEnumDeclaration:
      if (node.id?.name) {
        symbols.add(node.id.name);
      }
      break;

    // 方法定义
    case AST_NODE_TYPES.MethodDefinition:
      if (node.key?.type === AST_NODE_TYPES.Identifier) {
        symbols.add(node.key.name);
      }
      break;

    // 属性定义
    case AST_NODE_TYPES.PropertyDefinition:
      if (node.key?.type === AST_NODE_TYPES.Identifier) {
        symbols.add(node.key.name);
      }
      break;
  }

  // 递归遍历子节点
  for (const key in node) {
    if (key === 'parent') {
      continue; // 跳过父节点引用，避免循环
    }

    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      child.forEach((item) => {
        if (item && typeof item === 'object' && 'type' in item) {
          traverseAst(item as TSESTree.Node, symbols);
        }
      });
    } else if (child && typeof child === 'object' && 'type' in child) {
      traverseAst(child as TSESTree.Node, symbols);
    }
  }
}

/**
 * 通用符号提取函数
 *
 * 根据语言类型选择合适的解析器
 *
 * @param content - 代码内容
 * @param language - 编程语言
 * @param filePath - 文件路径
 * @returns 符号名称数组
 *
 * ECP-A1 (单一职责): 作为符号提取的调度器
 * ECP-B2 (KISS): 简单的switch分发，易于扩展
 */
export function extractSymbols(
  content: string,
  language: string,
  filePath: string,
): string[] {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return extractTypeScriptSymbols(content, filePath);

    case 'python':
      return extractPythonSymbols(content, filePath);

    case 'java':
      return extractJavaSymbols(content, filePath);

    // 其他语言暂不支持，返回空数组
    // 未来可扩展: C++, Go, Rust等
    default:
      return [];
  }
}
