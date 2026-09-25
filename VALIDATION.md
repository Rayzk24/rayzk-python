# Validation V1 — 25 septembre 2026

## Automatique, en local

- `npm run lint` : réussi, zéro avertissement.
- `npm run typecheck` : réussi, TypeScript strict.
- `npm test` : 19 tests réussis, 5 fichiers.
- `npm run build` : réussi. Éditeur chargé après connexion, Worker séparé ; runtime Python auto-hébergé, hors bundle initial.
- `npm run test:e2e` : 4 scénarios Chromium sur le build de production, headers CSP/COOP/COEP inclus.
- `npm audit --omit=dev` : aucune vulnérabilité signalée lors de la vérification.
- Vérification des fichiers publiables : aucune valeur issue du `.env.local` ni clé privée. `.env.local`, fichiers de test générés et runtime copié ignorés par Git.
- Le dépôt du dashboard est resté inchangé (`git status --porcelain` vide avant et après).

## Scénarios exécutés avec le vrai runtime Python

1. `print("hello")` et boucle `for i in range(5)`.
2. `input("Quel est ton nom ?")`, réponse `Élodie 🐍`, reprise de l’exécution.
3. Saisie vide puis deuxième `input()` dans le même programme.
4. REPL : `12 ** 2` → `144`, `len("Rayzk")` → `5`, partage d’une variable du programme.
5. REPL multiligne : définition d’une fonction, ligne vide pour valider, appel.
6. Vrai traceback de division par zéro, ligne fautive surlignée, lien cliquable.
7. Boucle infinie sans sortie arrêtée par Stop, puis nouvelle exécution.
8. Boucle infinie avec `print` arrêtée par Stop.
9. Reset puis vérification qu’une variable précédente n’existe plus.
10. Exécution par Ctrl/Cmd+Entrée.

## Données, interface et auth

- Autosave, sauvegardes séquentielles, debounce, copie locale immédiate, reconnexion, conflits et réponse réseau perdue après commit.
- Conservation des frappes pendant la récupération d’une version conflictuelle.
- Brouillon distinct de la bibliothèque ; création, ouverture, renommage et suppression confirmée.
- Import UTF-8 `.py`, confirmation de remplacement, refus de fichiers invalides ; téléchargement et vérification du contenu exporté.
- Persistance Auth cochée/décochée et nettoyage après déconnexion.
- Thèmes sombre/clair et mémorisation après rechargement.
- Largeurs 375, 390, 430 et 1440 px : absence de débordement de page et bascule mobile Éditeur/Console. Captures inspectées visuellement ; ce n’est pas un test sur iPhone physique.
- Migration SQL exécutée dans PostgreSQL local via PGlite : utilisateur A isolé de B, refus anonyme, interdiction de changer propriétaire/révision, incrément de révision, brouillon unique et contrôle de concurrence.

Les tests navigateur remplacent uniquement le transport Auth/REST Supabase par des réponses de test. Aucun faux compte, token de test ou bypass ne se trouve dans le code applicatif livré.

## Recette réelle / distante

- Connexion locale au **véritable projet Supabase partagé** : confirmée par l’utilisateur (arrivée dans l’éditeur).
- Migration distante et sauvegarde réelle après rechargement : en attente de confirmation utilisateur.
- Déploiement Cloudflare, domaine, DNS et recette sur HTTPS : actions manuelles, non exécutées pendant le développement.
- Safari/iOS physique : non testé.

Consulter `SUPABASE_SETUP.md`, puis `DEPLOYMENT.md`, dans cet ordre.
