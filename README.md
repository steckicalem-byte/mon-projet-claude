# PronoFoot

Application web de **pronostics de football** : pour chaque match à venir, elle calcule les probabilités 1/N/2, le nombre de buts, le score exact, et compare ces probabilités aux cotes de votre bookmaker pour repérer les « value bets ».

**Stack :** React 18 · Vite 5 · TypeScript · Tailwind CSS 3 · Recharts · React Router.
**Données :** API [football-data.org](https://www.football-data.org) (offre gratuite), via un petit relais serveur qui garde la clé secrète. Sans clé, l'application fonctionne en **mode démonstration** (équipes fictives, résultats simulés).

> ⚠️ Les pronostics sont des probabilités, pas des certitudes. Aucun modèle ne garantit de gain. Jouer comporte des risques : endettement, dépendance… Appelez le 09 74 75 13 13 (Joueurs Info Service, appel non surtaxé). Interdit aux mineurs.

## Fonctionnalités

| Page | Contenu |
| --- | --- |
| **Pronostics** | Matchs des deux prochaines semaines, groupés par jour : barre de probabilités 1/N/2, score le plus probable, +2,5 buts, « les deux équipes marquent », badge **Value** si une cote saisie est intéressante. Choix de la compétition (Ligue des champions, Ligue Europa*, Ligue 1, Premier League, LaLiga, Serie A, Bundesliga, Eredivisie, Primeira Liga, Championship, Brasileirão). |
| **Détail d'un match** | **Analyse par Claude Opus 5.5** (bouton) : Claude cherche sur le web blessures, compositions et forme récente, puis donne ses probabilités, un score, un résumé, les facteurs clés et ses sources, à côté du modèle statistique. Buts attendus, tous les marchés (1N2, double chance, plus/moins 1,5 / 2,5 / 3,5, BTTS) avec leur **cote juste**, grille de probabilité de chaque score, forme des 5 derniers matchs. **Comparateur de cotes** : marge du bookmaker, espérance de gain et mise conseillée (critère de Kelly fractionné). |
| **Équipes** | Classement de la saison, forme, forces offensive et défensive estimées, graphique attaque/défense. |
| **Performance** | Backtest honnête : chaque match passé est prédit **uniquement avec les matchs joués avant lui**. Taux de bon 1N2, score de Brier, log-loss, comparés à une référence naïve, courbe de calibration et 20 derniers pronostics. |
| **Paramètres** | Thème, championnat par défaut, bankroll, fraction de Kelly, seuil de value, état de la source de données, jeu responsable. |

Les cotes saisies et les préférences sont stockées dans le navigateur (localStorage).

## Le modèle

`src/lib/model/poisson.ts` — régression de Poisson de type **Dixon-Coles** :

- buts domicile ~ Poisson(exp(μ + avantage terrain + attaque domicile − défense extérieur)), et symétriquement pour l'extérieur ;
- correction de Dixon & Coles sur les petits scores (0-0, 1-0, 0-1, 1-1) ;
- estimation par maximum de vraisemblance sur **la saison en cours et la précédente**, les matchs anciens pesant moins (demi-vie de 180 jours) ;
- a priori qui ramène les équipes peu observées vers la moyenne, un peu en dessous pour les promus.

Le modèle ne connaît ni les blessures, ni les compositions, ni la motivation : croisez toujours avec l'actualité. La page **Performance** permet de vérifier s'il apporte réellement quelque chose sur le championnat choisi.

## Analyse IA (Claude Opus 5.5)

`server/analysis.ts`, exposé par `api/analyse.ts` (`GET /api/analyse?competition=CL&match=<id>`) :

- le serveur reconstruit lui-même le contexte (match, résultats récents, probabilités du modèle) depuis football-data.org : le navigateur n'envoie qu'un identifiant, l'endpoint ne peut pas servir à interroger Claude sur autre chose ;
- Claude (`claude-opus-5-5`, effort `medium`) utilise la recherche web (5 recherches max) puis rend son pronostic via un outil à schéma strict ;
- le repli automatique en cas de refus par les filtres de sécurité est activé (`fallbacks: "default"`) ;
- une analyse réussie est mise en cache 6 h sur le CDN de Vercel et dans le navigateur, pour ne pas la repayer.

Pour l'activer : créez une clé sur <https://console.anthropic.com> (facturation à l'usage, comptez quelques dizaines de centimes par analyse au plus), ajoutez-la dans Vercel sous `ANTHROPIC_API_KEY`, puis redéployez. Fixez une **limite de dépenses** dans la console Anthropic : sur un site public, n'importe quel visiteur peut lancer des analyses.

## Lancer le projet

Prérequis : **Node.js 18+**.

```bash
npm install
cp .env.example .env     # puis renseignez FOOTBALL_DATA_API_KEY (facultatif)
npm run dev              # → http://localhost:5173
npm run build            # vérification TypeScript + build de production dans dist/
npm run typecheck
```

### Brancher les vraies données

1. Créez une clé gratuite sur <https://www.football-data.org/client/register> (reçue par e-mail).
2. **En local** : mettez-la dans `.env` → `FOOTBALL_DATA_API_KEY=votre_cle`, puis relancez `npm run dev`.
3. **Sur Vercel** : *Project → Settings → Environment Variables* → `FOOTBALL_DATA_API_KEY`, puis redéployez.

Le badge passe de « Démo » à « Données réelles ». La clé n'est **jamais** envoyée au navigateur : celui-ci appelle `/api/football`, et le relais (`server/footballData.ts`, exposé par `api/football.ts` sur Vercel et par `vite.config.ts` en local) ajoute la clé et n'autorise que les championnats listés. L'offre gratuite est limitée à 10 requêtes/minute : les réponses sont mises en cache 10 min dans le navigateur et 5 min sur le CDN.

## Publier en ligne

**Vercel** (recommandé, car le relais API est une fonction serverless) : importez le dépôt GitHub sur vercel.com, framework « Vite » détecté automatiquement, ajoutez la variable `FOOTBALL_DATA_API_KEY`. Sur un hébergement purement statique (Netlify sans fonctions, GitHub Pages…), l'application reste en mode démonstration.

`npm run build:single` produit `dist-single/pronofoot.html`, un fichier unique toujours en mode démonstration (aperçu sans serveur).

## Architecture

```
api/football.ts        Fonction Vercel → relais football-data.org
server/footballData.ts Logique du relais (liste blanche, clé, cache)
src/
  lib/model/           poisson.ts (modèle), backtest.ts (évaluation), betting.ts (cotes, Kelly)
  lib/api.ts           Chargement + normalisation des matchs, cache, repli démo
  lib/demoData.ts      Saisons simulées (équipes fictives)
  context/             PrefsContext (préférences, cotes), DataContext (matchs + modèle)
  components/          UI réutilisable, cartes de match, mise en page
  pages/               Pronostics, Match, Équipes, Performance, Paramètres
```

## Limites

- **Ligue des champions** : le modèle n'apprend que sur les matchs de Ligue des champions (saison en cours et précédente), car ce sont les seuls où des clubs de championnats différents s'affrontent. Il dispose donc de moins de matchs par équipe qu'en championnat ; les scores après prolongation ou tirs au but sont ramenés au score du temps réglementaire.
- \*La **Ligue Europa** n'est pas dans l'offre gratuite de football-data.org : elle s'affiche avec un message explicatif tant que votre clé n'y donne pas accès. Les coupes nationales ne sont pas proposées.
- Pas de récupération automatique des cotes : il faut les saisir (les API de cotes sont payantes).
- En tout début de saison, ou si la saison précédente n'est pas accessible, les pronostics sont moins fiables.
