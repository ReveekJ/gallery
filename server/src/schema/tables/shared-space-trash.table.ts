import { Column, ForeignKeyColumn, Table, type Timestamp } from '@immich/sql-tools';
import { AssetTable } from 'src/schema/tables/asset.table.js';
import { SharedSpaceTable } from 'src/schema/tables/shared-space.table.js';
import { UserTable } from 'src/schema/tables/user.table.js';

@Table('shared_space_trash')
export class SharedSpaceTrashTable {
  @ForeignKeyColumn(() => AssetTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', primary: true, index: false })
  assetId!: string;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', index: true })
  userId!: string;

  @ForeignKeyColumn(() => SharedSpaceTable, { onDelete: 'CASCADE', onUpdate: 'CASCADE', index: true })
  spaceId!: string;

  @Column({ type: 'timestamp with time zone' })
  deletedAt!: Timestamp;
}
