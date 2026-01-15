import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventsService } from './notification-events.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let notificationEvents: NotificationEventsService;

  // Mock 数据
  const mockUserId = 'user-123';
  const mockNotificationId = 'notification-456';

  const mockUser = {
    id: mockUserId,
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockNotification = {
    id: mockNotificationId,
    userId: mockUserId,
    type: NotificationType.PR_CREATED,
    title: 'New PR Created',
    body: 'A new pull request has been created',
    link: '/pr/123',
    read: false,
    metadata: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPreference = {
    id: 'pref-789',
    userId: mockUserId,
    prCreated: true,
    prMerged: true,
    prReviewed: true,
    prCommented: true,
    issueMentioned: true,
    issueAssigned: true,
    issueCommented: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock PrismaService
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  // Mock NotificationEventsService
  const mockNotificationEvents = {
    emitNotificationCreated: jest.fn(),
    emitNotificationRead: jest.fn(),
    emitNotificationsCleared: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationEventsService,
          useValue: mockNotificationEvents,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationEvents = module.get<NotificationEventsService>(
      NotificationEventsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      userId: mockUserId,
      type: NotificationType.PR_CREATED,
      title: 'New PR Created',
      body: 'A new pull request has been created',
      link: '/pr/123',
    };

    it('should_create_notification_when_user_exists_and_preference_allows', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(
        mockNotificationEvents.emitNotificationCreated,
      ).toHaveBeenCalledWith(mockUserId, mockNotification);
    });

    it('should_throw_NotFoundException_when_user_does_not_exist', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `用户 ID ${mockUserId} 不存在`,
      );
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should_return_null_when_user_preference_disables_notification_type', async () => {
      // Arrange
      const disabledPreference = { ...mockPreference, prCreated: false };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        disabledPreference,
      );

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      expect(
        mockNotificationEvents.emitNotificationCreated,
      ).not.toHaveBeenCalled();
    });

    it('should_send_notification_for_unknown_type_by_default', async () => {
      // Arrange
      const unknownTypeDto = {
        ...createDto,
        type: 'UNKNOWN_TYPE' as NotificationType,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notification.create.mockResolvedValue({
        ...mockNotification,
        type: 'UNKNOWN_TYPE',
      });

      // Act
      const result = await service.create(unknownTypeDto);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should_create_default_preference_when_none_exists', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId: mockUserId },
      });
    });
  });

  describe('createBatch', () => {
    it('should_create_multiple_notifications_for_multiple_users', async () => {
      // Arrange
      const user2Id = 'user-456';
      const createDtos = [
        {
          userId: mockUserId,
          type: NotificationType.PR_CREATED,
          title: 'PR Created',
        },
        {
          userId: user2Id,
          type: NotificationType.PR_MERGED,
          title: 'PR Merged',
        },
      ];

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: user2Id, username: 'user2' });
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notification.create
        .mockResolvedValueOnce({ ...mockNotification, id: 'notif-1' })
        .mockResolvedValueOnce({
          ...mockNotification,
          id: 'notif-2',
          userId: user2Id,
        });

      // Act
      const results = await service.createBatch(createDtos);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
    });

    it('should_return_null_for_filtered_notifications_in_batch', async () => {
      // Arrange
      const createDtos = [
        {
          userId: mockUserId,
          type: NotificationType.PR_CREATED,
          title: 'PR Created',
        },
        {
          userId: mockUserId,
          type: NotificationType.PR_MERGED,
          title: 'PR Merged',
        },
      ];

      const partialPreference = { ...mockPreference, prCreated: false };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        partialPreference,
      );
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      // Act
      const results = await service.createBatch(createDtos);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toBeNull(); // PR_CREATED disabled
      expect(results[1]).not.toBeNull(); // PR_MERGED enabled
    });

    it('should_handle_empty_batch', async () => {
      // Act
      const results = await service.createBatch([]);

      // Assert
      expect(results).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_notifications', async () => {
      // Arrange
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 'n2' },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5); // unreadCount

      // Act
      const result = await service.findAll(mockUserId, {
        page: 1,
        pageSize: 20,
      });

      // Assert
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.unreadCount).toBe(5);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should_filter_by_read_status', async () => {
      // Arrange
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockUserId, { read: false, page: 1, pageSize: 20 });

      // Assert
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, read: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_use_default_pagination_values', async () => {
      // Arrange
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      // Act
      const result = await service.findAll(mockUserId, {});

      // Assert
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_calculate_correct_skip_for_pagination', async () => {
      // Arrange
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockUserId, { page: 3, pageSize: 10 });

      // Assert
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should_return_notification_when_found_and_owned_by_user', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act
      const result = await service.findOne(mockNotificationId, mockUserId);

      // Assert
      expect(result).toEqual(mockNotification);
    });

    it('should_throw_NotFoundException_when_notification_not_found', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne('non-existent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne('non-existent-id', mockUserId),
      ).rejects.toThrow('通知 ID non-existent-id 不存在');
    });

    it('should_throw_BadRequestException_when_user_not_owner', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act & Assert
      await expect(
        service.findOne(mockNotificationId, 'other-user-id'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findOne(mockNotificationId, 'other-user-id'),
      ).rejects.toThrow('无权查看此通知');
    });
  });

  describe('markAsRead', () => {
    it('should_mark_unread_notification_as_read', async () => {
      // Arrange
      const unreadNotification = { ...mockNotification, read: false };
      const readNotification = { ...mockNotification, read: true };
      mockPrisma.notification.findUnique.mockResolvedValue(unreadNotification);
      mockPrisma.notification.update.mockResolvedValue(readNotification);

      // Act
      const result = await service.markAsRead(mockNotificationId, mockUserId);

      // Assert
      expect(result.read).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: { read: true },
      });
    });

    it('should_return_notification_without_update_when_already_read', async () => {
      // Arrange
      const alreadyReadNotification = { ...mockNotification, read: true };
      mockPrisma.notification.findUnique.mockResolvedValue(
        alreadyReadNotification,
      );

      // Act
      const result = await service.markAsRead(mockNotificationId, mockUserId);

      // Assert
      expect(result).toEqual(alreadyReadNotification);
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('should_throw_NotFoundException_when_notification_not_found', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.markAsRead('non-existent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should_mark_all_unread_notifications_as_read', async () => {
      // Arrange
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.markAllAsRead(mockUserId);

      // Assert
      expect(result.count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, read: false },
        data: { read: true },
      });
    });

    it('should_mark_specific_notifications_as_read_when_ids_provided', async () => {
      // Arrange
      const notificationIds = ['notif-1', 'notif-2', 'notif-3'];
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await service.markAllAsRead(mockUserId, notificationIds);

      // Assert
      expect(result.count).toBe(3);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          read: false,
          id: { in: notificationIds },
        },
        data: { read: true },
      });
    });

    it('should_return_zero_count_when_no_unread_notifications', async () => {
      // Arrange
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.markAllAsRead(mockUserId);

      // Assert
      expect(result.count).toBe(0);
    });

    it('should_ignore_empty_notification_ids_array', async () => {
      // Arrange
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.markAllAsRead(mockUserId, []);

      // Assert
      expect(result.count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, read: false },
        data: { read: true },
      });
    });
  });

  describe('remove', () => {
    it('should_delete_notification_when_owned_by_user', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.delete.mockResolvedValue(mockNotification);

      // Act
      const result = await service.remove(mockNotificationId, mockUserId);

      // Assert
      expect(result.message).toBe('通知已删除');
      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
      });
    });

    it('should_throw_NotFoundException_when_notification_not_found', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.remove('non-existent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_BadRequestException_when_user_not_owner', async () => {
      // Arrange
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

      // Act & Assert
      await expect(
        service.remove(mockNotificationId, 'other-user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPreference', () => {
    it('should_return_existing_preference', async () => {
      // Arrange
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );

      // Act
      const result = await service.getPreference(mockUserId);

      // Assert
      expect(result).toEqual(mockPreference);
      expect(mockPrisma.notificationPreference.create).not.toHaveBeenCalled();
    });

    it('should_create_default_preference_when_none_exists', async () => {
      // Arrange
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue(
        mockPreference,
      );

      // Act
      const result = await service.getPreference(mockUserId);

      // Assert
      expect(result).toEqual(mockPreference);
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId: mockUserId },
      });
    });
  });

  describe('updatePreference', () => {
    it('should_update_notification_preference', async () => {
      // Arrange
      const updateDto = { prCreated: false, prMerged: false };
      const updatedPreference = { ...mockPreference, ...updateDto };
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notificationPreference.update.mockResolvedValue(
        updatedPreference,
      );

      // Act
      const result = await service.updatePreference(mockUserId, updateDto);

      // Assert
      expect(result.prCreated).toBe(false);
      expect(result.prMerged).toBe(false);
      expect(mockPrisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: updateDto,
      });
    });

    it('should_create_preference_if_not_exists_before_update', async () => {
      // Arrange
      const updateDto = { prCreated: false };
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notificationPreference.create.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        prCreated: false,
      });

      // Act
      const result = await service.updatePreference(mockUserId, updateDto);

      // Assert
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalled();
      expect(mockPrisma.notificationPreference.update).toHaveBeenCalled();
      expect(result.prCreated).toBe(false);
    });
  });

  describe('shouldSendNotification (via create)', () => {
    // 通过 create 方法间接测试私有方法 shouldSendNotification

    const testCases = [
      { type: NotificationType.PR_CREATED, prefKey: 'prCreated' },
      { type: NotificationType.PR_MERGED, prefKey: 'prMerged' },
      { type: NotificationType.PR_REVIEWED, prefKey: 'prReviewed' },
      { type: NotificationType.PR_COMMENTED, prefKey: 'prCommented' },
      { type: NotificationType.ISSUE_MENTIONED, prefKey: 'issueMentioned' },
      { type: NotificationType.ISSUE_ASSIGNED, prefKey: 'issueAssigned' },
      { type: NotificationType.ISSUE_COMMENTED, prefKey: 'issueCommented' },
    ];

    testCases.forEach(({ type, prefKey }) => {
      it(`should_filter_${type}_when_${prefKey}_is_disabled`, async () => {
        // Arrange
        const disabledPreference = { ...mockPreference, [prefKey]: false };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        mockPrisma.notificationPreference.findUnique.mockResolvedValue(
          disabledPreference,
        );

        // Act
        const result = await service.create({
          userId: mockUserId,
          type,
          title: `Test ${type}`,
        });

        // Assert
        expect(result).toBeNull();
        expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('should_handle_notification_with_metadata', async () => {
      // Arrange
      const createDto = {
        userId: mockUserId,
        type: NotificationType.PR_CREATED,
        title: 'PR Created',
        metadata: { prId: '123', repoName: 'test-repo' },
      };
      const notificationWithMetadata = {
        ...mockNotification,
        metadata: createDto.metadata,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notification.create.mockResolvedValue(
        notificationWithMetadata,
      );

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result?.metadata).toEqual(createDto.metadata);
    });

    it('should_handle_concurrent_batch_notifications', async () => {
      // Arrange
      const batchSize = 10;
      const createDtos = Array.from({ length: batchSize }, (_, i) => ({
        userId: `user-${i}`,
        type: NotificationType.PR_CREATED,
        title: `Notification ${i}`,
      }));

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      mockPrisma.notification.create.mockImplementation((args) =>
        Promise.resolve({
          ...mockNotification,
          id: `notif-${Math.random()}`,
          ...args.data,
        }),
      );

      // Act
      const results = await service.createBatch(createDtos);

      // Assert
      expect(results).toHaveLength(batchSize);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(batchSize);
    });
  });
});
