/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  listarPagamentosPorMovimentacao,
  marcarComoPagas,
  quitarRestante,
  pagarParcialmente,
  type Pagamento,
} from "@/services/pagamentos"
import { getClienteDaMovimentacao } from "@/services/movimentacoes"
import { gerarLinkWhatsapp, mensagemLembrete, mensagemComprovante, rotuloParcela } from "@/services/whatsapp"
import { useAuth } from "@/hooks/useAuth"
import { valorFinanceiro } from "@/lib/valores"
import {
  listarModelosMensagemComFallback,
  MODELOS_MENSAGEM_PADRAO,
  type ModelosMensagem,
} from "@/services/modelosMensagens"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Calendar,
  Check,
  AlertCircle,
  MessageCircle,
  SplitSquareHorizontal,
} from "lucide-react"

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor: number | string) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function DetalhePagamentos() {
  const { movimentacaoId } = useParams<{ movimentacaoId: string }>()
  const { usuario } = useAuth()
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [cliente, setCliente] = useState<{ nome: string; telefone: string | null } | null>(null)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [modelosMensagem, setModelosMensagem] = useState<ModelosMensagem>({
    ...MODELOS_MENSAGEM_PADRAO,
  })

  const [parcelaParcial, setParcelaParcial] = useState<Pagamento | null>(null)
  const [valorParcial, setValorParcial] = useState("")
  const [novaData, setNovaData] = useState("")

  const carregar = useCallback(async () => {
    if (!movimentacaoId) return

    setCarregando(true)
    try {
      const [dadosPagamentos, dadosCliente] = await Promise.all([
        listarPagamentosPorMovimentacao(movimentacaoId),
        getClienteDaMovimentacao(movimentacaoId),
      ])
      setPagamentos(dadosPagamentos)
      setCliente(dadosCliente)
      setSelecionados([])
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao carregar os pagamentos.")
    } finally {
      setCarregando(false)
    }
  }, [movimentacaoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    void listarModelosMensagemComFallback(usuario?.loja_id).then(setModelosMensagem)
  }, [usuario?.loja_id])

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handlePagarSelecionados() {
    if (selecionados.length === 0) return

    setProcessando(true)
    try {
      await marcarComoPagas(selecionados)
      await carregar()
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao registrar o recebimento.")
    } finally {
      setProcessando(false)
    }
  }

  async function handleQuitarTudo() {
    if (!movimentacaoId) return

    setProcessando(true)
    try {
      await quitarRestante(movimentacaoId)
      await carregar()
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao quitar as parcelas.")
    } finally {
      setProcessando(false)
    }
  }

  function abrirPagamentoParcial(pagamento: Pagamento) {
    setParcelaParcial(pagamento)
    setValorParcial(String(valorFinanceiro(pagamento)).replace(".", ","))
    setNovaData(pagamento.vencimento)
  }

  async function confirmarPagamentoParcial() {
    if (!parcelaParcial) return

    const valor = Number(valorParcial.replace(",", "."))
    if (!Number.isFinite(valor) || valor <= 0) return

    const saldoAReceber = pagamentos
      .filter((p) => p.status === "pendente")
      .reduce((soma, p) => soma + valorFinanceiro(p), 0)

    if (valor > saldoAReceber + 0.009) {
      alert(`O máximo que pode ser recebido é ${formatarMoeda(saldoAReceber)}`)
      return
    }

    setProcessando(true)
    try {
      await pagarParcialmente(
        parcelaParcial,
        valor,
        valor < valorFinanceiro(parcelaParcial) ? novaData || undefined : undefined
      )
      setParcelaParcial(null)
      await carregar()
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao registrar pagamento.")
    } finally {
      setProcessando(false)
    }
  }

  function abrirLembrete(pagamento: Pagamento) {
    if (!cliente?.telefone || pagamento.forma_pagamento === "cartao") return

    const link = gerarLinkWhatsapp(
      cliente.telefone,
      mensagemLembrete({
        modelo: modelosMensagem.cobranca,
        nomeCliente: cliente.nome,
        parcela: pagamento.parcela,
        totalParcelas: pagamento.total_parcelas,
        valor: Number(pagamento.valor),
        vencimento: pagamento.vencimento,
        formaPagamento: pagamento.forma_pagamento,
        nomeLoja: usuario?.loja?.nome ?? "Loja",
      })
    )
    window.open(link, "_blank")
  }

  function abrirComprovante(pagamento: Pagamento) {
    if (!cliente?.telefone || !pagamento.data_pagamento) return

    const link = gerarLinkWhatsapp(
      cliente.telefone,
      mensagemComprovante({
        modelo: modelosMensagem.recibo,
        nomeCliente: cliente.nome,
        parcela: pagamento.parcela,
        totalParcelas: pagamento.total_parcelas,
        valor: Number(pagamento.valor),
        dataPagamento: pagamento.data_pagamento,
        formaPagamento: pagamento.forma_pagamento,
        nomeLoja: usuario?.loja?.nome ?? "Loja",
      })
    )
    window.open(link, "_blank")
  }

  const pendentes = pagamentos.filter((p) => p.status === "pendente")
  const pagos = pagamentos.filter((p) => p.status === "pago")
  const totalPago = pagos.reduce((soma, p) => soma + valorFinanceiro(p), 0)
  const totalPendente = pendentes.reduce((soma, p) => soma + valorFinanceiro(p), 0)
  const valorParcialNumerico = Number(valorParcial.replace(",", ".")) || 0
  const valorParcelaParcial = parcelaParcial ? valorFinanceiro(parcelaParcial) : 0

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando parcelas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Pagamentos</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">
          {cliente?.nome ?? "Acompanhe as parcelas e os recebimentos."}
        </p>
        {pagos.length > 0 && (
          <p className="text-zinc-500 text-sm mt-1">
            Recebido líquido:{" "}
            <span className="text-emerald-400 font-medium">{formatarMoeda(totalPago)}</span>
          </p>
        )}
        {!cliente?.telefone && (
          <p className="text-amber-400/80 text-xs mt-2">
            Cliente sem telefone cadastrado — não é possível enviar mensagens no WhatsApp.
          </p>
        )}
      </div>

      {pagamentos.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
          <p className="text-zinc-400">Nenhum pagamento foi registrado para esta venda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagamentos.map((p) => {
            const isPago = p.status === "pago"
            const isSelecionado = selecionados.includes(p.id)
            const valorExibido = valorFinanceiro(p)

            if (isPago) {
              return (
                <div
                  key={p.id}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/2 border border-white/5 opacity-90 transition-all gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-emerald-500/40 shrink-0">
                      <CheckCircle2 size={24} strokeWidth={2} />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-white font-medium tracking-tight">{rotuloParcela(p.parcela, p.total_parcelas)}</p>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium flex-wrap">
                        <span className="flex items-center gap-1"><CreditCard size={12}/> {p.forma_pagamento}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Check size={12}/> {formatarData(p.data_pagamento!)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-emerald-500/80 font-semibold tracking-tight">
                      {formatarMoeda(valorExibido)}
                    </p>
                    {cliente?.telefone && (
                      <button
                        onClick={() => abrirComprovante(p)}
                        className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 active:scale-95 transition-all shrink-0"
                        title="Enviar comprovante"
                      >
                        <MessageCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={p.id}
                className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all gap-3 bg-white/5 border-white/5 hover:bg-white/10"
              >
                <div
                  onClick={() => toggleSelecionado(p.id)}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-4 min-w-0 cursor-pointer flex-1"
                >
                  <div className={`transition-colors shrink-0 ${isSelecionado ? "text-white" : "text-zinc-600"}`}>
                    {isSelecionado ? <CheckCircle2 size={24} className="fill-white/20" /> : <Circle size={24} />}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-white font-medium tracking-tight">{rotuloParcela(p.parcela, p.total_parcelas)}</p>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium flex-wrap">
                      <span className="flex items-center gap-1"><CreditCard size={12}/> {p.forma_pagamento}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12}/>
                        {p.forma_pagamento === "cartao" ? "Repasse previsto" : "Vence"} {formatarData(p.vencimento)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-amber-400 font-bold tracking-tight text-lg">
                    {formatarMoeda(valorExibido)}
                  </p>
                  <button
                    onClick={() => abrirPagamentoParcial(p)}
                    className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shrink-0"
                    title="Receber valor parcial"
                  >
                    <SplitSquareHorizontal size={16} />
                  </button>
                  {cliente?.telefone && p.forma_pagamento !== "cartao" && (
                    <button
                      onClick={() => abrirLembrete(p)}
                      className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center hover:bg-amber-500/20 active:scale-95 transition-all shrink-0"
                      title="Enviar lembrete"
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="mt-8 bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-500">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <AlertCircle size={14} /> Total a receber
              </p>
              <p className="text-amber-400 font-bold text-4xl tracking-tighter">
                {formatarMoeda(totalPendente)}
              </p>
            </div>
            <p className="text-zinc-500 text-sm font-medium pb-1.5">
              {pendentes.length} {pendentes.length === 1 ? "parcela" : "parcelas"}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:bg-white/20 disabled:text-white"
              disabled={selecionados.length === 0 || processando}
              onClick={handlePagarSelecionados}
            >
              {processando
                ? "Processando..."
                : selecionados.length > 0
                  ? `Receber selecionada${selecionados.length > 1 ? "s" : ""} (${selecionados.length})`
                  : "Selecione para receber"}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-zinc-400 hover:text-white hover:bg-white/5 h-12 rounded-xl font-medium transition-all active:scale-[0.98]"
              disabled={processando}
              onClick={handleQuitarTudo}
            >
              Quitar todas de uma vez
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!parcelaParcial} onOpenChange={(open) => !open && setParcelaParcial(null)}>
        <DialogContent className="bg-zinc-900/90 backdrop-blur-3xl border border-white/10 sm:rounded-[2rem] p-6 shadow-2xl w-[90vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold tracking-tight">
              Recebimento parcial — {parcelaParcial ? rotuloParcela(parcelaParcial.parcela, parcelaParcial.total_parcelas) : "Pagamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              Valor a receber:{" "}
              <span className="text-white font-medium">{formatarMoeda(valorParcelaParcial)}</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">
                Quanto entrou agora?
              </label>
              <Input
                inputMode="decimal"
                value={valorParcial}
                onChange={(e) => setValorParcial(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
              />
            </div>

            {parcelaParcial && (
              <div className="space-y-1.5">
                {valorParcialNumerico < valorParcelaParcial && (
                  <>
                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">
                      Nova data para o restante
                    </label>
                    <Input
                      type="date"
                      value={novaData}
                      onChange={(e) => setNovaData(e.target.value)}
                      className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
                    />
                    <p className="text-zinc-500 text-xs pl-1">
                      Restante nesta parcela: {formatarMoeda(valorParcelaParcial - valorParcialNumerico)}
                    </p>
                  </>
                )}
                {valorParcialNumerico > valorParcelaParcial && (
                  <p className="text-emerald-400 text-xs pl-1">
                    Excedente de {formatarMoeda(valorParcialNumerico - valorParcelaParcial)} será abatido da próxima parcela pendente.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={confirmarPagamentoParcial}
              disabled={processando || valorParcialNumerico <= 0}
              className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-semibold"
            >
              {processando ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
