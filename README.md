# R. Python

Un espace Python personnel pour la NSI, les petits essais et les codes à conserver. Connexion directe à l’éditeur, brouillon synchronisé, bibliothèque volontairement simple.

## Local

Node 22.12+ (Node 22 LTS recommandé).

```powershell
npm ci
# Sur une nouvelle machine uniquement : copier .env.example vers .env.local,
# puis remplir les deux variables publiques Supabase.
npm run dev
```

Ouvrir `http://127.0.0.1:5173/`. Le compte Auth est celui du dashboard. Aucun contournement Auth ni mode démo ne se trouve dans le code de production.

**Avant d’utiliser la synchronisation distante :** suivre [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Pour publier : [DEPLOYMENT.md](DEPLOYMENT.md).

## Fonctionnalités

- CodeMirror 6 : thème Python clair/sombre, lignes, indentation 4 espaces, Tab, parenthèses automatiques, recherche/remplacement, historique, Ctrl/Cmd+Entrée.
- Pyodide chargé après connexion, exécuté dans un Web Worker. Console stdout/stderr, vrais tracebacks cliquables, `input()` intégré, REPL avec suites multilignes (`...`, ligne vide pour terminer) et historique flèches haut/bas.
- Stop termine le Worker même dans une boucle infinie. Stop et Reset recréent un environnement vide.
- Brouillon principal, autosave 650 ms, copie locale immédiate, reprise réseau et conflits explicites entre appareils.
- Bibliothèque privée : enregistrer une copie, ouvrir, renommer, supprimer avec confirmation. Les codes ouverts sont autosauvés.
- Import `.py` UTF-8 (confirmation de remplacement) et export du contenu actuel.
- Éditeur/console redimensionnables au clavier ou à la souris ; bascule mobile ; safe areas ; thèmes mémorisés.
- Sessions persistantes optionnelles et déconnexion locale (sans déconnecter le dashboard).

## Organisation

```text
src/app/                  orchestration, layout et thème
src/components/           dialogue accessible natif
src/features/auth/        client Supabase, stockage de session, connexion
src/features/documents/   modèle, repository, files de sauvegarde, bibliothèque, import/export
src/features/editor/      CodeMirror et thème syntaxique
src/features/runtime/     Worker Python, protocole typé, contrôleur, console
supabase/                 migration additive et vérifications SQL
tests/e2e/                tests Chromium, runtime réel, transport Supabase simulé
```

Un futur panneau d’énoncé pourra rejoindre le layout `Workspace` sans modifier le runtime, le stockage ou l’éditeur. Aucun module d’exercices, projet multifichier ou système de plugins.

## Sauvegarde et confidentialité

Un utilisateur ne voit que ses lignes grâce à RLS, y compris via REST. Les changements utilisent une comparaison de révision côté serveur, avec une seule requête en vol par document. Les copies locales sont indexées par utilisateur. À l’ouverture, l’app revient au brouillon. La bibliothèque reste distincte.

Le navigateur conserve une copie locale pour résister à une coupure ; elle n’est pas chiffrée. **Déconnexion** efface les copies locales de ce compte et avertit si des changements ne sont pas synchronisés. Sur un PC partagé, décocher « Rester connecté » et se déconnecter avant de partir. Les navigateurs peuvent restaurer une session d’onglet après redémarrage.

En cas de conflit, ouvrir la version distante crée aussi une copie du contenu local dans la bibliothèque. Choisir explicitement la version locale remplace la version distante connue, sous contrôle de révision. Une suppression distante d’un code modifié localement provoque également un conflit.

## Vérifications

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` regroupe les quatre premières commandes. Playwright démarre le **build de production** sur le port 4173 avec les headers de production. Tests unitaires : autosave, reconnexion, conflits, documents, stockage Auth, protocole Worker, import/export. La migration RLS est exécutée dans PostgreSQL via PGlite, en test uniquement. Tests navigateur : **vrai Pyodide**, saisie Unicode, REPL, Stop, traceback, UI et largeur responsive. Les appels Auth/REST sont simulés uniquement dans les tests ; la recette réelle Supabase reste nécessaire après migration.

CI GitHub Actions facultative : voir [docs/CI.md](docs/CI.md). Le modèle est prêt, mais son activation nécessite le droit GitHub d’écriture des workflows.

## Limites utiles en NSI

- Python **3.14** via Pyodide, dans le navigateur. Quelques différences avec la version installée au lycée sont possibles.
- Bibliothèque standard courante (`math`, `random`, `statistics`, collections, récursivité, fichiers virtuels) ; ni terminal système, ni accès direct aux fichiers du PC, ni `tkinter`/GUI/turtle complexe.
- Les fichiers créés en Python restent dans la mémoire du Worker et disparaissent au Reset, Stop ou rechargement. Seul le texte des documents est sauvegardé.
- Les imports de paquets externes ne sont pas installés automatiquement. Pas de `pip` arbitraire ; la CSP et l’auto-hébergement limitent volontairement les ressources à cette V1.
- Premier chargement d’environ 13 Mo de ressources brutes (plus petit selon compression réseau), puis cache navigateur. L’app déjà ouverte reste utilisable après une coupure ; pas de garantie de démarrage entièrement hors ligne, pas de service worker.
- Stop et Reset effacent toutes les variables. Les exécutions normales et le REPL partagent leur espace de variables.
- Code : 1 Mio maximum synchronisable par document ; saisie `input()` : 64 Kio UTF-8 ; sortie limitée à 1 Mio par exécution et historique console borné pour préserver l’interface.
- Les programmes sont du code personnel : un Worker garde l’interface réactive mais n’est pas une sandbox de sécurité pour du code hostile. Ne pas exécuter un script inconnu sans le lire.
- Desktop prioritaire. Les tests automatiques mobiles portent sur les dimensions Chromium ; Safari/iOS réel reste à vérifier sur appareil.

Logo Rayzk copié depuis le projet de référence, puis adapté localement. Aucun fichier du dashboard n’est utilisé à l’exécution.
