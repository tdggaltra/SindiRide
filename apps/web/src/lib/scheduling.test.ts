import { describe, it, expect } from 'vitest'
import { buildScheduledAt } from './scheduling'

describe('buildScheduledAt', () => {
  it('combina data e hora futuras num ISO string', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = future.toISOString().split('T')[0]
    const time = '14:30'

    const result = buildScheduledAt(date, time, false)

    expect(result.error).toBeUndefined()
    expect(result.scheduledAt).toBeTruthy()
    const parsed = new Date(result.scheduledAt!)
    expect(parsed.getHours()).toBe(14)
    expect(parsed.getMinutes()).toBe(30)
  })

  it('retorna erro quando falta a data', () => {
    const result = buildScheduledAt('', '10:00', false)
    expect(result.error).toBe('Preencha a data e o horário.')
  })

  it('retorna erro quando falta o horário', () => {
    const result = buildScheduledAt('2030-01-01', '', false)
    expect(result.error).toBe('Preencha a data e o horário.')
  })

  it('retorna erro para data/horário inválidos', () => {
    const result = buildScheduledAt('data-invalida', '99:99', false)
    expect(result.error).toBe('Data ou horário inválido.')
  })

  it('retorna erro para data/horário no passado', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const date = past.toISOString().split('T')[0]

    const result = buildScheduledAt(date, '10:00', false)

    expect(result.error).toBe('O agendamento deve ser para uma data futura.')
  })

  it('isImmediate ignora data e hora e usa o horário atual', () => {
    const result = buildScheduledAt('', '', true)

    expect(result.error).toBeUndefined()
    expect(result.scheduledAt).toBeTruthy()
    expect(new Date(result.scheduledAt!).getTime()).toBeGreaterThan(Date.now() - 5_000)
  })
})
