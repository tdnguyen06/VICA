import type { NarrativeBlock } from '../scenario.js';
export type RegionalMotif = 'harbour' | 'karst' | 'river' | 'palace' | 'beach' | 'old-town' | 'hills' | 'city' | 'market';
export interface RegionalOption {
  readonly id: string;
  readonly label: string;
  readonly fact: string;
  readonly sourceIds: readonly string[];
  readonly motif: RegionalMotif;
}
export interface RegionalStory {
  readonly slug: string;
  readonly name: string;
  readonly setting: string;
  readonly accent: string;
  readonly morning: readonly [RegionalOption, RegionalOption];
  readonly lunch: readonly [RegionalOption, RegionalOption];
  readonly postcardLabels: readonly [string, string];
}
export interface RegionalImage {
  readonly id: string;
  readonly label: string;
  readonly motif: RegionalMotif | 'meal' | 'postcard-scene' | 'postcard-colour';
  readonly accent: string;
  readonly province: string;
}
export const fiction = (text: string): NarrativeBlock => ({ text, kind: 'fiction', editorialStatus: 'authored' });
export const gameplay = (text: string): NarrativeBlock => ({ text, kind: 'gameplay', editorialStatus: 'authored' });
