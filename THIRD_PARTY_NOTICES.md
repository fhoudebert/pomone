# Dépendances tierces

Pomone est distribué sous licence MIT. Il embarque ou utilise :

| Composant | Licence | Usage |
| --- | --- | --- |
| [SheetJS Community Edition](https://sheetjs.com) (`xlsx`) | Apache-2.0 | lecture et écriture des classeurs |
| [fflate](https://github.com/101arrowz/fflate) | MIT | mise en forme des classeurs écrits |
| [Tauri](https://tauri.app) et `tauri-plugin-dialog` | MIT ou Apache-2.0 | application de bureau |
| serde, serde_json | MIT ou Apache-2.0 | échanges entre l'interface et Rust |

Les pages HTML produites n'embarquent aucune dépendance tierce.
Le logo Pomone n'est pas sous MIT : CC BY-NC-SA 3.0.

`npm run licences` contrôle toutes les dépendances distribuées (npm et crates Rust). Licences
admises : MIT, Apache-2.0, BSD, ISC, Zlib, Unicode, CC0, BSL-1.0, et MPL-2.0 (copyleft limité
au fichier, apporté par le moteur CSS de Tauri).
Outils de développement (non distribués) : TypeScript, Vite, Vitest, esbuild, tsx, Playwright, axe-core.
