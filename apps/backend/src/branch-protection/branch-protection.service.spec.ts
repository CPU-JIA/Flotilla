/**
 * 分支保护规则服务单元测试
 *
 * ECP-D1: 可测试性设计 - 使用依赖注入Mock
 * ECP-C2: Systematic Error Handling - 测试所有错误路径
 *
 * 测试覆盖:
 * - 创建保护规则（含重复分支名冲突检测）
 * - 查询保护规则（单个/列表/按分支名）
 * - 更新保护规则
 * - 删除保护规则
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BranchProtectionService } from './branch-protection.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BranchProtectionService', () => {
  let service: BranchProtectionService;

  // Mock PrismaService
  const mockPrismaService = {
    branchProtectionRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  // 测试数据
  const mockProjectId = 'project-123';
  const mockRuleId = 'rule-456';

  const mockBranchProtectionRule = {
    id: mockRuleId,
    projectId: mockProjectId,
    branchPattern: 'main',
    requirePullRequest: true,
    requiredApprovingReviews: 2,
    dismissStaleReviews: true,
    requireCodeOwnerReview: false,
    allowForcePushes: false,
    allowDeletions: false,
    requireStatusChecks: true,
    requiredStatusChecks: ['ci', 'tests'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCreateDto = {
    branchPattern: 'main',
    requirePullRequest: true,
    requiredApprovingReviews: 2,
    dismissStaleReviews: true,
    requireStatusChecks: true,
    requiredStatusChecks: ['ci', 'tests'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchProtectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BranchProtectionService>(BranchProtectionService);

    // 每个测试前清除所有mock
    jest.clearAllMocks();
  });

  it('应该成功创建服务实例', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // create - 创建分支保护规则
  // ============================================================
  describe('create - 创建分支保护规则', () => {
    it('应该成功创建分支保护规则', async () => {
      // Arrange: 不存在相同分支的规则
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockResolvedValue(
        mockBranchProtectionRule,
      );

      // Act
      const result = await service.create(mockProjectId, mockCreateDto);

      // Assert
      expect(result).toEqual(mockBranchProtectionRule);
      expect(
        mockPrismaService.branchProtectionRule.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          projectId_branchPattern: {
            projectId: mockProjectId,
            branchPattern: mockCreateDto.branchPattern,
          },
        },
      });
      expect(
        mockPrismaService.branchProtectionRule.create,
      ).toHaveBeenCalledWith({
        data: {
          projectId: mockProjectId,
          ...mockCreateDto,
        },
      });
    });

    it('应该在分支已有保护规则时抛出 ConflictException', async () => {
      // Arrange: 已存在相同分支的规则
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        mockBranchProtectionRule,
      );

      // Act & Assert
      await expect(
        service.create(mockProjectId, mockCreateDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(mockProjectId, mockCreateDto),
      ).rejects.toThrow(`分支 "${mockCreateDto.branchPattern}" 已经有保护规则`);

      // 不应该调用create
      expect(
        mockPrismaService.branchProtectionRule.create,
      ).not.toHaveBeenCalled();
    });

    it('应该支持创建通配符分支模式规则 (release/*)', async () => {
      // Arrange
      const wildcardDto = {
        branchPattern: 'release/*',
        requirePullRequest: true,
        requiredApprovingReviews: 1,
      };
      const wildcardRule = {
        ...mockBranchProtectionRule,
        id: 'rule-wildcard',
        branchPattern: 'release/*',
      };

      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockResolvedValue(
        wildcardRule,
      );

      // Act
      const result = await service.create(mockProjectId, wildcardDto);

      // Assert
      expect(result.branchPattern).toBe('release/*');
    });

    it('应该在数据库错误时重新抛出异常', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(
        service.create(mockProjectId, mockCreateDto),
      ).rejects.toThrow('Database connection failed');
    });
  });

  // ============================================================
  // findAll - 获取项目的所有分支保护规则
  // ============================================================
  describe('findAll - 获取项目的所有分支保护规则', () => {
    it('应该返回项目的所有分支保护规则', async () => {
      // Arrange
      const rules = [
        mockBranchProtectionRule,
        {
          ...mockBranchProtectionRule,
          id: 'rule-789',
          branchPattern: 'develop',
        },
      ];
      mockPrismaService.branchProtectionRule.findMany.mockResolvedValue(rules);

      // Act
      const result = await service.findAll(mockProjectId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].branchPattern).toBe('main');
      expect(result[1].branchPattern).toBe('develop');
      expect(
        mockPrismaService.branchProtectionRule.findMany,
      ).toHaveBeenCalledWith({
        where: { projectId: mockProjectId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应该在项目没有保护规则时返回空数组', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll(mockProjectId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('应该在数据库错误时重新抛出异常', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findMany.mockRejectedValue(
        new Error('Query timeout'),
      );

      // Act & Assert
      await expect(service.findAll(mockProjectId)).rejects.toThrow(
        'Query timeout',
      );
    });
  });

  // ============================================================
  // findOne - 根据ID获取分支保护规则
  // ============================================================
  describe('findOne - 根据ID获取分支保护规则', () => {
    it('应该返回指定ID的分支保护规则', async () => {
      // Arrange
      const ruleWithProject = {
        ...mockBranchProtectionRule,
        project: {
          id: mockProjectId,
          name: 'Test Project',
        },
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        ruleWithProject,
      );

      // Act
      const result = await service.findOne(mockRuleId);

      // Assert
      expect(result).toEqual(ruleWithProject);
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe('Test Project');
      expect(
        mockPrismaService.branchProtectionRule.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: mockRuleId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('应该在规则不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        '分支保护规则不存在',
      );
    });

    it('应该在数据库错误时重新抛出异常', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockRejectedValue(
        new Error('Connection refused'),
      );

      // Act & Assert
      await expect(service.findOne(mockRuleId)).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ============================================================
  // findByBranch - 根据分支名称获取保护规则
  // ============================================================
  describe('findByBranch - 根据分支名称获取保护规则', () => {
    it('应该返回指定分支的保护规则', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        mockBranchProtectionRule,
      );

      // Act
      const result = await service.findByBranch(mockProjectId, 'main');

      // Assert
      expect(result).toEqual(mockBranchProtectionRule);
      expect(
        mockPrismaService.branchProtectionRule.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          projectId_branchPattern: {
            projectId: mockProjectId,
            branchPattern: 'main',
          },
        },
      });
    });

    it('应该在分支未受保护时返回 null', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByBranch(
        mockProjectId,
        'feature/unprotected',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('应该正确查询 release/* 等通配符分支', async () => {
      // Arrange
      const wildcardRule = {
        ...mockBranchProtectionRule,
        branchPattern: 'release/*',
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        wildcardRule,
      );

      // Act
      const result = await service.findByBranch(mockProjectId, 'release/*');

      // Assert
      expect(result?.branchPattern).toBe('release/*');
    });

    it('应该在数据库错误时重新抛出异常', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockRejectedValue(
        new Error('Network error'),
      );

      // Act & Assert
      await expect(service.findByBranch(mockProjectId, 'main')).rejects.toThrow(
        'Network error',
      );
    });
  });

  // ============================================================
  // update - 更新分支保护规则
  // ============================================================
  describe('update - 更新分支保护规则', () => {
    const updateDto = {
      requiredApprovingReviews: 3,
      dismissStaleReviews: false,
    };

    it('应该成功更新分支保护规则', async () => {
      // Arrange
      const ruleWithProject = {
        ...mockBranchProtectionRule,
        project: { id: mockProjectId, name: 'Test Project' },
      };
      const updatedRule = {
        ...mockBranchProtectionRule,
        ...updateDto,
      };

      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        ruleWithProject,
      );
      mockPrismaService.branchProtectionRule.update.mockResolvedValue(
        updatedRule,
      );

      // Act
      const result = await service.update(mockRuleId, updateDto);

      // Assert
      expect(result.requiredApprovingReviews).toBe(3);
      expect(result.dismissStaleReviews).toBe(false);
      expect(
        mockPrismaService.branchProtectionRule.update,
      ).toHaveBeenCalledWith({
        where: { id: mockRuleId },
        data: updateDto,
      });
    });

    it('应该在规则不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow('分支保护规则不存在');

      // 不应该调用update
      expect(
        mockPrismaService.branchProtectionRule.update,
      ).not.toHaveBeenCalled();
    });

    it('应该支持更新状态检查配置', async () => {
      // Arrange
      const statusCheckDto = {
        requireStatusChecks: true,
        requiredStatusChecks: ['ci', 'tests', 'lint', 'build'],
      };
      const ruleWithProject = {
        ...mockBranchProtectionRule,
        project: { id: mockProjectId, name: 'Test Project' },
      };
      const updatedRule = {
        ...mockBranchProtectionRule,
        ...statusCheckDto,
      };

      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        ruleWithProject,
      );
      mockPrismaService.branchProtectionRule.update.mockResolvedValue(
        updatedRule,
      );

      // Act
      const result = await service.update(mockRuleId, statusCheckDto);

      // Assert
      expect(result.requiredStatusChecks).toHaveLength(4);
      expect(result.requiredStatusChecks).toContain('lint');
      expect(result.requiredStatusChecks).toContain('build');
    });

    it('应该在数据库错误时重新抛出异常', async () => {
      // Arrange
      const ruleWithProject = {
        ...mockBranchProtectionRule,
        project: { id: mockProjectId, name: 'Test Project' },
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        ruleWithProject,
      );
      mockPrismaService.branchProtectionRule.update.mockRejectedValue(
        new Error('Update failed'),
      );

      // Act & Assert
      await expect(service.update(mockRuleId, updateDto)).rejects.toThrow(
        'Update failed',
      );
    });
  });

  // ============================================================
  // remove - 删除分支保护规则
  // ============================================================
  describe('remove - 删除分支保护规则', () => {
    it('应该成功删除分支保护规则', async () => {
      // Arrange
      const ruleWithProject = {
        ...mockBranchProtectionRule,
        project: { id: mockProjectId, name: 'Test Project' },
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        ruleWithProject,
      );
      mockPrismaService.branchProtectionRule.delete.mockResolvedValue(
        mockBranchProtectionRule,
      );

      // Act
      const result = await service.remove(mockRuleId);

      // Assert
      expect(result).toEqual({ message: '分支保护规则已删除' });
      expect(
        mockPrismaService.branchProtectionRule.delete,
      ).toHaveBeenCalledWith({
        where: { id: mockRuleId },
      });
    });

    it('应该在规则不存在时抛出 NotFoundException', async () => {
      // Arrange
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        '分支保护规则不存在',
      );

      // 不应该调用delete
      expect(
        mockPrismaService.branchProtectionRule.delete,
      ).not.toHaveBeenCalled();
    });

    it('应该在数据库错误时重新抛出异常', async () => {
      // Arrange
      const ruleWithProject = {
        ...mockBranchProtectionRule,
        project: { id: mockProjectId, name: 'Test Project' },
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(
        ruleWithProject,
      );
      mockPrismaService.branchProtectionRule.delete.mockRejectedValue(
        new Error('Foreign key constraint failed'),
      );

      // Act & Assert
      await expect(service.remove(mockRuleId)).rejects.toThrow(
        'Foreign key constraint failed',
      );
    });
  });

  // ============================================================
  // 边界条件测试
  // ============================================================
  describe('边界条件测试', () => {
    it('应该处理空字符串分支名', async () => {
      // Arrange
      const emptyBranchDto = {
        branchPattern: '',
        requirePullRequest: true,
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockResolvedValue({
        ...mockBranchProtectionRule,
        branchPattern: '',
      });

      // Act
      const result = await service.create(mockProjectId, emptyBranchDto);

      // Assert: 服务层不做验证，由DTO层处理
      expect(result.branchPattern).toBe('');
    });

    it('应该处理特殊字符分支名', async () => {
      // Arrange
      const specialBranchDto = {
        branchPattern: 'feature/JIRA-123_fix-bug',
        requirePullRequest: true,
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockResolvedValue({
        ...mockBranchProtectionRule,
        branchPattern: 'feature/JIRA-123_fix-bug',
      });

      // Act
      const result = await service.create(mockProjectId, specialBranchDto);

      // Assert
      expect(result.branchPattern).toBe('feature/JIRA-123_fix-bug');
    });

    it('应该处理 requiredApprovingReviews 为 0 的情况', async () => {
      // Arrange
      const zeroReviewsDto = {
        branchPattern: 'hotfix/*',
        requirePullRequest: true,
        requiredApprovingReviews: 0,
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockResolvedValue({
        ...mockBranchProtectionRule,
        branchPattern: 'hotfix/*',
        requiredApprovingReviews: 0,
      });

      // Act
      const result = await service.create(mockProjectId, zeroReviewsDto);

      // Assert
      expect(result.requiredApprovingReviews).toBe(0);
    });

    it('应该处理空的 requiredStatusChecks 数组', async () => {
      // Arrange
      const emptyChecksDto = {
        branchPattern: 'staging',
        requireStatusChecks: true,
        requiredStatusChecks: [],
      };
      mockPrismaService.branchProtectionRule.findUnique.mockResolvedValue(null);
      mockPrismaService.branchProtectionRule.create.mockResolvedValue({
        ...mockBranchProtectionRule,
        branchPattern: 'staging',
        requiredStatusChecks: [],
      });

      // Act
      const result = await service.create(mockProjectId, emptyChecksDto);

      // Assert
      expect(result.requiredStatusChecks).toEqual([]);
    });
  });
});
