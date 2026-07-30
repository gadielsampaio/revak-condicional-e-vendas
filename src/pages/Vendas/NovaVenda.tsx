import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AutocompleteBusca } from "@/components/AutocompleteBusca"
import { buscarClientesPorNome, criarCliente, type Cliente } from "@/services/clientes"
import { buscarProdutosPorNome, criarProduto, type Produto } from "@/services/produtos"
import { criarVenda, type ItemCondicional } from "@/services/movimentacoes"
import { arredondarCentavos } from "@/lib/valores"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User, PackagePlus, Trash2, Plus, CreditCard } from "lucide-react"

type ItemLocal = ItemCondicional & { id: string; nomeProduto: string }

export function NovaVenda() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [itens, setItens] = useState<ItemLocal[]>([])

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState("1")
  const [valorUnitario, setValorUnitario] = useState("")

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const quantidadeNumerica = Number(quantidade)
  const valorUnitarioNumerico = Number(valorUnitario.replace(",", "."))
  const itemValido =
    !!produtoSelecionado &&
    Number.isInteger(quantidadeNumerica) &&
    quantidadeNumerica > 0 &&
    Number.isFinite(valorUnitarioNumerico) &&
    valorUnitarioNumerico > 0

  function adicionarItem() {
    if (!produtoSelecionado || !itemValido) {
      setErro("Informe uma quantidade inteira e um valor unitário maior que zero.")
      return
    }

    const novoItem: ItemLocal = {
      id: crypto.randomUUID(),
      produto_id: produtoSelecionado.id,
      nomeProduto: produtoSelecionado.nome,
      descricao: produtoSelecionado.nome,
      quantidade: quantidadeNumerica,
      valor_unitario: arredondarCentavos(valorUnitarioNumerico),
    }

    setErro("")
    setItens([...itens, novoItem])
    setProdutoSelecionado(null)
    setQuantidade("1")
    setValorUnitario("")
  }

  function removerItem(id: string) {
    setItens(itens.filter((i) => i.id !== id))
  }

  const valorTotal = arredondarCentavos(
    itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0)
  )

  async function handleSalvar() {
    if (!cliente || itens.length === 0 || !usuario?.loja_id) return

    setSalvando(true)
    setErro("")
    try {
      const venda = await criarVenda(
        usuario.loja_id,
        cliente.id,
        itens.map(({ produto_id, descricao, quantidade, valor_unitario }) => ({
          produto_id,
          descricao,
          quantidade,
          valor_unitario,
        }))
      )
      navigate(`/pagamento/${venda.id}`)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível registrar a venda.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Nova Venda</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">Registre uma venda direta e vá para o caixa.</p>
      </div>

      <div className="space-y-6">
        
        {/* Seção 1: Cliente */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">1. Cliente</label>
          {cliente ? (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User size={18} className="text-white" />
                </div>
                <span className="text-white font-medium tracking-tight text-lg">{cliente.nome}</span>
              </div>
              <button 
                onClick={() => setCliente(null)} 
                className="text-zinc-400 text-sm font-medium hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
              >
                Trocar
              </button>
            </div>
          ) : (
            <AutocompleteBusca
              placeholder="Buscar ou criar cliente..."
              buscar={buscarClientesPorNome}
              criar={(nome) => criarCliente(usuario!.loja_id, nome)}
              onSelecionar={setCliente}
            />
          )}
        </div>

        {/* Seção 2: Adicionar Peças */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">2. Adicionar Produtos</label>
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-5 space-y-4">
            
            {produtoSelecionado ? (
              <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <PackagePlus size={18} className="text-zinc-400 shrink-0" />
                  <span className="text-white font-medium truncate">{produtoSelecionado.nome}</span>
                </div>
                <button onClick={() => setProdutoSelecionado(null)} className="text-zinc-500 hover:text-white text-xs font-medium ml-2">
                  Trocar
                </button>
              </div>
            ) : (
              <AutocompleteBusca
                placeholder="Buscar produto pelo nome..."
                buscar={buscarProdutosPorNome}
                criar={(nome) => criarProduto(usuario!.loja_id, nome)}
                onSelecionar={(p) => {
                  setProdutoSelecionado(p)
                  if (p.preco_padrao) setValorUnitario(String(p.preco_padrao))
                }}
              />
            )}

            <div className="flex gap-3">
              <div className="w-24 shrink-0">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Qtd"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 text-center font-medium"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="R$ Unitário"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 font-medium"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={adicionarItem}
              disabled={!itemValido}
              className="w-full bg-white/10 text-white hover:bg-white/20 h-12 rounded-xl font-medium transition-all active:scale-[0.98] border border-white/5 disabled:opacity-50"
            >
              <Plus size={18} className="mr-2" strokeWidth={2.5}/> Incluir na sacola
            </Button>
          </div>
        </div>

        {/* Seção 3: Sacola de Itens (Resumo da Venda) */}
        {itens.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-black/40 border border-white/10 rounded-3xl p-2 space-y-2 shadow-inner">
              {itens.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/2">
                  <div>
                    <p className="text-white font-medium tracking-tight">{item.nomeProduto}</p>
                    <p className="text-zinc-400 text-sm mt-0.5 font-medium">
                      {item.quantidade}x <span className="text-zinc-500">R$ {item.valor_unitario.toFixed(2).replace(".", ",")}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => removerItem(item.id)} 
                    className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {/* Totalizador */}
              <div className="p-5 flex justify-between items-center bg-white/5 rounded-2xl mt-2 border border-white/10">
                <span className="text-zinc-400 font-semibold text-sm uppercase tracking-widest">Total da Venda</span>
                <span className="text-white font-bold text-2xl tracking-tighter">
                  R$ {valorTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {erro && (
        <p className="text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-xl p-3">
          {erro}
        </p>
      )}

      {/* Botão de Ação Principal (Checkout) */}
      <Button
        className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:shadow-none mt-4"
        disabled={!cliente || itens.length === 0 || salvando}
        onClick={handleSalvar}
      >
        <CreditCard className="mr-2" size={20} strokeWidth={2.5}/>
        {salvando ? "Processando..." : "Ir para Pagamento"}
      </Button>
    </div>
  )
}