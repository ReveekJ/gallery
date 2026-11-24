import { getAllSpacesQuery } from '#lib/gallery/spaces/space.query.ts';
import { getViewerSpace } from '#lib/gallery/viewer-space.ts';
import { authManager } from '#lib/managers/auth-manager.svelte.ts';
import { queryClient } from '#lib/queries/client.ts';
import { canEditSpacePeople, resolveEffectiveSpaceId } from '#lib/utils/asset-editability.ts';
import { canTrashSpaceAssets, canWriteSpace } from '#lib/utils/space-utils.ts';
import type { AssetResponseDto } from '@immich/sdk';
import { createQuery } from '@tanstack/svelte-query';

/**
The space a viewer surface acts in for an asset, read from the viewer space context, so call it
during component init. `spaceId` is the viewer's space, else the one the asset read resolved to;
`canEditSpacePeople` gates the space face-editing affordances (see `canEditSpacePeople`).
*/
export const useAssetSpace = (getAsset: () => Pick<AssetResponseDto, 'ownerId' | 'canEdit' | 'resolvedSpaceId'>) => {
  const getViewer = getViewerSpace();
  return {
    get spaceId() {
      return resolveEffectiveSpaceId(getAsset(), getViewer().spaceId);
    },
    get canEditSpacePeople() {
      const userId = authManager.authenticated ? authManager.user.id : undefined;
      return canEditSpacePeople(getAsset(), { userId, spaceId: getViewer().spaceId });
    },
  };
};

export const useAssetSpacePermissions = (getAsset: () => AssetResponseDto, enabled: () => boolean) => {
  const assetSpace = useAssetSpace(getAsset);
  const spaces = createQuery(
    () => ({ ...getAllSpacesQuery(), enabled: enabled() && !!assetSpace.spaceId }),
    () => queryClient,
  );

  return {
    get permissions(): { id: string; canWrite: boolean; canDeleteFromSpace: boolean } | undefined {
      if (!enabled()) {
        return undefined;
      }
      const space = spaces.data?.find(({ id }) => id === assetSpace.spaceId);
      if (!space) {
        return undefined;
      }
      const role = space.members?.find(({ userId }) => userId === authManager.user.id)?.role;
      return { id: space.id, canWrite: canWriteSpace(role), canDeleteFromSpace: canTrashSpaceAssets(role) };
    },
  };
};
