# StudyMate AI

Application web pour aider les étudiants à organiser leurs études : devoirs, planning de révision, notes de cours et assistant d'étude.

**Stack :** React 18 · Vite 5 · TypeScript · Tailwind CSS 3 · Lucide · Recharts · React Router.
Les données sont stockées **localement dans le navigateur** (localStorage), aucun serveur n'est requis.

## Fonctionnalités

| Module | Contenu |
| --- | --- |
| **Tableau de bord** | Accueil personnalisé, compteurs (en cours / terminés / en retard / sessions à venir), prochaines échéances, graphique de la semaine calculé uniquement à partir de vos données, bouton « Nouveau devoir ». |
| **Devoirs** | Ajouter / modifier / supprimer (avec annulation), titre, matière, description, priorité, date limite, marquer comme terminé, filtres par matière / statut / priorité, recherche, section « En retard ». |
| **Planning** | Sessions de révision par jour et par matière, répétition hebdomadaire, vue semaine navigable, prochaines sessions, marquer comme terminée. |
| **Notes** | Créer / modifier / supprimer, recherche plein texte, regroupement et filtre par matière, copie dans le presse-papiers. |
| **Assistant IA** | Interface de discussion + boutons Résumé / Fiche de révision / Quiz. **Mode démonstration** clairement signalé tant qu'aucune IA n'est configurée (voir plus bas). |
| **Paramètres** | Nom de l'étudiant, e-mail (local), thème sombre/clair, rappels d'échéances, notifications du navigateur, export / import / effacement des données. |

## Lancer le projet

Prérequis : **Node.js 18+** (testé avec Node 22).

```bash
npm install        # installe les dépendances
npm run dev        # serveur de développement → http://localhost:5173
npm run build      # vérification TypeScript + build de production dans dist/
npm run preview    # sert le build de production → http://localhost:4173
npm run typecheck  # vérification TypeScript seule
```

Pour tester sur votre téléphone Android sur le même réseau Wi‑Fi : `npm run dev -- --host`, puis ouvrez l'adresse « Network » affichée.

## Tester

Parcours conseillé :

1. **Tableau de bord** vide → cliquez « Nouveau devoir », validez sans remplir : les erreurs s'affichent.
2. Ajoutez 2–3 devoirs dont un avec une date passée → il apparaît « En retard » (bandeau + section).
3. **Devoirs** : modifiez, cochez « terminé », testez les filtres, supprimez puis cliquez « Annuler » dans la notification.
4. **Planning** : créez une session répétée sur 4 semaines, naviguez de semaine en semaine, cochez une session.
5. **Notes** : créez des notes dans plusieurs matières, recherchez un mot, copiez une note.
6. **Assistant** : choisissez une note comme source et cliquez « Générer : résumé / fiche / quiz ».
7. **Paramètres** : saisissez votre prénom, changez de thème, exportez une sauvegarde.
8. Retour au **tableau de bord** : prénom, compteurs et graphique sont à jour ; rechargez la page, tout est conservé.

Navigation au clavier : `Tab` / `Maj+Tab`, `Entrée` pour valider, `Échap` pour fermer une fenêtre ; un lien « Aller au contenu » apparaît au premier `Tab`.

## Publier en ligne

Le site est statique : il suffit d'héberger le dossier `dist/`.

- **Vercel** : importez le dépôt GitHub sur vercel.com → framework « Vite » détecté automatiquement (build `npm run build`, dossier `dist`). Le fichier `vercel.json` gère les liens directs (ex. `/notes`).
- **Netlify** : « Add new site → Import from Git », build `npm run build`, dossier `dist`. Le fichier `public/_redirects` gère les liens directs.
- **GitHub Pages** : possible, mais il faut ajouter `base: '/nom-du-depot/'` dans `vite.config.ts` et une redirection 404 pour les routes ; Vercel ou Netlify sont plus simples.

## Assistant IA : ce qui manque pour une vraie IA

Par défaut, **aucune IA n'est connectée** : l'application l'indique clairement et n'envoie aucune donnée à l'extérieur.
- Le chat répond qu'il est en mode démonstration (il ne fait pas semblant de comprendre).
- Résumé / fiche / quiz sont produits **localement par des règles simples** (fréquence des mots, découpage en phrases), et chaque résultat le mentionne.

Pour brancher une vraie IA, il faut **un petit backend** (ex. fonction serverless Vercel/Netlify) qui détient la clé API du fournisseur — la clé ne doit **jamais** être placée dans le code front-end. Ensuite :

1. Implémentez dans ce backend :
   - `POST /chat` — corps `{ "messages": [{ "role": "user" | "assistant", "content": "..." }] }` → réponse `{ "reply": "..." }`
   - `POST /generate` — corps `{ "task": "summary" | "flashcards" | "quiz", "text": "..." }` → réponse `{ "reply": "..." }` (Markdown simple accepté)
2. Copiez `.env.example` en `.env` et renseignez `VITE_AI_API_URL=https://votre-backend.example.com/api/ai`.
3. Relancez `npm run dev` (ou redéployez). Le bandeau « Mode démonstration » disparaît.

Le code concerné : `src/lib/ai/` (`types.ts` définit l'interface `AIProvider`, `httpProvider.ts` le client HTTP, `demoProvider.ts` le mode démo).

## Architecture

```
src/
  types/            Modèles (Assignment, StudySession, Note, Preferences…)
  lib/storage.ts    Interface Repository<T> + implémentation localStorage
  lib/ai/           Interface AIProvider, fournisseur démo, fournisseur HTTP
  lib/              Dates, presse-papiers, couleurs de matières, rappels
  context/          StoreContext (données + actions), ToastContext (notifications)
  components/ui/    Composants réutilisables (Button, Modal, champs, Badge, EmptyState…)
  components/…      Composants métier (formulaires et éléments de liste)
  pages/            Une page par module
```

**Ajouter une base de données plus tard :** toutes les lectures/écritures passent par `Repository<T>` (`src/lib/storage.ts`) et par les actions de `StoreContext`. Il suffit de remplacer l'implémentation (ex. Supabase, Firebase ou votre API REST) et, pour un stockage asynchrone, de charger les données au démarrage puis d'appeler l'API dans les actions `add…` / `update…` / `delete…`.

## Limites actuelles

- Pas de compte en ligne ni de synchronisation entre appareils (données liées au navigateur ; utilisez Export/Import).
- Les notifications du navigateur sont affichées à l'ouverture de l'application uniquement ; des rappels en arrière-plan nécessiteraient un service worker et un serveur de notifications push.
