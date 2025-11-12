import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MediationSessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum MediationInteractionPending {
  USER = 'user',
  CONTACT = 'contact',
}

@Entity('mediation_sessions')
export class MediationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  companyId: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  contactId?: string | null;

  @Column({
    default: MediationSessionStatus.ACTIVE,
  })
  status: MediationSessionStatus;

  @Column({
    default: MediationInteractionPending.USER,
  })
  interactionPending: MediationInteractionPending;

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
