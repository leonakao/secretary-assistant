import { describe, expect, it, vi } from 'vitest';
import { CompaniesMeWhatsAppController } from './companies-me-whatsapp.controller';

function makeUser() {
  return { id: 'user-1' } as any;
}

describe('CompaniesMeWhatsAppController', () => {
  it('routes managed WhatsApp settings reads to the dedicated use case', async () => {
    const user = makeUser();
    const getManagedWhatsAppSettings = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      getManagedWhatsAppSettings as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await controller.getWhatsAppSettings(user);

    expect(getManagedWhatsAppSettings.execute).toHaveBeenCalledWith(user);
  });

  it('routes WhatsApp provisioning to the dedicated use case', async () => {
    const user = makeUser();
    const provisionManagedWhatsAppInstance = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      { execute: vi.fn() } as any,
      provisionManagedWhatsAppInstance as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await controller.provisionWhatsAppInstance(user);

    expect(provisionManagedWhatsAppInstance.execute).toHaveBeenCalledWith(user);
  });

  it('routes connection payload requests to the dedicated use case', async () => {
    const user = makeUser();
    const getManagedWhatsAppConnectionPayload = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      getManagedWhatsAppConnectionPayload as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await controller.getWhatsAppConnection(user);

    expect(getManagedWhatsAppConnectionPayload.execute).toHaveBeenCalledWith(
      user,
    );
  });

  it('routes status refresh requests to the dedicated use case', async () => {
    const user = makeUser();
    const refreshManagedWhatsAppStatus = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      refreshManagedWhatsAppStatus as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await controller.refreshWhatsAppStatus(user);

    expect(refreshManagedWhatsAppStatus.execute).toHaveBeenCalledWith(user);
  });

  it('routes agent-state updates to the dedicated use case', async () => {
    const user = makeUser();
    const updateManagedAgentState = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      updateManagedAgentState as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
    );

    await controller.updateAgentState(user, { enabled: false });

    expect(updateManagedAgentState.execute).toHaveBeenCalledWith(user, false);
  });

  it('routes agent reply settings updates to the dedicated use case', async () => {
    const user = makeUser();
    const updateManagedAgentReplySettings = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      updateManagedAgentReplySettings as any,
      { execute: vi.fn() } as any,
    );

    await controller.updateAgentReplySettings(user, {
      scope: 'specific',
      namePattern: 'cliente',
      listMode: 'blacklist',
      listEntries: ['spam'],
    });

    expect(updateManagedAgentReplySettings.execute).toHaveBeenCalledWith(user, {
      scope: 'specific',
      namePattern: 'cliente',
      listMode: 'blacklist',
      listEntries: ['spam'],
    });
  });

  it('routes WhatsApp disconnect to the dedicated use case', async () => {
    const user = makeUser();
    const disconnectManagedWhatsApp = {
      execute: vi.fn().mockResolvedValue({}),
    };
    const controller = new CompaniesMeWhatsAppController(
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      disconnectManagedWhatsApp as any,
    );

    await controller.disconnectWhatsApp(user);

    expect(disconnectManagedWhatsApp.execute).toHaveBeenCalledWith(user);
  });
});
