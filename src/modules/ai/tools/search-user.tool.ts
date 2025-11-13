import { StructuredTool } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { User } from 'src/modules/users/entities/user.entity';
import { AgentState } from '../agents/agent.state';

const searchUserSchema = z.object({
  query: z
    .string()
    .describe('Nome, telefone ou email do funcionário/usuário a ser buscado'),
});

@Injectable()
export class SearchUserTool extends StructuredTool {
  private readonly logger = new Logger(SearchUserTool.name);

  name = 'searchUser';
  description =
    'Busca informações de usuários (funcionários). Use para encontrar dados de telefone, email, cargo ou identificar quem pode ajudar em uma solicitação.';
  schema = searchUserSchema;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  protected async _call(
    args: z.infer<typeof searchUserSchema>,
    _runManager,
    state: typeof AgentState.State,
  ): Promise<string> {
    const { query } = args;
    const { companyId } = state.context;

    if (!companyId) {
      throw new Error('Company ID missing in the context');
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect(
        'user.userCompanies',
        'userCompany',
        'userCompany.companyId = :companyId',
        {
          companyId,
        },
      )
      .andWhere(
        '(LOWER(user.name) LIKE LOWER(:query) OR user.phone LIKE :query OR LOWER(user.email) LIKE LOWER(:query))',
        { query: `%${query}%` },
      )
      .orderBy('user.name', 'ASC')
      .take(10)
      .getMany();

    const result = {
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        companies: user.userCompanies
          ?.filter((uc) => uc.companyId === companyId)
          .map((uc) => ({
            companyId: uc.companyId,
            role: uc.role,
          })),
      })),
    };

    this.logger.log(
      `✅ [TOOL] Found ${users.length} user(s) for query "${query}"`,
    );

    return JSON.stringify(result, null, 2);
  }
}
