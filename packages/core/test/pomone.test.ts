import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { analyserNom, champ, classeurModele, comparerPositions, disposer, ecrireClasseur, especeParCle, genererSite, lireClasseur, nettoyer, rapprocher, type Verger } from '../src/index';
import { EXEMPLE, actifs, arbreAvecFiche, lireExemple } from './exemple';

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
  it('accepte des clés d’espèce libres', () => {
    expect(especeParCle('goyavier')).toMatchObject({ cle: 'goyavier', vernaculaire: 'Feijoa', strate: 'arbuste' });
    expect(especeParCle('plaqueminier')).toMatchObject({ cle: 'plaqueminier', latin: 'Diospyros kaki' });
    expect(especeParCle('kiwai')).toMatchObject({ cle: 'kiwai', vernaculaire: 'Kiwai' });
  });
  it('trie 1 < 1.1 < 1.9 < 1.10 < 2', () => {
    expect(['2', '1.10', '1', '1.9', '1.1'].sort(comparerPositions)).toEqual(['1', '1.1', '1.9', '1.10', '2']);
  });
});

describe(`classeur d'exemple (${EXEMPLE})`, () => {
  const lecture = lireExemple();
  const { verger, rapport, format } = lecture;
  it('est au format Pomone v1, sans erreur ni avertissement', () => {
    expect(format).toBe('pomone-v1');
    expect(rapport.filter((a) => a.niveau !== 'info')).toEqual([]);
  });
  it('a des allées toutes garnies et des idées rattachées à des allées existantes', () => {
    expect(verger.allees.length).toBeGreaterThan(0);
    for (const a of verger.allees) expect(verger.emplacements.some((e) => e.allee === a.id), a.id).toBe(true);
    const ids = new Set(verger.allees.map((a) => a.id));
    for (const i of verger.idees) expect(!i.allee || ids.has(i.allee), i.sujet).toBe(true);
  });
  it('dessine des couronnes qui ne se chevauchent pas, même là où les arbres sont serrés', () => {
    const { places } = disposer(verger);
    expect(places).toHaveLength(actifs(lecture).length);
    for (let i = 1; i < places.length; i++) {
      const [p, q] = [places[i - 1]!, places[i]!];
      if (p.e.allee === q.e.allee) expect(q.y - p.y, `${p.e.id} / ${q.e.id}`).toBeGreaterThanOrEqual(p.r + q.r - 1e-9);
    }
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
    const zip = unzipSync(ecrireClasseur(lireExemple().verger));
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
  const lecture = lireExemple();
  const { verger, rapport } = lecture;
  const { c: cultivar } = arbreAvecFiche(lecture);
  verger.decorations.push({ id: 'pe1', type: 'point_eau', x: -3, y: 4, largeur: null, hauteur: null, rayon: 1, points: [], libelle: 'Robinet' });
  const dossier = genererSite(verger, { rapport });
  const unique = genererSite(verger, { unique: true });
  it('sont autonomes : aucune adresse réseau', () => {
    for (const f of [...dossier, ...unique]) expect(f.contenu, f.chemin).not.toMatch(/https?:\/\/|\/\/cdn|@import|<link rel="stylesheet"/);
  });
  it('couvrent plan, allées, cultivars, catalogue et rapport', () => {
    const chemins = dossier.map((f) => f.chemin);
    expect(chemins).toEqual(expect.arrayContaining(['index.html', `allees/${verger.allees.at(-1)!.id}.html`, `cultivars/${cultivar.id}.html`, 'catalogue.html', 'rapport.html']));
    expect(chemins.filter((c) => c.startsWith('allees/'))).toHaveLength(verger.allees.length);
    expect(chemins.filter((c) => c.startsWith('cultivars/'))).toHaveLength(verger.cultivars.length);
    expect(unique.map((f) => f.chemin)).toEqual(['verger.html']);
  });
  it('donnent une fiche par arbre actif, la flèche du nord et les décorations', () => {
    const index = dossier[0]!.contenu;
    expect(index.match(/<template id="fiche-/g)).toHaveLength(actifs(lecture).length);
    expect(index).toContain(`rotate(${-verger.nordDeg})`);
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
    const base = lireExemple().verger;
    const n = base.allees.length;
    const v: Verger = { ...base, emplacements: Array.from({ length: 500 }, (_, i) => ({ ...base.emplacements[i % 10]!, id: `T${i}`, allee: base.allees[i % n]!.id, position: String(Math.floor(i / n) + 1), statut: 'planté' })) };
    const t = performance.now();
    const pages = genererSite(lireClasseur(ecrireClasseur(v)).verger);
    expect(performance.now() - t).toBeLessThan(3000);
    expect(pages.length).toBeGreaterThan(60);
  });
});
