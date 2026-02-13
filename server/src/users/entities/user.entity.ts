import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_profiles')
export class User {
  @PrimaryColumn('uuid')
  user_id: string;

  @Column({ type: 'text', nullable: true })
  display_name: string;

  @Column({ type: 'text', nullable: true })
  full_name: string;

  @Column({ type: 'text', unique: true, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'text', nullable: true })
  occupation: string;

  @Column({ type: 'text', nullable: true })
  country_of_origin: string;

  @Column({ type: 'text', nullable: true })
  current_city: string;

  @Column({ type: 'text', nullable: true })
  current_country: string;

  @Column({ type: 'text', nullable: true })
  avatar_url: string;

  @Column({ type: 'text', nullable: true })
  linkedin_handle: string;

  @Column({ type: 'text', nullable: true })
  instagram_handle: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  verification_photo_url: string;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'text', default: 'user' })
  role: string;

  @Column({ type: 'text', default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  auth_provider: string;

  @Column({ type: 'boolean', default: false })
  is_founder: boolean;

  @Column({ type: 'boolean', default: false })
  is_bot: boolean;

  @Column({ type: 'int', default: 100 })
  trust_score: number;
  

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}
