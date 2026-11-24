import { animateRemoval } from '#lib/gallery/motion/index.ts';
import { handleError } from '#lib/utils/handle-error.ts';
import { getFormatter } from '#lib/utils/i18n.ts';
import { emptyTrash, restoreTrash } from '@immich/sdk';
import { modalManager, toastManager, type ActionItem } from '@immich/ui';
import { mdiDeleteForeverOutline, mdiHistory } from '@mdi/js';
import type { MessageFormatter } from 'svelte-i18n';

export const getTrashActions = ($t: MessageFormatter, assetCount: number, animateAll = true) => {
  const RestoreAll: ActionItem = {
    title: $t('restore_all'),
    icon: mdiHistory,
    $if: () => assetCount > 0,
    onAction: () => handleRestoreTrash(animateAll),
  };

  const Empty: ActionItem = {
    title: $t('empty_trash'),
    icon: mdiDeleteForeverOutline,
    $if: () => assetCount > 0,
    onAction: () => emptyOwnedTrash(animateAll),
  };

  return { RestoreAll, Empty };
};

// gallery-fork: exported for the Library Cleanup hub's "empty trash" footer
// (web/src/lib/gallery/cleanup/pages/CleanupHubPage.svelte).
export const handleEmptyTrash = () => emptyOwnedTrash(true);

const emptyOwnedTrash = async (animateAll: boolean) => {
  const $t = await getFormatter();

  const confirmed = await modalManager.showDialog({ prompt: $t('empty_trash_confirmation') });
  if (!confirmed) {
    return;
  }

  try {
    const { count } = await emptyTrash();
    if (animateAll) {
      animateRemoval('visible', 'delete');
    }
    toastManager.primary($t('assets_permanently_deleted_count', { values: { count } }));
  } catch (error) {
    handleError(error, $t('errors.unable_to_empty_trash'));
  }
};

const handleRestoreTrash = async (animateAll: boolean) => {
  const $t = await getFormatter();

  const confirmed = await modalManager.showDialog({ prompt: $t('assets_restore_confirmation') });
  if (!confirmed) {
    return;
  }

  try {
    const { count } = await restoreTrash();
    if (animateAll) {
      animateRemoval('visible', 'restore');
    }
    toastManager.primary($t('assets_restored_count', { values: { count } }));
  } catch (error) {
    handleError(error, $t('errors.unable_to_restore_trash'));
  }
};
