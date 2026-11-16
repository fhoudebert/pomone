import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { analyserNom, champ, classeurModele, comparerPositions, ecrireClasseur, genererSite, lireClasseur, nettoyer, rapprocher, type Verger } from '../src/index';

const lire = (f: string) => lireClasseur(new Uint8Array(readFileSync(`exemples/${f}`)));

describe('noms et positions', () => {
  it('harmonise les apostrophes sans toucher aux élisions', () => {
    expect(nettoyer("Beurré Hardy'")).toBe('Beurré Hardy');
    expect(nettoyer("'Sydo d'Angers'")).toBe("Sydo d'Angers");
    expect(nettoyer('Jeanne d’Arc’')).toBe("Jeanne d'Arc");
  });
  it('sépare nom latin, espèce et cultivar', () => {
    expect(analyserNom("Malus domestica 'Ménagère")).toEqual({ latin: 'Malus domestica', espece: 'pommier', cultivar: 'Ménagère' });
    expect(analyserNom('figue  noire de bellone')).toMatchObject({ espece: 'figuier', cultivar: 'Noire de Bellone' });
    expect(analyserNom('Juglans nigra')).toEqual({ latin: 'Juglans nigra', espece: 'noyer', cultivar: '' });
    expect(analyserNom('ragouminier').espece).toBe('ragouminier');
  });
  it('rapproche les graphies divergentes et signale les rapprochements approchés', () => {
    const fiches = ['Reinette Dorée de Vitry', 'Doyenné de Comice', 'Noir de Meched', 'Reine Claude Verte'];
    expect(rapprocher('Reinette Dorée de Virty', fiches, (x) => x)).toEqual({ cible: 'Reinette Dorée de Vitry', exact: false });
    expect(rapprocher('Doyenne De Comice', fiches, (x) => x)).toEqual({ cible: 'Doyenné de Comice', exact: true });
    expect(rapprocher('Bigarreau Noir de Meched', fiches, (x) => x)?.cible).toBe('Noir de Meched');
    expect(rapprocher('Reine Claude Violette', fiches, (x) => x)).toBeNull();
  });
  it('trie 1 < 1.1 < 1.9 < 1.10 < 2', () => {
    expect(['2', '1.10', '1', '1.9', '1.1'].sort(comparerPositions)).toEqual(['1', '1.1', '1.9', '1.10', '2']);
  });
});

describe('classeur ébauche', () => {
  const { verger, rapport, format } = lire('verger-pomone-ebauche.xlsx');
  it('est lu sans erreur, allées renumérotées 1 à 7', () => {
    expect(format).toBe('ebauche');
    expect(rapport.filter((a) => a.niveau === 'erreur')).toEqual([]);
    expect(verger.allees.map((a) => a.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(verger.allees[4]!.nom).toBe('Poiriers');
    expect(rapport.filter((a) => a.code === 'numero-allee')).toHaveLength(3);
  });
  it('traite les cellules vides comme des arbres à planter', () => {
    expect(verger.emplacements.filter((e) => e.statut === 'à planter').map((e) => e.id)).toContain('A2-007');
  });
  it('relie le plan aux fiches malgré les graphies', () => {
    const vitry = verger.emplacements.find((e) => e.id === 'A7-009')!;
    expect(verger.cultivars.find((c) => c.id === vitry.cultivar)!.fiche.length).toBeGreaterThan(3);
    expect(rapport.some((a) => a.code === 'rapprochement' && a.message.includes('Virty'))).toBe(true);
  });
  it('distingue deux espèces sans cultivar et propose la multiplication en ébauche', () => {
    const ids = verger.cultivars.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['noyer-regia', 'noyer-nigra', 'sorbier-forresti', 'sorbier-domestica']));
    expect(verger.cultivars.find((c) => c.espece === 'grenadier')!.multiplication).toEqual({ v: 'bouture', ebauche: true });
  });
});

describe('format Pomone v1', () => {
  const { verger, rapport, format } = lire('verger-pomone-v1.xlsx');
  it("l'exemple corrigé ne lève ni erreur ni avertissement", () => {
    expect(format).toBe('pomone-v1');
    expect(rapport.filter((a) => a.niveau !== 'info')).toEqual([]);
    expect(verger.nordDeg).toBe(10);
  });
  it('survit à un aller-retour, positions intermédiaires comprises', () => {
    const v: Verger = structuredClone(verger);
    v.emplacements.push({ ...v.emplacements[0]!, id: 'A1-900', position: '1.10', strate: 'plante basse', remarque: champ('thym', true) });
    const relu = lireClasseur(ecrireClasseur(v)).verger;
    expect(relu.emplacements).toEqual(v.emplacements);
    expect(relu.cultivars).toEqual(v.cultivars);
    expect(relu.allees).toEqual(v.allees);
  });
});

describe('classeurs écrits', () => {
  it('marquent les ébauches en italique couleur et proposent des listes déroulantes', () => {
    const zip = unzipSync(ecrireClasseur(lire('verger-pomone-v1.xlsx').verger));
    const emplacements = strFromU8(zip['xl/worksheets/sheet3.xml']!);
    expect(emplacements).toContain('<cfRule type="beginsWith"');
    expect(emplacements).toContain('"planté,à planter,remplacé,mort,retiré"');
    expect(strFromU8(zip['xl/styles.xml']!)).toContain('<dxf><font><i/>');
  });
  it('le modèle vierge est relu sans erreur, avec sa feuille d’aide', () => {
    const { verger, rapport, format } = lireClasseur(classeurModele());
    expect(format).toBe('pomone-v1');
    expect(rapport.filter((a) => a.niveau !== 'info')).toEqual([]);
    expect(verger.emplacements).toEqual([]);
  });
});

describe('pages produites', () => {
  const { verger, rapport } = lire('verger-pomone-v1.xlsx');
  verger.decorations.push({ id: 'pe1', type: 'point_eau', x: -3, y: 4, largeur: null, hauteur: null, rayon: 1, points: [], libelle: 'Robinet' });
  const dossier = genererSite(verger, { rapport });
  const unique = genererSite(verger, { unique: true });
  it('sont autonomes : aucune adresse réseau', () => {
    for (const f of [...dossier, ...unique]) expect(f.contenu, f.chemin).not.toMatch(/https?:\/\/|\/\/cdn|@import|<link rel="stylesheet"/);
  });
  it('couvrent plan, allées, cultivars, catalogue et rapport', () => {
    const chemins = dossier.map((f) => f.chemin);
    expect(chemins).toEqual(expect.arrayContaining(['index.html', 'allees/A5.html', 'cultivars/pommier-melrose.html', 'catalogue.html', 'rapport.html']));
    expect(unique.map((f) => f.chemin)).toEqual(['verger.html']);
  });
  it('donnent une fiche par arbre actif, la flèche du nord et les décorations', () => {
    const index = dossier[0]!.contenu;
    expect(index.match(/<template id="fiche-/g)).toHaveLength(71);
    expect(index).toContain('rotate(-10)');
    expect(index).toContain('data-type="point_eau"');
    expect(index).toContain('class="plante a-planter"');
  });
  it('marquent les ébauches, ou les masquent sur demande', () => {
    expect(dossier[0]!.contenu).toContain('class="ebauche"');
    expect(genererSite(verger, { masquerEbauches: true })[0]!.contenu).not.toContain('class="ebauche"');
  });
  it('créditent le logo, ou s’en passent sur demande', () => {
    expect(dossier[0]!.contenu).toContain('CC BY-NC-SA 3.0');
    const sans = genererSite(verger, { sansLogo: true })[0]!.contenu;
    expect(sans).not.toContain('data:image');
    expect(sans).not.toContain('CC BY-NC-SA');
  });
  it('échappent le contenu du classeur', () => {
    const v: Verger = structuredClone(verger);
    v.nom = '<script>alert(1)</script>';
    expect(genererSite(v)[0]!.contenu).not.toContain('<script>alert(1)');
  });
});

describe('robustesse et performance', () => {
  it('un fichier illisible donne un rapport, pas une exception', () => {
    const r = lireClasseur(new Uint8Array([1, 2, 3, 4]));
    expect(r.verger.allees.length + r.rapport.length).toBeGreaterThan(0);
  });
  it('un classeur v1 incomplet signale les feuilles absentes et les références inconnues', async () => {
    const X = await import('xlsx');
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['id', 'allee', 'position', 'cultivar', 'statut'], ['x1', 'ZZ', 'a', 'inconnu', 'planté']]), 'emplacements');
    const { rapport } = lireClasseur(new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' })));
    expect(rapport.map((a) => a.code)).toEqual(expect.arrayContaining(['feuille-absente', 'allee-inconnue', 'position', 'cultivar-inconnu']));
  });
  it('génère un verger de 500 arbres en moins de 3 s', () => {
    const base = lire('verger-pomone-v1.xlsx').verger;
    const v: Verger = { ...base, emplacements: Array.from({ length: 500 }, (_, i) => ({ ...base.emplacements[i % 10]!, id: `T${i}`, allee: `A${(i % 7) + 1}`, position: String(Math.floor(i / 7) + 1) })) };
    const t = performance.now();
    const pages = genererSite(lireClasseur(ecrireClasseur(v)).verger);
    expect(performance.now() - t).toBeLessThan(3000);
    expect(pages.length).toBeGreaterThan(60);
  });
});
