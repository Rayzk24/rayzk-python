# Supabase — Rayzk Python

L’IDE utilise le **même projet Supabase et les mêmes comptes Auth que Rayzk Dashboard**. Le code de l’IDE, son dépôt et ses données métier sont indépendants. Aucune migration du dashboard n’est requise ni modifiée. Il n’y a pas d’inscription dans l’IDE.

## 1. Identifier le bon projet

1. Ouvre [Supabase](https://supabase.com/dashboard), puis le projet utilisé par ton dashboard.
2. Dans **Project Settings > Data API**, compare le **Project URL** avec la valeur de `VITE_SUPABASE_URL` dans le `.env.local` du dashboard. Ne colle pas cette valeur dans un ticket public.
3. Dans **Authentication > Users**, vérifie que ton compte habituel est présent. Tu gardes cet email et ce mot de passe ; aucun compte supplémentaire n’est nécessaire.

## 2. Appliquer l’unique migration de l’IDE

**Cette étape est manuelle. Le développement n’applique aucune modification distante.**

1. Ouvre **SQL Editor > New query** dans ce même projet.
2. Ouvre localement `supabase/migrations/202609250001_python_documents.sql` dans ce dépôt.
3. Copie **tout** son contenu dans la requête SQL, puis clique **Run**.
4. Vérifie le résultat sans erreur. La migration est transactionnelle : un échec annule ses changements. Elle doit être exécutée une seule fois. Si `python_documents` existe déjà, vérifie son schéma au lieu de supprimer la table ou de réexécuter aveuglément.
5. Dans **Table Editor**, vérifie que la nouvelle table `python_documents` existe et que **RLS enabled** est indiqué.
6. Dans **SQL Editor > New query**, exécute ensuite `supabase/verify.sql` :
   - `rowsecurity` doit être `true` ;
   - quatre politiques `python_select_own`, `python_insert_own`, `python_update_own`, `python_delete_own` doivent apparaître ;
   - elles ciblent `authenticated` et comparent `auth.uid()` à `user_id` ;
   - aucun droit de table ni de colonne pour `anon` ;
   - `authenticated` peut lire/supprimer et insérer les colonnes métier ; la mise à jour est limitée à `name` et `content` ;
   - l’index unique `python_one_draft_per_user` existe.

La table contient le brouillon (`kind = draft`, un seul par compte) et les codes de bibliothèque (`kind = saved`). Les révisions et dates sont produites par PostgreSQL. La sauvegarde met à jour uniquement la révision qu’elle a lue : une autre version entraîne un conflit explicite, jamais un écrasement automatique. RLS s’applique aussi aux appels REST directs.

Les utilisateurs existants du projet peuvent chacun utiliser un espace privé. Pour un usage strictement personnel, conserve uniquement les comptes souhaités. Ne change pas les politiques des tables du dashboard.

## 3. Vérifier Auth sans casser le dashboard

1. Dans **Authentication > Sign In / Providers > Email**, laisse Email activé.
2. Dans **Authentication > Settings / User Signups**, vérifie que **Allow new users to sign up** est désactivé si le compte personnel existe déjà et qu’aucun autre usage du projet ne nécessite d’inscription. L’IDE n’utilise pas `signUp`. Cette option est globale au projet partagé : ne change pas une politique voulue par un autre usage.
3. Dans **Authentication > URL Configuration**, **conserve le Site URL actuel du dashboard**. Il ne faut pas le remplacer par l’IDE.
4. Dans **Redirect URLs > Add URL**, ajoute, sans supprimer les URLs existantes :

```text
http://localhost:5173/
http://127.0.0.1:5173/
http://localhost:4173/
http://127.0.0.1:4173/
https://python.rayzk.fr/
```

5. Après création de Pages, ajoute aussi l’URL exacte de production `https://rayzk-python.pages.dev/` si Cloudflare a attribué ce nom, sinon l’URL effectivement affichée. N’autorise pas globalement tous les sites `*.pages.dev`.
6. Clique **Save** et vérifie que les URLs du dashboard sont toujours présentes.

La connexion email/mot de passe de cette V1 est directe (`signInWithPassword`) et ne dépend pas d’une redirection. Ces URLs préparent les flux Auth futurs sans modifier les liens de récupération actuels du dashboard. L’IDE ne fournit pas de flux de réinitialisation de mot de passe : utilise le flux existant du compte.

## 4. Variables locales

Le `.env.local` a été préparé localement à partir des deux variables publiques du dashboard. Il est ignoré par Git. Sur une nouvelle machine :

```powershell
Copy-Item .env.example .env.local
```

Puis renseigne dans `.env.local` :

- `VITE_SUPABASE_URL` : **Project Settings > Data API > Project URL**.
- `VITE_SUPABASE_ANON_KEY` : **Project Settings > API Keys > Legacy anon, service_role API keys > anon public**, ou la clé publique **Publishable key** du même projet. Le nom de variable reste identique.

Ne mets **jamais** de clé `service_role`, `sb_secret_*`, JWT secret, mot de passe ou token GitHub ici. Les variables `VITE_` font partie du JavaScript servi au navigateur : seules les clés publiques y ont leur place. Leur protection est assurée par Auth et RLS, pas par la confidentialité du bundle.

Redémarre `npm run dev` après toute modification du fichier.

## 5. Validation réelle avant déploiement

1. Lance `npm run dev`, puis ouvre `http://127.0.0.1:5173/`.
2. Connecte-toi avec le compte du dashboard. L’éditeur doit s’ouvrir directement.
3. Écris un commentaire reconnaissable dans le brouillon, attends **Sauvegardé**, actualise : il doit revenir.
4. Dans **Table Editor > python_documents**, vérifie `user_id`, `kind = draft`, `content`, `revision` et `updated_at`. Le SQL Editor et Table Editor administrateur contournent RLS : ce n’est pas un test d’isolation entre utilisateurs.
5. Enregistre un code nommé « Test V1 », ouvre la bibliothèque, renomme-le puis supprime-le après confirmation.
6. Coupe temporairement le réseau dans les outils de développement du navigateur après chargement. Modifie ton brouillon : **Hors ligne · sauvegardé localement**. Rétablis le réseau et attends **Sauvegardé**.
7. Sur un deuxième navigateur/appareil connecté, vérifie que le brouillon est récupéré. Si deux appareils modifient la même révision, teste le bandeau de conflit. « Ouvrir la version distante » conserve aussi le code local en bibliothèque.
8. Déconnecte-toi via **Compte > Déconnexion**. Les sauvegardes locales de ce compte sont effacées. Si du code n’est pas synchronisé, une confirmation permet d’abord de le télécharger.
9. Teste la case **Rester connecté** : cochée = stockage persistant ; décochée = `sessionStorage`, limité à la session de l’onglet. Certains navigateurs restaurent les sessions d’onglets au redémarrage : sur un PC partagé, utilise toujours **Déconnexion** avant de partir.

Les tests automatisés utilisent un faux transport Supabase pour l’UI, et un PostgreSQL local pour RLS. Ils ne remplacent pas ces vérifications avec le projet distant.

## Dépannage

- « Erreur de synchronisation » dès l’ouverture : vérifier que la migration est appliquée sur le **même** projet que `.env.local` et que les droits de colonnes sont présents.
- Connexion refusée : vérifier email/mot de passe, confirmation d’email et état du compte dans Authentication > Users.
- Le code est local mais pas distant : ne vide pas les données du navigateur ; télécharge d’abord le `.py`, puis utilise **Réessayer** après correction.
- Stockage local plein/indisponible : un message l’indique ; télécharge le code avant de fermer.

Références officielles : [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [URLs Auth](https://supabase.com/docs/guides/auth/redirect-urls).
