import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/constants/enums.dart';
import 'package:immich_mobile/generated/translations.g.dart';
import 'package:immich_mobile/presentation/actions/action.dart';
import 'package:immich_mobile/providers/infrastructure/toast.provider.dart';
import 'package:immich_mobile/repositories/shared_space_api.repository.dart';
import 'package:immich_mobile/utils/error_handler.dart';

/// Space-scoped delete: moves the selected assets to the global trash through the
/// space endpoint, so it also covers assets contributed by other members. Derive from
/// [assetsActionProvider], NOT [ownedAssetsActionProvider] — the server authorizes the
/// Contributor role against the space, not against asset ownership. Distinct from
/// `RemoveFromSpaceAction`, which only unlinks the asset from the space. Local copies
/// are not touched: the local sync DB is owner-scoped.
final _hasRemoteAssetsProvider = Provider.family.autoDispose<bool, ActionSource>(
  (ref, source) => ref.watch(assetsActionProvider(source)).remote().isNotEmpty,
  dependencies: [assetsActionProvider],
);

class DeleteFromSpaceAction extends AssetActionBuilder {
  final String spaceId;
  final VoidCallback? onComplete;

  const DeleteFromSpaceAction({required super.source, required this.spaceId, this.onComplete});

  @override
  ActionItem? create(BuildContext context, WidgetRef ref) {
    if (!ref.watch(_hasRemoteAssetsProvider(source))) {
      return null;
    }

    return .new(
      icon: Icons.delete_outline,
      label: context.t.delete,
      onAction: () => _trash(context, ref),
    );
  }

  Future<void> _trash(BuildContext context, WidgetRef ref) async {
    final toastService = ref.read(toastServiceProvider);
    final clearSelection = ref.read(clearSelectionProvider(source));
    final assetIds = ref.read(assetsActionProvider(source)).remote().map((asset) => asset.id).toList();
    final message = context.t.trash_action_prompt(count: assetIds.length);

    try {
      await ref.read(sharedSpaceApiRepositoryProvider).trashAssets(spaceId, assetIds);
    } catch (error, stack) {
      handleError(error, stack: stack, description: 'Failed to move space assets to trash');
      return;
    }

    clearSelection();
    onComplete?.call();
    toastService.success(message);
  }
}
