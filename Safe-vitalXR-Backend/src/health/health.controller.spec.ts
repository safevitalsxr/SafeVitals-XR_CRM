import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { getConnectionToken } from '@nestjs/mongoose';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let mockConnection: { readyState: number };

  beforeEach(async () => {
    mockConnection = { readyState: 1 };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return healthy status when DB is connected', () => {
    const res = controller.getHealth();
    expect(res.status).toBe('ok');
    expect(res.dependencies.database).toBe('healthy');
  });

  it('should return live probe status', () => {
    const res = controller.getLiveness();
    expect(res.status).toBe('ok');
  });

  it('should return ready when DB is connected', () => {
    const res = controller.getReadiness();
    expect(res.status).toBe('ready');
  });

  it('should throw ServiceUnavailableException when DB is not connected', () => {
    mockConnection.readyState = 0;
    expect(() => controller.getReadiness()).toThrow(ServiceUnavailableException);
  });
});
