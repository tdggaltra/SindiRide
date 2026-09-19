export type ScheduleResult =
  | { scheduledAt: string; error?: undefined }
  | { scheduledAt?: undefined; error: string }

/**
 * Combina data + hora (inputs HTML separados) num ISO string validado, ou
 * imediato usa o horário do cliente (o servidor sobrescreve com o dele).
 * Extraído do NewRidePage para poder testar a regra sem montar o componente
 * inteiro (que dispara fetch pro Nominatim/OSRM em efeitos colaterais).
 */
export function buildScheduledAt(date: string, time: string, isImmediate: boolean): ScheduleResult {
  if (isImmediate) {
    return { scheduledAt: new Date().toISOString() }
  }

  if (!date || !time) {
    return { error: 'Preencha a data e o horário.' }
  }

  const combined = new Date(`${date}T${time}:00`)
  if (isNaN(combined.getTime())) {
    return { error: 'Data ou horário inválido.' }
  }

  if (combined <= new Date()) {
    return { error: 'O agendamento deve ser para uma data futura.' }
  }

  return { scheduledAt: combined.toISOString() }
}
