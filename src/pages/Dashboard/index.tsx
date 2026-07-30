import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { getResumoDashboard } from "@/services/dashboard"
import {
  TrendingUp,
  PackageOpen,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  WalletCards
} from "lucide-react"

type Resumo = {
  condicionaisAbertas: number
  pecasEmCondicional: number
  vendidoNoMes: number
  recebidoNoMes: number
  aReceber: number
  parcelasVencidas: number
}

export function Dashboard() {
  const { usuario } = useAuth()
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await getResumoDashboard()
        setResumo(dados)
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a visão geral.")
      } finally {
        setCarregando(false)
      }
    }
    void carregar()
  }, [])

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando visão geral...</p>
      </div>
    )
  }

  if (erro || !resumo) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6">
        <p className="text-red-400">{erro || "Não foi possível carregar a visão geral."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">

      <div>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">
          {usuario?.loja?.nome ?? "Minha loja"}
        </p>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Visão Geral</h1>
      </div>

      <div className="relative bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 overflow-hidden shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)]">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <p className="text-emerald-500/80 text-sm font-semibold uppercase tracking-widest">Vendido no mês</p>
          </div>
          <p className="text-emerald-400 text-5xl font-bold tracking-tighter mt-2">
            {formatarMoeda(resumo.vendidoNoMes)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">

        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col justify-between aspect-square lg:aspect-auto lg:h-fit">
          <div className="flex items-center gap-2 text-zinc-400">
            <ArrowRightLeft size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">Abertas</p>
          </div>
          <p className="text-white text-4xl font-semibold tracking-tighter mt-4">
            {resumo.condicionaisAbertas}
          </p>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col justify-between aspect-square lg:aspect-auto lg:h-fit">
          <div className="flex items-center gap-2 text-zinc-400">
            <PackageOpen size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider pl-0.5">Peças Condicional</p>
          </div>
          <p className="text-white text-4xl font-semibold tracking-tighter mt-4">
            {resumo.pecasEmCondicional}
          </p>
        </div>

        <Link
          to="/financeiro"
          className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-5 flex flex-col justify-between col-span-2 hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2 text-emerald-500/70">
            <WalletCards size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">Recebido líquido no mês</p>
          </div>
          <p className="text-emerald-400 text-3xl font-semibold tracking-tighter mt-4">
            {formatarMoeda(resumo.recebidoNoMes)}
          </p>
        </Link>

        <Link
          to="/financeiro"
          className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-5 flex flex-col justify-between col-span-2 sm:col-span-1 hover:bg-amber-500/10 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2 text-amber-500/70">
            <Clock size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">A receber líquido</p>
          </div>
          <p className="text-amber-400 text-3xl font-semibold tracking-tighter mt-4">
            {formatarMoeda(resumo.aReceber)}
          </p>
        </Link>

        <Link
          to="/financeiro"
          className="bg-red-500/5 border border-red-500/10 rounded-3xl p-5 flex flex-col justify-between col-span-2 sm:col-span-1 hover:bg-red-500/10 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2 text-red-500/70">
            <AlertCircle size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">Vencidas</p>
          </div>
          <p className="text-red-400 text-3xl font-semibold tracking-tighter mt-4">
            {formatarMoeda(resumo.parcelasVencidas)}
          </p>
        </Link>

      </div>
    </div>
  )
}