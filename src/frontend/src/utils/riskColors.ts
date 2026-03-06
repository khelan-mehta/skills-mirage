export function getRiskColor(score: number): string {
  if (score > 80) return '#ff4444';
  if (score > 60) return '#ff8800';
  if (score > 40) return '#ffcc00';
  return '#00d4aa';
}

export function getRiskLevel(score: number): string {
  if (score > 80) return 'CRITICAL';
  if (score > 60) return 'HIGH';
  if (score > 40) return 'MEDIUM';
  return 'LOW';
}

export function getRiskBg(score: number): string {
  if (score > 80) return 'rgba(255, 68, 68, 0.1)';
  if (score > 60) return 'rgba(255, 136, 0, 0.1)';
  if (score > 40) return 'rgba(255, 204, 0, 0.1)';
  return 'rgba(0, 212, 170, 0.1)';
}
