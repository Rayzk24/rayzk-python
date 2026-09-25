# Activer GitHub Actions (facultatif)

Tous les contrôles de la V1 ont été exécutés localement. Le modèle `docs/github-actions.yml` permet de les répéter automatiquement sur GitHub (lint, types, tests, build, Chromium).

L’authentification CLI disponible lors de la publication autorisait le dépôt mais pas l’écriture de workflows. Pour activer la CI sans transmettre de token :

1. Ouvrir le dépôt sur GitHub.
2. Cliquer **Add file > Create new file**.
3. Saisir `.github/workflows/ci.yml` comme nom de fichier.
4. Copier le contenu de `docs/github-actions.yml` dans l’éditeur, puis **Commit changes**.
5. Aller dans **Actions** et vérifier le workflow **Quality**.

Les variables du modèle sont volontairement fictives : les tests interceptent le transport Supabase. Aucun secret du compte réel n’est nécessaire pour la CI.
