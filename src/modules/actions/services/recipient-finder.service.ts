import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';

export interface RecipientResult {
  recipient: Contact | User | null;
  type?: 'contact' | 'user';
  multipleRecipients?: Array<{
    name: string;
    phone: string;
    type: 'contact' | 'user';
  }>;
}

@Injectable()
export class RecipientFinderService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findRecipient(
    companyId: string,
    recipientName?: string,
    recipientPhone?: string,
    excludeUserId?: string,
  ): Promise<RecipientResult> {
    if (recipientPhone) {
      const contact = await this.contactRepository.findOne({
        where: { companyId, phone: recipientPhone },
      });
      if (contact) return { recipient: contact, type: 'contact' };

      const user = await this.userRepository.findOne({
        where: { phone: recipientPhone },
        relations: ['userCompanies'],
      });
      if (
        user &&
        (!excludeUserId || user.id !== excludeUserId) &&
        user.userCompanies?.some((uc) => uc.companyId === companyId)
      ) {
        return { recipient: user, type: 'user' };
      }
    }

    if (!recipientName) {
      return { recipient: null };
    }

    const contacts = await this.contactRepository.find({
      where: { companyId, name: ILike(`%${recipientName}%`) },
      take: 10,
    });

    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userCompanies', 'uc')
      .where('uc.companyId = :companyId', { companyId })
      .andWhere('user.name ILIKE :name', { name: `%${recipientName}%` })
      .take(10)
      .getMany();

    const filteredUsers = excludeUserId
      ? users.filter((u) => u.id !== excludeUserId)
      : users;

    const allRecipients = [
      ...contacts.map((c) => ({ ...c, type: 'contact' as const })),
      ...filteredUsers.map((u) => ({ ...u, type: 'user' as const })),
    ];

    if (allRecipients.length === 0) {
      return { recipient: null };
    }

    if (allRecipients.length === 1) {
      const { type, ...recipient } = allRecipients[0];
      return { recipient: recipient as Contact | User, type };
    }

    const exactMatch = allRecipients.find(
      (r) => r.name.toLowerCase() === recipientName.toLowerCase(),
    );
    if (exactMatch) {
      const { type, ...recipient } = exactMatch;
      return { recipient: recipient as Contact | User, type };
    }

    return {
      recipient: null,
      multipleRecipients: allRecipients.map((r) => ({
        name: r.name,
        phone: r.phone,
        type: r.type,
      })),
    };
  }

  async findContact(
    companyId: string,
    contactName?: string,
    contactPhone?: string,
  ): Promise<Contact | null> {
    if (contactPhone) {
      return this.contactRepository.findOne({
        where: { companyId, phone: contactPhone },
      });
    }

    if (!contactName) {
      return null;
    }

    const contacts = await this.contactRepository.find({
      where: { companyId, name: ILike(`%${contactName}%`) },
      take: 10,
    });

    if (contacts.length === 0) {
      return null;
    }

    if (contacts.length === 1) {
      return contacts[0];
    }

    const exactMatch = contacts.find(
      (c) => c.name.toLowerCase() === contactName.toLowerCase(),
    );

    return exactMatch || contacts[0];
  }
}
