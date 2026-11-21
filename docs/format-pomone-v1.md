# Format de classeur Pomone v1

Un classeur `.xlsx`, `.xls` ou `.ods` avec six feuilles à noms fixes. La première ligne de chaque
feuille porte les noms de colonnes. `exemples/modele-pomone-v1.xlsx` est un classeur vierge (aussi créé par l'application ou par
`pomone modele`) ; `exemples/verger-arboretum.xlsx` est un verger complet. Les classeurs écrits par
Pomone proposent des listes déroulantes (statut, strate, multiplication, type d'idée) et une feuille `aide`.

## Ébauches

Une valeur qui commence par `~` est une **ébauche** proposée, à valider par l'administrateur.
Le modèle contient une mise en forme conditionnelle (« le texte commence par ~ ») qui l'affiche
en italique couleur dans Excel et LibreOffice ; les pages produites font de même, avec la
mention « à valider ». Pour valider, retirer le `~`. Exemple : `~5` pour un espacement de 5 m à vérifier.

## `verger` — paramètres (colonnes `cle`, `valeur`)

| Clé | Rôle |
| --- | --- |
| `nom`, `lieu`, `auteur` | affichés dans l'en-tête et le pied des pages |
| `nord_deg` | azimut de l'axe des allées, en degrés depuis le nord, sens horaire. Les allées sont toujours dessinées verticales ; la flèche du nord est tournée d'autant vers la gauche. `0` = nord en haut |
| `ecart_allees_m` | distance entre deux allées voisines (défaut `~6`) |

## `allees`

| Colonne | Obligatoire | Rôle |
| --- | --- | --- |
| `id` | oui | identifiant fixe (`A1`) |
| `numero` | oui | numéro affiché ; les allées sont dessinées dans l'ordre des lignes |
| `nom` | oui | |
| `espacement_defaut_m` | non | distance entre deux arbres quand elle n'est pas saisie (défaut `~5`) |

## `emplacements` — une ligne par plante, actuelle ou passée

| Colonne | Obligatoire | Rôle |
| --- | --- | --- |
| `id` | oui | identifiant attribué une fois, jamais réutilisé (`A5-007`) : adresse de la fiche |
| `allee` | oui | `id` de l'allée |
| `position` | oui | `1`, `2`… et `1.1`, `1.2` pour insérer entre 1 et 2. **Format texte** (sinon `1.10` devient `1.1`). Tri segment par segment : `1.9` < `1.10` < `2` |
| `cultivar` | non | `id` de la feuille `cultivars` ; vide pour un arbre à planter non choisi |
| `statut` | oui | `planté`, `à planter`, `remplacé`, `mort`, `retiré` |
| `strate` | non | `arbre`, `arbuste`, `petit fruit`, `plante basse` |
| `espacement_precedent_m` | non | distance depuis la plante précédente ; sinon valeur de l'allée (moitié pour une plante basse) |
| `date_plantation`, `date_retrait` | non | |
| `remplace` | non | `id` de l'emplacement remplacé |
| `multiplication` | non | prime sur celle du cultivar |
| `porte_greffe`, `origine`, `remarque` | non | |

Remplacer un arbre : passer l'ancienne ligne en `remplacé` (avec `date_retrait`) et ajouter une
ligne à la même position, avec un nouvel `id` et `remplace` = l'ancien. La fiche montre l'historique.

## `cultivars`

| Colonne | Rôle |
| --- | --- |
| `id` | identifiant (`pommier-melrose`) |
| `nom_latin` | *Malus domestica* |
| `cultivar` | sans guillemets : `Melrose` ; Pomone affiche *Malus domestica* 'Melrose' |
| `nom_vernaculaire` | Pommier |
| `espece` | clé d'espèce (couleurs, filtres) : `pommier`, `poirier`, `prunier`, `cerisier`, `cognassier`, `figuier`, `grenadier`, `framboisier`… ou toute autre valeur |
| `multiplication` | `greffage`, `semis`, `bouture`, `marcotte`, `drageon` |
| `description` | texte libre |
| autres colonnes | affichées telles quelles dans la fiche (floraison, récolte, pollinisateurs…) |

Une colonne dont le nom contient « pollinis » produit des liens vers les variétés citées qui sont plantées.

## `idees`

`allee` (vide = idée pour tout le verger), `type` (`remplacement`, `évolution`, `plante intercalaire`),
`sujet`, `emplacement`, `priorite`, `remarque`.

## `decorations`

Coordonnées en mètres dans le repère du plan : origine en haut à gauche de la première allée,
`x_m` vers la droite, `y_m` vers le bas (le long des allées). Valeurs négatives admises.

| `type` | Colonnes utiles |
| --- | --- |
| `point_eau`, `mare` | `x_m`, `y_m`, `rayon_m` |
| `ruche` | `x_m`, `y_m` |
| `composteur`, `banc`, `abri` | `x_m`, `y_m`, `largeur_m`, `hauteur_m` |
| `chemin`, `haie`, `cloture` | `points` : `x,y ; x,y ; …` et `largeur_m` |
| `texte` | `x_m`, `y_m`, `libelle` |

Un type inconnu est dessiné comme un point avec son `libelle`.
