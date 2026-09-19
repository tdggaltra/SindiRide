import { describe, it, expect } from 'vitest'
import { buildScheduledAt, MIN_LEAD_TIME_HOURS } from './scheduling'

function isoPartsInHours(hoursFromNow: number) {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { date, time }
}

describe('buildScheduledAt', () => {
  it('combina data e hora futuras (com folga) num ISO string', () => {
    const { date, time } = isoPartsInHours(MIN_LEAD_TIME_HOURS + 2)
    const result = buildScheduledAt(date, time)
    expect(result.error).toBeUndefined()
    expect(result.scheduledAt).toBeTruthy()
  })

  it('retorna erro quando falta a data', () => {
    const result = buildScheduledAt('', '10:00')
    expect(result.error).toBe('Preencha a data e o horário.')
  })

  it('retorna erro quando falta o horário', () => {
    const result = buildScheduledAt('2030-01-01', '')
    expect(result.error).toBe('Preencha a data e o horário.')
  })

  it('retorna erro para data/horário inválidos', () => {
    const result = buildScheduledAt('data-invalida', '99:99')
    expect(result.error).toBe('Data ou horário inválido.')
  })

  it(`rejeita agendamento com menos de ${MIN_LEAD_TIME_HOURS} horas de antecedência`, () => {
    const { date, time } = isoPartsInHours(MIN_LEAD_TIME_HOURS - 1)
    const result = buildScheduledAt(date, time)
    expect(result.error).toBe(`Agende com pelo menos ${MIN_LEAD_TIME_HOURS} horas de antecedência.`)
  })

  it('rejeita data/horário no passado', () => {
    const { date, time } = isoPartsInHours(-24)
    const result = buildScheduledAt(date, time)
    expect(result.error).toBe(`Agende com pelo menos ${MIN_LEAD_TIME_HOURS} horas de antecedência.`)
  })

  it('aceita exatamente no limite da antecedência mínima', () => {
    // +1 minuto de folga sobre o limite exato pra não flakar por causa do tempo de execução do teste
    const { date, time } = isoPartsInHours(MIN_LEAD_TIME_HOURS + 1 / 60)
    const result = buildScheduledAt(date, time)
    expect(result.error).toBeUndefined()
  })
})
