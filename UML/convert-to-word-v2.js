const fs = require('fs')
const path = require('path')

// Read the original report
const originalPath = path.join(__dirname, 'Flotilla云端代码托管平台_UML课程报告.md')
const outputPath = path.join(__dirname, 'Flotilla云端代码托管平台_UML课程报告_Word版.md')
let content = fs.readFileSync(originalPath, 'utf-8')

// Figure mapping
const figureMapping = [
  { file: '01-系统整体架构图.png', figNum: '图2-1', name: '系统整体架构图' },
  { file: '02-用户认证时序图.png', figNum: '图2-2', name: '用户认证时序图' },
  { file: '03-Git-Push流程图.png', figNum: '图2-3', name: 'Git Push流程图' },
  { file: '04-整体用例图.png', figNum: '图2-4', name: '整体用例图' },
  { file: '05-认证模块用例图.png', figNum: '图2-5', name: '认证模块用例图' },
  { file: '06-代码协作用例图.png', figNum: '图2-6', name: '代码协作用例图' },
  { file: '07-核心实体类图.png', figNum: '图2-7', name: '核心实体类图' },
  { file: '08-数据库ER图.png', figNum: '图2-8', name: '数据库ER图' },
  { file: '09-Raft共识类图.png', figNum: '图2-9', name: 'Raft共识类图' },
  { file: '10-Raft节点状态图.png', figNum: '图2-10', name: 'Raft节点状态图' },
  { file: '11-Raft-Leader选举时序图.png', figNum: '图2-11', name: 'Raft Leader选举时序图' },
  { file: '12-PullRequest工作流活动图.png', figNum: '图2-12', name: 'Pull Request工作流活动图' },
  { file: '13-系统组件部署图.png', figNum: '图2-13', name: '系统组件部署图' },
  { file: '14-Issue生命周期状态图.png', figNum: '图2-14', name: 'Issue生命周期状态图' },
  { file: '15-用户注册时序图.png', figNum: '图2-15', name: '用户注册时序图' },
  { file: '16-OAuth第三方登录时序图.png', figNum: '图2-16', name: 'OAuth第三方登录时序图' },
  { file: '17-Git-Clone操作时序图.png', figNum: '图2-17', name: 'Git Clone操作时序图' },
  { file: '18-通知系统活动图.png', figNum: '图2-18', name: '通知系统活动图' },
  { file: '19-服务层类图.png', figNum: '图2-19', name: '服务层类图' },
  { file: '20-数据访问层类图.png', figNum: '图2-20', name: '数据访问层类图' },
  { file: '21-后端模块依赖图.png', figNum: '图2-21', name: '后端模块依赖图' },
  { file: '22-安全认证流程活动图.png', figNum: '图2-22', name: '安全认证流程活动图' },
  { file: '23-CICD流水线状态图.png', figNum: '图2-23', name: 'CI/CD流水线状态图' },
  { file: '24-WebSocket实时通知时序图.png', figNum: '图2-24', name: 'WebSocket实时通知时序图' },
  { file: '25-Kubernetes部署架构图.png', figNum: '图2-25', name: 'Kubernetes部署架构图' },
  { file: '26-前端React组件层级图.png', figNum: '图2-26', name: '前端React组件层级图' },
  { file: '27-RBAC三层权限模型图.png', figNum: '图2-27', name: 'RBAC三层权限模型图' },
  { file: '28-数据库读写分离架构图.png', figNum: '图2-28', name: '数据库读写分离架构图' },
  { file: '29-GitFlow分支管理策略图.png', figNum: '图2-29', name: 'GitFlow分支管理策略图' },
  { file: '30-微服务通信架构图.png', figNum: '图2-30', name: '微服务通信架构图' },
  { file: '31-用户会话管理状态图.png', figNum: '图2-31', name: '用户会话管理状态图' },
  { file: '32-文件上传处理活动图.png', figNum: '图2-32', name: '文件上传处理活动图' },
  { file: '33-API请求生命周期时序图.png', figNum: '图2-33', name: 'API请求生命周期时序图' },
  { file: '34-Raft日志复制详细时序图.png', figNum: '图2-34', name: 'Raft日志复制详细时序图' },
]

// Replace all mermaid code blocks with images
let figIndex = 0
content = content.replace(/```mermaid[\s\S]*?```/g, () => {
  if (figIndex < figureMapping.length) {
    const fig = figureMapping[figIndex]
    figIndex++
    return `![${fig.figNum} ${fig.name}](diagrams/images/${fig.file})\n\n<center>${fig.figNum} ${fig.name}</center>`
  }
  return ''
})

// Remove section 2.4.1 UML建模语言概述
const umlOverviewStart = '### 2.4.1 UML建模语言概述'
const umlOverviewEnd = '### 2.4.2 系统用例图'
const startIdx = content.indexOf(umlOverviewStart)
const endIdx = content.indexOf(umlOverviewEnd)
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx)
}

// Simplify section 3.3
const section33Start = '## 3.3 不足与下一步改进'
const section33End = '---\n\n# 参考文献'
const s33StartIdx = content.indexOf(section33Start)
const s33EndIdx = content.indexOf(section33End)

if (s33StartIdx !== -1 && s33EndIdx !== -1) {
  const simplifiedSection33 = `## 3.3 不足与下一步改进

### 当前主要不足

1. **Raft算法简化**：未实现日志压缩和动态成员变更功能
2. **测试覆盖率**：单元测试覆盖率约70%，未达到80%目标
3. **性能优化**：大型仓库文件列表渲染和代码Diff性能有待优化

### 改进方向

| 优先级 | 改进项 | 预期效果 |
|--------|--------|---------|
| P0 | 实现Raft日志压缩 | 解决日志无限增长问题 |
| P0 | 提升测试覆盖率至80% | 保证代码质量 |
| P1 | 优化大文件Diff性能 | 提升用户体验 |
| P1 | 添加监控告警系统 | 及时发现和处理问题 |
| P2 | 实现Raft动态成员变更 | 支持集群弹性伸缩 |

### 技术债务管理

在项目开发过程中，使用\`// TODO:\`和\`// FIXME:\`标记待改进点，每个迭代预留20%时间处理技术债务，新代码必须通过lint检查和测试。

`
  content = content.substring(0, s33StartIdx) + simplifiedSection33 + content.substring(s33EndIdx)
}

// Only replace standalone horizontal rules (--- at start of line, by itself)
// But NOT table separator rows (which have | characters)
content = content.replace(/^---$/gm, '***')

// Write the output
fs.writeFileSync(outputPath, content, 'utf-8')

console.log('Word-optimized version created:', outputPath)
console.log('Total figures replaced:', figIndex)
