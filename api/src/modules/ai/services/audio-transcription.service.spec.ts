import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { AudioTranscriptionService } from './audio-transcription.service';

const createMock = vi.fn();

vi.mock('openai', () => {
  const OpenAIMock = vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: createMock,
      },
    },
  }));

  return {
    __esModule: true,
    default: OpenAIMock,
    toFile: vi.fn(),
  };
});

describe('AudioTranscriptionService', () => {
  const createConfigService = (apiKey?: string) =>
    ({
      get: vi.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? apiKey : undefined,
      ),
    }) as unknown as ConfigService;

  beforeEach(() => {
    createMock.mockReset();
    vi.mocked(toFile).mockReset();
    vi.mocked(OpenAI).mockClear();
  });

  it('transcribes supported audio with the OpenAI audio API', async () => {
    const service = new AudioTranscriptionService(createConfigService('test'));
    const audioBuffer = Buffer.from('audio');

    vi.mocked(toFile).mockResolvedValue(
      {} as Awaited<ReturnType<typeof toFile>>,
    );
    createMock.mockResolvedValue({ text: '  transcricao final  ' });

    await expect(
      service.transcribeAudio(audioBuffer, 'audio/webm'),
    ).resolves.toBe('transcricao final');

    expect(toFile).toHaveBeenCalledWith(audioBuffer, 'audio.webm', {
      type: 'audio/webm',
    });
    expect(createMock).toHaveBeenCalledWith({
      file: {},
      model: 'gpt-4o-mini-transcribe',
      language: 'pt',
      prompt:
        'Transcreva este audio em portugues brasileiro. Retorne apenas o texto transcrito, sem comentarios adicionais.',
    });
  });

  it('throws when OPENAI_API_KEY is missing', () => {
    expect(
      () => new AudioTranscriptionService(createConfigService(undefined)),
    ).toThrow('OPENAI_API_KEY is not defined in environment variables');
  });

  it('rejects unsupported MIME types', async () => {
    const service = new AudioTranscriptionService(createConfigService('test'));

    await expect(
      service.transcribeAudio(Buffer.from('audio'), 'audio/unknown'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(toFile).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('normalizes common browser recording MIME aliases before transcribing', async () => {
    const service = new AudioTranscriptionService(createConfigService('test'));

    vi.mocked(toFile).mockResolvedValue(
      {} as Awaited<ReturnType<typeof toFile>>,
    );
    createMock.mockResolvedValue({ text: 'ok' });

    await expect(
      service.transcribeAudio(Buffer.from('audio'), 'audio/webm;codecs=opus'),
    ).resolves.toBe('ok');
    await expect(
      service.transcribeAudio(Buffer.from('audio'), 'audio/opus'),
    ).resolves.toBe('ok');
    await expect(
      service.transcribeAudio(Buffer.from('audio'), 'video/webm'),
    ).resolves.toBe('ok');

    expect(toFile).toHaveBeenNthCalledWith(1, Buffer.from('audio'), 'audio.webm', {
      type: 'audio/webm',
    });
    expect(toFile).toHaveBeenNthCalledWith(2, Buffer.from('audio'), 'audio.ogg', {
      type: 'audio/ogg',
    });
    expect(toFile).toHaveBeenNthCalledWith(3, Buffer.from('audio'), 'audio.webm', {
      type: 'audio/webm',
    });
  });
});
