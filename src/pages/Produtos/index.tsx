/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { listarProdutos, criarProduto, atualizarProduto, type Produto } from "@/services/produtos"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, ChevronRight, Tag, PackageX } from "lucide-react"
import { BadgeDot } from "@/components/BadgeDot"
import { atualizarBadgesDoLayout } from "@/hooks/useBadges"

export function Produtos() {
  const { usuario } = useAuth()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [nome, setNome] = useState("")
  const [preco, setPreco] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [editando, setEditando] = useState<Produto | null>(null)
  const [nomeEdit, setNomeEdit] = useState("")
  const [precoEdit, setPrecoEdit] = useState("")
  const [ativoEdit, setAtivoEdit] = useState(true)
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  async function carregar() {
    setCarregando(true)
    const dados = await listarProdutos()
    setProdutos(dados)
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

async function handleCriar(e: React.FormEvent) {
  e.preventDefault()

  if (!nome.trim() || !usuario?.loja_id) return

  setSalvando(true)

  try {
    const precoNumero = preco
      ? parseFloat(preco.replace(",", "."))
      : undefined

    await criarProduto(
      usuario.loja_id,
      nome.trim(),
      precoNumero
    )

    setNome("")
    setPreco("")

    await carregar()
    atualizarBadgesDoLayout()
  } finally {
    setSalvando(false)
  }
}

  function abrirEdicao(produto: Produto) {
    setEditando(produto)
    setNomeEdit(produto.nome)
    setPrecoEdit(produto.preco_padrao ? String(produto.preco_padrao) : "")
    setAtivoEdit(produto.ativo)
  }

async function handleSalvarEdicao() {
  if (!editando) return

  setSalvandoEdit(true)

  try {
    await atualizarProduto(editando.id, {
      nome: nomeEdit.trim(),
      preco_padrao: precoEdit
        ? parseFloat(precoEdit.replace(",", "."))
        : null,
      ativo: ativoEdit,
    })

    setEditando(null)

    await carregar()
    atualizarBadgesDoLayout()
  } finally {
    setSalvandoEdit(false)
  }
}

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Produtos</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">Gerencie seu catálogo de peças e valores padrão.</p>
      </div>

      {/* Formulário de Criação Integrado */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-4">
        <form onSubmit={handleCriar} className="flex gap-3">
          <Input 
            placeholder="Nome da peça..." 
            value={nome} 
            onChange={(e) => setNome(e.target.value)} 
            className="flex-1 bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-500 font-medium"
          />
          <Input 
            placeholder="R$ Preço" 
            value={preco} 
            onChange={(e) => setPreco(e.target.value)} 
            className="w-28 bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-500 font-medium" 
          />
          <Button 
            type="submit" 
            disabled={salvando}
            className="bg-white text-black hover:bg-zinc-200 h-12 rounded-xl px-5 transition-all active:scale-[0.98] shrink-0"
          >
            {salvando ? "..." : <Plus size={22} strokeWidth={2.5} />}
          </Button>
        </form>
      </div>

      {/* Área de Listagem */}
      <div>
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
            <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando catálogo...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/2 border border-white/5 rounded-[2rem]">
            <p className="text-zinc-400 font-medium">Nenhum produto cadastrado.</p>
            <p className="text-zinc-500 text-sm mt-1">Crie seu primeiro produto acima.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {produtos.map((produto) => (
              <button
                key={produto.id}
                onClick={() => abrirEdicao(produto)}
                className={`w-full text-left flex items-center justify-between p-4 border transition-all rounded-2xl group active:scale-[0.98] ${
                  produto.ativo 
                    ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                    : 'bg-white/2 border-white/2 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="space-y-1">
                  <div>
                    <div className="flex items-center gap-2">
                      {!produto.preco_padrao && <BadgeDot />}
                      <p className="text-white font-medium">{produto.nome}</p>
                    </div>
                    {!produto.ativo && <p className="text-red-400 text-xs">inativo</p>}
                  </div>
                  
                  <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                    {produto.preco_padrao ? (
                      <span className="flex items-center gap-1">
                        <Tag size={14} className="text-emerald-500/70" /> 
                        {formatarMoeda(produto.preco_padrao)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <PackageX size={14} /> Sem preço padrão
                      </span>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edição (Estilo Ajustes do iOS) */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="bg-zinc-900/70 backdrop-blur-3xl border border-white/10 sm:rounded-[2rem] p-6 shadow-2xl w-[90vw] max-w-sm">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-white text-xl font-semibold tracking-tight">Detalhes do Produto</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            
            {/* Bloco de Inputs (Nome e Preço) */}
            <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4">
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">Nome</label>
                <Input 
                  value={nomeEdit} 
                  onChange={(e) => setNomeEdit(e.target.value)} 
                  className="bg-black/20 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">Preço Padrão {!precoEdit.trim() && <BadgeDot />}</label>
                <Input 
                  value={precoEdit} 
                  onChange={(e) => setPrecoEdit(e.target.value)} 
                  placeholder="0,00"
                  className="bg-black/20 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Bloco do Switch (Estilo célula nativa) */}
            <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-4">
              <div className="space-y-0.5">
                <p className="text-white font-medium tracking-tight">Produto Ativo</p>
                <p className="text-zinc-500 text-xs">Aparece na busca de condicionais</p>
              </div>
              <Switch 
                checked={ativoEdit} 
                onCheckedChange={setAtivoEdit} 
                // Assumindo que o Switch do shadcn aceita classes para mudar as cores (se não, o padrão já funciona bem)
                className="data-[state=checked]:bg-emerald-500" 
              />
            </div>

          </div>

          <DialogFooter className="mt-6 bg-transparent">
            <Button 
              onClick={handleSalvarEdicao} 
              disabled={salvandoEdit}
              className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
            >
              {salvandoEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}