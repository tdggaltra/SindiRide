import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Lock, CreditCard, Star } from 'lucide-react'
import { useLogin } from '@/hooks'
import { Button, Input } from '@/components/ui'

// ── Login ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  cpf:      z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (formato: 000.000.000-00)'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const login = useLogin()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Badge gratuito */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-brand-800 bg-brand-50 px-3 py-1.5 rounded-full w-fit mb-5">
        <Star className="w-3 h-3" />
        Corridas 100% gratuitas
      </div>

      <h1 className="text-xl font-medium text-gray-900 mb-1">Bem-vindo de volta</h1>
      <p className="text-sm text-gray-500 mb-6">Entre com sua conta de síndico</p>

      <form onSubmit={handleSubmit((d) => login.mutate(d))} className="flex flex-col gap-4">
        <Input
          label="CPF"
          placeholder="000.000.000-00"
          icon={<CreditCard className="w-4 h-4" />}
          error={errors.cpf?.message}
          {...register('cpf')}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="text-right -mt-2">
          <Link to="/esqueci-senha" className="text-xs text-brand-600">Esqueci minha senha</Link>
        </div>

        {login.isError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            CPF ou senha incorretos
          </p>
        )}

        <Button type="submit" loading={login.isPending} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">não tem conta?</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <Link to="/cadastro">
        <Button variant="secondary" className="w-full">
          Cadastrar como síndico
        </Button>
      </Link>
    </div>
  )
}

// ── Register ───────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name:               z.string().min(3, 'Nome muito curto'),
  email:              z.string().email('E-mail inválido'),
  cpf:                z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  phone:              z.string().min(10, 'Telefone inválido'),
  password:           z.string().min(8, 'Mínimo 8 caracteres'),
  condominiumName:    z.string().min(3, 'Nome do condomínio obrigatório'),
  condominiumAddress: z.string().min(5, 'Endereço obrigatório'),
  condominiumDistrict:z.string().min(2, 'Bairro obrigatório'),
  condominiumZip:     z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido'),
  mandateType:        z.enum(['ELEITO', 'PROFISSIONAL', 'SUBSINDICO', 'INTERINO']),
})
type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const register_ = useRegister_()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { mandateType: 'ELEITO' },
  })

  const step = watch('name') && watch('email') ? 2 : 1

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
          {step > 1 ? '✓' : '1'}
        </div>
        <div className={`flex-1 h-px ${step > 1 ? 'bg-brand-600' : 'bg-gray-200'}`} />
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
          2
        </div>
        <span className="text-xs text-gray-400 ml-1">{step === 1 ? 'Dados pessoais' : 'Condomínio'}</span>
      </div>

      <h1 className="text-xl font-medium text-gray-900 mb-1">Criar conta</h1>
      <p className="text-sm text-gray-500 mb-5">Preencha seus dados para solicitar acesso</p>

      <form onSubmit={handleSubmit((d) => register_.mutate(d))} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" placeholder="Carlos" error={errors.name?.message} {...register('name')} />
          <Input label="E-mail" placeholder="carlos@email.com" error={errors.email?.message} {...register('email')} />
        </div>
        <Input label="CPF" placeholder="000.000.000-00" error={errors.cpf?.message} {...register('cpf')} />
        <Input label="Celular" placeholder="(43) 9 9999-0000" error={errors.phone?.message} {...register('phone')} />
        <Input label="Senha" type="password" placeholder="Mínimo 8 caracteres" error={errors.password?.message} {...register('password')} />

        <div className="border-t border-gray-100 pt-3 mt-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Condomínio</p>
          <div className="flex flex-col gap-3">
            <Input label="Nome do condomínio" placeholder="Ed. Solar das Flores" error={errors.condominiumName?.message} {...register('condominiumName')} />
            <Input label="Endereço" placeholder="Rua das Palmeiras, 320" error={errors.condominiumAddress?.message} {...register('condominiumAddress')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bairro" placeholder="Jd. Higienópolis" error={errors.condominiumDistrict?.message} {...register('condominiumDistrict')} />
              <Input label="CEP" placeholder="86020-000" error={errors.condominiumZip?.message} {...register('condominiumZip')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de mandato</label>
              <select className="input-field" {...register('mandateType')}>
                <option value="ELEITO">Síndico eleito</option>
                <option value="PROFISSIONAL">Síndico profissional</option>
                <option value="SUBSINDICO">Subsíndico</option>
                <option value="INTERINO">Síndico interino</option>
              </select>
            </div>
          </div>
        </div>

        {register_.isError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            Erro ao criar conta. Verifique os dados e tente novamente.
          </p>
        )}

        <Button type="submit" loading={register_.isPending} className="w-full mt-1">
          Enviar solicitação
        </Button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-4">
        Já tem conta?{' '}
        <Link to="/login" className="text-brand-600 font-medium">Entrar</Link>
      </p>
    </div>
  )
}

// Hook local para registro (reexporta com nome diferente pra evitar conflito)
import { useRegister as useRegister_ } from '@/hooks'

// ── Pending ────────────────────────────────────────────────────────────────
export function PendingPage() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
        <Star className="w-7 h-7 text-brand-600" />
      </div>

      <h1 className="text-xl font-medium text-gray-900 mb-2">Solicitação enviada!</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Sua conta está em análise. Você receberá uma notificação assim que for aprovada pelo administrador.
      </p>

      <div className="bg-brand-50 rounded-xl p-4 text-left mb-6">
        <p className="text-xs font-medium text-brand-800 mb-2">O que acontece agora?</p>
        <ul className="text-xs text-brand-600 space-y-1.5 list-disc list-inside">
          <li>Administrador revisa seus dados</li>
          <li>Verificação do mandato como síndico</li>
          <li>Aprovação em até 24 horas úteis</li>
        </ul>
      </div>

      <Link to="/login">
        <Button variant="secondary" className="w-full">
          Voltar ao login
        </Button>
      </Link>
    </div>
  )
}
