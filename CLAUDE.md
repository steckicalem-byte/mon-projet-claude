# PronoFoot — consignes pour Claude

Application React/Vite/TypeScript de pronostics de football (voir `README.md`). Vérifications avant chaque commit : `npm run typecheck` et `npm test`.

## Code qui appelle Claude : skill `claude-api` obligatoire

L'API Claude évolue plus vite que les données d'entraînement du modèle : un appel « de mémoire » compile souvent, puis échoue en production (400) ou se dégrade sans erreur. Avant de modifier `server/analysis.ts`, `api/analyse.ts` ou tout autre code qui utilise `@anthropic-ai/sdk`, **chargez le skill `claude-api`** et suivez sa documentation TypeScript plutôt que vos souvenirs.

- Le skill est livré avec Claude Code (`/claude-api`). `.claude/settings.json` l'active aussi depuis le dépôt open source [`anthropics/skills`](https://github.com/anthropics/skills) (plugin `claude-api@anthropic-agent-skills`) ; à la main : `/plugin marketplace add anthropics/skills` puis `/plugin install claude-api@anthropic-agent-skills`.
- Il couvre huit langages (Python, TypeScript, Java, Go, Ruby, C#, PHP, cURL) ; ici seul le dossier `typescript/` compte.
- Sous-commandes utiles : `/claude-api migrate` (changer de modèle), `/claude-api prompt-audit` (prompt système et descriptions d'outils), `/claude-api cost-optimize`.

### Choix actuels de `server/analysis.ts` (conformes au skill, ne pas « corriger » de mémoire)

| Réglage | Pourquoi |
| --- | --- |
| `model: 'claude-opus-5-5'`, sans suffixe de date | Identifiant exact du modèle par défaut. |
| `output_config: { effort: 'medium' }`, pas de `thinking` | Sur Opus 5.5 la réflexion ne peut pas être désactivée (`disabled` et `budget_tokens` → 400) ; l'effort est le seul réglage et vaut `medium` par défaut, on l'écrit explicitement. |
| `tool_choice: { type: 'auto' }` + `strict: true` sur `submit_prediction` | `tool_choice` `any` / `tool` renvoie une 400 sur Opus 5.5 ; le prompt système demande l'appel de l'outil. |
| `web_search_20260209` | Version actuelle de la recherche web (filtrage dynamique) ; `web_search_20250305` est l'ancienne. Ne pas ajouter `code_execution` à côté. |
| `betas: ['server-side-fallback-2026-07-01']` + `fallbacks: 'default'` | Repli côté serveur en cas de refus ; ce couple d'en-tête et de forme est indissociable (l'en-tête `-2026-06-01` va avec la forme tableau). |
| Boucle sur `stop_reason === 'pause_turn'`, contrôle de `refusal` | La recherche côté serveur peut s'interrompre ; un refus arrive en HTTP 200. |
| Erreurs via `Anthropic.AuthenticationError` / `RateLimitError` / `APIError` | Classes typées du SDK, pas de comparaison de messages. |

`server/gemini.ts` utilise Gemini : le skill `claude-api` ne s'applique pas à ce fichier, n'y introduisez pas le SDK Anthropic.
