import type { Note } from "@/types/galaxy"

export function getDistance(n1: Note, n2: Note) {
  return Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2))
}

export function getNearestNotes(target: Note, allNotes: Note[], count = 3): Note[] {
  return allNotes
    .filter(n => n.id !== target.id) // Remove a própria nota
    .map(n => ({ ...n, distance: getDistance(target, n) })) // Calcula distâncias
    .sort((a, b) => a.distance - b.distance) // Ordena pela mais perto
    .slice(0, count) // Pega as Top N
}