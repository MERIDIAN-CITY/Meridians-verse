import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagNormalizationIndex1722000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add a generated column for normalized name (PostgreSQL)
    await queryRunner.query(`
      ALTER TABLE "tag" 
      ADD COLUMN "name_normalized" VARCHAR(256) 
      GENERATED ALWAYS AS (LOWER(TRIM(name))) STORED
    `);

    // Create unique index on normalized name for active (non-deleted) tags
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_tag_name_normalized_unique" 
      ON "tag" ("name_normalized") 
      WHERE "deletedAt" IS NULL
    `);

    // Create index for faster pagination queries
    await queryRunner.query(`
      CREATE INDEX "idx_tag_created_at" 
      ON "tag" ("createDate" DESC)
    `);

    // Create index for user pagination
    await queryRunner.query(`
      CREATE INDEX "idx_user_created_at" 
      ON "user" ("createDate" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_user_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_tag_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_tag_name_normalized_unique"`);
    await queryRunner.query(`ALTER TABLE "tag" DROP COLUMN "name_normalized"`);
  }
}
