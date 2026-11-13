---
name: histoire-blocs-3d
description: Produit une vidéo verticale « histoire d'horreur narrée dans un monde 3D en blocs » (style jeu de construction type Roblox/Minecraft) — narration à la première personne, monstre géant avec une règle, escalade, cliffhanger, sous-titres jaunes mot par mot — rendue de A à Z en three.js avec voix ElevenLabs, bande-son synthétisée et export MP4 1080×1920. Utilise ce skill dès que l'utilisateur veut reproduire, imiter ou créer une vidéo de ce genre (« histoire de monstre en 3D », « vidéo style Roblox horreur », « short narré avec des persos en blocs », « fais une vidéo comme ça » avec une vidéo de ce type en pièce jointe), même s'il ne parle pas de skill ni de three.js.
---

# Histoire narrée en monde de blocs 3D

Résultat : un MP4 vertical 1080×1920, 30 i/s, de 60 à 130 s.
- Image : ville 3D en blocs, personnages à visages expressifs, monstre géant, coupes toutes les ~2 s.
- Son : voix off anglaise à la première personne, sous-titres jaunes un mot à la fois, musique et bruitages synthétisés (aucun problème de droits).

Réponds en français, ton détendu. La narration de la vidéo est en anglais par défaut (comme le format d'origine), sauf demande contraire.

Le format est décrit avec des chiffres dans `references/format-reference.md` : rythme, structure en 11 temps, style des sous-titres. Lis-le avant d'écrire une histoire.

## Règle d'originalité (non négociable)
On reproduit le **format**, jamais le contenu d'une vidéo existante. L'histoire, les personnages, le monstre et le texte sont toujours les nôtres.
- Pas de monstre connu (Siren Head, Cartoon Cat, SCP…), pas de logo ni de nom de jeu (« Roblox », « Minecraft ») à l'écran.
- Pas d'avatar copié.
- On peut garder la *mécanique* d'une référence (une règle, un dispositif, une nuit où tout lâche) avec une idée neuve. Exemple : l'épisode modèle remplace « le monstre ne bouge que dans le noir » par « il ne bouge que si la musique s'arrête ».

## Dossiers
```
engine/kit.js          briques 3D : personnages, visages, ville, tours, monstre, police, pluie, explosions, caméras, sous-titres
engine/main.js         boucle de rendu (page Chromium) ; engine/index.html
engine/render.mjs      rendu : images de contrôle, repères son, vidéo multi-workers
audio/soundtrack.py    musique diégétique + 13 bruitages synthétisés + side-chain sous la voix
tools/analyse_video.sh décortiquer une vidéo de référence (coupes, planche, transcription)
tools/new_episode.sh   créer un dossier d'épisode (dépendances + fichiers modèles)
tools/fake_words.py    timings provisoires (avant d'avoir la voix)
tools/align.py         voix + texte -> words.json (hors ligne, pocketsphinx)
tools/check_cues.py    vérifie que chaque repère / début de plan tombe sur le bon mot
tools/make_video.sh    chaîne complète voix -> final.mp4
tools/qa.py            contrôle final (noir, figé, loudness, planche)
episodes/musique/      épisode modèle complet : script.txt, story.js, sfx.json
```

## Déroulé

### 1. Si l'utilisateur envoie une vidéo de référence
Lance `tools/analyse_video.sh ref.mp4 <scratchpad>/ref`. Regarde `planche.jpg` avec Read, puis lis `cuts.txt` et `transcription.txt`. Résume à l'utilisateur en 5 lignes :
- format ;
- rythme (plan moyen, mots/s) ;
- structure ;
- style des sous-titres ;
- ce que tu vas garder et changer pour rester original.

Pas besoin de demander la permission pour continuer.

### 2. Histoire + script (`script.txt`)
- Une idée = **un monstre + une règle simple et visuelle + un dispositif chiffré qui la fait respecter**. Ensuite, suis les 11 temps de `references/format-reference.md`.
- Longueur : 3 mots/s, soit ~290 mots pour 95 s.
- Écris les nombres et les heures comme ils se prononcent (« three oh seven A.M. »).
- Balises de ton ElevenLabs v4 avec parcimonie : `[excited]`, `[shouting]`, `[whispering]`.
- Montre le script à l'utilisateur seulement s'il a donné un sujet précis à respecter. Sinon, enchaîne.

### 3. Voix
- ElevenLabs : `creative_list_voices`, puis `creative_generate_speech`.
  - Modèle `eleven_v4`, `generations_count: 1`.
  - Voix jeune et naturelle pour un narrateur ado. Exemple : « Joel - Smooth & Natural », `G7bJ0cnNDezf2z9EA3FB`.
- Récupère le MP3 avec `creative_get_flow_run_status` (`content_url`) et `curl`, puis enregistre-le en `voice.mp3` dans le dossier épisode.
- **Réseau** : `elevenlabsusercontent.com` est bloqué dans l'environnement par défaut. Si le `curl` répond 403 :
  - soit l'utilisateur bascule sur un environnement qui autorise ce domaine ;
  - soit tu lui demandes de télécharger le MP3 depuis le lien ElevenLabs et de le joindre au chat.

  Ne bloque pas en attendant : construis l'épisode avec `tools/fake_words.py script.txt <durée> words.json` et recale ensuite.
- Pas d'ElevenLabs du tout : l'utilisateur peut enregistrer sa voix. `align.py` marche avec n'importe quel enregistrement anglais du script.

### 4. Épisode (`story.js` + `sfx.json`)
Crée le dossier avec `tools/new_episode.sh <scratchpad>/ep_<nom>`. Il copie le modèle `episodes/musique`, que tu adaptes.

`story.js` exporte `async ({kit, THREE, scene, camera, at}) => ({duration, shots, update, late, kick, bigWords, cues, musicLevel})` :
- `at('mot', n)` : début de la n-ième occurrence du mot dans `words.json`. **Tout le timing passe par là**, donc changer de voix recale automatiquement l'image et le son.
  - Compte bien les occurrences (« one » apparaît aussi dans « each one »).
  - Vérifie toujours avec `render.mjs --cues cues.json` puis `check_cues.py cues.json words.json`.
- `update(t)` : l'état du monde ne dépend que de `t` (déterministe, rendu parallèle possible).
- `shots` : `[{t, cam(u, t) -> {pos, look, fov}}]`, avec un plan toutes les ~2 s. Aides du kit :
  - `glide` (travelling) ;
  - `push` (poussée lente : aucun plan n'est figé) ;
  - `orbit` ;
  - `follow(obj)` et `wpos(obj)`, qui visent la vraie position d'un objet animé. Le monde est mis à jour avant la caméra.
- `cues` + `musicLevel(t)` : exportés vers la bande-son (`render.mjs --cues`). La musique du film est *diégétique* : elle baisse, devient grêle (petites enceintes) ou se coupe selon l'histoire.
- `sfx.json` : événements sonores sur des repères nommés, par ex. `{"t":"explode","type":"boom","gain":2}`.
  - Types : boom, crackle, powerdown, siren, thunder, rain, sparks, blip, creak, growl, stinger, whoosh, crowd, drone.
  - `"lerp":["autreRepère",0.5]` place un son entre deux repères.

### 5. Images de contrôle (avant tout rendu long)
```
node engine/render.mjs --ep <ep> --stills 2,10,24.5,… --stillsDir <ep>/stills
ffmpeg -pattern_type glob -i '<ep>/stills/t*.jpg' -vf "scale=300:-1,tile=8x3" planche.jpg
```
Regarde la planche et corrige, puis recommence. Comptez 2-3 tours pour qu'une trentaine de plans soient lisibles.

### 6. Rendu final
Une fois `voice.mp3` présent, lance `tools/make_video.sh <ep>`. Il enchaîne :
1. alignement ;
2. repères ;
3. bande-son ;
4. rendu 720×1280 ;
5. agrandissement 1080×1920 + niveau -14 LUFS ;
6. contrôle qualité.

Temps : environ 1 image/s/worker en 720p avec SwiftShader (pas de GPU). Pour ~100 s, compte 30-45 min avec 2 workers. Lance-le en arrière-plan et suis la progression.

Ensuite :
- regarde `final_qa/planche.jpg` ;
- envoie `final.mp4` avec SendUserFile ;
- donne le lien ElevenLabs de la voix ;
- propose une partie 2, puisque le cliffhanger est fait pour ça.

## Le look (réglé d'après les retours de l'utilisateur)
Une 3D « plate » est rejetée. Le look attendu est celui d'une capture de jeu de blocs moderne. Ces réglages sont déjà dans le kit, ne les dégrade pas :
- **Halo (bloom)** sur toutes les sources de lumière : `UnrealBloomPass(0.5, 0.45, 0.92)` dans `main.js`, puis étalonnage (saturation 1,12, noirs légèrement relevés, vignettage).
  - Trop fort, ça voile tout en blanc. Si une image est laiteuse, regarde d'abord les faisceaux (`lightCone`, opacité ≤ 0,07) et la taille des halos (`glow`).
- **Personnages** : blocs aux arêtes arrondies (`rbox`, `RoundedBoxGeometry`), tête plus arrondie que le corps.
  - Vêtements dessinés : `uniform: true` (col, boutons, poches, badge, ceinture), `hoodie: '<couleur des bandes>'` (fermeture, cordons, poche), `walkie`, `hood`.
  - Yeux noirs avec reflet blanc, sourcils épais.
- **Ville** : 4 anneaux d'immeubles jusqu'à 200 m, feux rouges clignotants sur les toits, corniches, auvents et vitrines éclairées autour de la place.
- **Pluie** : longues gouttes (0,95 m) et sol mouillé (`town.setWet(k, renderer, scene)` : reflets de la ville capturés une fois, sol lisse et brillant).
- Les projecteurs des tours sont à 450 (au-delà, le monstre est « cramé » en blanc). Le faisceau s'efface quand la caméra est dedans.
- Évite les vues aériennes pour montrer un objet précis (voiture, personne) : en 9:16 il disparaît. Préfère un plan bas qui suit l'objet.

## Leçons apprises (à respecter)
- **En 9:16, le champ horizontal est minuscule.** À fov 42 vertical, l'horizontal ne fait que ~24°. Cadre toujours le sujet au centre ; un sujet décalé de 15° sort du cadre. Pour un sujet qui bouge, utilise `follow` ou une caméra calculée à partir de sa position.
- **Objets tenus en main en gros plan** (horloge, radio, batterie) : ne les attache pas à la main. Pose une copie dans le monde, devant le personnage et face caméra (inserts `PHONE`, `RADIO`, `BATT` de l'épisode modèle). La référence triche pareil.
- La lune éclaire le dos des personnages qui regardent le monstre. La lumière d'appoint attachée à la caméra (dans `main.js`) garde les visages lisibles : ne la retire pas.
- Une caméra qui part de l'extérieur de la place finit souvent dans un immeuble (anneau d'immeubles à 37 m du centre). Pareil pour les poteaux de barrière (rayon 9 m) en contre-plongée : vérifie sur la planche.
- Les voitures qui arrivent de loin ne sont pas encore dans le plan au moment du mot : fais-les partir à ±45 m, avec ~0,6 s d'avance sur le mot.
- Les sous-titres de `main.js` retirent la ponctuation finale. `bigWords` grossit 3 à 5 mots-clés, pas plus.
- La « seconde de silence » de l'histoire doit être un vrai silence dans la musique (`musicLevel` = 0). Garde la pluie ou l'ambiance pour que ça ne sonne pas comme une coupure.
- `soundtrack.py` ne peut pas être écouté ici. Vérifie les niveaux par seconde de chaque piste (`--stems`) et assure-toi que la musique est à -180 dB pendant le silence.

## Variantes faciles
- Autre règle : lumière, bruit, regard, chaleur, pluie… Garde les tours du dispositif, change l'équipement (projecteurs au lieu d'enceintes : `speakerTower` a déjà un projecteur et un cône de lumière).
- Autre décor : `city()` fait la place et les immeubles. Ajoute des blocs avec `THREE.BoxGeometry` pour une école, une forêt (arbres du kit) ou un parking.
- Narration française : écris `script.txt` en français et choisis une voix FR. `align.py` est anglais seulement : utilise `fake_words.py`, puis recale à la main les 10-15 repères clés en écoutant les temps donnés par une transcription ElevenLabs (`creative_transcribe_audio`).
