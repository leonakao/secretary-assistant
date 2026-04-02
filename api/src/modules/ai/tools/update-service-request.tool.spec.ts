import { UpdateServiceRequestTool } from './update-service-request.tool';

describe('UpdateServiceRequestTool', () => {
  it('persists computed updates onto the existing service request entity', async () => {
    const serviceRequest = {
      id: 'request-1',
      companyId: 'company-1',
      status: 'pending',
      title: 'Titulo antigo',
      description: 'Descricao antiga',
      internalNotes: 'Nota antiga',
      scheduledFor: null,
      assignedToUserId: null,
    };

    const serviceRequestRepository = {
      findOne: vi.fn().mockResolvedValue(serviceRequest),
      save: vi.fn().mockImplementation(async (entity) => entity),
    } as any;

    const tool = new UpdateServiceRequestTool(serviceRequestRepository);

    const result = await (tool as any)._call(
      {
        requestId: 'request-1',
        title: 'Novo titulo',
        description: 'Nova descricao',
        internalNotes: 'Nova nota',
      },
      undefined,
      {
        context: {
          companyId: 'company-1',
        },
      },
    );

    expect(result).toBe('Solicitação de serviço atualizada com sucesso');
    expect(serviceRequest.title).toBe('Novo titulo');
    expect(serviceRequest.description).toBe('Nova descricao');
    expect(serviceRequest.internalNotes).toBe('Nota antiga\n\nNova nota');
    expect(serviceRequestRepository.save).toHaveBeenCalledWith(serviceRequest);
  });
});
