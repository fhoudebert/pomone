/** Un champ de texte ; `ebauche` = valeur proposée, à valider par l'admin (préfixe ~ dans le classeur). */
export interface Champ { v: string; ebauche: boolean }

export const MODES_MULTIPLICATION = ['greffage', 'semis', 'bouture', 'marcotte', 'drageon'] as const;
export const STATUTS = ['planté', 'à planter', 'remplacé', 'mort', 'retiré'] as const;
export const STRATES = ['arbre', 'arbuste', 'petit fruit', 'plante basse'] as const;
export const TYPES_IDEE = ['remplacement', 'évolution', 'plante intercalaire'] as const;

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
}

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
