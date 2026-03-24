import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum ServiceRequestStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  WAITING_PARTS = 'waiting_parts',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('service_requests')
@Index(['companyId', 'status'])
@Index(['companyId', 'contactId'])
@Index(['companyId', 'requestType'])
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'uuid' })
  contactId: string;

  @Column({ type: 'varchar', length: 100 })
  requestType: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ServiceRequestStatus.PENDING,
  })
  status: ServiceRequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @Column({ type: 'text', nullable: true })
  clientNotes: string;

  @Column({ type: 'uuid', nullable: true })
  assignedToUserId: string;

  @ManyToOne('Company', { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: any;

  @ManyToOne('Contact', { nullable: false })
  @JoinColumn({ name: 'contact_id' })
  contact: any;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
