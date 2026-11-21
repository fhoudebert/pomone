# Guide de l'utilisateur

Pomone transforme le classeur de votre verger en pages web consultables sans connexion.
Le classeur reste la référence : on le modifie dans son tableur habituel (Excel, LibreOffice),
puis on régénère les pages.

## 1. Préparer le classeur

- **Nouveau verger** : bouton « Créer un classeur vierge… » de l'application. Le classeur
  contient les six feuilles attendues, des listes déroulantes et une feuille `aide`.
- **Classeur existant** au format d'origine (une feuille « allées » en colonnes) : ouvrez-le dans
  Pomone, puis « Enregistrer au format Pomone v1… ». Travaillez ensuite dans ce nouveau classeur.

Le détail des feuilles et des colonnes est dans [format-pomone-v1.md](format-pomone-v1.md).

## 2. Tenir le verger à jour

| Je veux… | Dans le classeur |
| --- | --- |
| Ajouter un arbre en bout d'allée | Nouvelle ligne dans `emplacements`, avec un nouvel `id` et la position suivante |
| Insérer une plante entre le 1 et le 2 | Position `1.1` (puis `1.2`…). Pour une plante basse, renseigner `strate` |
| Prévoir une plantation | Statut `à planter` ; le cultivar peut rester vide |
| Remplacer un arbre | Ancienne ligne : statut `remplacé` et `date_retrait`. Nouvelle ligne à la même position, nouvel `id`, `remplace` = ancien `id` |
| Noter une distance mesurée | `espacement_precedent_m` de l'arbre, ou `espacement_defaut_m` de l'allée |
| Ajouter une espèce | Nouvelle ligne dans `cultivars` ; la colonne `espece` accepte n'importe quel nom |
| Compléter une fiche | Colonnes de `cultivars` ; toute colonne ajoutée à droite s'affiche dans la fiche |
| Noter une idée | Feuille `idees`, avec l'allée concernée (ou vide pour tout le verger) |
| Placer un point d'eau, une ruche… | Feuille `decorations`, coordonnées en mètres |
| Orienter le plan | `nord_deg` dans la feuille `verger` : angle des allées par rapport au nord |

### Les ébauches

Une valeur précédée de `~` (par exemple `~5` ou `~Prunus avium`) est une proposition à vérifier.
Elle apparaît en italique couleur dans le tableur et dans les pages. Quand la valeur est
confirmée, retirez le `~`.

## 3. Produire les pages

1. Déposez le classeur dans la fenêtre de Pomone.
2. Lisez le bilan : les **erreurs** (référence inconnue, identifiant en double) sont à corriger
   dans le classeur ; les avertissements et informations sont détaillés dans « Rapport d'import ».
3. Parcourez l'aperçu.
4. Exportez :
   - **le dossier HTML** : plusieurs pages, à ouvrir par `index.html` ;
   - **un fichier unique** `verger.html` : pratique à envoyer par courriel ou à copier sur un téléphone.

Options : *joindre le rapport* (page des anomalies), *masquer les ébauches* (ne publie que les
valeurs validées), *sans logo*.

## 4. Consulter le verger

- **Cliquer sur un arbre** (ou touche Entrée) ouvre sa fiche ; Échap la referme.
- **Rechercher** par nom, filtrer par espèce ou par statut.
- La case **Multiplication** affiche une lettre sur chaque arbre : G greffage, S semis, B bouture,
  M marcotte, D drageon. La case **Noms** affiche le nom sous chaque arbre.
- Le numéro en pied d'allée ouvre la page de l'allée : plan agrandi, liste des plantes, idées.
- L'adresse d'une fiche (elle se termine par `#A5-007`) peut être mise en favori ou partagée.
- **Imprimer** depuis le navigateur : le plan tient sur une page A4 ou A3 en paysage.

Les pages fonctionnent sans connexion, sur ordinateur comme sur téléphone.

## 5. Premier lancement de l'application

L'application n'est pas signée. Au premier lancement :

- **Windows** : « Windows a protégé votre ordinateur » → *Informations complémentaires* → *Exécuter quand même*.
- **macOS** : clic droit sur l'application → *Ouvrir*, puis confirmer.
- **Linux** : rendre le fichier `.AppImage` exécutable, ou installer le paquet `.deb`.

## Licence

Pomone est un logiciel libre sous licence MIT. Son logo est sous licence CC BY-NC-SA 3.0. Les données de votre verger vous appartiennent.
