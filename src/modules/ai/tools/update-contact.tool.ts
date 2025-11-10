import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { ToolConfig } from '../types';

const updateContactSchema = z.object({
  contactId: z.string().describe('ID do contato a ser atualizado'),
  newName: z.string().optional().describe('Novo nome'),
  newPhone: z.string().optional().describe('Novo telefone'),
  newEmail: z.string().optional().describe('Novo email'),
});

@Injectable()
export class UpdateContactTool extends StructuredTool {
  private readonly logger = new Logger(UpdateContactTool.name);

  name = 'updateContact';
  description =
    'Atualiza informações de um contato existente. Use para modificar nome, telefone, email ou adicionar notas.';
  schema = updateContactSchema;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof updateContactSchema>,
    _,
    config: ToolConfig,
  ): Promise<string> {
    this.logger.log('🔧 [TOOL] updateContact called');
    this.logger.log(`📥 [TOOL] Args: ${JSON.stringify(args)}`);

    const { contactId, newName, newPhone, newEmail } = args;
    const { companyId } = config.configurable.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const contact = await this.contactRepository.findOne({
      where: {
        id: contactId,
        companyId,
      },
    });

    if (!contact) {
      return `Contato com ID ${contactId} não encontrado.`;
    }
    const updates: Partial<Contact> = {};

    if (newName) updates.name = newName;
    if (newPhone) updates.phone = newPhone;
    if (newEmail) updates.email = newEmail;

    await this.contactRepository.update({ id: contact.id }, updates);

    const result = `Contato "${contact.name}" atualizado com sucesso.`;
    this.logger.log(`✅ [TOOL] ${result}`);
    return result;
  }
}
