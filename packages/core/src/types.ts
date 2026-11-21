/** Un champ de texte ; `ebauche` = valeur proposée, à valider par l'admin (préfixe ~ dans le classeur). */
export interface Champ { v: string; ebauche: boolean }

export const MODES_MULTIPLICATION = ['greffage', 'semis', 'bouture', 'marcotte', 'drageon'] as const;
export const STATUTS = ['planté', 'à planter', 'remplacé', 'mort', 'retiré'] as const;
export const STRATES = ['arbre', 'arbuste', 'petit fruit', 'plante basse'] as const;
export const TYPES_IDEE = ['remplacement', 'évolution', 'plante intercalaire'] as const;
/** Un rang est une allée (verticale sur le plan) ou une haie, posée sur un côté des allées. */
export const TYPES_RANG = ['allée', 'haie'] as const;
export const COTES = ['haut', 'bas', 'gauche', 'droite'] as const;
/** Distance par défaut entre une haie et le bout des allées (haut, bas) ou l'allée voisine (gauche, droite). */
export const DISTANCE_HAIE = 10;

export interface Cultivar {
  id: string;
  nomLatin: Champ;
  cultivar: Champ;
  nomVernaculaire: Champ;
  /** Clé d'espèce (pommier, poirier…) : sert aux couleurs, filtres et valeurs par défaut. */
  espece: string;
  multiplication: Champ;
  description: Champ;
  /** Colonnes libres de la fiche, affichées telles quelles. */
  fiche: { libelle: string; valeur: Champ }[];
}

export interface Emplacement {
  id: string;
  allee: string;
  /** Position dans l'allée : « 1 », « 2 », « 1.1 » (entre 1 et 2). Toujours du texte. */
  position: string;
  /** Identifiant de cultivar, vide pour un arbre à planter non choisi. */
  cultivar: string;
  statut: string;
  strate: string;
  /** Distance depuis la plante précédente, en mètres ; null = valeur par défaut de l'allée. */
  espacement: Champ | null;
  datePlantation: string;
  dateRetrait: string;
  remplace: string;
  multiplication: Champ;
  porteGreffe: Champ;
  origine: Champ;
  remarque: Champ;
}

export interface Allee {
  id: string;
  numero: number;
  nom: string;
  espacementDefaut: Champ;
  /** « allée » ou « haie ». */
  type: string;
  /** Côté d'une haie : haut, bas, gauche, droite (haut si vide). Ignoré pour une allée. */
  cote: string;
  /** Distance d'une haie au rang voisin, en mètres ; null = DISTANCE_HAIE. */
  distance: Champ | null;
}

export const estHaie = (a: Allee): boolean => a.type === 'haie';
export const coteDe = (a: Allee): (typeof COTES)[number] => ((COTES as readonly string[]).includes(a.cote) ? a.cote : 'haut') as (typeof COTES)[number];

export interface Idee { allee: string; type: string; sujet: string; emplacement: string; priorite: string; remarque: string }

export interface Decoration {
  id: string; type: string; x: number; y: number;
  largeur: number | null; hauteur: number | null; rayon: number | null;
  /** Polyligne « x,y ; x,y » pour chemin, haie, clôture. */
  points: [number, number][];
  libelle: string;
}

export interface Verger {
  nom: string;
  lieu: string;
  auteur: string;
  /** Azimut de l'axe des allées, en degrés depuis le nord, sens horaire. */
  nordDeg: number;
  /** Distance entre deux allées voisines, en mètres. */
  ecartAllees: Champ;
  allees: Allee[];
  emplacements: Emplacement[];
  cultivars: Cultivar[];
  idees: Idee[];
  decorations: Decoration[];
}

export interface Anomalie { niveau: 'erreur' | 'avertissement' | 'info'; code: string; message: string }

export interface Lecture { format: 'pomone-v1' | 'ebauche'; verger: Verger; rapport: Anomalie[] }

export const champ = (v = '', ebauche = false): Champ => ({ v, ebauche });
