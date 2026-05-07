# AGENTS.md

## Project summary

This is a Windows-first local desktop app for a human chat operator.
It is a copy-only snippet console.

The app helps the user organize, edit, generate and copy text snippets quickly.

It must not automate third-party apps.
It must not auto-send messages.
It must not auto-paste text into external windows.
It must not simulate keystrokes.
It must not bypass platform rules.

The user always manually pastes copied text into the target chat.

## Tech stack

- Tauri 2
- Vite
- TypeScript
- Local-only persistence
- No backend server
- No cloud
- No login
- No external AI API at runtime

Prefer simple, readable modules over complex abstractions.

## Core concepts

The app has two main content types:

1. Fixed snippets:
   - Exact text copied as-is.
   - Examples: editable daily data, private references, links, canned instructions.

2. Variable templates:
   - Generated from approved local blocks.
   - No free-form AI generation.
   - No external synonym API.
   - No aggressive random text mutation.
   - Use curated variants only.

## Safety and boundaries

Allowed:

- Copying text to clipboard.
- Local editing.
- Local generation from curated blocks.
- Import/export JSON.
- Local app settings.
- Optional global shortcut to focus/open the app, if implemented safely.

Not allowed:

- Auto-paste into other applications.
- Auto-send messages.
- Browser automation.
- DOM injection into chat platforms.
- Simulated keyboard events for third-party apps.
- Scraping.
- Remote backend.
- External AI calls.
- Anti-detection or anti-bot evasion features.

## UX priorities

The app must be fast and simple for a non-technical user.

Prioritize:

- One-click copy.
- Clear toast feedback.
- Big clickable cards.
- Search.
- Favorites.
- Easy editing.
- Daily fixed buttons.
- Import/export backup.

Avoid:

- Complex settings.
- Developer-facing UI.
- Raw JSON editing as the primary workflow.
- Too many nested screens.

## Code standards

- Use TypeScript types for domain objects.
- Keep generation logic pure and tested.
- Keep storage isolated behind a small module.
- Keep UI components small.
- Avoid unnecessary dependencies.
- Do not introduce a database unless required.
- Validate imported JSON before replacing current data.
- Never corrupt existing local data on failed import.

## Testing expectations

At minimum, test:

- Template generation.
- Optional slot cleanup.
- Placeholder replacement.
- Double-space normalization.
- Avoiding immediate repeat.
- Import validation if practical.

## Definition of done for V1

- App opens locally.
- Seed data loads.
- Snippets display grouped by category.
- Search works.
- Click copies text to clipboard.
- Toast appears after copy.
- Fixed item can be edited.
- New fixed item can be created.
- Item can be deleted with confirmation.
- Favorite can be toggled.
- Variable template can be regenerated.
- Local persistence works.
- JSON export works.
- JSON import works with validation.
- No external automation exists.
