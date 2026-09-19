export type ScheduleResult =
  | { scheduledAt: string; error?: undefined }
  | { scheduledAt?: undefined; error: string }

export const MIN_LEAD_TIME_HOURS = 5

/**
 * Combina data + hora (inputs HTML separados) num ISO string validado.
 * Não existe mais corrida imediata — todo agendamento precisa de pelo menos
 * MIN_LEAD_TIME_HOURS de antecedência, pro motorista se organizar e aceitar.
 * Extraído do NewRidePage para poder testar a regra sem montar o componente
 * inteiro (que dispara fetch pro Nominatim/OSRM em efeitos colaterais).
 */
export function buildScheduledAt(date: string, time: string): ScheduleResult {
  if (!date || !time) {
    return { error: 'Preencha a data e o horário.' }
  }

  const combined = new Date(`${date}T${time}:00`)
  if (isNaN(combined.getTime())) {
    return { error: 'Data ou horário inválido.' }
  }

  const minScheduledAt = new Date(Date.now() + MIN_LEAD_TIME_HOURS * 60 * 60 * 1000)
  if (combined < minScheduledAt) {
    return { error: `Agende com pelo menos ${MIN_LEAD_TIME_HOURS} horas de antecedência.` }
  }

  return { scheduledAt: combined.toISOString() }
}
