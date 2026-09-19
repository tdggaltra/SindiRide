export function buildRidesCSV(rides: any[]): string {
  const headers = ['ID', 'Status', 'Síndico', 'Motorista', 'Origem', 'Destino', 'Km', 'Duração (min)', 'Agendado em', 'Concluído em']
  const rows = rides.map((r: any) => [
    r.id,
    r.status,
    r.sindico?.user?.name ?? '',
    r.motorista?.user?.name ?? '',
    r.originAddress,
    r.destAddress,
    r.estimatedDistanceKm ?? '',
    r.estimatedDurationMin ?? '',
    r.scheduledAt ? new Date(r.scheduledAt).toLocaleString('pt-BR') : '',
    r.finishedAt  ? new Date(r.finishedAt).toLocaleString('pt-BR')  : '',
  ])
  return [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
