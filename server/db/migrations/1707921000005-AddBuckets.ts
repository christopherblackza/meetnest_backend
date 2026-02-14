import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuckets1707921000005 implements MigrationInterface {
  name = 'AddBuckets1707921000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('face-verification-images', 'face-verification-images', true) 
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM storage.buckets WHERE id = 'face-verification-images';
    `);
  }
}
