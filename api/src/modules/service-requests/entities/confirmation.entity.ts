import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ConfirmationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum ConfirmationInteractionPending {
  USER = 'user',
  CONTACT = 'contact',
}

@Entity('confirmations')
export class Confirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  companyId: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'uuid' })
  contactId: string;

  @Column({
    default: ConfirmationStatus.ACTIVE,
  })
  status: ConfirmationStatus;

  @Column({
    default: ConfirmationInteractionPending.USER,
  })
  interactionPending: ConfirmationInteractionPending;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  expectedResult: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
