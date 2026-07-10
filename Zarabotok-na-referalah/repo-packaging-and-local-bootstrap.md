# Repo Packaging and Local Bootstrap

## A. Purpose

This document defines how to package the current workspace into a standalone local project and Git repository. The goal is to preserve every verified file, establish a clean repo structure, and enable a fresh local clone to pass all tests and run the smoke test sequence without contacting the MiMo session.

Once packaged, the local copy is the single source of truth. The MiMo workspace is no longer needed for development.

## B. Packaging Goal

The packaging must achieve three things:

First, every file that contributes to the verified 255-test pipeline must be preserved exactly as-is. No renaming, no restructuring, no "improvements" during packaging. The files work. Package what works.

Second, the local copy must boot from a clean state: npm install, npm test, all 255 pass. No manual fixups, no hidden dependencies, no missing files.

Third, the Git history must start clean: one initial commit with the full verified state. No partial commits, no broken intermediate states. The first commit must be a passing state.

## C. Files That Must Be Preserved

These files are critical. If any of them is lost or corrupted, the pipeline breaks. They must be included in the repo exactly as they exist in the current workspace.

Source modules — 19 files:

src/store/lead-schema.js — lead structure, states, transitions, immutable fields
src/store/lead-store.js — in-memory CRUD, dedup, status transitions
src/store/dedup-index.js — dedup key tracking
src/logger/logger.js — append-only event logger
src/logger/pii-mask.js — phone and email masking
src/logger/event-types.js — 13 canonical event type constants
src/middleware/middleware.js — pipeline orchestrator (normalize, validate, dedup, policy, dispatch)
src/middleware/normalize.js — phone normalization, email trimming
src/middleware/validate.js — required field and format validation
src/middleware/policy-check.js — rule evaluation, severity, enforcement
src/middleware/dispatch.js — outbound dispatch to CPA adapter pattern
src/adapter/telegram.js — inbound Telegram adapter, token validation, middleware integration
src/adapter/update-handler.js — update parsing, type detection, lead extraction
src/adapter/update-cache.js — update_id deduplication with TTL eviction
src/adapter/cpa/adapter-base.js — abstract adapter contract
src/adapter/cpa/adapter-registry.js — adapter registration and lookup
src/adapter/cpa/delivery-result.js — delivery result factories (ok, reject, retryable)
src/adapter/cpa/error-taxonomy.js — error types and retryable classification
src/adapter/cpa/mock-adapter.js — mock/stub adapter for testing

Test suites — 5 files:

tests/test-lead-store.js — 13 assertions covering store CRUD, dedup, transitions, PII masking
tests/test-cpa-adapter.js — 87 assertions covering adapter pattern, registry, error taxonomy, delivery result
tests/test-telegram-adapter.js — 79 assertions covering update handling, cache, adapter integration
tests/test-middleware.js — 57 assertions covering full pipeline integration
tests/test-dispatch.js — 19 assertions covering dispatch layer, idempotency, status mapping

Configuration — 3 files:

package.json — project metadata, test scripts, zero external dependencies
config/bot-config.json — Telegram bot config skeleton
.env.example — environment variable template

These 27 files are the system. Everything else is documentation or workspace metadata.

## D. Files That Are Optional

These files are useful but not required for the pipeline to function. Include them in the repo, but their absence does not break tests.

Project documentation:

dashboard-control-panel-mvp.md — dashboard spec for operator visibility
deployment-readiness-checklist.md — blocker list and readiness assessment
runbook.md — startup, verification, smoke test, failure handling procedures
middleware-outbound-dispatch-implementation.md — dispatch integration spec

Workspace metadata (do NOT include in repo):

AGENTS.md — workspace agent configuration (MiMo-specific)
SOUL.md — persona configuration (MiMo-specific)
USER.md — user profile (MiMo-specific)
IDENTITY.md — agent identity (MiMo-specific)
TOOLS.md — tool notes (MiMo-specific)
HEARTBEAT.md — heartbeat configuration (MiMo-specific)

The workspace metadata files are specific to the MiMo session. They must not be copied to the repo. They contain session-specific configuration that has no meaning outside this workspace.

## E. Local Folder Structure

The local project should use this folder structure. It matches the current workspace layout exactly. No restructuring needed.

Root:
- package.json
- .env.example
- README.md (TBD — create during packaging)
- .gitignore (TBD — create during packaging)

Source:
- src/store/ — lead schema, store, dedup index
- src/logger/ — logger, PII mask, event types
- src/middleware/ — middleware pipeline, normalize, validate, policy-check, dispatch
- src/adapter/ — telegram adapter, update handler, update cache
- src/adapter/cpa/ — CPA adapter base, registry, delivery result, error taxonomy, mock adapter

Tests:
- tests/ — all 5 test suites

Config:
- config/ — bot-config.json

Data (created at runtime, not committed):
- data/leads/ — lead storage (TBD when persistent storage is implemented)
- data/logs/ — log files (TBD when persistent logging is implemented)

Documentation:
- docs/ or root — all .md spec and operational documents

The data/ directory must exist but should be empty in the repo. Add .gitkeep files or document that the directories are created at runtime.

## F. Recommended Repo Layout

The repo should be named to reflect its purpose. Suggested name: lead-gen-system or cpa-lead-gen-mvp. The exact name is the operator's choice.

Root-level files in the repo:

.gitignore — must exclude node_modules, .env, data/leads/, data/logs/, any runtime artifacts
README.md — project overview, quick start (npm install, npm test), pointer to runbook.md
package.json — already exists, no changes needed
.env.example — already exists, no changes needed

Source and test directories: unchanged from current workspace.

Documentation files: place at repo root alongside README.md. No separate docs/ directory needed for MVP — there are only 4 doc files.

Do not create:
- src/index.js (TBD — not yet implemented, no entry point exists)
- src/server.js (TBD — no HTTP server exists)
- docker files (TBD — not needed for local bootstrap)
- CI/CD config (TBD — not needed for local bootstrap)
- linting config (TBD — not needed for local bootstrap)
- TypeScript config (not applicable — system is plain JavaScript)

## G. What To Download From MiMo

The operator needs to copy these files from the MiMo workspace to the local machine. All files are in /home/work/.openclaw/workspace/ within the MiMo session.

Method: the operator can download files individually or request a single archive. The recommended approach is to request a tar.gz archive of the entire workspace, then filter out the MiMo-specific files on the local machine.

Files to download (27 source/config/test files):

From src/store/:
- lead-schema.js
- lead-store.js
- dedup-index.js

From src/logger/:
- logger.js
- pii-mask.js
- event-types.js

From src/middleware/:
- middleware.js
- normalize.js
- validate.js
- policy-check.js
- dispatch.js

From src/adapter/:
- telegram.js
- update-handler.js
- update-cache.js

From src/adapter/cpa/:
- adapter-base.js
- adapter-registry.js
- delivery-result.js
- error-taxonomy.js
- mock-adapter.js

From tests/:
- test-lead-store.js
- test-cpa-adapter.js
- test-telegram-adapter.js
- test-middleware.js
- test-dispatch.js

From root:
- package.json
- .env.example

From config/:
- bot-config.json

Files to download (4 documentation files):

- dashboard-control-panel-mvp.md
- deployment-readiness-checklist.md
- runbook.md
- middleware-outbound-dispatch-implementation.md

Files to NOT download (6 workspace metadata files):

- AGENTS.md
- SOUL.md
- USER.md
- IDENTITY.md
- TOOLS.md
- HEARTBEAT.md

These are MiMo session configuration. They have no meaning outside this workspace.

## H. Local Bootstrap Sequence

Step 1: Create the project directory on the local machine. Name it whatever the repo will be named.

Step 2: Copy all downloaded files into the directory, preserving the folder structure exactly as described in section E.

Step 3: Create the data directories. These are runtime directories, not committed to git:
- data/leads/
- data/logs/

Step 4: Create .gitignore with these entries:
- node_modules/
- .env
- data/leads/
- data/logs/
- *.log

Step 5: Create a minimal README.md with:
- Project name and one-line description
- Quick start: npm install, npm test
- Pointer to runbook.md for operational procedures
- Pointer to deployment-readiness-checklist.md for cloud readiness status

Step 6: Run npm install. The system has zero external dependencies, so this will succeed with nothing to install. It is a formality that establishes the npm project structure.

Step 7: Run npm test. Expected: 255 tests pass, 0 fail.

Step 8: Run the smoke test from runbook.md section G. Expected: SMOKE TEST PASS.

If all steps pass, the local bootstrap is complete. The local copy is a verified clone of the MiMo workspace.

## I. First Local Verification

After bootstrap, run these checks to confirm the local copy is healthy.

Check 1: All source files present
- Verify 19 files exist in src/
- Verify 5 files exist in tests/
- Verify 3 config files exist (package.json, .env.example, config/bot-config.json)

Check 2: All tests pass
- Run: npm test
- Expected: 255 passed, 0 failed

Check 3: Module imports resolve
- Run: node -e "require('./src/store/lead-store'); require('./src/logger/logger'); require('./src/middleware/middleware'); require('./src/adapter/telegram'); require('./src/adapter/cpa/mock-adapter'); require('./src/middleware/dispatch'); console.log('All imports OK')"
- Expected: "All imports OK"

Check 4: No MiMo-specific files leaked
- Verify AGENTS.md, SOUL.md, USER.md, IDENTITY.md, TOOLS.md, HEARTBEAT.md do NOT exist in the local copy

Check 5: .gitignore is correct
- Verify node_modules/, .env, data/leads/, data/logs/ are in .gitignore
- Verify git status does not show any of these as untracked

If any check fails, fix it before proceeding to Git initialization.

## J. Git Initialization Sequence

Step 1: Initialize the repository
- Run: git init in the project root

Step 2: Verify .gitignore
- Run: git status
- Confirm: no node_modules, no .env, no data/ directories appear as untracked

Step 3: Stage all files
- Run: git add .
- Confirm: 27 source/config/test files + 4 doc files + README.md + .gitignore are staged

Step 4: Create the initial commit
- Run: git commit -m "Initial commit: verified mock-level pipeline, 255 tests passing"
- This commit must represent a fully passing state. Do not commit if any test is failing.

Step 5: Verify the commit
- Run: git log --oneline
- Confirm: one commit exists with the expected message

Step 6: (Optional) Add a remote
- If the operator has a remote repository (GitHub, GitLab, etc.), add it as a remote and push
- If no remote exists yet, the local repo is sufficient. Remote can be added later.

After this sequence, the local Git repository contains the full verified system in a single clean commit. All future work branches from this commit.

## K. What Must Not Be Lost

The following items represent verified work. If they are lost, the effort to recreate them is significant. They must be preserved in the Git repository.

The 255-test verification: this is the proof that the pipeline works. The test files themselves are the verification record. Losing them means losing the ability to confirm the system is correct.

The middleware pipeline implementation: this is the core of the system. It handles normalization, validation, dedup, policy checking, and dispatch in a single orchestrated flow. Losing it means rebuilding the entire pipeline logic.

The dispatch layer: this integrates the middleware with the CPA adapter pattern. It handles idempotency, status mapping, and error handling. Losing it means re-implementing the outbound integration.

The CPA adapter pattern: this is the abstraction layer for all network adapters. It includes the base contract, registry, error taxonomy, and delivery result format. Losing it means re-designing the adapter architecture.

The Telegram adapter: this is the inbound integration point. It handles update parsing, dedup, and lead extraction. Losing it means re-building the inbound pipeline.

The operational documentation: runbook.md, deployment-readiness-checklist.md, and dashboard-control-panel-mvp.md define how to operate, assess readiness, and build visibility. Losing them means re-writing operational knowledge.

The spec document middleware-outbound-dispatch-implementation.md: this defines the dispatch integration contract. Losing it means re-discovering the integration design.

## L. MVP Packaging Limits

- No entry point (src/index.js does not exist). The system is a library, not a runnable application. TBD: create an entry point that wires all modules together.
- No HTTP server. No port binding. No webhook endpoint. TBD: required for cloud.
- No .env loading. The .env.example is a template. No dotenv or equivalent is installed. TBD: implement env loading.
- No linting. No code formatting. No pre-commit hooks. TBD: add before team collaboration.
- No CI/CD. No GitHub Actions, no pipeline config. TBD: add before team collaboration.
- No Docker. No containerization. TBD: add before cloud deployment.
- No TypeScript. No type checking. Plain JavaScript only.
- No external npm dependencies. The system is self-contained with zero packages.
- No src/index.js. No programmatic entry point. Modules are imported individually.
- Data directories (data/leads/, data/logs/) are empty placeholders. They will be populated at runtime when persistent storage is implemented.

## M. Exact Next Step

The operator should now:

1. Request a download of all files listed in section G from the MiMo session.
2. Follow the local bootstrap sequence in section H.
3. Run the first local verification in section I.
4. Initialize Git per section J.
5. Confirm the initial commit contains all 27 source/config/test files and passes 255 tests.

After that, the local repo is the working copy. All future development happens there. The MiMo workspace is no longer the source of truth — the local Git repo is.

The next development step after packaging is the operator's choice per the deployment-readiness-checklist.md exact next step: implement file-based logger with daily rotation.
