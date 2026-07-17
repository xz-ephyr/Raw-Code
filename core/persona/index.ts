import type { Persona } from './types';
import { defaultPersona } from './default';
import { teamworkPersona } from './teamwork';
import { antigravityPersona } from './antigravity';

export const PERSONAS: Persona[] = [
  defaultPersona,
  teamworkPersona,
  antigravityPersona,
];

export type { Persona } from './types';

export function getPersonaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
