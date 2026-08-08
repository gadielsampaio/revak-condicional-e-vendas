import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { AutocompleteBusca } from "@/components/AutocompleteBusca"
import { buscarClientesPorNome, criarCliente, type Cliente } from "@/services/clientes"
import { buscarProdutosPorNome, criarProduto, type Produto } from "@/services/produtos"
import { criarCondicional, type ItemCondicional } from "@/services/movimentacoes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User, PackagePlus, Trash2, Plus, ShoppingBag } from "lucide-react"

type ItemLocal = ItemCondicional & { id: string; nomeProduto: string }

export function NovaCondicional() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [itens, setItens] = useState<ItemLocal[]>([])

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [quantidade, setQuantidade] = useState("1")
  const [valorUnitario, setValorUnitario] = useState("")
  const [salvando, setSalvando] = useState(false)

  function adicionarItem() {
    if (!produtoSelecionado || !quantidade || !valorUnitario) return

    const novoItem: ItemLocal = {
      // id: crypto.randomUUID(),
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      produto_id: produtoSelecionado.id,
      nomeProduto: produtoSelecionado.nome,
      descricao: produtoSelecionado.nome,
      quantidade: parseInt(quantidade),
      valor_unitario: parseFloat(valorUnitario.replace(",", ".")),
    }

    setItens([...itens, novoItem])
    setProdutoSelecionado(null)
    setQuantidade("1")
    setValorUnitario("")
  }

  function removerItem(id: string) {
    setItens(itens.filter((i) => i.id !== id))
  }

  const valorTotal = itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0)

  async function handleSalvar() {
    if (!cliente || itens.length === 0 || !usuario?.loja_id) return
    setSalvando(true)
    await criarCondicional(
      usuario.loja_id,
      cliente.id,
      itens.map(({ produto_id, descricao, quantidade, valor_unitario }) => ({
        produto_id,
        descricao,
        quantidade,
        valor_unitario,
      }))
    )
    setSalvando(false)
    navigate("/condicionais")
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Nova Condicional</h1>
        <p className="text-zinc-500 text-sm mt-1">Crie um novo envio de peças para aprovação.</p>
      </div>

      <div className="space-y-6">
        {/* Seção: Cliente */}
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
            <AutocompleteBusca<Cliente>
              placeholder="Buscar ou criar cliente..."
              buscar={buscarClientesPorNome}
              criar={(nome) => criarCliente(usuario!.loja_id, nome)}
              onSelecionar={setCliente}
            />
          )}
        </div>

        {/* Seção: Adicionar Peças */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">2. Adicionar Peças</label>
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
                  placeholder="Qtd"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 text-center"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="R$ Unitário"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={adicionarItem}
              disabled={!produtoSelecionado || !quantidade || !valorUnitario}
              className="w-full bg-white/10 text-white hover:bg-white/20 h-12 rounded-xl font-medium transition-all active:scale-[0.98] border border-white/5 disabled:opacity-50"
            >
              <Plus size={18} className="mr-2" strokeWidth={2.5}/> Incluir na sacola
            </Button>
          </div>
        </div>

        {/* Seção: Sacola de Itens */}
        {itens.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-black/40 border border-white/10 rounded-3xl p-2 space-y-2">
              {itens.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
                  <div>
                    <p className="text-white font-medium tracking-tight">{item.nomeProduto}</p>
                    <p className="text-zinc-400 text-sm mt-0.5">
                      {item.quantidade}x <span className="text-zinc-500">R$ {item.valor_unitario.toFixed(2).replace(".", ",")}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => removerItem(item.id)} 
                    className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <div className="p-4 flex justify-between items-center bg-white/5 rounded-2xl mt-2 border border-white/5">
                <span className="text-zinc-400 font-medium text-sm">Total da condicional</span>
                <span className="text-white font-bold text-xl tracking-tighter">
                  R$ {valorTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Button
        className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:shadow-none mt-4"
        disabled={!cliente || itens.length === 0 || salvando}
        onClick={handleSalvar}
      >
        <ShoppingBag className="mr-2" size={20} strokeWidth={2.5}/>
        {salvando ? "Processando..." : "Salvar Condicional"}
      </Button>
    </div>
  )
}