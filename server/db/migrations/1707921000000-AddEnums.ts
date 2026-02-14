import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnums1707921000000 implements MigrationInterface {
  name = 'AddEnums1707921000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE activity_intent AS ENUM (
        'social',
        'food',
        'night',
        'outdoors',
        'sports',
        'work',
        'other'
      );
    `);
  }

  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TYPE IF EXISTS activity_intent;
    `);
  }
}
