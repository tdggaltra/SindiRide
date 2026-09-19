/**
 * Marca DriveSíndicos — usa o arquivo de imagem fornecido pelo usuário
 * (recortado e com o fundo removido em apps/web/public/brand-mark.png),
 * não um símbolo redesenhado. Ver histórico: duas tentativas de recriar o
 * símbolo à mão em SVG foram rejeitadas antes desta.
 */
export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return <img src="/brand-mark.png" alt="DriveSíndicos" className={`${className} object-contain`} />
}

const markSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
}

const textSizes = {
  sm: 'font-medium text-gray-900',
  md: 'text-xl font-medium text-gray-900',
}

/** Lockup compacto (mark + wordmark lado a lado) — usado em sidebars e topbars. */
export function BrandLogo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark className={`${markSizes[size]} flex-shrink-0`} />
      <span className={textSizes[size]}>
        Drive<span className="text-brand-600">Síndicos</span>
      </span>
    </div>
  )
}

/** Lockup completo (mark + wordmark + slogan, empilhados) — tela de login. */
export function BrandLockup() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <BrandMark className="w-20 h-20" />
      <span className="text-2xl font-medium text-gray-900">
        Drive<span className="text-brand-600">Síndicos</span>
      </span>
      <span className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
        Mobilidade inteligente para síndicos
      </span>
    </div>
  )
}
