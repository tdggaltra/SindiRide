import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  inline?: boolean
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    if (this.props.inline) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl p-4 gap-2 text-sm text-gray-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Não foi possível carregar este componente.
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-gray-50">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-lg font-medium text-gray-900">Algo deu errado</h1>
        <p className="text-sm text-gray-500 max-w-xs">
          Ocorreu um erro inesperado. Recarregue a página para tentar novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="h-10 px-5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors"
        >
          Recarregar
        </button>
      </div>
    )
  }
}
