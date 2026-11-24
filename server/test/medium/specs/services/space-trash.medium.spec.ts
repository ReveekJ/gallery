import type { Kysely } from 'kysely';
import { AssetStatus, AssetVisibility, Permission, SharedSpaceRole } from 'src/enum.js';
import { AccessRepository } from 'src/repositories/access.repository.js';
import { AssetRepository } from 'src/repositories/asset.repository.js';
import { LoggingRepository } from 'src/repositories/logging.repository.js';
import { PartnerRepository } from 'src/repositories/partner.repository.js';
import { SharedSpaceRepository } from 'src/repositories/shared-space.repository.js';
import type { DB } from 'src/schema/index.js';
import { TimelineService } from 'src/services/timeline.service.js';
import { checkAccess } from 'src/utils/access.js';
import { newMediumService } from 'test/medium.factory.js';
import { factory } from 'test/small.factory.js';
import { getKyselyDB } from 'test/utils.js';

let db: Kysely<DB>;

beforeAll(async () => {
  db = await getKyselyDB();
});

afterAll(async () => {
  await db?.destroy();
});

it('only the owner and the space trash actor with a current trash role can see the trashed photo', async () => {
  const { ctx, sut } = newMediumService(TimelineService, {
    database: db,
    real: [AccessRepository, AssetRepository, PartnerRepository, SharedSpaceRepository],
    mock: [LoggingRepository],
  });
  const { user: owner } = await ctx.newUser();
  const { user: actor } = await ctx.newUser();
  const { user: other } = await ctx.newUser();
  const { space } = await ctx.newSharedSpace({ createdById: owner.id });
  await ctx.newSharedSpaceMember({ spaceId: space.id, userId: owner.id, role: SharedSpaceRole.Owner });
  await ctx.newSharedSpaceMember({ spaceId: space.id, userId: actor.id, role: SharedSpaceRole.Contributor });
  await ctx.newSharedSpaceMember({ spaceId: space.id, userId: other.id, role: SharedSpaceRole.Contributor });
  const { asset } = await ctx.newAsset({ ownerId: owner.id, visibility: AssetVisibility.Timeline });
  const { asset: privateTrash } = await ctx.newAsset({
    ownerId: owner.id,
    visibility: AssetVisibility.Timeline,
    status: AssetStatus.Trashed,
    deletedAt: new Date(),
  });
  await ctx.newSharedSpaceAsset({ spaceId: space.id, assetId: asset.id });
  await ctx.newSharedSpaceAsset({ spaceId: space.id, assetId: privateTrash.id });
  await ctx.newExif({ assetId: asset.id, make: 'Canon' });
  await ctx.newExif({ assetId: privateTrash.id, make: 'Canon' });

  const repository = ctx.get(SharedSpaceRepository);
  const access = ctx.get(AccessRepository);
  const actorAuth = factory.auth({ user: actor });
  const ownerAuth = factory.auth({ user: owner });
  const otherAuth = factory.auth({ user: other });
  const trashIds = async (auth: typeof actorAuth): Promise<string[]> => {
    const buckets = await sut.getTimeBuckets(auth, { isTrashed: true });
    const contents = await Promise.all(
      buckets.map(({ timeBucket }) => sut.getTimeBucket(auth, { isTrashed: true, timeBucket })),
    );
    return contents
      .flatMap((bucket) => {
        const data: { id: string[] } = JSON.parse(bucket);
        return data.id;
      })
      .sort();
  };

  expect(await repository.trashSpaceAssets(space.id, actor.id, [asset.id, privateTrash.id])).toBe(false);
  expect(await trashIds(actorAuth)).toEqual([]);
  expect(await repository.trashSpaceAssets(space.id, actor.id, [asset.id])).toBe(true);
  expect(await trashIds(ownerAuth)).toEqual([asset.id, privateTrash.id].sort());
  expect(await trashIds(otherAuth)).toEqual([]);
  expect(await trashIds({ ...actorAuth, stockClient: true })).toEqual([]);

  for (const [role, visible] of [
    [SharedSpaceRole.Owner, true],
    [SharedSpaceRole.Contributor, true],
    [SharedSpaceRole.Editor, false],
    [SharedSpaceRole.Viewer, false],
  ] as const) {
    await db.updateTable('shared_space_member').set({ role }).where('userId', '=', actor.id).execute();
    expect(await trashIds(actorAuth)).toEqual(visible ? [asset.id] : []);
    expect(
      await checkAccess(access, {
        auth: actorAuth,
        permission: Permission.AssetView,
        ids: [asset.id, privateTrash.id],
      }),
    ).toEqual(new Set(visible ? [asset.id] : []));
    expect(await checkAccess(access, { auth: actorAuth, permission: Permission.AssetDelete, ids: [asset.id] })).toEqual(
      new Set(),
    );
  }

  await db.deleteFrom('shared_space_member').where('userId', '=', actor.id).execute();
  expect(await trashIds(actorAuth)).toEqual([]);
  await ctx.newSharedSpaceMember({ spaceId: space.id, userId: actor.id, role: SharedSpaceRole.Contributor });
  await db
    .updateTable('asset')
    .set({ deletedAt: null, status: AssetStatus.Active })
    .where('id', '=', asset.id)
    .execute();
  expect(await trashIds(actorAuth)).toEqual([]);
  await db
    .updateTable('asset')
    .set({ deletedAt: new Date(), status: AssetStatus.Trashed })
    .where('id', '=', asset.id)
    .execute();
  expect(await trashIds(actorAuth)).toEqual([]);
});
