import type { ExpressionBuilder } from 'kysely';
import { AssetStatus, SharedSpaceRole } from 'src/enum.js';
import type { DB } from 'src/schema/index.js';
import { sharedWithViewer, spaceVisibilityGate } from 'src/utils/shared-space-album-scope.js';

export const spaceTrashRoles = [SharedSpaceRole.Owner, SharedSpaceRole.Contributor];

export const trashedThroughSpaceBy = (eb: ExpressionBuilder<DB, 'asset'>, userId: string) =>
  eb.and([
    eb('asset.status', '=', AssetStatus.Trashed),
    spaceVisibilityGate(eb),
    eb.exists(
      eb
        .selectFrom('shared_space_trash')
        .innerJoin('shared_space_member', (join) =>
          join
            .onRef('shared_space_member.spaceId', '=', 'shared_space_trash.spaceId')
            .onRef('shared_space_member.userId', '=', 'shared_space_trash.userId'),
        )
        .select('shared_space_trash.assetId')
        .whereRef('shared_space_trash.assetId', '=', 'asset.id')
        .whereRef('shared_space_trash.deletedAt', '=', 'asset.deletedAt')
        .where('shared_space_trash.userId', '=', userId)
        .where('shared_space_member.role', 'in', spaceTrashRoles),
    ),
  ]);

export const visibleForSpaceTrash = (eb: ExpressionBuilder<DB, 'asset'>, spaceId: string) =>
  eb.and([eb('asset.isOffline', '=', false), sharedWithViewer(eb, { scope: { spaceId }, albumTimelineGate: 'none' })]);
