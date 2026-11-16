# Contribuer : livraison par patch et build à la demande

L'accès au dépôt est en lecture seule pour les contributeurs. Le mainteneur (fhoudebert)
applique les patchs et lance le build.

## Livrer

1. Cloner le dépôt et partir du commit indiqué par le mainteneur.
2. Un commit par changement logique, message en français au format conventionnel (`feat:`, `fix:`, `docs:`…).
3. `npm test` et `npm run typecheck` doivent passer.
4. Produire la série : `git format-patch <sha-de-base>..HEAD -o livraison/`
5. Joindre une note : SHA de base, liste des patchs, tests passés, points à vérifier.

## Appliquer (mainteneur)

```sh
git switch init                      # ou une branche de recette
git am --3way livraison/*.patch
npm ci && npm test
git push
```

En cas d'échec : `git am --abort`, puis retour au contributeur pour une série `v2`.

## Build

Onglet **Actions → Build Pomone → Run workflow**, puis choisir la branche (`ref`) et les plateformes.
Le bouton n'apparaît que lorsque `.github/workflows/build.yml` est présent sur la branche par
défaut (`main`). Les binaires sont à télécharger dans les *artifacts* de l'exécution (30 jours).

Cocher « release brouillon » crée une release non publiée ; ce job utilise l'environnement
GitHub `release`, à créer dans *Settings → Environments* et à réserver au mainteneur.

## Lecture des classeurs

Le dépôt utilise `xlsx` 0.18.5, dernière version de SheetJS publiée sur le registre npm.
SheetJS diffuse ses versions récentes (0.20.x, qui corrigent CVE-2023-30533 et CVE-2024-22363)
depuis son propre dépôt ; pour y passer :

```sh
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```
