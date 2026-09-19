import { describe, it, expect } from 'vitest'
import { buildRidesCSV } from './csv'

describe('buildRidesCSV', () => {
  it('gera o cabeçalho correto mesmo sem corridas', () => {
    const csv = buildRidesCSV([])
    const [header] = csv.split('\n')
    expect(header).toBe('"ID","Status","Síndico","Motorista","Origem","Destino","Km","Duração (min)","Agendado em","Concluído em"')
  })

  it('escapa aspas duplas e preserva vírgulas dentro dos campos', () => {
    const csv = buildRidesCSV([
      { id: '1', status: 'CONCLUIDA', originAddress: 'Rua "A", 100', destAddress: 'Rua B' },
    ])
    const [, row] = csv.split('\n')
    expect(row).toContain('"Rua ""A"", 100"')
  })

  it('usa string vazia para campos opcionais ausentes', () => {
    const csv = buildRidesCSV([
      { id: '1', status: 'AGENDADA', originAddress: 'Rua A', destAddress: 'Rua B' },
    ])
    const [, row] = csv.split('\n')
    const fields = row.split(',')
    // Síndico, Motorista, Km, Duração, Concluído em
    expect(fields[2]).toBe('""')
    expect(fields[3]).toBe('""')
  })
})
