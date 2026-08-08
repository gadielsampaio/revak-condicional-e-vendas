/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AutocompleteBusca } from "@/components/AutocompleteBusca"
import { buscarProdutosPorNome, criarProduto, type Produto } from "@/services/produtos"
import {
  listarPagamentosPorMovimentacao,
  registrarPagamentoProgramado,
  registrarRecebimentoAgora,
  type FormaPagamento,
  type FormaRecebimento,
} from "@/services/pagamentos"
import {
  adicionarItemMovimentacao,
  atualizarValorTotalMovimentacao,
  getMovimentacaoParaPagamento,
  removerItemMovimentacao,
} from "@/services/movimentacoes"
import { arredondarCentavos, distribuirEmParcelas } from "@/lib/valores"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Banknote,
  QrCode,
  CreditCard,
  FileText,
  Calendar,
  Tag,
  Clock3,
  Zap,
  Plus,
  Trash2,
  ShoppingBag,
} from "lucide-react"

type TipoRecebimento = "agora" | "programado"

type ItemPagamento = {
  id: string
  produto_id: string
  descricao: string
  quantidade: number
  quantidade_vendida: number
  valor_unitario: number
  produtos: { nome: string } | null
}

type MovimentacaoPagamento = {
  id: string
  valor_total: number
  status: string
  tipo: "venda" | "condicional"
  clientes: { nome: string } | { nome: string }[] | null
  movimentacao_itens: ItemPagamento[]
}

function lerNumero(valor: string) {
  return Number(valor.replace(",", "."))
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function nomeCliente(clientes: MovimentacaoPagamento["clientes"]) {
  if (Array.isArray(clientes)) return clientes[0]?.nome ?? "Cliente"
  return clientes?.nome ?? "Cliente"
}

const opcoesRecebimento: { valor: FormaRecebimento; label: string; icon: typeof Banknote }[] = [
  { valor: "pix", label: "Pix", icon: QrCode },
  { valor: "dinheiro", label: "Dinheiro", icon: Banknote },
  { valor: "cartao", label: "Cartão", icon: CreditCard },
]

const opcoesPrevistas: { valor: FormaPagamento; label: string; icon: typeof Banknote }[] = [
  ...opcoesRecebimento,
  { valor: "promissoria", label: "Promissória", icon: FileText },
]

export function Pagamento() {
  const { movimentacaoId } = useParams<{ movimentacaoId: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [movimentacao, setMovimentacao] = useState<MovimentacaoPagamento | null>(null)
  const [valorOriginal, setValorOriginal] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [jaPossuiPagamento, setJaPossuiPagamento] = useState(false)
  const [erroCarregamento, setErroCarregamento] = useState("")
  const [erroAcao, setErroAcao] = useState("")

  const [tipoDesconto, setTipoDesconto] = useState<"valor" | "percentual">("percentual")
  const [desconto, setDesconto] = useState("")
  const [tipoRecebimento, setTipoRecebimento] = useState<TipoRecebimento | null>(null)
  const [formaAgora, setFormaAgora] = useState<FormaRecebimento | null>(null)
  const [taxaCartaoAgora, setTaxaCartaoAgora] = useState("")

  const [formaPrevista, setFormaPrevista] = useState<FormaPagamento | null>(null)
  const [numeroParcelas, setNumeroParcelas] = useState("1")
  const [primeiraData, setPrimeiraData] = useState("")
  const [entrada, setEntrada] = useState("")
  const [entradaForma, setEntradaForma] = useState<FormaRecebimento | null>(null)
  const [taxaEntradaCartao, setTaxaEntradaCartao] = useState("")

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState("1")
  const [valorUnitario, setValorUnitario] = useState("")
  const [editandoSacola, setEditandoSacola] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    if (!movimentacaoId) {
      setErroCarregamento("Venda não encontrada.")
      setCarregando(false)
      return
    }

    try {
      const [dadosMovimentacao, pagamentos] = await Promise.all([
        getMovimentacaoParaPagamento(movimentacaoId),
        listarPagamentosPorMovimentacao(movimentacaoId),
      ])

      const mov = dadosMovimentacao as unknown as MovimentacaoPagamento
      setMovimentacao(mov)
      setValorOriginal(mov.valor_total)
      setJaPossuiPagamento(pagamentos.length > 0)
    } catch (erro) {
      setErroCarregamento(
        erro instanceof Error ? erro.message : "Não foi possível carregar esta venda."
      )
    } finally {
      setCarregando(false)
    }
  }, [movimentacaoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function adicionarProduto() {
    if (!movimentacaoId || !produtoSelecionado) return

    const qtd = Number(quantidade)
    const valor = lerNumero(valorUnitario)
    if (!Number.isInteger(qtd) || qtd <= 0 || !Number.isFinite(valor) || valor <= 0) {
      setErroAcao("Informe quantidade e valor unitário válidos.")
      return
    }

    setEditandoSacola(true)
    setErroAcao("")
    try {
      await adicionarItemMovimentacao(
        movimentacaoId,
        {
          produto_id: produtoSelecionado.id,
          descricao: produtoSelecionado.nome,
          quantidade: qtd,
          valor_unitario: arredondarCentavos(valor),
        },
        qtd
      )
      setProdutoSelecionado(null)
      setQuantidade("1")
      setValorUnitario("")
      await carregar()
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : "Não foi possível adicionar a peça.")
    } finally {
      setEditandoSacola(false)
    }
  }

  async function removerProduto(itemId: string) {
    if (!movimentacaoId || !movimentacao || movimentacao.movimentacao_itens.length <= 1) {
      setErroAcao("A venda precisa manter pelo menos uma peça.")
      return
    }

    setEditandoSacola(true)
    setErroAcao("")
    try {
      await removerItemMovimentacao(movimentacaoId, itemId)
      await carregar()
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : "Não foi possível remover a peça.")
    } finally {
      setEditandoSacola(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando venda...</p>
      </div>
    )
  }

  if (erroCarregamento || valorOriginal === null || !movimentacaoId || !movimentacao) {
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
          <h1 className="text-white text-2xl font-semibold tracking-tight">Recebimento já configurado</h1>
          <p className="text-zinc-400 text-sm mt-2">
            A sacola está protegida porque já existem recebimentos ou parcelas vinculadas a ela.
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

  const taxaAgora = taxaCartaoAgora ? lerNumero(taxaCartaoAgora) : 0
  const taxaAgoraInvalida = !Number.isFinite(taxaAgora) || taxaAgora < 0 || taxaAgora > 100
  const entradaNumerica = entrada ? arredondarCentavos(lerNumero(entrada)) : 0
  const entradaInvalida = !Number.isFinite(entradaNumerica) || entradaNumerica < 0 || entradaNumerica >= valorTotal
  const taxaEntrada = taxaEntradaCartao ? lerNumero(taxaEntradaCartao) : 0
  const taxaEntradaInvalida = !Number.isFinite(taxaEntrada) || taxaEntrada < 0 || taxaEntrada > 100
  const parcelasNumericas = Number(numeroParcelas)
  const parcelasInvalidas = !Number.isInteger(parcelasNumericas) || parcelasNumericas < 1 || parcelasNumericas > 120
  const saldoProgramado = arredondarCentavos(valorTotal - (entradaInvalida ? 0 : entradaNumerica))
  const valoresParcelas =
    tipoRecebimento === "programado" && !parcelasInvalidas && saldoProgramado > 0
      ? distribuirEmParcelas(saldoProgramado, parcelasNumericas)
      : []

  let erroValidacao = ""
  if (descontoInvalido) erroValidacao = "Revise o desconto informado."
  else if (valorTotal <= 0) erroValidacao = "O valor final deve ser maior que zero."
  else if (tipoRecebimento === "agora" && !formaAgora) erroValidacao = "Escolha como o cliente pagou."
  else if (tipoRecebimento === "agora" && formaAgora === "cartao" && taxaAgoraInvalida) erroValidacao = "A taxa do cartão deve estar entre 0% e 100%."
  else if (tipoRecebimento === "programado" && !formaPrevista) erroValidacao = "Escolha a forma combinada para o pagamento."
  else if (tipoRecebimento === "programado" && !primeiraData) erroValidacao = "Informe o primeiro vencimento."
  else if (tipoRecebimento === "programado" && parcelasInvalidas) erroValidacao = "Informe entre 1 e 120 parcelas para o saldo."
  else if (tipoRecebimento === "programado" && entradaInvalida) erroValidacao = "A entrada deve ser menor que o total da venda."
  else if (tipoRecebimento === "programado" && entradaNumerica > 0 && !entradaForma) erroValidacao = "Informe como a entrada foi recebida."
  else if (tipoRecebimento === "programado" && entradaForma === "cartao" && taxaEntradaInvalida) erroValidacao = "A taxa do cartão da entrada deve estar entre 0% e 100%."

  const podeConfirmar = !!tipoRecebimento && !salvando && !editandoSacola && !erroValidacao

  async function handleConfirmar() {
    if (!tipoRecebimento || !movimentacaoId || erroValidacao) return

    setSalvando(true)
    setErroAcao("")
    const alterouValor = Math.abs(valorBase - valorTotal) > 0.009

    try {
      if (alterouValor) {
        await atualizarValorTotalMovimentacao(movimentacaoId, valorTotal)
      }

      try {
        if (tipoRecebimento === "agora" && formaAgora) {
          await registrarRecebimentoAgora({
            movimentacao_id: movimentacaoId,
            forma_pagamento: formaAgora,
            valor_total: valorTotal,
            taxa_cartao: formaAgora === "cartao" ? taxaAgora : undefined,
          })
        } else if (tipoRecebimento === "programado" && formaPrevista) {
          await registrarPagamentoProgramado({
            movimentacao_id: movimentacaoId,
            forma_prevista: formaPrevista,
            valor_total: valorTotal,
            primeira_data: primeiraData,
            numero_parcelas: parcelasNumericas,
            entrada_valor: entradaNumerica,
            entrada_forma: entradaNumerica > 0 ? entradaForma ?? undefined : undefined,
            entrada_taxa_cartao: entradaForma === "cartao" ? taxaEntrada : undefined,
          })
        }
      } catch (erro) {
        if (alterouValor) await atualizarValorTotalMovimentacao(movimentacaoId, valorBase)
        throw erro
      }

      navigate(`/pagamentos/${movimentacaoId}`)
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : "Não foi possível registrar o pagamento.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Finalizar sacola</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">{nomeCliente(movimentacao.clientes)}</p>
      </div>

      <section className="bg-zinc-900/50 border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5">
              <ShoppingBag size={13} /> Sacola
            </p>
            <p className="text-zinc-500 text-xs mt-1">Pode ser alterada enquanto não houver pagamento.</p>
          </div>
          <span className="text-white font-semibold">{movimentacao.movimentacao_itens.length} item(ns)</span>
        </div>

        <div className="space-y-2">
          {movimentacao.movimentacao_itens.map((item) => {
            const quantidadeVenda = movimentacao.tipo === "condicional" && movimentacao.status === "fechada"
              ? Number(item.quantidade_vendida || item.quantidade)
              : Number(item.quantidade)
            return (
              <div key={item.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-2xl p-3 gap-3">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{item.produtos?.nome ?? item.descricao}</p>
                  <p className="text-zinc-500 text-xs mt-1">{quantidadeVenda}x {formatarMoeda(Number(item.valor_unitario))}</p>
                </div>
                <button
                  type="button"
                  disabled={editandoSacola || movimentacao.movimentacao_itens.length <= 1}
                  onClick={() => void removerProduto(item.id)}
                  className="w-9 h-9 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 disabled:opacity-30"
                  title="Remover da sacola"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Adicionar outra peça</p>
          {produtoSelecionado ? (
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
              <span className="text-white font-medium truncate">{produtoSelecionado.nome}</span>
              <button onClick={() => setProdutoSelecionado(null)} className="text-zinc-400 text-xs">Trocar</button>
            </div>
          ) : (
            <AutocompleteBusca
              placeholder="Buscar produto..."
              buscar={buscarProdutosPorNome}
              criar={(nome) => criarProduto(usuario!.loja_id, nome)}
              onSelecionar={(produto) => {
                setProdutoSelecionado(produto)
                if (produto.preco_padrao) setValorUnitario(String(produto.preco_padrao))
              }}
            />
          )}
          <div className="flex gap-2">
            <Input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-24 bg-white/5 border-white/10 text-white rounded-xl h-12" />
            <Input inputMode="decimal" placeholder="R$ Unitário" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} className="flex-1 bg-white/5 border-white/10 text-white rounded-xl h-12" />
            <Button type="button" onClick={() => void adicionarProduto()} disabled={!produtoSelecionado || editandoSacola} className="h-12 rounded-xl bg-white/10 text-white hover:bg-white/20 px-4">
              <Plus size={18} />
            </Button>
          </div>
        </div>
      </section>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="text-center">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1">
            {valorDesconto > 0 ? "Valor com desconto" : "Valor total"}
          </p>
          <p className="text-white text-4xl font-bold tracking-tighter">{formatarMoeda(valorTotal)}</p>
          {valorDesconto > 0 && <p className="text-zinc-500 text-sm mt-1 line-through">{formatarMoeda(valorBase)}</p>}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-2">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 flex items-center gap-1.5">
            <Tag size={12} /> Desconto (opcional)
          </label>
          <div className="flex gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden shrink-0">
              <button type="button" onClick={() => setTipoDesconto("percentual")} className={`px-3 h-12 font-medium text-sm ${tipoDesconto === "percentual" ? "bg-white text-black" : "text-zinc-400"}`}>%</button>
              <button type="button" onClick={() => setTipoDesconto("valor")} className={`px-3 h-12 font-medium text-sm ${tipoDesconto === "valor" ? "bg-white text-black" : "text-zinc-400"}`}>R$</button>
            </div>
            <Input inputMode="decimal" placeholder={tipoDesconto === "percentual" ? "Ex: 10" : "Ex: 20,00"} value={desconto} onChange={(e) => setDesconto(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setTipoRecebimento("agora")} className={`p-5 rounded-2xl border text-left transition-all ${tipoRecebimento === "agora" ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10"}`}>
          <Zap size={24} />
          <p className="font-semibold mt-3">Receber agora</p>
          <p className={`text-xs mt-1 ${tipoRecebimento === "agora" ? "text-zinc-600" : "text-zinc-500"}`}>Cliente paga neste momento.</p>
        </button>
        <button type="button" onClick={() => setTipoRecebimento("programado")} className={`p-5 rounded-2xl border text-left transition-all ${tipoRecebimento === "programado" ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10"}`}>
          <Clock3 size={24} />
          <p className="font-semibold mt-3">Pagamento programado</p>
          <p className={`text-xs mt-1 ${tipoRecebimento === "programado" ? "text-zinc-600" : "text-zinc-500"}`}>Há saldo para receber depois.</p>
        </button>
      </div>

      {tipoRecebimento === "agora" && (
        <section className="bg-zinc-900/50 border border-white/10 rounded-3xl p-5 space-y-4">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Como recebeu?</p>
          <div className="grid grid-cols-3 gap-2">
            {opcoesRecebimento.map((opcao) => {
              const Icon = opcao.icon
              return <button key={opcao.valor} type="button" onClick={() => setFormaAgora(opcao.valor)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${formaAgora === opcao.valor ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10"}`}><Icon size={21}/><span className="text-sm font-medium">{opcao.label}</span></button>
            })}
          </div>
          {formaAgora === "cartao" && (
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">Taxa da máquina (%) — opcional</label>
              <Input inputMode="decimal" placeholder="Ex: 3,5" value={taxaCartaoAgora} onChange={(e) => setTaxaCartaoAgora(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4" />
              <p className="text-zinc-500 text-xs pl-1">O cliente já é considerado pago hoje. Não há data prevista de pagamento do cartão.</p>
            </div>
          )}
        </section>
      )}

      {tipoRecebimento === "programado" && (
        <section className="bg-zinc-900/50 border border-white/10 rounded-3xl p-5 space-y-5">
          <div className="space-y-3">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Forma combinada</p>
            <div className="grid grid-cols-2 gap-2">
              {opcoesPrevistas.map((opcao) => {
                const Icon = opcao.icon
                return <button key={opcao.valor} type="button" onClick={() => setFormaPrevista(opcao.valor)} className={`p-4 rounded-2xl border flex items-center gap-2 ${formaPrevista === opcao.valor ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10"}`}><Icon size={19}/><span className="text-sm font-medium">{opcao.label}</span></button>
              })}
            </div>
            <p className="text-zinc-500 text-xs">É apenas o combinado. No dia do recebimento você poderá registrar Pix, dinheiro ou cartão de acordo com o que realmente entrou.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 flex items-center gap-1.5"><Calendar size={12}/> 1º vencimento</label>
              <Input type="date" value={primeiraData} onChange={(e) => setPrimeiraData(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-3" />
            </div>
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">Parcelas do saldo</label>
              <Input type="number" min={1} max={120} value={numeroParcelas} onChange={(e) => setNumeroParcelas(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-3" />
            </div>
          </div>

          <div className="border-t border-white/10 pt-5 space-y-3">
            <div>
              <p className="text-white font-medium">Entrada / adiantamento agora</p>
              <p className="text-zinc-500 text-xs mt-1">Opcional. O restante será dividido nas parcelas acima.</p>
            </div>
            <Input inputMode="decimal" placeholder="R$ 0,00" value={entrada} onChange={(e) => setEntrada(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4" />

            {entradaNumerica > 0 && !entradaInvalida && (
              <div className="space-y-3">
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Como recebeu a entrada?</p>
                <div className="grid grid-cols-3 gap-2">
                  {opcoesRecebimento.map((opcao) => {
                    const Icon = opcao.icon
                    return <button key={opcao.valor} type="button" onClick={() => setEntradaForma(opcao.valor)} className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${entradaForma === opcao.valor ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10"}`}><Icon size={18}/><span className="text-xs font-medium">{opcao.label}</span></button>
                  })}
                </div>
                {entradaForma === "cartao" && <Input inputMode="decimal" placeholder="Taxa do cartão da entrada (%) — opcional" value={taxaEntradaCartao} onChange={(e) => setTaxaEntradaCartao(e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4" />}
              </div>
            )}
          </div>

          {valoresParcelas.length > 0 && (
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs uppercase font-semibold tracking-widest">Resumo</p>
              {entradaNumerica > 0 && !entradaInvalida && <p className="text-emerald-400 text-sm mt-2">Entrada hoje: {formatarMoeda(entradaNumerica)}</p>}
              <p className="text-white text-sm mt-1">Saldo programado: {formatarMoeda(saldoProgramado)} em {parcelasNumericas}x</p>
              <p className="text-zinc-500 text-xs mt-1">Parcelas entre {formatarMoeda(Math.min(...valoresParcelas))} e {formatarMoeda(Math.max(...valoresParcelas))}</p>
            </div>
          )}
        </section>
      )}

      {(erroValidacao || erroAcao) && (
        <p className="text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-xl p-3">{erroAcao || erroValidacao}</p>
      )}

      <Button className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-50" disabled={!podeConfirmar} onClick={handleConfirmar}>
        {salvando ? "Salvando..." : tipoRecebimento === "programado" ? "Programar recebimento" : "Confirmar recebimento"}
      </Button>
    </div>
  )
}
