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
- Syllabus import stores each subject's topics on its skill and an optional free-text syllabus_topic on activities; AI extraction only previews, the client saves after review. Why: user must review edital imports, and topics stay per-track with their skill.
- The dashboard global view reads approved data from all tracks read-only and merges same-named skills by name; track-scoped widgets (daily goal, streak protector, mission map) stay hidden there. Why: lifetime overview without breaking per-track isolation.
- Skills flagged `shared` stay owned by their original track but are listed, linkable and reviewable in every track; their progress aggregates all tracks via skillProgressWithShared. Why: lifetime subjects (e.g. Portuguese) must not fragment across contests.
- The Arena (`/arena`) generates board-styled questions, distractor discussion and open-answer grading via authenticated server functions in `src/lib/arena.functions.ts`; nothing is persisted until the user ends the session, which saves one approved `practice` activity with elapsed minutes and the syllabus topic. Why: study time and XP keep flowing through the existing derived-XP pipeline without new reward paths.
- Each track stores its target exam board (`study_tracks.exam_board`), which calibrates every Arena prompt. Why: question style must match the contest's board.
- Syllabus import reads full PDFs in the browser (pdfjs), narrows to syllabus pages via `src/lib/syllabus-pages.ts`, and sends text plus the target role so the AI keeps only general + that role's content. Why: full editais exceed upload limits and mix many roles.
- Past exams (`past_exams`) store AI-extracted questions with the official answer key per track; practice and manual scores update the exam row, and exam badges are derived from score percentage in `src/lib/past-exams.ts`. Why: badges are reproducible from data and no new XP path is introduced.
- AI model and reasoning preferences are account-owned, validated through the shared allowlist, and resolved server-side separately for study and document tools. Why: preferences persist without letting a browser submit arbitrary models.
- Every gateway HTTP request uses the authenticated-identity tracked fetch; usage writes are service-only metadata with nullable provider-reported token counts, and reasoning is a subset of output. Why: account statistics cannot be forged or double-counted and missing data is not reported as zero.
- AI monthly token goals are informational, with estimates derived only from matching feature/model/effort history; aggregate usage through an owner-scoped database function. Why: transparency must not invent financial charges or block study.
- Exam structure rules live per track in track_exam_blocks/track_skill_rules (keyed track+skill), computed by src/lib/exam-rules.ts; unspecified block questions split evenly. Why: shared skills can weigh differently per contest and editais often only give per-block counts.
