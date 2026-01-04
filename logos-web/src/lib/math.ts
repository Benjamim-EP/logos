import type { Note } from "@/types/galaxy"

export function getDistance(n1: Note, n2: Note) {
  // Defesa contra nulos
  if (!n1 || !n2) return 999999;
  return Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2))
}

export function getNearestNotes(target: Note, allNotes: Note[] = [], count = 10): Note[] {
  // CORREÇÃO DO ERRO: Validação defensiva
  if (!allNotes || !Array.isArray(allNotes) || allNotes.length === 0) return []
  if (!target) return []

  return allNotes
    .filter(n => n.id !== target.id) // Remove a própria nota
    .map(n => ({ ...n, distance: getDistance(target, n) })) // Calcula distâncias
    .sort((a, b) => (a.distance || 0) - (b.distance || 0)) // Ordena
    .slice(0, count) // Pega as Top N
}

export function seededRandom(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const normalized = (Math.sin(hash) + 1) / 2; // Normaliza para 0..1
  return min + normalized * (max - min);
}