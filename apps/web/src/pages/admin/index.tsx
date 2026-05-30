import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Car,
  Clock,
  CheckCircle,
  X,
  Eye,
  TrendingUp,
  Gauge,
} from "lucide-react";
import {
  useAdminDashboard,
  usePendingSindicos,
  useApproveSindico,
  useRejectSindico,
  useAdminRides,
  useSindicos,
} from "@/hooks";
import { Button, Card, RideStatusBadge, Spinner } from "@/components/ui";

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
  const { data, isLoading } = useSindicos(statusFilter || undefined);
  const approve = useApproveSindico();
  const reject = useRejectSindico();

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
              onClick={() => setStatusFilter(opt.value)}
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
                    {u.status === "PENDENTE" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => approve.mutate(u.id)}
                          className="w-7 h-7 rounded-lg border border-green-200 text-green-600 flex items-center justify-center hover:bg-green-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── AdminRides ─────────────────────────────────────────────────────────────
export function AdminRidesPage() {
  const { data, isLoading } = useAdminRides();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-gray-900">Corridas</h1>
        <button className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 flex items-center gap-1.5 hover:border-gray-300">
          <TrendingUp className="w-3.5 h-3.5" />
          Exportar
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
                "",
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
                    <button className="text-brand-600 hover:text-brand-800">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
