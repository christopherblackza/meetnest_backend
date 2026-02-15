import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissions1707921000004 implements MigrationInterface {
  name = 'AddPermissions1707921000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          
            -- Permissions
            REVOKE ALL ON FUNCTION public.is_email_available(text) FROM PUBLIC;
            GRANT EXECUTE ON FUNCTION public.is_email_available(text) TO anon;
            GRANT EXECUTE ON FUNCTION public.is_email_available(text) TO authenticated;
            GRANT EXECUTE ON FUNCTION public.is_email_available(text) TO service_role;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rollback = restore default postgres behaviour
    await queryRunner.query(`
      GRANT EXECUTE ON FUNCTION public.is_email_available(text) TO PUBLIC;
    `);

    await queryRunner.query(`
      REVOKE EXECUTE ON FUNCTION public.is_email_available(text) FROM anon;
      REVOKE EXECUTE ON FUNCTION public.is_email_available(text) FROM authenticated;
      REVOKE EXECUTE ON FUNCTION public.is_email_available(text) FROM service_role;
    `);
  }
}
