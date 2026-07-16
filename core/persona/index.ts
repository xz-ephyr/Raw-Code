import type { Persona } from './types';
import { writerPersona } from './writer';
import { researcherPersona } from './researcher';
import { videoPersona } from './video';
import { martianPersona } from './martian';

export const PERSONAS: Persona[] = [
  writerPersona,
  researcherPersona,
  videoPersona,
  martianPersona,
];

export type { Persona } from './types';

export function getPersonaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
