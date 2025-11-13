import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from 'src/modules/contacts/entities/contact.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Injectable()
export class FindResponsibleUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(contact: Contact): Promise<User | null> {
    const preferredUser = await this.findPreferredUser(contact);
    if (preferredUser) {
      return preferredUser;
    }

    return await this.findFallbackUser(contact.companyId);
  }

  private async findPreferredUser(contact: Contact): Promise<User | null> {
    if (!contact.preferredUserId) {
      return null;
    }

    return await this.userRepository
      .createQueryBuilder('user')
      .innerJoin(
        'user.userCompanies',
        'userCompany',
        'userCompany.companyId = :companyId',
        { companyId: contact.companyId },
      )
      .where('user.id = :preferredUserId', {
        preferredUserId: contact.preferredUserId,
      })
      .getOne();
  }

  private async findFallbackUser(companyId: string): Promise<User | null> {
    return await this.userRepository
      .createQueryBuilder('user')
      .innerJoin(
        'user.userCompanies',
        'userCompany',
        'userCompany.companyId = :companyId',
        { companyId },
      )
      .orderBy(
        "CASE userCompany.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END",
        'ASC',
      )
      .addOrderBy('user.name', 'ASC')
      .getOne();
  }
}
