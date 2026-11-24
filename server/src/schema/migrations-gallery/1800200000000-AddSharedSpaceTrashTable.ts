import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('shared_space_trash')
    .addColumn('assetId', 'uuid', (column) =>
      column.primaryKey().references('asset.id').onDelete('cascade').onUpdate('cascade'),
    )
    .addColumn('userId', 'uuid', (column) =>
      column.notNull().references('user.id').onDelete('cascade').onUpdate('cascade'),
    )
    .addColumn('spaceId', 'uuid', (column) =>
      column.notNull().references('shared_space.id').onDelete('cascade').onUpdate('cascade'),
    )
    .addColumn('deletedAt', 'timestamptz', (column) => column.notNull())
    .execute();

  await db.schema.createIndex('shared_space_trash_userId_idx').on('shared_space_trash').column('userId').execute();
  await db.schema.createIndex('shared_space_trash_spaceId_idx').on('shared_space_trash').column('spaceId').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('shared_space_trash').execute();
}
