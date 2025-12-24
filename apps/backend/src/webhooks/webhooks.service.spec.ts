import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: PrismaService;

  const mockPrismaService = {
    webhook: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    webhookDelivery: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get<PrismaService>(PrismaService);

    // 清除所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWebhook', () => {
    it('should create a webhook with generated secret', async () => {
      const projectId = 'project-123';
      const dto = {
        url: 'https://example.com/webhook',
        events: ['push', 'pull_request.opened'],
        active: true,
      };

      const mockWebhook = {
        id: 'webhook-123',
        projectId,
        url: dto.url,
        secret: 'generated-secret',
        events: dto.events,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.webhook.create.mockResolvedValue(mockWebhook);

      const result = await service.createWebhook(projectId, dto);

      expect(result).toEqual(mockWebhook);
      expect(prisma.webhook.create).toHaveBeenCalledWith({
        data: {
          projectId,
          url: dto.url,
          secret: expect.any(String), // 验证 secret 被生成
          events: dto.events,
          active: true,
        },
      });
      // 验证 secret 长度（32 字节 hex = 64 字符）
      const callArgs = (prisma.webhook.create as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.secret).toHaveLength(64);
    });
  });

  describe('updateWebhook', () => {
    it('should update a webhook', async () => {
      const webhookId = 'webhook-123';
      const dto = {
        url: 'https://new-url.com/webhook',
        events: ['issue.opened'],
        active: false,
      };

      const mockWebhook = {
        id: webhookId,
        projectId: 'project-123',
        ...dto,
        secret: 'secret',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.webhook.update.mockResolvedValue(mockWebhook);

      const result = await service.updateWebhook(webhookId, dto);

      expect(result).toEqual(mockWebhook);
      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: webhookId },
        data: dto,
      });
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      const webhookId = 'webhook-123';

      mockPrismaService.webhook.delete.mockResolvedValue({});

      await service.deleteWebhook(webhookId);

      expect(prisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: webhookId },
      });
    });
  });

  describe('getWebhook', () => {
    it('should return a webhook', async () => {
      const webhookId = 'webhook-123';
      const mockWebhook = {
        id: webhookId,
        projectId: 'project-123',
        url: 'https://example.com/webhook',
        secret: 'secret',
        events: ['push'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.webhook.findUnique.mockResolvedValue(mockWebhook);

      const result = await service.getWebhook(webhookId);

      expect(result).toEqual(mockWebhook);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      const webhookId = 'non-existent';

      mockPrismaService.webhook.findUnique.mockResolvedValue(null);

      await expect(service.getWebhook(webhookId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listWebhooks', () => {
    it('should list all webhooks for a project', async () => {
      const projectId = 'project-123';
      const mockWebhooks = [
        {
          id: 'webhook-1',
          projectId,
          url: 'https://example.com/webhook1',
          secret: 'secret1',
          events: ['push'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'webhook-2',
          projectId,
          url: 'https://example.com/webhook2',
          secret: 'secret2',
          events: ['issue.opened'],
          active: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.webhook.findMany.mockResolvedValue(mockWebhooks);

      const result = await service.listWebhooks(projectId);

      expect(result).toEqual(mockWebhooks);
      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('triggerWebhook', () => {
    it('should deliver webhooks matching the event', async () => {
      const projectId = 'project-123';
      const event = 'push';
      const payload = { ref: 'refs/heads/main', commits: [] };

      const mockWebhooks = [
        {
          id: 'webhook-1',
          projectId,
          url: 'https://example.com/webhook1',
          secret: 'secret1',
          events: ['push', 'pull_request.opened'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'webhook-2',
          projectId,
          url: 'https://example.com/webhook2',
          secret: 'secret2',
          events: ['issue.opened'], // 不匹配
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.webhook.findMany.mockResolvedValue(mockWebhooks);
      mockPrismaService.webhookDelivery.create.mockResolvedValue({});
      mockedAxios.post.mockResolvedValue({ status: 200, data: 'OK' });

      await service.triggerWebhook(projectId, event, payload);

      // 只有 webhook-1 应该被投递
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://example.com/webhook1',
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Event': 'push',
            'X-Webhook-Signature': expect.stringContaining('sha256='),
          }),
        }),
      );
    });

    it('should match wildcard events', async () => {
      const projectId = 'project-123';
      const event = 'pull_request.opened';
      const payload = { action: 'opened', pull_request: {} };

      const mockWebhooks = [
        {
          id: 'webhook-1',
          projectId,
          url: 'https://example.com/webhook1',
          secret: 'secret1',
          events: ['pull_request.*'], // 通配符匹配
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.webhook.findMany.mockResolvedValue(mockWebhooks);
      mockPrismaService.webhookDelivery.create.mockResolvedValue({});
      mockedAxios.post.mockResolvedValue({ status: 200, data: 'OK' });

      await service.triggerWebhook(projectId, event, payload);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('deliverWebhook', () => {
    it('should successfully deliver a webhook', async () => {
      const webhook = {
        id: 'webhook-123',
        projectId: 'project-123',
        url: 'https://example.com/webhook',
        secret: 'secret123',
        events: ['push'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const event = 'push';
      const payload = { ref: 'refs/heads/main' };

      const mockDelivery = {
        id: 'delivery-123',
        webhookId: webhook.id,
        event,
        payload,
        statusCode: 200,
        response: 'OK',
        success: true,
        duration: 100,
        error: null,
        deliveredAt: new Date(),
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: 'OK' });
      mockPrismaService.webhookDelivery.create.mockResolvedValue(mockDelivery);

      const result = await service.deliverWebhook(webhook, event, payload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should record failed delivery on HTTP error', async () => {
      const webhook = {
        id: 'webhook-123',
        projectId: 'project-123',
        url: 'https://example.com/webhook',
        secret: 'secret123',
        events: ['push'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const event = 'push';
      const payload = { ref: 'refs/heads/main' };

      const mockDelivery = {
        id: 'delivery-123',
        webhookId: webhook.id,
        event,
        payload,
        statusCode: 500,
        response: null,
        success: false,
        duration: 50,
        error: 'Request failed with status code 500',
        deliveredAt: new Date(),
      };

      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500 },
        message: 'Request failed with status code 500',
      });
      mockPrismaService.webhookDelivery.create.mockResolvedValue(mockDelivery);

      const result = await service.deliverWebhook(webhook, event, payload);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });
  });

  describe('retryDelivery', () => {
    it('should retry a failed delivery', async () => {
      const deliveryId = 'delivery-123';
      const mockDelivery = {
        id: deliveryId,
        webhookId: 'webhook-123',
        event: 'push',
        payload: { ref: 'refs/heads/main' },
        statusCode: 500,
        response: null,
        success: false,
        duration: 50,
        error: 'Timeout',
        deliveredAt: new Date(),
        webhook: {
          id: 'webhook-123',
          projectId: 'project-123',
          url: 'https://example.com/webhook',
          secret: 'secret123',
          events: ['push'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrismaService.webhookDelivery.findUnique.mockResolvedValue(
        mockDelivery,
      );
      mockPrismaService.webhookDelivery.create.mockResolvedValue({
        ...mockDelivery,
        id: 'delivery-456',
        success: true,
        statusCode: 200,
      });
      mockedAxios.post.mockResolvedValue({ status: 200, data: 'OK' });

      const result = await service.retryDelivery(deliveryId);

      expect(result.success).toBe(true);
    });

    it('should throw error if retrying successful delivery', async () => {
      const deliveryId = 'delivery-123';
      const mockDelivery = {
        id: deliveryId,
        webhookId: 'webhook-123',
        event: 'push',
        payload: { ref: 'refs/heads/main' },
        statusCode: 200,
        response: 'OK',
        success: true, // 已经成功
        duration: 100,
        error: null,
        deliveredAt: new Date(),
        webhook: {
          id: 'webhook-123',
          projectId: 'project-123',
          url: 'https://example.com/webhook',
          secret: 'secret123',
          events: ['push'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrismaService.webhookDelivery.findUnique.mockResolvedValue(
        mockDelivery,
      );

      await expect(service.retryDelivery(deliveryId)).rejects.toThrow(
        'Cannot retry a successful delivery',
      );
    });
  });

  describe('listDeliveries', () => {
    it('should list deliveries for a webhook', async () => {
      const webhookId = 'webhook-123';
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhookId,
          event: 'push',
          payload: {},
          statusCode: 200,
          response: 'OK',
          success: true,
          duration: 100,
          error: null,
          deliveredAt: new Date(),
        },
        {
          id: 'delivery-2',
          webhookId,
          event: 'pull_request.opened',
          payload: {},
          statusCode: 500,
          response: null,
          success: false,
          duration: 50,
          error: 'Timeout',
          deliveredAt: new Date(),
        },
      ];

      mockPrismaService.webhookDelivery.findMany.mockResolvedValue(
        mockDeliveries,
      );
      mockPrismaService.webhookDelivery.count.mockResolvedValue(2);

      const result = await service.listDeliveries(webhookId, 50, 0);

      expect(result.deliveries).toEqual(mockDeliveries);
      expect(result.total).toBe(2);
    });
  });
});
