import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhooks.controller';
import { WebhookService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: WebhookService;

  const mockWebhookService = {
    createWebhook: jest.fn(),
    listWebhooks: jest.fn(),
    getWebhook: jest.fn(),
    updateWebhook: jest.fn(),
    deleteWebhook: jest.fn(),
    testWebhook: jest.fn(),
    listDeliveries: jest.fn(),
    getDelivery: jest.fn(),
    redeliverWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a webhook', async () => {
      const projectId = 'project-1';
      const createDto: CreateWebhookDto = {
        url: 'https://example.com/webhook',
        events: ['push', 'pull_request'],
        active: true,
        secret: 'webhook-secret',
      };

      const mockWebhook = {
        id: 'webhook-1',
        projectId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWebhookService.createWebhook.mockResolvedValue(mockWebhook);

      const result = await controller.createWebhook(projectId, createDto);

      expect(result).toEqual(mockWebhook);
      expect(service.createWebhook).toHaveBeenCalledWith(projectId, createDto);
    });
  });

  describe('listWebhooks', () => {
    it('should list project webhooks', async () => {
      const projectId = 'project-1';
      const mockWebhooks = [
        {
          id: 'webhook-1',
          projectId,
          url: 'https://example.com/webhook1',
          events: ['push'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'webhook-2',
          projectId,
          url: 'https://example.com/webhook2',
          events: ['pull_request'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockWebhookService.listWebhooks.mockResolvedValue(mockWebhooks);

      const result = await controller.listWebhooks(projectId);

      expect(result).toEqual(mockWebhooks);
      expect(result).toHaveLength(2);
      expect(service.listWebhooks).toHaveBeenCalledWith(projectId);
    });
  });

  describe('getWebhook', () => {
    it('should get a webhook by id', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';

      const mockWebhook = {
        id: webhookId,
        projectId,
        url: 'https://example.com/webhook',
        events: ['push'],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWebhookService.getWebhook.mockResolvedValue(mockWebhook);

      const result = await controller.getWebhook(projectId, webhookId);

      expect(result).toEqual(mockWebhook);
      expect(service.getWebhook).toHaveBeenCalledWith(projectId, webhookId);
    });
  });

  describe('updateWebhook', () => {
    it('should update a webhook', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';
      const updateDto: UpdateWebhookDto = {
        url: 'https://example.com/updated-webhook',
        active: false,
      };

      const mockUpdatedWebhook = {
        id: webhookId,
        projectId,
        ...updateDto,
        events: ['push'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWebhookService.updateWebhook.mockResolvedValue(mockUpdatedWebhook);

      const result = await controller.updateWebhook(
        projectId,
        webhookId,
        updateDto,
      );

      expect(result).toEqual(mockUpdatedWebhook);
      expect(service.updateWebhook).toHaveBeenCalledWith(
        projectId,
        webhookId,
        updateDto,
      );
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';

      mockWebhookService.deleteWebhook.mockResolvedValue({
        message: 'Webhook deleted successfully',
      });

      const result = await controller.deleteWebhook(projectId, webhookId);

      expect(result).toEqual({ message: 'Webhook deleted successfully' });
      expect(service.deleteWebhook).toHaveBeenCalledWith(projectId, webhookId);
    });
  });

  describe('testWebhook', () => {
    it('should test a webhook', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';

      const mockDelivery = {
        id: 'delivery-1',
        webhookId,
        success: true,
        statusCode: 200,
        response: 'OK',
        createdAt: new Date(),
      };

      mockWebhookService.testWebhook.mockResolvedValue(mockDelivery);

      const result = await controller.testWebhook(projectId, webhookId);

      expect(result).toEqual(mockDelivery);
      expect(service.testWebhook).toHaveBeenCalledWith(projectId, webhookId);
    });
  });

  describe('listDeliveries', () => {
    it('should list webhook deliveries', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';

      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhookId,
          success: true,
          statusCode: 200,
          createdAt: new Date(),
        },
        {
          id: 'delivery-2',
          webhookId,
          success: false,
          statusCode: 500,
          createdAt: new Date(),
        },
      ];

      mockWebhookService.listDeliveries.mockResolvedValue(mockDeliveries);

      const result = await controller.listDeliveries(projectId, webhookId);

      expect(result).toEqual(mockDeliveries);
      expect(result).toHaveLength(2);
      expect(service.listDeliveries).toHaveBeenCalledWith(projectId, webhookId);
    });
  });

  describe('getDelivery', () => {
    it('should get a webhook delivery', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';
      const deliveryId = 'delivery-1';

      const mockDelivery = {
        id: deliveryId,
        webhookId,
        success: true,
        statusCode: 200,
        request: { body: {}, headers: {} },
        response: 'OK',
        createdAt: new Date(),
      };

      mockWebhookService.getDelivery.mockResolvedValue(mockDelivery);

      const result = await controller.getDelivery(
        projectId,
        webhookId,
        deliveryId,
      );

      expect(result).toEqual(mockDelivery);
      expect(service.getDelivery).toHaveBeenCalledWith(
        projectId,
        webhookId,
        deliveryId,
      );
    });
  });

  describe('redeliverWebhook', () => {
    it('should redeliver a webhook', async () => {
      const projectId = 'project-1';
      const webhookId = 'webhook-1';
      const deliveryId = 'delivery-1';

      const mockNewDelivery = {
        id: 'delivery-2',
        webhookId,
        success: true,
        statusCode: 200,
        createdAt: new Date(),
      };

      mockWebhookService.redeliverWebhook.mockResolvedValue(mockNewDelivery);

      const result = await controller.redeliverWebhook(
        projectId,
        webhookId,
        deliveryId,
      );

      expect(result).toEqual(mockNewDelivery);
      expect(service.redeliverWebhook).toHaveBeenCalledWith(
        projectId,
        webhookId,
        deliveryId,
      );
    });
  });
});
