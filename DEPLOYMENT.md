# Déployer Rayzk Python sur Cloudflare Pages

## Ordre à suivre

1. Appliquer la migration et vérifier Supabase selon `SUPABASE_SETUP.md`.
2. Vérifier la connexion et l’autosave réelles en local.
3. Vérifier le dépôt GitHub public `Rayzk24/rayzk-python` et sa branche `main`.
4. Créer le projet **Pages**, renseigner les variables et lancer le build.
5. Associer `python.rayzk.fr` dans Pages, puis valider le DNS.
6. Compléter les URLs Supabase Auth, tester le site final.

## 1. État actuel et installation locale facultative

Le dépôt public [Rayzk24/rayzk-python](https://github.com/Rayzk24/rayzk-python) et sa branche `main` existent déjà. Le commit initial a passé lint, typecheck, tests unitaires, tests navigateur et build. Tu n'as pas besoin de refaire `npm ci` sur ton PC pour configurer Cloudflare Pages : Pages installe lui-même les dépendances depuis `package-lock.json`.

Si `npm ci` affiche `EPERM ... rolldown-binding.win32-x64-msvc.node` sous Windows, ferme le terminal `npm run dev` ou `vite` utilisant le projet, puis relance `npm ci` dans un nouveau terminal. Le fichier natif était verrouillé par le processus en cours. Cette erreur ne touche pas les sources Git ni la base Supabase. Après fermeture du serveur local, `npm ci` a été relancé avec succès sur ce projet.

Pour une vérification locale *facultative*, dans PowerShell :

Dans PowerShell :

```powershell
Set-Location C:\Users\95ray\Desktop\code\rayzk-python
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

Node **22 LTS** (minimum 22.12), `.nvmrc` = `22`. `npm ci` installe les versions verrouillées et copie automatiquement le runtime Pyodide dans `public/pyodide`. Ne désactive pas les scripts d’installation. Ne commite ni `.env.local`, ni `dist`, ni les assets générés du runtime.

## 2. GitHub

Le dépôt [Rayzk24/rayzk-python](https://github.com/Rayzk24/rayzk-python) est déjà public et indépendant du dashboard. Dans GitHub, vérifie que `main` contient `package-lock.json`, `public/_headers`, cette documentation et la migration, mais aucun `.env.local`. Tu n'as pas de dépôt GitHub à créer et aucun push à faire pour le premier déploiement.

## 3. Créer le projet Pages

1. Ouvre [Cloudflare Dashboard](https://dash.cloudflare.com/), sélectionne ton compte.
2. Va dans **Workers & Pages > Create application > Pages > Import an existing Git repository** (ou **Connect to Git** selon l’écran).
3. Connecte GitHub si nécessaire et autorise l’accès à **rayzk-python**.
4. Sélectionne **Rayzk24/rayzk-python**, puis **Begin setup**.
5. Entre les paramètres suivants :

| Champ | Valeur |
|---|---|
| Project name | `rayzk-python` |
| Production branch | `main` |
| Framework preset | `React (Vite)` ; si absent, `None` avec les valeurs ci-dessous |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | laisser vide, racine du dépôt |
| Node version | variable `NODE_VERSION` = `22` |

6. Dans **Environment variables**, ajoute :

| Nom | Valeur à saisir |
|---|---|
| `NODE_VERSION` | `22` |
| `VITE_SUPABASE_URL` | même valeur publique que dans ton `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | même clé publique anon/publishable que dans ton `.env.local` |

Tu peux aussi les renseigner dans **Pages > rayzk-python > Settings > Variables and Secrets**. Elles sont nécessaires au **build**, pas à un serveur Node. N’ajoute aucune clé privilégiée. Pour les previews, soit renseigne les mêmes valeurs publiques, soit désactive les déploiements de branches inutiles ; une preview configurée utilise les mêmes données sous RLS.

7. Clique **Save and Deploy**.
8. Dans **Deployments**, attends **Success**. Les logs doivent montrer la copie du runtime lors de l’installation, le typecheck et le build Vite.
9. Ouvre l’URL `pages.dev` affichée. Note-la : si `rayzk-python.pages.dev` n’est pas disponible, utilise l’adresse réellement attribuée dans les étapes suivantes.

Chaque push sur `main` déclenche ensuite un nouveau déploiement. Une modification des variables nécessite **Retry deployment / Redeploy** pour reconstruire le bundle.

## 4. Domaine python.rayzk.fr

1. Dans **Workers & Pages > rayzk-python > Custom domains**, clique **Set up a custom domain**.
2. Entre exactement `python.rayzk.fr`, clique **Continue**.
3. Si la zone `rayzk.fr` est déjà dans ce compte Cloudflare, laisse Pages créer le CNAME proposé, puis **Activate domain**. Vérifie qu’aucun enregistrement existant important n’utilise déjà `python` avant de le remplacer.
4. Si le DNS est géré ailleurs, crée chez le fournisseur DNS :

| Type | Nom / hôte | Cible | TTL |
|---|---|---|---|
| CNAME | `python` | `rayzk-python.pages.dev` ou la cible exacte donnée par Pages | Auto / défaut |

5. **Associe d’abord le domaine dans Pages**, puis le CNAME ; un CNAME seul ne suffit pas.
6. Retourne dans **Custom domains** et attends **Active** et l’activation HTTPS. Ouvre `https://python.rayzk.fr/`, vérifie le cadenas.

Ne modifie ni le domaine racine, ni les enregistrements du dashboard. Pas de Workers Functions, pas de serveur backend, pas de commande de démarrage ni de binding R2 nécessaires.

## 5. Auth et isolation du Worker

Dans Supabase **Authentication > URL Configuration > Redirect URLs**, ajoute `https://python.rayzk.fr/` et l’URL `pages.dev` exacte. Garde le **Site URL du dashboard** et toutes ses URLs existantes. Voir `SUPABASE_SETUP.md` pour localhost.

`public/_headers` devient `dist/_headers` et configure notamment :

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Ces headers permettent `SharedArrayBuffer` : le Worker attend avec `Atomics.wait`, l’interface reste disponible et transmet la réponse d’`input()`. Tous les fichiers Python sont servis depuis `/pyodide/`, sans CDN. La CSP autorise WebAssembly, les ressources locales et Supabase. N’active pas d’injection de scripts (Rocket Loader, analytics externes, etc.) sans adapter et retester cette configuration.

Pour vérifier : ouvre les outils de développement > **Network**, recharge, sélectionne le document HTML, consulte **Response Headers**. Les deux headers doivent avoir les valeurs ci-dessus. Dans la console développeur, `crossOriginIsolated` doit renvoyer `true`.

Le script de copie bloque le build si un asset dépasse **25 Mio**, limite par fichier de Pages. Le runtime installé est en dessous. Ne renomme pas les assets Pyodide séparément ; ils doivent rester de la même version.

## 6. Recette finale sur le domaine

1. Se connecter avec le compte existant et retrouver le brouillon.
2. Exécuter `print("hello")` ; attendre la sortie.
3. Exécuter :

```python
name = input("Quel est ton nom ?")
print("Bonjour", name)
```

Entrer une réponse contenant un accent, puis Entrée : la sortie doit reprendre cette réponse.

4. Exécuter une boucle `for i in range(5):` avec `print(i)` indenté de quatre espaces.
5. Dans la console, saisir `12 ** 2`, puis `len("Rayzk")` : résultats `144` et `5`.
6. Exécuter `while True: pass`, cliquer **Stop**, attendre Python prêt, puis relancer un `print`.
7. Tester **Reset Python**, une division par zéro et le lien vers la ligne du traceback.
8. Modifier le code, attendre **Sauvegardé**, actualiser puis vérifier depuis un deuxième appareil.
9. Enregistrer, ouvrir, renommer, supprimer un code de test ; importer et télécharger un `.py`.
10. Basculer les thèmes et vérifier 375, 390, 430 et 1440 px. Tester le partage Éditeur / Console sur mobile.
11. Se déconnecter, vérifier le retour à la connexion et l’absence d’accès aux documents hors connexion Auth.

Si Python ne démarre pas : vérifier HTTPS, les headers et les réponses 200 de `/pyodide/314.0.7/pyodide.mjs`, `/pyodide/314.0.7/pyodide.asm.mjs`, `/pyodide/314.0.7/pyodide.asm.wasm`, `/pyodide/314.0.7/python_stdlib.zip`. Les URLs incluent la version pour éviter un mélange de fichiers en cache après une mise à jour. Un proxy/filtre du lycée peut bloquer WebAssembly ; tester le réseau autorisé avant une séance.

Références : [build Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/), [domaines](https://developers.cloudflare.com/pages/configuration/custom-domains/), [headers](https://developers.cloudflare.com/pages/configuration/headers/), [limites](https://developers.cloudflare.com/pages/platform/limits/), [flux Pyodide](https://pyodide.org/en/stable/usage/streams.html).
