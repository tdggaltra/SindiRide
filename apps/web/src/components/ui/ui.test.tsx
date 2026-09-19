import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, Pagination, RideStatusBadge, Input } from './index'

describe('Button', () => {
  it('dispara onClick quando clicado', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Salvar</Button>)
    fireEvent.click(screen.getByText('Salvar'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fica desabilitado e não dispara onClick quando loading', () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Salvar</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Pagination', () => {
  it('não renderiza nada quando há uma página ou menos', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPrev={() => {}} onNext={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('desabilita "Anterior" na primeira página e "Próxima" na última', () => {
    render(<Pagination page={1} totalPages={3} onPrev={() => {}} onNext={() => {}} />)
    expect(screen.getByText('Anterior')).toBeDisabled()
    expect(screen.getByText('Próxima')).not.toBeDisabled()
  })

  it('chama onNext e onPrev ao clicar', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(<Pagination page={2} totalPages={3} onPrev={onPrev} onNext={onNext} />)
    fireEvent.click(screen.getByText('Anterior'))
    fireEvent.click(screen.getByText('Próxima'))
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})

describe('RideStatusBadge', () => {
  it.each([
    ['AGENDADA', 'Agendada'],
    ['ACEITA', 'Aceita'],
    ['EM_ANDAMENTO', 'Em andamento'],
    ['CONCLUIDA', 'Concluída'],
    ['CANCELADA', 'Cancelada'],
  ] as const)('mapeia %s para o rótulo "%s"', (status, label) => {
    render(<RideStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

describe('Input', () => {
  it('mostra a mensagem de erro quando presente', () => {
    render(<Input label="E-mail" error="Campo obrigatório" />)
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument()
  })

  it('não mostra mensagem de erro quando ausente', () => {
    render(<Input label="E-mail" />)
    expect(screen.queryByText('Campo obrigatório')).not.toBeInTheDocument()
  })
})
