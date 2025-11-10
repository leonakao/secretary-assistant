import { StructuredTool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { Contact } from 'src/modules/contacts/entities/contact.entity';

const updateContactSchema = z.object({
  contactId: z.string().describe('ID do contato a ser atualizado'),
  newName: z.string().optional().describe('Novo nome'),
  newPhone: z.string().optional().describe('Novo telefone'),
  newEmail: z.string().optional().describe('Novo email'),
});

@Injectable()
export class UpdateContactTool extends StructuredTool {
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
    config,
  ): Promise<string> {
    const { contactId, newName, newPhone, newEmail } = args;

    if (!config?.context?.companyId) {
      throw new Error('Company ID missing in the context');
    }

    const contact = await this.contactRepository.findOne({
      where: {
        id: contactId,
        companyId: config.context.companyId,
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

    return `Contato "${contact.name}" atualizado com sucesso.`;
  }
}
