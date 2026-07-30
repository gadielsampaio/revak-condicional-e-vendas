/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { listarClientes, criarCliente, atualizarCliente, type Cliente } from "@/services/clientes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChevronRight, Phone, Smartphone, Plus } from "lucide-react"
import { BadgeDot } from "@/components/BadgeDot"
import { atualizarBadgesDoLayout } from "@/hooks/useBadges"



export function Clientes() {
  const { usuario } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [novoNome, setNovoNome] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [editando, setEditando] = useState<Cliente | null>(null)
  const [nomeEdit, setNomeEdit] = useState("")
  const [telefoneEdit, setTelefoneEdit] = useState("")
  const [instagramEdit, setSmartphoneEdit] = useState("")
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  async function carregar() {
    setCarregando(true)
    const dados = await listarClientes()
    setClientes(dados)
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

async function handleCriar(e: React.FormEvent) {
  e.preventDefault()

  if (!novoNome.trim() || !usuario?.loja_id) return

  setSalvando(true)

  try {
    await criarCliente(usuario.loja_id, novoNome.trim())

    setNovoNome("")

    await carregar()
    atualizarBadgesDoLayout()
  } finally {
    setSalvando(false)
  }
}

  function abrirEdicao(cliente: Cliente) {
    setEditando(cliente)
    setNomeEdit(cliente.nome)
    setTelefoneEdit(cliente.telefone ?? "")
    setSmartphoneEdit(cliente.instagram ?? "")
  }

async function handleSalvarEdicao() {
  if (!editando) return

  setSalvandoEdit(true)

  try {
    await atualizarCliente(editando.id, {
      nome: nomeEdit.trim(),
      telefone: telefoneEdit.trim() || null,
      instagram: instagramEdit.trim() || null,
    })

    setEditando(null)

    await carregar()
    atualizarBadgesDoLayout()
  } finally {
    setSalvandoEdit(false)
  }
}

  return (
    <div className="space-y-6">
      {/* Título com tracking ajustado (San Francisco style) */}
      <h1 className="text-white text-3xl font-semibold tracking-tighter">Clientes</h1>

      {/* Formulário de Criação Integrado */}
      <div className="space-y-2">
        <form onSubmit={handleCriar} className="flex gap-3">
          <Input 
            placeholder="Nome do novo cliente..." 
            value={novoNome} 
            onChange={(e) => setNovoNome(e.target.value)} 
            className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-500 font-medium"
          />
          <Button 
            type="submit" 
            disabled={salvando}
            className="bg-white text-black hover:bg-zinc-200 h-12 rounded-xl px-5 transition-all active:scale-[0.98] shrink-0"
          >
            {salvando ? "..." : <Plus size={22} strokeWidth={2.5} />}
          </Button>
        </form>
        <p className="text-zinc-500 text-xs font-medium tracking-tight pl-1">
          Toque em um cliente para adicionar telefone e Smartphone.
        </p>
      </div>

      {/* Área de Listagem */}
      <div className="mt-4">
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
            <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando lista...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/2 border border-white/5 rounded-[2rem]">
            <p className="text-zinc-400 font-medium">Nenhum cliente cadastrado.</p>
            <p className="text-zinc-500 text-sm mt-1">Os clientes que você criar aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {clientes.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => abrirEdicao(cliente)}
                // Estilo de card clicável do iOS: fundo translúcido que afunda ao toque
                className="w-full text-left flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-2xl group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-lg tracking-tight">{cliente.nome}</p>
                    {!cliente.telefone && <BadgeDot />}
                  </div>

                  <div className="flex items-center gap-3">
                    {cliente.telefone && (
                      <span className="flex items-center gap-1 text-zinc-400 text-sm font-medium">
                        <Phone size={14} /> {cliente.telefone}
                      </span>
                    )}
                    {cliente.instagram && (
                      <span className="flex items-center gap-1 text-zinc-400 text-sm font-medium">
                        <Smartphone size={14} /> @{cliente.instagram}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Chevron indicando navegabilidade */}
                <ChevronRight className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edição (Padrão de Configurações do iOS) */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="bg-zinc-900/70 backdrop-blur-3xl border border-white/10 sm:rounded-[2rem] p-6 shadow-2xl w-[90vw] max-w-sm">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-white text-xl font-semibold tracking-tight">Editar Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">Nome</label>
              <Input 
                value={nomeEdit} 
                onChange={(e) => setNomeEdit(e.target.value)} 
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 flex items-center gap-1.5">
                Telefone
                {!telefoneEdit.trim() && <BadgeDot />}
              </label>
              <Input
                value={telefoneEdit}
                onChange={(e) => setTelefoneEdit(e.target.value)}
                type="tel"
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1">Instagram</label>
              <Input 
                value={instagramEdit} 
                onChange={(e) => setSmartphoneEdit(e.target.value)} 
                placeholder="sem @"
                className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-600"
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