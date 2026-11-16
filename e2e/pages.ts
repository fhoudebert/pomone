/**
 * Essai des pages produites dans un vrai navigateur : interactions, accessibilité (axe-core),
 * impression. Utilise le Chrome installé (CHROME_PATH pour un autre chemin) : npm run test:e2e
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium, type Page } from 'playwright-core';
import { genererSite, lireClasseur } from '../packages/core/src/index';

const { verger, rapport } = lireClasseur(new Uint8Array(readFileSync('exemples/verger-pomone-v1.xlsx')));
verger.decorations.push({ id: 'pe1', type: 'point_eau', x: -3, y: 4, largeur: null, hauteur: null, rayon: 1, points: [], libelle: 'Robinet' });
const dossier = mkdtempSync(join(tmpdir(), 'pomone-'));
const ecrire = (sous: string, o: Parameters<typeof genererSite>[1]) => {
  for (const f of genererSite(verger, o)) {
    const chemin = join(dossier, sous, f.chemin);
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, f.contenu);
  }
};
ecrire('site', { rapport });
ecrire('unique', { unique: true });
const url = (c: string) => { const [f, ancre] = c.split('#'); return pathToFileURL(join(dossier, f!)).href + (ancre ? `#${ancre}` : ''); };

const navigateur = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome', args: ['--no-sandbox'] });
const erreurs: string[] = [];
let echecs = 0;

async function etape(nom: string, f: () => Promise<void>): Promise<void> {
  try { await f(); console.log(`ok   ${nom}`); } catch (e) { echecs++; console.error(`ÉCHEC ${nom}\n${(e as Error).message}`); }
}
async function ouvrirPage(chemin: string, largeur = 1200): Promise<Page> {
  const p = await (await navigateur.newContext({ viewport: { width: largeur, height: 900 } })).newPage();
  p.on('pageerror', (e) => erreurs.push(`${chemin} : ${e}`));
  p.on('console', (m) => { if (m.type() === 'error') erreurs.push(`${chemin} : ${m.text()}`); });
  p.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) erreurs.push(`${chemin} : requête réseau ${r.url()}`); });
  await p.goto(url(chemin));
  return p;
}
async function axe(p: Page, nom: string): Promise<void> {
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  assert.deepEqual(r.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help} — ${v.nodes[0]?.target}`), [], `accessibilité ${nom}`);
}

await etape('plan : fiche au clic, adresse stable, fermeture par Échap', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.click('[data-fiche="A7-009"]');
  assert.match(await p.textContent('#panneau h2') ?? '', /Reinette Dorée de Vitry/);
  assert.match(p.url(), /#A7-009$/);
  await p.keyboard.press('Escape');
  assert.equal(await p.isVisible('#panneau'), false);
  assert.doesNotMatch(p.url(), /#/);
});
await etape('plan : parcours au clavier', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.focus('[data-fiche="A1-001"]');
  await p.keyboard.press('Enter');
  assert.equal(await p.isVisible('#panneau'), true);
  assert.equal(await p.evaluate(() => document.activeElement?.className), 'fermer');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('data-fiche')), 'A1-001', 'le focus revient sur l’arbre');
});
await etape('plan : recherche, filtre par espèce, pollinisateurs', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.fill('#recherche', 'reine claude');
  assert.equal(await p.locator('.plante:not(.estompe)').count(), 6);
  await p.fill('#recherche', '');
  await p.selectOption('#filtre-espece', 'figuier');
  assert.equal(await p.locator('.plante:not(.estompe)').count(), 4);
  await p.selectOption('#filtre-espece', '');
  await p.click('[data-fiche="A5-011"]');
  await p.click('#panneau button.voir');
  assert.equal(await p.locator('.plante:not(.estompe)').count(), 2);
});
await etape('liens entre pages en file://', async () => {
  const p = await ouvrirPage('site/cultivars/pommier-melrose.html');
  await p.click('main ul a');
  await p.waitForSelector('#panneau:not([hidden])');
  assert.match(p.url(), /index\.html#A7-010$/);
  await p.goto(url('site/index.html'));
  await p.click('svg.plan a >> nth=4');
  assert.match(await p.textContent('h1') ?? '', /Allée 5/);
});
await etape('catalogue : tri par colonne', async () => {
  const p = await ouvrirPage('site/catalogue.html');
  const premier = () => p.locator('tbody tr >> nth=0').locator('td >> nth=1').textContent();
  await p.click('th >> nth=1');
  const a = await premier();
  await p.click('th >> nth=1');
  assert.notEqual(await premier(), a);
});
await etape('fichier unique : fiche par ancre, téléphone', async () => {
  const p = await ouvrirPage('unique/verger.html#A1-003', 390);
  assert.equal(await p.isVisible('#panneau'), true);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'pas de défilement horizontal de la page');
});
for (const [nom, chemin] of [['plan', 'site/index.html'], ['allée', 'site/allees/A6.html'], ['cultivar', 'site/cultivars/poirier-conference.html'],
  ['catalogue', 'site/catalogue.html'], ['rapport', 'site/rapport.html'], ['fichier unique', 'unique/verger.html']] as const)
  await etape(`accessibilité : ${nom}`, async () => axe(await ouvrirPage(chemin), nom));
await etape('accessibilité : fiche ouverte', async () => {
  const p = await ouvrirPage('site/index.html#A6-004');
  await axe(p, 'fiche');
});
await etape('impression : le plan tient sur une page A4 paysage', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.emulateMedia({ media: 'print' });
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  if (process.env.POMONE_PDF) writeFileSync(process.env.POMONE_PDF, pdf);
  const boite = await p.locator('svg.plan').boundingBox();
  assert.ok(boite && boite.height <= 720 && boite.width <= 1050, `plan imprimé ${boite?.width}×${boite?.height}`);
});
await etape('aucune erreur ni requête réseau', async () => assert.deepEqual(erreurs, []));

await navigateur.close();
console.log(echecs ? `${echecs} échec(s)` : 'Tous les essais passent.');
process.exit(echecs ? 1 : 0);
