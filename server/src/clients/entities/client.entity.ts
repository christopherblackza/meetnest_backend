import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ClientType = 'bar' | 'restaurant' | 'cafe' | 'gym' | 'market' | 'volunteering' | 'social';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  type: ClientType;

  @Column({ type: 'text', nullable: true })
  description: string;

@Column({
  type: 'decimal',
  precision: 10,
  scale: 8,
  nullable: true,
})
latitude: string;

@Column({
  type: 'decimal',
  precision: 11,
  scale: 8,
  nullable: true,
})
longitude: string;

  @Column({ type: 'text', nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'website_url', type: 'text', nullable: true })
  websiteUrl: string;

  @Column({ name: 'instagram_url', type: 'text', nullable: true })
  instagramUrl: string;

  @Column({ name: 'google_maps_link', type: 'text', nullable: true })
  googleMapsLink: string;

  @Column({ name: 'contact_number', type: 'text', nullable: true })
  contactNumber: string;

  @Column({ type: 'text', nullable: true })
  email: string;

  @Column({ type: 'float', nullable: true })
  rating: number;

@Column({ name: 'logo_url', type: 'text', nullable: true })
logoUrl: string;

  @Column('text', { array: true, name: 'image_url', nullable: true })
  imageUrls: string[];

   @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
  
    @UpdateDateColumn({ type: 'timestamptz', nullable: true })
    updated_at: Date;
}
