import { describe, expect, it, vi } from 'vitest';
import { RedisLockService } from './redis-lock.service';

function makeConfigService(
  redisUrl: string | undefined = 'redis://localhost:6379',
) {
  return {
    get: vi.fn().mockReturnValue(redisUrl),
  };
}

/**
 * Bypass onModuleInit by injecting a mock Redis instance directly.
 * This lets us test lock behaviour without a real Redis connection.
 */
function makeServiceWithRedis(redisMock: any) {
  const service = new RedisLockService(makeConfigService() as any);
  (service as any).redis = redisMock;
  return service;
}

describe('RedisLockService', () => {
  describe('acquireLock', () => {
    it('returns true when Redis is unavailable (graceful degradation)', async () => {
      const service = makeServiceWithRedis(null);

      const acquired = await service.acquireLock('queue-lock:item-1', 60_000);

      expect(acquired).toBe(true);
    });

    it('returns true when Redis SET NX succeeds (lock acquired)', async () => {
      const redisMock = { set: vi.fn().mockResolvedValue('OK'), del: vi.fn() };
      const service = makeServiceWithRedis(redisMock);

      const acquired = await service.acquireLock('queue-lock:item-1', 60_000);

      expect(acquired).toBe(true);
      expect(redisMock.set).toHaveBeenCalledWith(
        'queue-lock:item-1',
        '1',
        'px',
        60_000,
        'nx',
      );
    });

    it('returns false when Redis SET NX returns null (lock already held by another instance)', async () => {
      const redisMock = { set: vi.fn().mockResolvedValue(null), del: vi.fn() };
      const service = makeServiceWithRedis(redisMock);

      const acquired = await service.acquireLock('queue-lock:item-1', 60_000);

      expect(acquired).toBe(false);
    });

    it('returns true when Redis throws an error (graceful degradation — processing continues)', async () => {
      const redisMock = {
        set: vi.fn().mockRejectedValue(new Error('Redis connection refused')),
        del: vi.fn(),
      };
      const service = makeServiceWithRedis(redisMock);

      const acquired = await service.acquireLock('queue-lock:item-1', 60_000);

      expect(acquired).toBe(true);
    });
  });

  describe('releaseLock', () => {
    it('is a no-op when Redis is unavailable', async () => {
      const service = makeServiceWithRedis(null);

      await expect(
        service.releaseLock('queue-lock:item-1'),
      ).resolves.toBeUndefined();
    });

    it('deletes the lock key from Redis', async () => {
      const redisMock = { del: vi.fn().mockResolvedValue(1) };
      const service = makeServiceWithRedis(redisMock);

      await service.releaseLock('queue-lock:item-1');

      expect(redisMock.del).toHaveBeenCalledWith('queue-lock:item-1');
    });
  });
});
