import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { listarHistoricoVendas } from "@/services/movimentacoes"
import { hojeLocalISO } from "@/lib/datas"
import {
  Plus,
  ShoppingBag,
  Calendar,
  ArrowRightLeft,
  ChevronRight,
  Receipt,
  Wallet,
  AlertCircle,
  Clock3,
  CheckCircle2,
} from "lucide-react"

type ItemComProduto = {
  id: string
  descricao: string
  quantidade: number
  quantidade_vendida: number
  produtos: { nome: string } | null
}

type PagamentoResumo = {
  id: string
  valor: number
  valor_liquido: number | null
  vencimento: string
  data_pagamento: string | null
  status: "pendente" | "pago"
  forma_pagamento: string
}

type MovimentacaoComRelacoes = {
  id: string
  tipo: string
  status: string
  data_envio: string
  data_retorno: string | null
  valor_total: number
  clientes: { nome: string } | null
  movimentacao_itens: ItemComProduto[]
  pagamentos: PagamentoResumo[]
}

type StatusVisual = "fechada" | "andamento" | "atrasada" | "parcial" | "receber"

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function statusDaVenda(mov: MovimentacaoComRelacoes): StatusVisual {
  const pagamentos = mov.pagamentos ?? []
  if (pagamentos.length === 0) return "andamento"

  const pendentes = pagamentos.filter((p) => p.status === "pendente")
  const pagos = pagamentos.filter((p) => p.status === "pago")
  if (pendentes.length === 0) return "fechada"
  if (pendentes.some((p) => p.vencimento < hojeLocalISO())) return "atrasada"
  if (pagos.length > 0) return "parcial"
  return "receber"
}

const statusConfig: Record<StatusVisual, { label: string; classe: string; icon: typeof Clock3 }> = {
  fechada: { label: "Fechada", classe: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  andamento: { label: "Em andamento", classe: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20", icon: Clock3 },
  atrasada: { label: "Atrasada", classe: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle },
  parcial: { label: "Parcial", classe: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Wallet },
  receber: { label: "A receber", classe: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Wallet },
}

export function Vendas() {
  const [historico, setHistorico] = useState<MovimentacaoComRelacoes[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const dados = await listarHistoricoVendas()
      setHistorico((dados as MovimentacaoComRelacoes[]).filter((mov) => mov.status === "fechada" || mov.tipo === "venda"))
      setCarregando(false)
    }
    void carregar()
  }, [])

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-white text-3xl font-semibold tracking-tighter">Vendas</h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Sacolas fechadas, em andamento e valores a receber.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/financeiro"><Button className="bg-white/5 text-white hover:bg-white/10 border border-white/10 h-11 rounded-xl px-4 font-semibold text-sm"><Wallet size={18} className="mr-1.5"/> Financeiro</Button></Link>
          <Link to="/vendas/nova"><Button className="bg-white text-black hover:bg-zinc-200 h-11 rounded-xl px-4 font-semibold text-sm"><Plus size={18} className="mr-1.5"/> Nova</Button></Link>
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div><p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando histórico...</p></div>
      ) : historico.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/2 border border-white/5 rounded-[2rem]"><Receipt size={32} className="text-zinc-600 mb-3"/><p className="text-zinc-400 font-medium text-lg tracking-tight">Nenhuma venda registrada.</p></div>
      ) : (
        <div className="space-y-4">
          {historico.map((mov) => {
            const itensVendidos = mov.movimentacao_itens.filter((item) => mov.tipo === "condicional" ? item.quantidade_vendida > 0 : true)
            if (itensVendidos.length === 0) return null

            const isCondicional = mov.tipo === "condicional"
            const status = statusDaVenda(mov)
            const config = statusConfig[status]
            const StatusIcon = config.icon
            const possuiPagamento = (mov.pagamentos ?? []).length > 0

            return (
              <div key={mov.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 shadow-lg hover:bg-white/[0.07] transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-white font-medium text-lg tracking-tight leading-none">{mov.clientes?.nome}</p>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium pt-1"><Calendar size={12}/>{formatarData(mov.data_retorno ?? mov.data_envio)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-white font-bold text-xl tracking-tighter">{formatarMoeda(mov.valor_total)}</p>
                    <div className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md border ${config.classe}`}><StatusIcon size={10} strokeWidth={3}/>{config.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                  {isCondicional ? <ArrowRightLeft size={11}/> : <ShoppingBag size={11}/>} {isCondicional ? "Condicional" : "Venda direta"}
                </div>

                <div className="bg-black/30 border border-white/5 rounded-2xl p-3 space-y-2">
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest pl-1 mb-2">Itens faturados</p>
                  {itensVendidos.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5 text-sm px-1"><span className="text-zinc-500 font-medium">{isCondicional ? item.quantidade_vendida : item.quantidade}x</span><p className="text-zinc-300 font-medium leading-tight">{item.produtos?.nome ?? item.descricao}</p></div>
                  ))}
                </div>

                <Link to={possuiPagamento ? `/pagamentos/${mov.id}` : `/pagamento/${mov.id}`} className="block pt-2">
                  <Button className="w-full bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border border-white/5 rounded-xl h-12 font-medium group flex justify-between px-4"><span>{possuiPagamento ? "Ver pagamentos" : "Continuar recebimento"}</span><ChevronRight size={18} className="text-zinc-500 group-hover:text-white"/></Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
