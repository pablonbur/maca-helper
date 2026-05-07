# Seed data and private data

`snippets.example.json` is safe demo data and can be committed to GitHub.

Do not commit real user snippets, links, account data, aliases, phrases, or exports.

Recommended private file:

```txt
seed/snippets.local.json
```

That file is ignored by Git. To create it:

1. Copy `seed/snippets.local.template.json`.
2. Rename the copy to `seed/snippets.local.json`.
3. Edit it with private snippets.
4. Open the app.
5. Use `Importar` and select `seed/snippets.local.json`.

After importing, the app stores the data locally in the user's browser/Tauri storage.

Exported backups should also stay private. Keep them outside the repo or inside `backups/`, which is ignored.
