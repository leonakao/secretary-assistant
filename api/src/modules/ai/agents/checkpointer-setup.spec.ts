import {
  ensureCheckpointerSetup,
  resetCheckpointerSetupCache,
} from './checkpointer-setup';

describe('ensureCheckpointerSetup', () => {
  beforeEach(() => {
    resetCheckpointerSetupCache();
  });

  it('runs setup only once for concurrent callers sharing a key', async () => {
    const setup = vi.fn(async () => undefined);

    await Promise.all([
      ensureCheckpointerSetup('postgres://db|checkpointer', setup),
      ensureCheckpointerSetup('postgres://db|checkpointer', setup),
      ensureCheckpointerSetup('postgres://db|checkpointer', setup),
    ]);

    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('retries setup after a failed attempt', async () => {
    const setup = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('duplicate schema'))
      .mockResolvedValueOnce(undefined);

    await expect(
      ensureCheckpointerSetup('postgres://db|checkpointer', setup),
    ).rejects.toThrow('duplicate schema');

    await expect(
      ensureCheckpointerSetup('postgres://db|checkpointer', setup),
    ).resolves.toBeUndefined();

    expect(setup).toHaveBeenCalledTimes(2);
  });
});
