export const STYLE = `
:root{--vert:#2f5d27;--vert-clair:#eef4e4;--terre:#b6975a;--encre:#1f2a1a;--gris:#5c6656;--ebauche:#b4541a;--fond:#fbfaf4;--bord:#d9dcc9}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--encre);background:var(--fond)}
a{color:var(--vert)}
header.bandeau{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;padding:.6rem 1rem;background:var(--vert);color:#fff}
header.bandeau img{width:44px;height:44px;background:#fff;border-radius:50%;padding:3px}
header.bandeau .titre{font-size:1.25rem;font-weight:650;margin-right:auto}
header.bandeau .titre small{display:block;font-size:.8rem;font-weight:400;opacity:.85}
header.bandeau nav a{color:#fff;text-decoration:none;padding:.35rem .6rem;border-radius:6px}
header.bandeau nav a:hover,header.bandeau nav a[aria-current]{background:#ffffff26}
main{max-width:1200px;margin:0 auto;padding:1rem}
h1{font-size:1.5rem;margin:.5rem 0}h2{font-size:1.2rem;margin:1.5rem 0 .5rem}h3{font-size:1rem;margin:1rem 0 .25rem}
.outils{display:flex;flex-wrap:wrap;gap:.5rem .9rem;align-items:center;margin:.5rem 0}
.outils input[type=search],.outils select{font:inherit;padding:.3rem .5rem;border:1px solid var(--bord);border-radius:6px;background:#fff}
.outils button,.fermer,button.voir{font:inherit;padding:.3rem .65rem;border:1px solid var(--bord);border-radius:6px;background:#fff;cursor:pointer}
.outils label{display:inline-flex;gap:.3rem;align-items:center}
.cadre{overflow:auto;border:1px solid var(--bord);border-radius:12px;background:#7fa650;max-height:82vh}
svg.plan{display:block;margin:0 auto;font-family:system-ui,sans-serif}
svg.plan text{fill:#17260f}
.plante{cursor:pointer;outline:none}
.plante:hover>path:first-of-type,.plante:focus-visible>path:first-of-type,.plante:focus-visible>circle:first-of-type{stroke:#fff;stroke-width:3}
.plante.choisi>path:first-of-type,.plante.choisi>circle:first-of-type{stroke:#ffe066;stroke-width:4}
.plante.sans-fiche>path:first-of-type{stroke-dasharray:3 2}
.plante.estompe,.compagne.estompe{opacity:.18}
.plante .nom{font-size:8.5px;display:none;paint-order:stroke;stroke:#ffffffb0;stroke-width:2.5px}
.montrer-noms .plante .nom{display:block}
.plante .etiquette{font-size:13px}.plante .etiquette .pos{font-weight:700}
.badge{pointer-events:none}.badge text{font-size:9px;font-weight:700}.plante.estompe+.badge{opacity:.18}
.sans-badges .badge{display:none}
.pied{font-size:17px;fill:#fff!important;font-weight:600}.pied.numero{text-decoration:underline}
.echelle text,.nord text{font-size:11px;font-weight:700}
.decor-nom,.decor-texte{font-size:10px;font-style:italic}
.nom-haie{font-size:11px;font-weight:600;text-decoration:underline}
.legende{display:flex;flex-wrap:wrap;gap:.3rem 1rem;margin:.6rem 0;padding:0;list-style:none;font-size:.9rem}
.legende i{display:inline-block;width:.9em;height:.9em;border-radius:50%;border:1px solid #2e4a1f;vertical-align:-1px;margin-right:.3em}
.legende b{display:inline-block;min-width:1.3em;text-align:center;border:1px solid #5a4a2a;border-radius:50%;font-size:.75em;margin-right:.3em}
.ebauche,.a-completer{font-style:italic;color:var(--ebauche)}
.ebauche::after{content:" · à valider";font-size:.75em;opacity:.85}
td .ebauche::after,.court .ebauche::after{content:" ~"}
#panneau{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);background:#fff;border-left:1px solid var(--bord);box-shadow:-6px 0 24px #0002;padding:1rem 1.1rem 2rem;overflow:auto;z-index:10}
#panneau[hidden]{display:none}
#panneau .fermer{float:right}
.fiche h2{margin:.2rem 0 0;font-size:1.3rem}
.fiche .latin{margin:0;color:var(--gris)}
.fiche .lieu{margin:.4rem 0;font-size:.9rem;color:var(--gris)}
.etat{display:inline-block;padding:0 .5em;border-radius:99px;background:var(--vert-clair);border:1px solid var(--bord);font-size:.85em}
.etat.a-planter{background:#fff7e0;border-color:#e3c56a}
dl{display:grid;grid-template-columns:minmax(8rem,38%) 1fr;gap:.25rem .75rem;margin:.75rem 0}
dt{color:var(--gris);font-size:.9rem}dd{margin:0}
table{border-collapse:collapse;width:100%;font-size:.93rem}
th,td{text-align:left;padding:.35rem .5rem;border-bottom:1px solid var(--bord);vertical-align:top}
th{background:var(--vert-clair);position:sticky;top:0}
th[data-tri]{cursor:pointer}th[data-tri]::after{content:" ↕";opacity:.4}
.table{overflow:auto}
.cartes{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.6rem;padding:0;list-style:none}
.cartes li{border:1px solid var(--bord);border-radius:10px;padding:.6rem .8rem;background:#fff}
.niveau-erreur{color:#a61b1b;font-weight:600}.niveau-avertissement{color:#8a5a00}.niveau-info{color:var(--gris)}
section.page{margin-bottom:2.5rem;padding-top:.5rem;border-top:3px solid var(--vert-clair)}
footer{padding:1.5rem 1rem;color:var(--gris);font-size:.85rem;text-align:center}
@media (max-width:640px){#panneau{top:auto;left:0;width:100%;max-height:72vh;border-left:0;border-top:1px solid var(--bord);border-radius:14px 14px 0 0;box-shadow:0 -6px 24px #0003}dl{grid-template-columns:1fr}dt{margin-top:.4rem}}
@media print{header.bandeau,.outils,#panneau{display:none!important}main{max-width:none;padding:0}h1{margin:0 0 2mm;font-size:14pt}.cadre{max-height:none;overflow:visible;border:0;background:none}svg.plan{width:auto!important;height:auto!important;max-width:100%;max-height:165mm}.legende{font-size:8pt;margin:1mm 0}section.page,h2{break-before:auto}section.page{border:0}.cartes,table{break-inside:auto}tr{break-inside:avoid}th{position:static}body{background:#fff;font-size:10pt}footer{padding:2mm 0;font-size:7pt}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4 landscape;margin:10mm}}
`;
