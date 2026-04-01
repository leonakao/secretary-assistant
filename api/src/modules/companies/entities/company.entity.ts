import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessType: string | null;

  @Column({ type: 'boolean', default: false })
  isClientsSupportEnabled: boolean;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  agentReplyScope: 'all' | 'specific';

  @Column({ type: 'varchar', length: 255, nullable: true })
  agentReplyNamePattern: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  agentReplyListMode: 'whitelist' | 'blacklist' | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  agentReplyListEntries: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  evolutionInstanceName: string | null;

  @Column({ type: 'varchar', length: 50, default: 'running' })
  step: 'running' | 'onboarding';

  @OneToMany('UserCompany', 'company')
  userCompanies: any[];

  @OneToMany('Contact', 'company')
  contacts: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
