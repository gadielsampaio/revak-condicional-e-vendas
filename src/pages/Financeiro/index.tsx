import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getFaturaMensal, type ParcelaFatura, type ResumoFatura } from "@/services/financeiro"
import { gerarLinkWhatsapp, mensagemLembrete } from "@/services/whatsapp"
import {
  listarModelosMensagemComFallback,
  MODELOS_MENSAGEM_PADRAO,
  type ModelosMensagem,
} from "@/services/modelosMensagens"
import { useAuth } from "@/hooks/useAuth"
import { hojeLocalISO } from "@/lib/datas"
import { ChevronLeft, ChevronRight, AlertCircle, MessageCircle, CheckCircle2, WalletCards, TrendingUp } from "lucide-react"

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function rotuloFormaPagamento(forma: string) {
  const rotulos: Record<string, string> = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao: "Cartão",
    promissoria: "Promissória",
  }

  return rotulos[forma] ?? forma
}

function nomeDoMes(ano: number, mes: number) {
  const data = new Date(ano, mes - 1, 1)
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function Financeiro() {
  const { usuario } = useAuth()
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [fatura, setFatura] = useState<ResumoFatura | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [modelosMensagem, setModelosMensagem] = useState<ModelosMensagem>({
    ...MODELOS_MENSAGEM_PADRAO,
  })

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro("")
      try {
        const dados = await getFaturaMensal(ano, mes)
        setFatura(dados)
      } catch (falha) {
        setFatura(null)
        setErro(falha instanceof Error ? falha.message : "Não foi possível carregar o financeiro.")
      } finally {
        setCarregando(false)
      }
    }
    void carregar()
  }, [ano, mes])

  useEffect(() => {
    void listarModelosMensagemComFallback(usuario?.loja_id).then(setModelosMensagem)
  }, [usuario?.loja_id])

  function mudarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes)
    setAno(novoAno)
  }

  function handleLembrete(parcela: ParcelaFatura) {
    if (!parcela.cliente_telefone) return

    const link = gerarLinkWhatsapp(
      parcela.cliente_telefone,
      mensagemLembrete({
        modelo: modelosMensagem.cobranca,
        nomeCliente: parcela.cliente_nome,
        parcela: parcela.parcela,
        totalParcelas: parcela.total_parcelas,
        valor: parcela.valor_bruto,
        vencimento: parcela.vencimento,
        formaPagamento: parcela.forma_pagamento,
        nomeLoja: usuario?.loja?.nome ?? "Loja",
      })
    )
    window.open(link, "_blank")
  }

  const hojeStr = hojeLocalISO()

  return (
    <div className="space-y-6 pb-10">

      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Financeiro</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">Suas entradas líquidas mês a mês.</p>
      </div>

      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2">
        <button
          onClick={() => mudarMes(-1)}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="text-white font-semibold tracking-tight">{nomeDoMes(ano, mes)}</p>
        <button
          onClick={() => mudarMes(1)}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm font-medium tracking-tight">Calculando fatura...</p>
        </div>
      ) : erro || !fatura ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
          <p className="text-red-400 text-sm">{erro || "Não foi possível carregar o financeiro."}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3.5">
            <div className="bg-linear-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute -right-8 -top-8 text-white/5 pointer-events-none">
                <WalletCards size={120} strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1">Faturamento do mês</p>
                <p className="text-white text-5xl font-bold tracking-tighter">
                  {formatarMoeda(fatura.previsto)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-emerald-500/70">
                  <TrendingUp size={14} />  
                  <p className="text-[10px] font-semibold uppercase tracking-wider">Recebido</p>
                </div>
                <p className="text-emerald-400 text-lg font-semibold tracking-tighter mt-3">
                  {formatarMoeda(fatura.recebido)}
                </p>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-amber-500/70">
                  <WalletCards size={14} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider">A Receber</p>
                </div>
                <p className="text-amber-400 text-lg font-semibold tracking-tighter mt-3">
                  {formatarMoeda(fatura.aFaltar)}
                </p>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-red-500/70">
                  <AlertCircle size={14} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider">Vencido</p>
                </div>
                <p className="text-red-400 text-lg font-semibold tracking-tighter mt-3">
                  {formatarMoeda(fatura.vencido)}
                </p>
              </div>
            </div>
          </div>

          {fatura.parcelas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/2 border border-white/5 rounded-[2rem]">
              <CheckCircle2 size={32} className="text-zinc-600 mb-3" strokeWidth={1.5} />
              <p className="text-zinc-400 font-medium">Nenhuma parcela nesse mês.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest px-1">Parcelas do mês</p>
              {fatura.parcelas.map((p) => {
                const vencida = p.status === "pendente" && p.vencimento < hojeStr
                return (
                  <Link
                    key={p.id}
                    to={`/pagamentos/${p.movimentacao_id}`}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl gap-3 hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium tracking-tight truncate">{p.cliente_nome}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-zinc-400 text-xs font-medium">
                          {rotuloFormaPagamento(p.forma_pagamento)}
                          {p.forma_pagamento === "promissoria" && ` • ${p.parcela}/${p.total_parcelas}`}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md border ${
                          p.status === "pago"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : vencida
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {p.status === "pago"
                            ? "Pago"
                            : p.forma_pagamento === "cartao"
                              ? "Repasse"
                              : vencida
                                ? "Vencido"
                                : "Pendente"}
                        </span>
                        <span className="text-zinc-500 text-xs">
                          {p.status === "pago"
                            ? `recebido em ${formatarData(p.data_pagamento!)}`
                            : p.forma_pagamento === "cartao"
                              ? `repasse previsto ${formatarData(p.vencimento)}`
                              : `vence ${formatarData(p.vencimento)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-white font-bold tracking-tight">{formatarMoeda(p.valor)}</p>
                      {p.status === "pendente" && p.forma_pagamento !== "cartao" && p.cliente_telefone && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleLembrete(p)
                          }}
                          className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center hover:bg-amber-500/20 active:scale-95 transition-all"
                          title="Enviar lembrete"
                        >
                          <MessageCircle size={16} />
                        </button>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
