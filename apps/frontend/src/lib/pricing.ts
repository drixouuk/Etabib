export function calculateCabinetPrice(doctorCount: number): number {
  return 499 + Math.max(0, doctorCount - 1) * 199
}
