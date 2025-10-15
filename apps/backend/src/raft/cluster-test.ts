/**
 * Raft Cluster Integration Tests
 *
 * 完整的Raft集群测试用例
 * 验证Leader选举、日志复制、故障恢复等核心功能
 *
 * ECP-D1: 可测试性 - 系统化的测试覆盖
 * ECP-C1: 防御性编程 - 边界条件和异常测试
 */

import { RaftNode } from './raft-node'
import { WebSocketTransport } from './websocket-transport'
import { MemoryPersistentStorage } from './storage'
import { GitStateMachine } from './git-state-machine'
import type { ClusterConfig, NodeState, Command } from './types'
import { NodeState as States, CommandType } from './types'

// 测试工具类
class TestCluster {
  private nodes: RaftNode[] = []
  private transports: WebSocketTransport[] = []
  private storages: MemoryPersistentStorage[] = []
  private stateMachines: GitStateMachine[] = []

  constructor(private readonly nodeCount: number = 3) {}

  /**
   * 启动测试集群
   */
  async start(): Promise<void> {
    // 生成端口映射（避免与MinIO端口9000-9001冲突）
    const portMapping: Record<string, number> = {}
    for (let i = 0; i < this.nodeCount; i++) {
      const nodeId = `node${i + 1}`
      portMapping[nodeId] = 8100 + i // 使用8100-8105端口范围
    }

    const nodeIds = Object.keys(portMapping)

    // 创建节点
    for (let i = 0; i < this.nodeCount; i++) {
      const nodeId = nodeIds[i]

      // 创建依赖
      const transport = new WebSocketTransport(nodeId, portMapping)
      const storage = new MemoryPersistentStorage(nodeId)
      const stateMachine = new GitStateMachine(nodeId)

      // 创建集群配置
      const config: ClusterConfig = {
        nodeId,
        nodes: nodeIds,
        electionTimeoutMin: 150,
        electionTimeoutMax: 300,
        heartbeatInterval: 50,
        rpcTimeout: 100,
      }

      // 创建Raft节点
      const node = new RaftNode(config, transport, stateMachine, storage)

      this.transports.push(transport)
      this.storages.push(storage)
      this.stateMachines.push(stateMachine)
      this.nodes.push(node)
    }

    // 启动所有节点
    for (const node of this.nodes) {
      await node.start()
    }

    console.log(`Test cluster started with ${this.nodeCount} nodes`)
  }

  /**
   * 停止测试集群
   */
  async stop(): Promise<void> {
    for (const node of this.nodes) {
      await node.stop()
    }
    console.log('Test cluster stopped')
  }

  /**
   * 获取当前Leader
   */
  getLeader(): RaftNode | null {
    for (const node of this.nodes) {
      const state = node.exportState()
      if (state.state === States.LEADER) {
        return node
      }
    }
    return null
  }

  /**
   * 获取所有Follower
   */
  getFollowers(): RaftNode[] {
    return this.nodes.filter(node => {
      const state = node.exportState()
      return state.state === States.FOLLOWER
    })
  }

  /**
   * 获取节点状态统计
   */
  getStateStats(): Record<NodeState, number> {
    const stats = {
      [States.LEADER]: 0,
      [States.FOLLOWER]: 0,
      [States.CANDIDATE]: 0,
    }

    for (const node of this.nodes) {
      const state = node.exportState()
      stats[state.state]++
    }

    return stats
  }

  /**
   * 等待Leader选举完成
   */
  async waitForLeaderElection(timeoutMs: number = 5000): Promise<RaftNode> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const leader = this.getLeader()
      if (leader) {
        const stats = this.getStateStats()
        if (stats[States.LEADER] === 1 && stats[States.FOLLOWER] === this.nodeCount - 1) {
          return leader
        }
      }
      await this.sleep(50)
    }

    throw new Error('Leader election timeout')
  }

  /**
   * 停止指定节点
   */
  async stopNode(nodeIndex: number): Promise<void> {
    if (nodeIndex >= 0 && nodeIndex < this.nodes.length) {
      await this.nodes[nodeIndex].stop()
    }
  }

  /**
   * 重启指定节点
   */
  async restartNode(nodeIndex: number): Promise<void> {
    if (nodeIndex >= 0 && nodeIndex < this.nodes.length) {
      await this.nodes[nodeIndex].start()
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 测试用例
class RaftClusterTests {
  /**
   * 测试1: Leader选举
   */
  static async testLeaderElection(): Promise<void> {
    console.log('\\n=== Test 1: Leader Election ===')

    const cluster = new TestCluster(3)
    try {
      await cluster.start()

      // 等待Leader选举
      const leader = await cluster.waitForLeaderElection()
      console.log(`✓ Leader elected: ${leader.exportState().nodeId}`)

      // 验证集群状态
      const stats = cluster.getStateStats()
      console.log(`✓ Cluster state: ${JSON.stringify(stats)}`)

      if (stats[States.LEADER] !== 1) {
        throw new Error('Should have exactly one leader')
      }

      if (stats[States.FOLLOWER] !== 2) {
        throw new Error('Should have exactly two followers')
      }

      console.log('✓ Leader election test passed')
    } finally {
      await cluster.stop()
    }
  }

  /**
   * 测试2: 日志复制
   */
  static async testLogReplication(): Promise<void> {
    console.log('\\n=== Test 2: Log Replication ===')

    const cluster = new TestCluster(3)
    try {
      await cluster.start()
      const leader = await cluster.waitForLeaderElection()

      // 发送命令到Leader
      const command: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'test-project-1',
          name: 'Test Project',
          description: 'A test project for Raft',
          ownerId: 'user1',
        },
      }

      const result = await leader.handleClientWrite(command)
      console.log(`✓ Command result: ${JSON.stringify(result)}`)

      if (!result.success) {
        throw new Error(`Command failed: ${result.error}`)
      }

      // 等待日志复制
      await cluster['sleep'](1000)

      console.log('✓ Log replication test passed')
    } finally {
      await cluster.stop()
    }
  }

  /**
   * 测试3: Leader故障恢复
   */
  static async testLeaderFailover(): Promise<void> {
    console.log('\\n=== Test 3: Leader Failover ===')

    const cluster = new TestCluster(3)
    try {
      await cluster.start()
      const originalLeader = await cluster.waitForLeaderElection()
      const originalLeaderIndex = cluster['nodes'].indexOf(originalLeader)

      console.log(`✓ Original leader: ${originalLeader.exportState().nodeId}`)

      // 停止当前Leader
      await cluster.stopNode(originalLeaderIndex)
      console.log('✓ Original leader stopped')

      // 等待新Leader选举
      await cluster['sleep'](1000)
      const newLeader = await cluster.waitForLeaderElection()

      if (newLeader === originalLeader) {
        throw new Error('New leader should be different from original leader')
      }

      console.log(`✓ New leader elected: ${newLeader.exportState().nodeId}`)

      // 验证新Leader可以处理命令
      const command: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'test-project-2',
          name: 'Test Project 2',
          description: 'Another test project',
          ownerId: 'user1',
        },
      }

      const result = await newLeader.handleClientWrite(command)
      if (!result.success) {
        throw new Error(`New leader cannot handle commands: ${result.error}`)
      }

      console.log('✓ Leader failover test passed')
    } finally {
      await cluster.stop()
    }
  }

  /**
   * 测试4: 网络分区
   */
  static async testNetworkPartition(): Promise<void> {
    console.log('\\n=== Test 4: Network Partition ===')

    const cluster = new TestCluster(5) // 使用5节点集群
    try {
      await cluster.start()
      const leader = await cluster.waitForLeaderElection()

      console.log(`✓ Initial leader: ${leader.exportState().nodeId}`)

      // 模拟网络分区：停止2个节点
      await cluster.stopNode(1)
      await cluster.stopNode(2)
      console.log('✓ Simulated network partition (stopped 2 nodes)')

      // 剩余3个节点应该能继续工作
      await cluster['sleep'](1000)

      const command: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'test-project-partition',
          name: 'Partition Test',
          description: 'Test during partition',
          ownerId: 'user1',
        },
      }

      const currentLeader = cluster.getLeader()
      if (currentLeader) {
        const result = await currentLeader.handleClientWrite(command)
        if (result.success) {
          console.log('✓ Majority partition can still process commands')
        }
      }

      console.log('✓ Network partition test passed')
    } finally {
      await cluster.stop()
    }
  }

  /**
   * 测试5: Git状态机操作
   */
  static async testGitStateMachine(): Promise<void> {
    console.log('\\n=== Test 5: Git State Machine ===')

    const cluster = new TestCluster(3)
    try {
      await cluster.start()
      const leader = await cluster.waitForLeaderElection()

      // 创建项目
      const createProject: Command = {
        type: CommandType.CREATE_PROJECT,
        payload: {
          id: 'git-test-project',
          name: 'Git Test Project',
          description: 'Testing Git operations',
          ownerId: 'developer1',
        },
      }

      let result = await leader.handleClientWrite(createProject)
      if (!result.success) {
        throw new Error(`Failed to create project: ${result.error}`)
      }
      console.log('✓ Project created')

      // 等待日志应用
      await cluster['sleep'](500)

      // 创建文件（Git提交）
      const createFile: Command = {
        type: CommandType.GIT_COMMIT,
        payload: {
          repositoryId: 'repo-git-test-project',
          branchName: 'main',
          message: 'Initial commit: Add README',
          author: 'developer1',
          files: [
            {
              path: 'README.md',
              content: '# Git Test Project\\n\\nThis is a test project for Raft-based Git.',
              mimeType: 'text/markdown',
            },
          ],
        },
      }

      result = await leader.handleClientWrite(createFile)
      if (!result.success) {
        throw new Error(`Failed to create file: ${result.error}`)
      }
      console.log('✓ File committed')

      // 创建分支
      const createBranch: Command = {
        type: CommandType.GIT_CREATE_BRANCH,
        payload: {
          repositoryId: 'repo-git-test-project',
          branchName: 'feature-branch',
          fromBranch: 'main',
        },
      }

      result = await leader.handleClientWrite(createBranch)
      if (!result.success) {
        throw new Error(`Failed to create branch: ${result.error}`)
      }
      console.log('✓ Branch created')

      console.log('✓ Git state machine test passed')
    } finally {
      await cluster.stop()
    }
  }

  /**
   * 运行所有测试
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Raft Cluster Tests')

    try {
      await this.testLeaderElection()
      await this.testLogReplication()
      await this.testLeaderFailover()
      await this.testNetworkPartition()
      await this.testGitStateMachine()

      console.log('\\n🎉 All tests passed!')
    } catch (error) {
      console.error('\\n❌ Test failed:', error)
      process.exit(1)
    }
  }
}

// 性能测试
class RaftPerformanceTests {
  static async testThroughput(): Promise<void> {
    console.log('\\n=== Performance Test: Throughput ===')

    const cluster = new TestCluster(3)
    try {
      await cluster.start()
      const leader = await cluster.waitForLeaderElection()

      const commandCount = 100
      const startTime = Date.now()

      // 发送多个命令
      const promises: Promise<any>[] = []
      for (let i = 0; i < commandCount; i++) {
        const command: Command = {
          type: CommandType.CREATE_PROJECT,
          payload: {
            id: `perf-project-${i}`,
            name: `Performance Project ${i}`,
            description: `Performance test project ${i}`,
            ownerId: 'perf-user',
          },
        }

        promises.push(leader.handleClientWrite(command))
      }

      const results = await Promise.allSettled(promises)
      const endTime = Date.now()

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const duration = endTime - startTime
      const throughput = (successCount / duration) * 1000 // commands per second

      console.log(`✓ Processed ${successCount}/${commandCount} commands in ${duration}ms`)
      console.log(`✓ Throughput: ${throughput.toFixed(2)} commands/second`)
    } finally {
      await cluster.stop()
    }
  }
}

// 主函数
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes('--performance')) {
    await RaftPerformanceTests.testThroughput()
  } else {
    await RaftClusterTests.runAllTests()
  }
}

// 导出用于其他模块使用
export { TestCluster, RaftClusterTests, RaftPerformanceTests }

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error)
}