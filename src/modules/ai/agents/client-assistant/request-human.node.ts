import { Repository } from 'typeorm';
import { AIMessage } from '@langchain/core/messages';

import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';

import { SendMessageTool } from '../../tools/send-message.tool';
import { ClientAssistantAgentState } from './client-assistant.agent';

export const createRequestHumanNode =
  (
    contactRepository: Repository<Contact>,
    userRepository: Repository<User>,
    sendMessageTool: SendMessageTool,
  ) =>
  async (state: typeof ClientAssistantAgentState.State) => {
    const { contactId, contactName, companyId } = state.context;

    const ignoreUntil = new Date();
    ignoreUntil.setHours(ignoreUntil.getHours() + 24);

    await contactRepository.update(
      { id: contactId },
      { ignoreUntil: ignoreUntil },
    );

    const contact = await contactRepository.findOneOrFail({
      where: { id: contactId },
      relations: ['preferredUser'],
    });

    const latestHumanMessage = [...state.messages]
      .reverse()
      .find((message) => message.type === 'human');

    const lastUserContent =
      typeof latestHumanMessage?.content === 'string'
        ? latestHumanMessage.content
        : undefined;

    let targetUser: User | null = contact.preferredUser ?? null;

    if (!targetUser || !targetUser.phone) {
      targetUser = await userRepository
        .createQueryBuilder('user')
        .innerJoin(
          'user.userCompanies',
          'userCompany',
          'userCompany.companyId = :companyId',
          {
            companyId,
          },
        )
        .where('user.phone IS NOT NULL')
        .andWhere("user.phone <> ''")
        .orderBy(
          "CASE userCompany.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END",
          'ASC',
        )
        .addOrderBy('user.name', 'ASC')
        .getOne();
    }

    const contactDisplayName = contact?.name ?? contactName ?? 'o cliente';

    let humanNotified = false;

    if (targetUser) {
      const greetingName = targetUser.name?.split(' ')[0] ?? targetUser.name;
      const messageToUser = [
        `Olá ${greetingName}, o contato ${contactDisplayName} solicitou atendimento humano na conversa com a assistente.`,
        lastUserContent
          ? `Mensagem mais recente do cliente: "${lastUserContent}".`
          : undefined,
        'Pode assumir esse atendimento, por favor?',
      ]
        .filter(Boolean)
        .join(' ');

      try {
        const result = await sendMessageTool.invoke(
          {
            recipientId: targetUser.id,
            recipientType: 'user',
            message: messageToUser,
          },
          {
            configurable: {
              context: state.context,
            },
          },
        );

        if (typeof result === 'string') {
          try {
            const parsed = JSON.parse(result) as { success?: boolean };
            humanNotified = Boolean(parsed.success);
          } catch {
            humanNotified = false;
          }
        }
      } catch (error) {
        console.error('Failed to notify human support user:', error);
      }
    }

    const confirmationMessage = humanNotified
      ? 'Acionei um atendente humano. Ele já vai continuar o atendimento.'
      : 'Registrei o seu pedido de suporte humano e vou acompanhar para que alguém retorne o quanto antes.';

    return {
      messages: [new AIMessage(confirmationMessage)],
    };
  };
