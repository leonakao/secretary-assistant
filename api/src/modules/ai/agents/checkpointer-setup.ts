const checkpointerSetupPromises = new Map<string, Promise<void>>();

export async function ensureCheckpointerSetup(
  key: string,
  setup: () => Promise<void>,
): Promise<void> {
  const existingSetup = checkpointerSetupPromises.get(key);

  if (existingSetup) {
    await existingSetup;
    return;
  }

  const setupPromise = setup().catch((error) => {
    checkpointerSetupPromises.delete(key);
    throw error;
  });

  checkpointerSetupPromises.set(key, setupPromise);
  await setupPromise;
}

export function resetCheckpointerSetupCache(): void {
  checkpointerSetupPromises.clear();
}
