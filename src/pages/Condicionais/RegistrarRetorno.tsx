import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AutocompleteBusca } from "@/components/AutocompleteBusca"
import { buscarProdutosPorNome, criarProduto, type Produto } from "@/services/produtos"
import { adicionarItemMovimentacao, getCondicionalPorId, fecharCondicional } from "@/services/movimentacoes"
import { arredondarCentavos } from "@/lib/valores"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PackageOpen, CheckCircle2, Plus } from "lucide-react"

type ItemRetornoBanco = {
  id: string
  descricao: string
  quantidade: number
  valor_unitario: number
  produtos: { nome: string } | null
}

type ItemForm = {
  id: string
  nomeProduto: string
  quantidadeEnviada: number
  valorUnitario: number
  ficou: string
  adicionadoNaEntrega?: boolean
}

export function RegistrarRetorno() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [cliente, setCliente] = useState("")
  const [itens, setItens] = useState<ItemForm[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [erro, setErro] = useState("")

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidadeNova, setQuantidadeNova] = useState("1")
  const [valorNovo, setValorNovo] = useState("")

  useEffect(() => {
    async function carregar() {
      if (!id) return
      const dados = await getCondicionalPorId(id)
      setCliente(dados.clientes?.nome ?? "")
      setItens(
        (dados.movimentacao_itens as ItemRetornoBanco[]).map((item) => ({
          id: item.id,
          nomeProduto: item.produtos?.nome ?? item.descricao,
          quantidadeEnviada: item.quantidade,
          valorUnitario: item.valor_unitario,
          ficou: "0",
        }))
      )
      setCarregando(false)
    }
    void carregar()
  }, [id])

  function atualizarFicou(itemId: string, valor: string) {
    setItens((prev) => prev.map((item) => item.id === itemId ? { ...item, ficou: valor } : item))
  }

  async function adicionarPecaNaEntrega() {
    if (!id || !produtoSelecionado) return
    const qtd = Number(quantidadeNova)
    const valor = Number(valorNovo.replace(",", "."))

    if (!Number.isInteger(qtd) || qtd <= 0 || !Number.isFinite(valor) || valor <= 0) {
      setErro("Informe quantidade e valor unitário válidos para a nova peça.")
      return
    }

    setAdicionando(true)
    setErro("")
    try {
      const item = await adicionarItemMovimentacao(
        id,
        {
          produto_id: produtoSelecionado.id,
          descricao: produtoSelecionado.nome,
          quantidade: qtd,
          valor_unitario: arredondarCentavos(valor),
        },
        qtd
      )

      setItens((prev) => [
        ...prev,
        {
          id: item.id as string,
          nomeProduto: produtoSelecionado.nome,
          quantidadeEnviada: qtd,
          valorUnitario: arredondarCentavos(valor),
          ficou: "0",
          adicionadoNaEntrega: true,
        },
      ])
      setProdutoSelecionado(null)
      setQuantidadeNova("1")
      setValorNovo("")
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível adicionar a peça.")
    } finally {
      setAdicionando(false)
    }
  }

  const itensCalculados = itens.map((item) => {
    const ficou = Math.min(Math.max(parseInt(item.ficou) || 0, 0), item.quantidadeEnviada)
    const vendida = item.quantidadeEnviada - ficou
    return { ...item, ficou, vendida, valorVendido: vendida * item.valorUnitario }
  })

  const valorTotalVendido = itensCalculados.reduce((soma, i) => soma + i.valorVendido, 0)

  async function handleConfirmar() {
    if (!id) return

    setSalvando(true)
    setErro("")
    try {
      await fecharCondicional(
        id,
        itensCalculados.map((item) => ({ item_id: item.id, quantidade_vendida: item.vendida })),
        valorTotalVendido
      )
      navigate(valorTotalVendido > 0 ? `/pagamento/${id}` : "/condicionais")
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível fechar a condicional.")
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
      <p className="text-zinc-500 text-sm font-medium tracking-tight">Buscando informações...</p>
    </div>
  )

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Retorno</h1>
        <p className="text-zinc-400 font-medium text-lg mt-1 tracking-tight">{cliente}</p>
        <p className="text-zinc-500 text-sm mt-3 bg-white/5 p-3 rounded-xl border border-white/5">
          Informe as peças que voltaram. Se o cliente decidir ficar com outra peça na entrega, adicione-a nesta mesma sacola antes de finalizar.
        </p>
      </div>

      <div className="space-y-4">
        {itensCalculados.map((item) => (
          <div key={item.id} className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-medium text-lg tracking-tight">{item.nomeProduto}</p>
                <div className="inline-flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-md mt-1">
                  <PackageOpen size={12} className="text-zinc-400" />
                  <span className="text-zinc-300 text-xs font-semibold">
                    {item.adicionadoNaEntrega ? "Adicionada na entrega" : `Enviado: ${item.quantidadeEnviada} un`}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center bg-black/30 p-4 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 block">Voltou (Estoque)</label>
                <Input type="number" min={0} max={item.quantidadeEnviada} value={item.ficou} onChange={(e) => atualizarFicou(item.id, e.target.value)} className="bg-white/10 border-white/10 text-white rounded-xl h-12 px-4 text-lg font-medium text-center" />
              </div>
              <div className="space-y-2 flex flex-col items-end">
                <label className="text-emerald-500/80 text-xs font-semibold uppercase tracking-widest pr-1 block">Vendeu</label>
                <div className="h-12 flex items-center justify-end px-2"><p className="text-emerald-400 text-2xl font-bold tracking-tighter">{item.vendida} <span className="text-sm font-medium text-emerald-500/70">un</span></p></div>
              </div>
            </div>

            <div className="text-right"><span className="text-zinc-500 text-sm">Subtotal vendido: </span><span className="text-white font-medium tracking-tight">R$ {item.valorVendido.toFixed(2).replace(".", ",")}</span></div>
          </div>
        ))}
      </div>

      <section className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
        <div>
          <p className="text-white font-semibold">Cliente ficou com mais uma peça?</p>
          <p className="text-zinc-500 text-xs mt-1">Inclua aqui antes de fechar a sacola.</p>
        </div>
        {produtoSelecionado ? (
          <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-white font-medium truncate">{produtoSelecionado.nome}</span>
            <button onClick={() => setProdutoSelecionado(null)} className="text-zinc-500 hover:text-white text-xs">Trocar</button>
          </div>
        ) : (
          <AutocompleteBusca
            placeholder="Buscar produto..."
            buscar={buscarProdutosPorNome}
            criar={(nome) => criarProduto(usuario!.loja_id, nome)}
            onSelecionar={(produto) => {
              setProdutoSelecionado(produto)
              if (produto.preco_padrao) setValorNovo(String(produto.preco_padrao))
            }}
          />
        )}
        <div className="flex gap-3">
          <Input type="number" min={1} value={quantidadeNova} onChange={(e) => setQuantidadeNova(e.target.value)} className="w-24 bg-white/5 border-white/10 text-white rounded-xl h-12 text-center" />
          <Input inputMode="decimal" placeholder="R$ Unitário" value={valorNovo} onChange={(e) => setValorNovo(e.target.value)} className="flex-1 bg-white/5 border-white/10 text-white rounded-xl h-12" />
        </div>
        <Button type="button" onClick={() => void adicionarPecaNaEntrega()} disabled={!produtoSelecionado || adicionando} className="w-full bg-white/10 text-white hover:bg-white/20 h-12 rounded-xl">
          <Plus size={18} className="mr-2" /> {adicionando ? "Adicionando..." : "Adicionar à sacola"}
        </Button>
      </section>

      {erro && <p className="text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-xl p-3">{erro}</p>}

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 text-center space-y-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)]">
        <div><p className="text-emerald-500/80 text-sm font-semibold uppercase tracking-widest mb-1">Total da Venda</p><p className="text-emerald-400 font-bold text-5xl tracking-tighter">R$ {valorTotalVendido.toFixed(2).replace(".", ",")}</p></div>
        <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600 h-14 rounded-2xl font-bold text-lg" disabled={salvando || adicionando} onClick={handleConfirmar}>
          {salvando ? "Processando..." : <><CheckCircle2 className="mr-2" size={22} strokeWidth={2.5}/> Finalizar e configurar recebimento</>}
        </Button>
      </div>
    </div>
  )
}
