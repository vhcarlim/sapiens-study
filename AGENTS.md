<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Imported activities (Duolingo/TryHackMe public profiles via `src/lib/sync.functions.ts`) are diffed against `import_snapshots` and inserted as `status='pending'`; only approved rows feed the dashboard. Why: user wants review before anything counts, and no credentials are stored.

- Study tracks are owned by the authenticated user; all source, skill and activity queries and writes carry track_id, with per-track query keys and database relationship validation. Why: switching contexts must never mix study data.
- TrackProvider owns global selection and mounts track content keyed by track ID; track colors are semantic CSS tokens. Why: local forms reset on switching and secondary accents preserve the existing brand.
- Active-review threads use activity-specific page URLs, database UIMessage history, authenticated AI SDK streaming and AI Elements controls. Why: reloads preserve each activity's independent conversation.
- Review scores are generated server-side from authoritative history; service-only atomic review completion deduplicates rounds and updates scheduling, mastery and XP together. Why: client messages cannot forge rewards and concurrent submissions cannot double-count.
- Study time remains unchanged by reviews; review XP contributes to level progression, while evaluated mastery drives the radar. Why: demonstrated retention is distinct from time invested.
- Derive gamification XP from approved activity minutes, items and one summary bonus plus authoritative review results; use the shared gamification module for all progress views. Why: edits cannot stack duplicate rewards, and study time remains separate from XP.
- Store daily-goal and mission-map view/order preferences locally under user-and-track-scoped keys; mission locks are visual guidance, never restrictions on logging or reviewing. Why: optional gamification must not block independent studies or mix account preferences.
