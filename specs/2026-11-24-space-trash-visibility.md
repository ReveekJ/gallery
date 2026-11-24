# Space trash visibility

The web Trash timeline includes photos the viewer moved to trash through a Shared Space. An actor sees an entry while they are still an Owner or Contributor of the space. The asset owner uses the existing trash path and retains control of restoration and permanent deletion. Assigning a trash-capable space role is the opt-in to actor visibility.

A fork table stores the actor, space and exact deletion timestamp in the same transaction as the asset status update. Reads require the current trash status and matching timestamp, so restoration and a later deletion by the owner cannot reuse the old grant. Shared-link sessions have no grant. Older deletion operations lack provenance and cannot be attributed safely.

New web clients still work with older servers and see owner-only trash there. Older Gallery web clients can receive the wider timeline with the existing wire format. Their older controls may offer actions the server denies. Stock clients receive the owner-only timeline. Mobile trash continues to use the owner-scoped local database.

Downgrading removes the attribution table. The owner retains the trashed asset and can still restore or permanently delete it.
