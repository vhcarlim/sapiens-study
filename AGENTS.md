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
- TrackProvider owns global selection and mounts track content keyed by track ID; track colors are semantic CSS tokens.
- Active-review threads use activity-specific page URLs, database UIMessage history, authenticated AI SDK streaming and AI Elements controls.
- Review scores are generated server-side from authoritative history; service-only atomic review completion deduplicates rounds and updates scheduling, mastery and XP together.
- Study time remains unchanged by reviews; review XP contributes to level progression, while evaluated mastery drives the radar.
- Derive gamification XP from approved activity minutes, items and one summary bonus plus authoritative review results; use the shared gamification module for all progress views.
- Store daily-goal and mission-map view/order preferences locally under user-and-track-scoped keys; mission locks are visual guidance, never restrictions on logging or reviewing.
- Syllabus import stores each subject's topics on its skill and an optional free-text syllabus_topic on activities; AI extraction only previews, the client saves after review.
- The dashboard global view reads approved data from all tracks read-only and merges same-named skills by name; track-scoped widgets (daily goal, streak protector, mission map) stay hidden there.
- Skills flagged `shared` stay owned by their original track but are listed, linkable and reviewable in every track; their progress aggregates all tracks via skillProgressWithShared.
- The Arena (`/arena`) generates board-styled questions, distractor discussion and open-answer grading via authenticated server functions in `src/lib/arena.functions.ts`; nothing is persisted until the user ends the session, which saves one approved `practice` activity with elapsed minutes and the syllabus topic.
- Each track stores its target exam board (`study_tracks.exam_board`), which calibrates every Arena prompt.
- Syllabus import reads full PDFs in the browser (pdfjs), narrows to syllabus pages via `src/lib/syllabus-pages.ts`, and sends text plus the target role so the AI keeps only general + that role's content.
- Past exams (`past_exams`) store AI-extracted questions with the official answer key per track; practice and manual scores update the exam row, and exam badges are derived from score percentage in `src/lib/past-exams.ts`.
- AI model and reasoning preferences are account-owned, validated through the shared allowlist, and resolved server-side separately for study and document tools.
- Every gateway HTTP request uses the authenticated-identity tracked fetch; usage writes are service-only metadata with nullable provider-reported token counts, and reasoning is a subset of output.
- AI monthly token goals are informational, with estimates derived only from matching feature/model/effort history; aggregate usage through an owner-scoped database function.
- Exam structure rules live per track in track_exam_blocks/track_skill_rules (keyed track+skill), computed by src/lib/exam-rules.ts; unspecified block questions split evenly.
- Activities record material/phase/perception (src/lib/study-meta.ts); the activity chart stacks by material and the latest perception scales recommendation priority; legacy type is derived from phase for XP.
- Arena generation records a one-line fingerprint + angle per question in `arena_question_history` (owner RLS) and feeds the last 25 per topic back to the prompt; student focus/style/difficulty prefs live in localStorage per track and are wrapped as data in the prompt.

- The study plan (`/plano`) is derived, never persisted: `src/lib/study-plan.ts` simulates the week with `recommendTopic`, past days come from approved activities; only availability (`study_plan_settings`) and per-week pin/skip plus per-day adjustments (`study_plan_overrides.day_adjust`) are stored.
- Prefer Baseline native web features (container queries, View Transitions, OKLCH tokens, native dialog semantics via Radix) over JS layout/animation libraries.
- `/caderno` (`study_learnings`) is filled by `distillRound` from Arena rounds at session end, no AI call.
- AI cost control: `createTrackedAiFetch` enforces per-plan daily caps (`src/lib/ai-quota.ts`) and routes AES-encrypted own keys server-side; Arena serves the shared `question_bank` first.
- Individual AI quota exemptions use the protected `ai_entitlements` unlimited plan, not roles or client overrides; usage tracking and provider billing remain active.
- Official/AI provenance never crosses; token ingestion stays pending, Arena filters origin/topic/board/year and quarantine. Unique likes/reports only count; only admins disable or promote questions (abuse-proof); private RAG stays owner-only. Why: separate authenticity, quality and privacy.
- Track-owned source_documents provide bounded article chunks by lexical retrieval; Gateway SDK runs behind tracked transport, while BYOK uses provider fetch. Why: grounded questions with no embedding cost and preserved quotas/preferences.
- MCP uses OAuth client-claim verification and caller-scoped RLS clients in `src/lib/mcp`; read-only tools avoid AI costs and generated transport routes remain plugin-owned.
- OAuth login validates local return paths once and preserves consent through password, signup and social login; browser-local WebMCP tools stay in their owning screen with fail-open telemetry.
- Domain contexts (tracks, practice, retention, progression, content, ai-quota, planning) expose public ports at `src/lib/contexts/<ctx>/index.ts`; import only those across contexts, reference aggregates by ID (boundary test). Why: DDD without risky moves.
