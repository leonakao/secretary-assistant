import { describe, expect, it, vi } from 'vitest';
import { IncomingMessageUseCase } from './incoming-message.use-case';

describe('IncomingMessageUseCase', () => {
  it('keeps client auto-replies blocked when isClientsSupportEnabled is false', async () => {
    const contactRepository = {
      findOne: vi.fn(),
      update: vi.fn(),
    } as any;
    const userRepository = {
      findOne: vi.fn(),
    } as any;
    const userCompanyRepository = {
      findOne: vi.fn().mockResolvedValue(null),
    } as any;
    const companyRepository = {
      findOne: vi.fn().mockResolvedValue({
        id: 'company-1',
        isClientsSupportEnabled: false,
        step: 'running',
      }),
    } as any;
    const memoryRepository = {
      findOne: vi.fn(),
    } as any;
    const clientStrategy = {
      handleConversation: vi.fn(),
    } as any;
    const ownerStrategy = {
      handleConversation: vi.fn(),
    } as any;
    const onboardingStrategy = {
      handleConversation: vi.fn(),
    } as any;
    const audioTranscriptionService = {
      transcribeAudio: vi.fn(),
    } as any;
    const useCase = new IncomingMessageUseCase(
      contactRepository,
      userRepository,
      userCompanyRepository,
      companyRepository,
      memoryRepository,
      clientStrategy,
      ownerStrategy,
      onboardingStrategy,
      audioTranscriptionService,
    );

    const result = await useCase.execute('company-1', 'instance-1', {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
      },
      message: {
        conversation: 'Oi',
      },
    } as any);

    expect(result).toEqual({ message: '' });
    expect(contactRepository.findOne).not.toHaveBeenCalled();
    expect(clientStrategy.handleConversation).not.toHaveBeenCalled();
  });
});
