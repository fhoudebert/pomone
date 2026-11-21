# Pomone

Pomone lit un classeur de tableur décrivant un verger et produit des pages HTML autonomes,
consultables hors ligne : un plan vu de dessus, allée par allée, et la fiche de chaque arbre au clic.

- **Entrée** : un classeur `.xlsx`, `.xls` ou `.ods` au [format Pomone v1](docs/format-pomone-v1.md)
  (ou le classeur « ébauche » d'origine, converti à la volée).
- **Sortie** : un dossier de pages HTML, ou un seul fichier `verger.html`, sans aucun appel réseau.
- **Application de bureau** Linux, Windows et macOS (Tauri 2) et **ligne de commande**.
- Licence MIT.

## Utiliser l'application

1. Ouvrir Pomone et déposer le classeur du verger dans la fenêtre.
2. Lire le rapport d'import, parcourir l'aperçu, cliquer sur quelques arbres.
3. Exporter le dossier HTML (ouvrir ensuite `index.html`) ou un fichier unique à envoyer.

Les binaires ne sont pas signés : au premier lancement, Windows (SmartScreen) et macOS
(Gatekeeper) demandent une confirmation.

## Ligne de commande

```sh
npm ci
npm run pomone -- build exemples/verger-arboretum.xlsx -o site          # dossier de pages
npm run pomone -- build exemples/verger-arboretum.xlsx -o site --unique # un seul verger.html
npm run pomone -- modele -o mon-verger.xlsx                             # classeur vierge
```

Options de `build` : `--rapport` (joint la page des anomalies), `--sans-ebauches` (ne publie pas
les valeurs à valider), `--sans-logo`.

Mode d'emploi complet : [docs/guide-utilisateur.md](docs/guide-utilisateur.md).

## Le classeur en bref

| Feuille | Contenu |
| --- | --- |
| `verger` | nom, lieu, `nord_deg` (azimut des allées), écart entre allées |
| `allees` | une ligne par allée ; les allées sont toujours dessinées verticales |
| `emplacements` | une ligne par plante : identifiant fixe, allée, position (`1`, `2`, `1.1`…), cultivar, statut |
| `cultivars` | nom latin, cultivar, nom vernaculaire, multiplication, description, colonnes libres |
| `idees` | idées par allée : remplacement, évolution, plante intercalaire |
| `decorations` | point d'eau, mare, ruche, haie… placés par coordonnées en mètres |

Une valeur précédée de `~` est une **ébauche** : elle s'affiche en italique couleur, dans le
tableur comme dans les pages, jusqu'à ce que l'administrateur la valide en retirant le `~`.

## Développer

```sh
npm ci
npm test            # tests du moteur
npm run test:e2e    # pages dans Chrome : interactions, accessibilité, impression
npm run licences    # licences des dépendances distribuées
npm run dev         # interface dans le navigateur (http://localhost:1420)
npm run tauri dev   # application de bureau (Rust et dépendances Tauri requis)
```

| Dossier | Rôle |
| --- | --- |
| `packages/core` | moteur TypeScript : import, contrôles, rendu SVG et HTML |
| `packages/cli` | ligne de commande |
| `app` | interface de l'application |
| `src-tauri` | hôte Tauri (Rust) : dialogues et écriture des fichiers |
| `exemples` | verger de l'arboretum (`verger-arboretum.xlsx`), modèle vierge |
| `e2e`, `outils` | essais en navigateur, contrôle des licences |

Le build des binaires se lance à la main (GitHub Actions, `workflow_dispatch`) ; les
contributions arrivent par séries de patchs : voir [docs/contribuer.md](docs/contribuer.md).

## Licence

Code, documentation et exemples : MIT.
Dépendances : voir [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
