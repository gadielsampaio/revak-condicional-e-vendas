import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  listarPagamentosPorMovimentacao,
  registrarPagamento,
  type FormaPagamento,
} from "@/services/pagamentos"
import {
  atualizarValorTotalMovimentacao,
  getMovimentacaoParaPagamento,
} from "@/services/movimentacoes"
import { arredondarCentavos, distribuirEmParcelas } from "@/lib/valores"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Banknote, QrCode, CreditCard, FileText, Calendar, Tag } from "lucide-react"

function lerNumero(valor: string) {
  return Number(valor.replace(",", "."))
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function Pagamento() {
  const { movimentacaoId } = useParams<{ movimentacaoId: string }>()
  const navigate = useNavigate()

  const [valorOriginal, setValorOriginal] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [jaPossuiPagamento, setJaPossuiPagamento] = useState(false)
  const [erroCarregamento, setErroCarregamento] = useState("")
  const [erroAcao, setErroAcao] = useState("")

  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "percentual">("percentual")
  const [desconto, setDesconto] = useState("")
  const [forma, setForma] = useState<FormaPagamento | null>(null)
  const [dataRecebimento, setDataRecebimento] = useState("")
  const [taxaCartao, setTaxaCartao] = useState("")
  const [numeroParcelas, setNumeroParcelas] = useState("2")
  const [primeiraData, setPrimeiraData] = useState("")
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carregar() {
      if (!movimentacaoId) {
        setErroCarregamento("Venda não encontrada.")
        setCarregando(false)
        return
      }

      try {
        const [movimentacao, pagamentos] = await Promise.all([
          getMovimentacaoParaPagamento(movimentacaoId),
          listarPagamentosPorMovimentacao(movimentacaoId),
        ])

        setValorOriginal(movimentacao.valor_total)
        setJaPossuiPagamento(pagamentos.length > 0)
      } catch (erro) {
        setErroCarregamento(
          erro instanceof Error ? erro.message : "Não foi possível carregar esta venda."
        )
      } finally {
        setCarregando(false)
      }
    }

    void carregar()
  }, [movimentacaoId])

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando venda...</p>
      </div>
    )
  }

  if (erroCarregamento || valorOriginal === null || !movimentacaoId) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-4">
        <p className="text-red-400 font-medium">{erroCarregamento || "Venda não encontrada."}</p>
        <Button onClick={() => navigate("/vendas")} className="bg-white text-black hover:bg-zinc-200">
          Voltar para vendas
        </Button>
      </div>
    )
  }

  if (jaPossuiPagamento) {
    return (
      <div className="space-y-5 bg-white/5 border border-white/10 rounded-3xl p-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Pagamento já registrado</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Esta venda já possui parcelas ou recebimentos. Nenhum novo pagamento foi criado.
          </p>
        </div>
        <Button
          onClick={() => navigate(`/pagamentos/${movimentacaoId}`)}
          className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-semibold"
        >
          Ver pagamentos
        </Button>
      </div>
    )
  }

  const valorBase = valorOriginal
  const descontoNumerico = desconto ? lerNumero(desconto) : 0
  const descontoInvalido =
    !Number.isFinite(descontoNumerico) ||
    descontoNumerico < 0 ||
    (tipoDesconto === "percentual" && descontoNumerico > 100) ||
    (tipoDesconto === "valor" && descontoNumerico > valorBase)

  const valorDesconto = descontoInvalido
    ? 0
    : tipoDesconto === "percentual"
      ? (valorBase * descontoNumerico) / 100
      : descontoNumerico
  const valorTotal = arredondarCentavos(Math.max(0, valorBase - valorDesconto))

  const taxaNumerica = taxaCartao ? lerNumero(taxaCartao) : 0
  const taxaInvalida =
    !Number.isFinite(taxaNumerica) || taxaNumerica < 0 || taxaNumerica > 100
  const parcelasNumericas = Number(numeroParcelas)
  const parcelasInvalidas =
    !Number.isInteger(parcelasNumericas) || parcelasNumericas < 1 || parcelasNumericas > 120

  const valorLiquidoCartao =
    forma === "cartao" && !taxaInvalida
      ? arredondarCentavos(valorTotal - (valorTotal * taxaNumerica) / 100)
      : null

  const valoresPromissoria =
    forma === "promissoria" && !parcelasInvalidas
      ? distribuirEmParcelas(valorTotal, parcelasNumericas)
      : []
  const menorParcela = valoresPromissoria.length ? Math.min(...valoresPromissoria) : 0
  const maiorParcela = valoresPromissoria.length ? Math.max(...valoresPromissoria) : 0

  let erroValidacao = ""
  if (descontoInvalido) erroValidacao = "Revise o desconto informado."
  else if (valorTotal <= 0) erroValidacao = "O valor final deve ser maior que zero."
  else if (forma === "cartao" && !dataRecebimento) erroValidacao = "Informe a data prevista de recebimento."
  else if (forma === "cartao" && taxaInvalida) erroValidacao = "A taxa deve estar entre 0% e 100%."
  else if (forma === "promissoria" && parcelasInvalidas) erroValidacao = "Informe entre 1 e 120 parcelas."
  else if (forma === "promissoria" && !primeiraData) erroValidacao = "Informe a data da primeira parcela."

  const podeConfirmar = !!forma && !salvando && !erroValidacao

  async function handleConfirmar() {
    if (!forma || !movimentacaoId || erroValidacao) return

    setSalvando(true)
    setErroAcao("")
    const alterouValor = Math.abs(valorBase - valorTotal) > 0.009

    try {
      if (alterouValor) {
        await atualizarValorTotalMovimentacao(movimentacaoId, valorTotal)
      }

      try {
        await registrarPagamento({
          movimentacao_id: movimentacaoId,
          forma_pagamento: forma,
          valor_total: valorTotal,
          data_recebimento: dataRecebimento || undefined,
          taxa_cartao: taxaNumerica,
          numero_parcelas: parcelasNumericas,
          primeira_data: primeiraData || undefined,
        })
      } catch (erro) {
        if (alterouValor) {
          await atualizarValorTotalMovimentacao(movimentacaoId, valorBase)
        }
        throw erro
      }

      navigate(`/pagamentos/${movimentacaoId}`)
    } catch (erro) {
      setErroAcao(
        erro instanceof Error ? erro.message : "Não foi possível registrar o pagamento."
      )
    } finally {
      setSalvando(false)
    }
  }

  const opcoes: { valor: FormaPagamento; label: string; icon: typeof Banknote }[] = [
    { valor: "pix", label: "Pix", icon: QrCode },
    { valor: "dinheiro", label: "Dinheiro", icon: Banknote },
    { valor: "cartao", label: "Cartão", icon: CreditCard },
    { valor: "promissoria", label: "Promissória", icon: FileText },
  ]

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Pagamento</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">Como o cliente vai pagar?</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="text-center">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1">
            {valorDesconto > 0 ? "Valor com desconto" : "Valor total"}
          </p>
          <p className="text-white text-4xl font-bold tracking-tighter">
            {formatarMoeda(valorTotal)}
          </p>
          {valorDesconto > 0 && (
            <p className="text-zinc-500 text-sm mt-1 line-through">
              {formatarMoeda(valorBase)}
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-2">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 flex items-center gap-1.5">
            <Tag size={12} /> Desconto (opcional)
          </label>
          <div className="flex gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setTipoDesconto("percentual")}
                className={`px-3 h-12 font-medium text-sm transition-colors ${
                  tipoDesconto === "percentual" ? "bg-white text-black" : "text-zinc-400"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setTipoDesconto("valor")}
                className={`px-3 h-12 font-medium text-sm transition-colors ${
                  tipoDesconto === "valor" ? "bg-white text-black" : "text-zinc-400"
                }`}
              >
                R$
              </button>
            </div>
            <Input
              inputMode="decimal"
              placeholder={tipoDesconto === "percentual" ? "Ex: 10" : "Ex: 20,00"}
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
            />
          </div>
          {descontoInvalido && <p className="text-red-400 text-xs pl-1">Revise o desconto informado.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {opcoes.map((opcao) => {
          const Icon = opcao.icon
          const ativo = forma === opcao.valor
          return (
            <button
              key={opcao.valor}
              onClick={() => setForma(opcao.valor)}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all active:scale-[0.98] ${
                ativo
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              }`}
            >
              <Icon size={24} strokeWidth={2} />
              <span className="font-medium tracking-tight">{opcao.label}</span>
            </button>
          )
        })}
      </div>

      {forma === "cartao" && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-2">
            <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Calendar size={12} /> Data prevista de recebimento
            </label>
            <Input
              type="date"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">
              Taxa da máquina (%) — opcional
            </label>
            <Input
              inputMode="decimal"
              placeholder="Ex: 3,5"
              value={taxaCartao}
              onChange={(e) => setTaxaCartao(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
            />
            {taxaInvalida && <p className="text-red-400 text-xs pl-1">Informe uma taxa entre 0% e 100%.</p>}
          </div>

          {valorLiquidoCartao !== null && (
            <p className="text-zinc-400 text-sm">
              Entrada líquida prevista:{" "}
              <span className="text-emerald-400 font-medium">
                {formatarMoeda(valorLiquidoCartao)}
              </span>
            </p>
          )}
        </div>
      )}

      {forma === "promissoria" && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-2">
            <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">
              Número de parcelas
            </label>
            <Input
              type="number"
              min={1}
              max={120}
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
            />
            {parcelasInvalidas && <p className="text-red-400 text-xs pl-1">Informe entre 1 e 120 parcelas.</p>}
          </div>

          <div className="space-y-2">
            <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Calendar size={12} /> Data da 1ª parcela
            </label>
            <Input
              type="date"
              value={primeiraData}
              onChange={(e) => setPrimeiraData(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4"
            />
          </div>

          {valoresPromissoria.length > 0 && (
            <p className="text-zinc-400 text-sm">
              {parcelasNumericas} parcelas{" "}
              <span className="text-white font-medium">
                {menorParcela === maiorParcela
                  ? `de ${formatarMoeda(maiorParcela)}`
                  : `entre ${formatarMoeda(menorParcela)} e ${formatarMoeda(maiorParcela)}`}
              </span>
            </p>
          )}
        </div>
      )}

      {(erroValidacao || erroAcao) && (
        <p className="text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-xl p-3">
          {erroAcao || erroValidacao}
        </p>
      )}

      <Button
        className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-50"
        disabled={!podeConfirmar}
        onClick={handleConfirmar}
      >
        {salvando ? "Salvando..." : "Confirmar pagamento"}
      </Button>
    </div>
  )
}
