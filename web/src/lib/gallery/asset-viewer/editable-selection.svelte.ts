import type { AssetMultiSelectManager } from '#lib/managers/asset-multi-select-manager.svelte.ts';
import { resolveEditableAssetIds, type EditabilityContext } from '#lib/utils/asset-editability.ts';

export const useEditableSelection = (
  getSelection: () => AssetMultiSelectManager,
  getContext: () => EditabilityContext,
) => {
  let editableIds = $state<string[] | undefined>();

  $effect(() => {
    const selection = getSelection();
    const assets = selection.assets;
    const context = getContext();
    editableIds = undefined;
    if (assets.length === 0) {
      return;
    }
    if (selection.isAllUserOwned) {
      editableIds = assets.map(({ id }) => id);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      const ids = await resolveEditableAssetIds(assets, context);
      if (!controller.signal.aborted) {
        editableIds = ids;
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  });

  return {
    get ids(): string[] | undefined {
      return editableIds;
    },
  };
};
