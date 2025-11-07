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

@Entity('contacts')
@Index(['companyId', 'email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['companyId', 'phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['companyId', 'instagram'], {
  unique: true,
  where: 'instagram IS NOT NULL',
})
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagram: string;

  @ManyToOne('Company', 'contacts')
  @JoinColumn({ name: 'company_id' })
  company: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
