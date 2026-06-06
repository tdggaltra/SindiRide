import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, Car, Clock, CheckCircle, X, TrendingUp, Gauge,
  Plus, Shield, ShieldOff, Star, MapPin, Trash2,
  Map, Bell, Zap, Info,
} from "lucide-react";
import {
  useAdminDashboard,
  usePendingSindicos,
  useApproveSindico,
  useRejectSindico,
  useAdminRides,
  useSindicos,
  useAdminMotoristas,
  useCreateMotorista,
  useToggleBlockMotorista,
  useDeleteMotorista,
  useToggleBlockSindico,
  useDeleteSindico,
  useAdminRoutes,
  useCreateAdminRoute,
  useUpdateAdminRoute,
  useDeleteAdminRoute,
  useExportAdminRides,
} from "@/hooks";
import { Button, Card, RideStatusBadge, Spinner, Pagination } from "@/components/ui";

// ── AdminDashboard ─────────────────────────────────────────────────────────
export function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();
  const { data: pending } = usePendingSindicos();
  const approve = useApproveSindico();
  const reject = useRejectSindico();
  const { data: ridesData } = useAdminRides({ limit: 5 });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading)
    return (
      <div className="flex justify-center pt-20">
        <Spinner />
      </div>
    );

  const metrics = [
    {
      label: "Síndicos ativos",
      value: data?.sindicos?.total ?? 0,
      icon: Users,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Corridas este mês",
      value: data?.rides?.thisMonth ?? 0,
      icon: Car,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Aprovações pendentes",
      value: data?.sindicos?.pending ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Motoristas ativos",
      value: data?.motoristas?.total ?? 0,
      icon: Gauge,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">Dashboard</h1>
        <span className="text-xs text-gray-400">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </span>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4">
            <div
              className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Aprovações pendentes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">
              Aprovações pendentes
            </h2>
            <span className="badge-warning">{pending?.length ?? 0}</span>
          </div>
          {!pending?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Nenhuma pendência
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {pending.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 text-xs font-medium flex-shrink-0">
                    {u.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n: string) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {u.sindico?.condominiumName}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(u.createdAt), "dd/MM")}
                  </span>
                  {rejectingId === u.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        className="input-field text-xs h-7 w-28"
                        placeholder="Motivo..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          reject.mutate({ userId: u.id, reason: rejectReason });
                          setRejectingId(null);
                        }}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => approve.mutate(u.id)}
                        className="w-7 h-7 rounded-lg border border-green-200 text-green-600 flex items-center justify-center hover:bg-green-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRejectingId(u.id)}
                        className="w-7 h-7 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Corridas recentes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">
              Corridas em tempo real
            </h2>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ao vivo
            </div>
          </div>
          {!ridesData?.rides?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Sem corridas ativas
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {ridesData.rides.map((ride: any) => (
                <div
                  key={ride.id}
                  className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      ride.status === "EM_ANDAMENTO"
                        ? "bg-green-500 animate-pulse"
                        : ride.status === "AGENDADA"
                          ? "bg-brand-400"
                          : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {ride.sindico?.user?.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      → {ride.destAddress}
                    </p>
                  </div>
                  <RideStatusBadge status={ride.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── AdminSindicos ──────────────────────────────────────────────────────────
export function AdminSindicosPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data, isLoading } = useSindicos(statusFilter || undefined, page);
  const approve = useApproveSindico();
  const reject  = useRejectSindico();
  const block   = useToggleBlockSindico();
  const remove  = useDeleteSindico();

  const statusOptions = [
    { label: "Todos", value: "" },
    { label: "Aprovados", value: "ATIVO" },
    { label: "Pendentes", value: "PENDENTE" },
    { label: "Bloqueados", value: "BLOQUEADO" },
  ];

  const statusVariant: Record<string, string> = {
    ATIVO: "badge-success",
    PENDENTE: "badge-warning",
    BLOQUEADO: "badge-danger",
    REJEITADO: "badge-danger",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">Síndicos</h1>
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === opt.value
                  ? "bg-brand-50 border-brand-600 text-brand-800"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Síndico", "Condomínio", "CPF", "Cadastro", "Status", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <Spinner className="w-5 h-5 mx-auto" />
                </td>
              </tr>
            ) : !data?.users?.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-gray-400 text-sm"
                >
                  Nenhum síndico encontrado
                </td>
              </tr>
            ) : (
              data.users.map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 hover:bg-gray-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium">
                        {u.name
                          ?.split(" ")
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium text-gray-900">
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.sindico?.condominiumName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.cpf}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {u.createdAt
                      ? format(new Date(u.createdAt), "dd/MM/yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusVariant[u.status] ?? "badge-gray"}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {u.status === "PENDENTE" && rejectingId === u.id ? (
                        <>
                          <input
                            className="input-field text-xs h-7 w-28"
                            placeholder="Motivo..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              reject.mutate({ userId: u.id, reason: rejectReason });
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(""); }}
                            className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {u.status === "PENDENTE" && (
                            <>
                              <button
                                onClick={() => approve.mutate(u.id)}
                                title="Aprovar"
                                className="w-7 h-7 rounded-lg border border-green-200 text-green-600 flex items-center justify-center hover:bg-green-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRejectingId(u.id)}
                                title="Rejeitar"
                                className="w-7 h-7 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {(u.status === "ATIVO" || u.status === "BLOQUEADO") && (
                            <button
                              onClick={() => block.mutate(u.id)}
                              title={u.status === "ATIVO" ? "Bloquear" : "Desbloquear"}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                                u.status === "ATIVO"
                                  ? "border-red-200 text-red-500 hover:bg-red-50"
                                  : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}
                            >
                              {u.status === "ATIVO"
                                ? <ShieldOff className="w-3.5 h-3.5" />
                                : <Shield className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Remover ${u.name}? Esta ação não pode ser desfeita.`)) {
                                remove.mutate(u.id)
                              }
                            }}
                            title="Remover"
                            className="w-7 h-7 rounded-lg border border-red-200 text-red-400 flex items-center justify-center hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPrev={() => setPage(p => p - 1)}
        onNext={() => setPage(p => p + 1)}
      />
    </div>
  );
}

// ── AdminRides ─────────────────────────────────────────────────────────────
export function AdminRidesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminRides({ page, limit: 15 });
  const exportCSV = useExportAdminRides();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">Corridas</h1>
        <button
          onClick={() => exportCSV.mutate(undefined)}
          disabled={exportCSV.isPending}
          className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 flex items-center gap-1.5 hover:border-gray-300 disabled:opacity-50"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {exportCSV.isPending ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[
                "Status",
                "Síndico",
                "Motorista",
                "Destino",
                "Horário",
                "Km",
                "Avaliação",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Spinner className="w-5 h-5 mx-auto" />
                </td>
              </tr>
            ) : !data?.rides?.length ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-400 text-sm"
                >
                  Nenhuma corrida encontrada
                </td>
              </tr>
            ) : (
              data.rides.map((ride: any) => (
                <tr
                  key={ride.id}
                  className="border-b border-gray-50 hover:bg-gray-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <RideStatusBadge status={ride.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {ride.sindico?.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ride.motorista?.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                    {ride.destAddress}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {ride.scheduledAt
                      ? format(new Date(ride.scheduledAt), "dd/MM HH:mm")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {ride.estimatedDistanceKm
                      ? `${ride.estimatedDistanceKm} km`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {ride.rating ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((s: number) => (
                            <Star key={s} className={`w-3 h-3 ${s <= ride.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        {ride.ratingComment && (
                          <p className="text-[10px] text-gray-400 max-w-[140px] truncate" title={ride.ratingComment}>
                            {ride.ratingComment}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPrev={() => setPage(p => p - 1)}
        onNext={() => setPage(p => p + 1)}
      />
    </div>
  );
}

// ── AdminMotoristas ────────────────────────────────────────────────────────
const MOTORISTA_EMPTY = {
  name: '', email: '', cpf: '', phone: '', password: '',
  vehicleBrand: '', vehicleModel: '', vehicleColor: '', vehiclePlate: '',
  vehicleYear: new Date().getFullYear(),
  cnhNumber: '', cnhCategory: 'B', cnhExpiry: '',
}

export function AdminMotoristasPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminMotoristas(page)
  const create = useCreateMotorista()
  const block  = useToggleBlockMotorista()
  const remove = useDeleteMotorista()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(MOTORISTA_EMPTY)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate(
      { ...form, vehicleYear: Number(form.vehicleYear) },
      { onSuccess: () => { setShowForm(false); setForm(MOTORISTA_EMPTY) } },
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">Motoristas</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" />
          Novo motorista
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-gray-900">Cadastrar motorista</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dados pessoais</p>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Nome completo"       value={form.name}     onChange={e => set('name', e.target.value)}     required />
                <input className="input-field" placeholder="CPF"                 value={form.cpf}      onChange={e => set('cpf', e.target.value)}      required />
                <input className="input-field" type="email" placeholder="E-mail" value={form.email}    onChange={e => set('email', e.target.value)}    required />
                <input className="input-field" placeholder="Celular"             value={form.phone}    onChange={e => set('phone', e.target.value)}    required />
                <input className="input-field col-span-2" type="password" placeholder="Senha (mín. 8 caracteres)" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Veículo</p>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Marca"  value={form.vehicleBrand} onChange={e => set('vehicleBrand', e.target.value)} required />
                <input className="input-field" placeholder="Modelo" value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} required />
                <input className="input-field" placeholder="Cor"    value={form.vehicleColor} onChange={e => set('vehicleColor', e.target.value)} required />
                <input className="input-field" placeholder="Placa"  value={form.vehiclePlate} onChange={e => set('vehiclePlate', e.target.value)} required />
                <input className="input-field" type="number" placeholder="Ano" value={form.vehicleYear} onChange={e => set('vehicleYear', e.target.value)} required />
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">CNH</p>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Número CNH"    value={form.cnhNumber}   onChange={e => set('cnhNumber', e.target.value)}   required />
                <input className="input-field" placeholder="Categoria (B)" value={form.cnhCategory} onChange={e => set('cnhCategory', e.target.value)} required />
                <input className="input-field col-span-2" type="date" placeholder="Validade CNH" value={form.cnhExpiry} onChange={e => set('cnhExpiry', e.target.value)} required />
              </div>
              {create.isError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {(create.error as any)?.response?.data?.message ?? 'Erro ao cadastrar motorista.'}
                </p>
              )}
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" loading={create.isPending}>Cadastrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Motorista', 'CPF', 'Veículo', 'Placa', 'Avaliação', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8"><Spinner className="w-5 h-5 mx-auto" /></td></tr>
            ) : !data?.motoristas?.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Nenhum motorista cadastrado</td></tr>
            ) : (
              data.motoristas.map((m: any) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium">
                        {m.user?.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{m.user?.name}</p>
                        <p className="text-gray-400 text-[11px]">{m.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.user?.cpf}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.vehicleBrand} {m.vehicleModel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.vehiclePlate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {m.ratingAvg?.toFixed(1) ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={m.user?.status === 'ATIVO' ? 'badge-success' : 'badge-danger'}>
                      {m.user?.status === 'ATIVO' ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => block.mutate(m.userId)}
                        title={m.user?.status === 'ATIVO' ? 'Bloquear' : 'Desbloquear'}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                          m.user?.status === 'ATIVO'
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {m.user?.status === 'ATIVO' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remover ${m.user?.name}? Esta ação não pode ser desfeita.`)) {
                            remove.mutate(m.userId)
                          }
                        }}
                        title="Remover"
                        className="w-7 h-7 rounded-lg border border-red-200 text-red-400 flex items-center justify-center hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPrev={() => setPage(p => p - 1)}
        onNext={() => setPage(p => p + 1)}
      />
    </div>
  )
}

// ── AdminRoutesPage ────────────────────────────────────────────────────────
const ROUTE_EMPTY = { name: '', category: '', address: '', district: '', lat: '', lng: '', isPopular: false }

export function AdminRoutesPage() {
  const { data: routes, isLoading } = useAdminRoutes()
  const create = useCreateAdminRoute()
  const update = useUpdateAdminRoute()
  const remove = useDeleteAdminRoute()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(ROUTE_EMPTY)

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate(
      { ...form, lat: parseFloat(form.lat as string), lng: parseFloat(form.lng as string) },
      { onSuccess: () => { setShowForm(false); setForm(ROUTE_EMPTY) } },
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">Destinos sugeridos</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" />
          Nova rota
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-gray-900">Nova rota sugerida</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input className="input-field" placeholder="Nome (ex: Prefeitura de Londrina)" value={form.name}     onChange={e => set('name', e.target.value)}     required />
              <input className="input-field" placeholder="Categoria (ex: Órgão público)"    value={form.category} onChange={e => set('category', e.target.value)} />
              <input className="input-field" placeholder="Endereço"                          value={form.address}  onChange={e => set('address', e.target.value)}  required />
              <input className="input-field" placeholder="Bairro"                            value={form.district} onChange={e => set('district', e.target.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Latitude (ex: -23.3105)"  value={form.lat} onChange={e => set('lat', e.target.value)} required />
                <input className="input-field" placeholder="Longitude (ex: -51.1628)" value={form.lng} onChange={e => set('lng', e.target.value)} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.isPopular as boolean} onChange={e => set('isPopular', e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
                Destino popular (aparece primeiro)
              </label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" loading={create.isPending}>Criar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Nome', 'Categoria', 'Endereço', 'Bairro', 'Popular', 'Ativo', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8"><Spinner className="w-5 h-5 mx-auto" /></td></tr>
            ) : !routes?.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Nenhuma rota cadastrada</td></tr>
            ) : (
              routes.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                      {r.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.category ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{r.address}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.district}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => update.mutate({ id: r.id, isPopular: !r.isPopular })} className={`w-6 h-6 rounded flex items-center justify-center ${r.isPopular ? 'text-amber-500' : 'text-gray-300'}`}>
                      <Star className={`w-4 h-4 ${r.isPopular ? 'fill-amber-400' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => update.mutate({ id: r.id, isActive: !r.isActive })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.isActive ? 'bg-brand-600' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${r.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (window.confirm(`Desativar "${r.name}"?`)) remove.mutate(r.id) }} className="w-7 h-7 rounded-lg border border-red-200 text-red-400 flex items-center justify-center hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── AdminConfig ────────────────────────────────────────────────────────────
export function AdminConfigPage() {
  const integrations = [
    {
      icon: Map,
      label: 'OpenStreetMap + Nominatim',
      description: 'Geocodificação de endereços — sem chave de API',
      status: 'ok',
    },
    {
      icon: Zap,
      label: 'OSRM (Project-OSRM)',
      description: 'Cálculo de rota e distância — sem chave de API',
      status: 'ok',
    },
    {
      icon: Bell,
      label: 'Firebase Cloud Messaging (FCM)',
      description: 'Push notifications — requer FIREBASE_PROJECT_ID no .env',
      status: 'optional',
    },
    {
      icon: Info,
      label: 'Socket.io',
      description: 'Rastreamento em tempo real e notificações in-app',
      status: 'ok',
    },
  ]

  const operationalInfo = [
    { label: 'Sistema',           value: 'SindiRide v1.0' },
    { label: 'Região de operação', value: 'Londrina — PR e Região Metropolitana' },
    { label: 'Modalidade',         value: 'Corridas 100% gratuitas' },
    { label: 'Público-alvo',       value: 'Síndicos em exercício de função administrativa' },
    { label: 'Banco de dados',     value: 'PostgreSQL via Prisma ORM' },
    { label: 'Cache / filas',      value: 'Redis' },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-medium text-gray-900 mb-6">Configurações</h1>

      {/* Informações operacionais */}
      <Card className="mb-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Sistema</p>
        <div className="flex flex-col gap-3">
          {operationalInfo.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 text-sm">
              <span className="text-gray-500 flex-shrink-0">{label}</span>
              <span className="text-gray-800 font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Status das integrações */}
      <Card>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Integrações</p>
        <div className="flex flex-col gap-3">
          {integrations.map(({ icon: Icon, label, description, status }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-1 ${
                status === 'ok'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {status === 'ok' ? 'Ativo' : 'Opcional'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
