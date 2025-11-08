import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

@Entity('user_companies')
export class UserCompany {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({
    type: 'enum',
    enum: ['owner', 'admin', 'employee'],
    default: 'employee',
  })
  role: 'owner' | 'admin' | 'employee';

  @ManyToOne('User', 'userCompanies')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @ManyToOne('Company', 'userCompanies')
  @JoinColumn({ name: 'company_id' })
  company: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
