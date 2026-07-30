/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react" // Adicionado para dar um toque mais premium na ação de criar

type Item = { id: string; nome: string }

type Props<T extends Item> = {
  placeholder: string
  buscar: (termo: string) => Promise<T[]>
  criar: (nome: string) => Promise<T>
  onSelecionar: (item: T) => void
}

export function AutocompleteBusca<T extends Item>({
  placeholder,
  buscar,
  criar,
  onSelecionar,
}: Props<T>) {
  const [termo, setTermo] = useState("")
  const [sugestoes, setSugestoes] = useState<T[]>([])
  const [aberto, setAberto] = useState(false)
  const [criando, setCriando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (termo.trim().length < 2) {
      setSugestoes([])
      return
    }
    const timeout = setTimeout(async () => {
      const resultados = await buscar(termo.trim())
      setSugestoes(resultados)
      setAberto(true)
    }, 300)

    return () => clearTimeout(timeout)
  }, [buscar, termo])

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener("mousedown", handleClickFora)
    return () => document.removeEventListener("mousedown", handleClickFora)
  }, [])

  async function handleCriar() {
    setCriando(true)
    const novo = await criar(termo.trim())
    setCriando(false)
    setTermo("")
    setAberto(false)
    onSelecionar(novo)
  }

  function handleSelecionar(item: T) {
    setTermo("")
    setAberto(false)
    onSelecionar(item)
  }

  const jaExisteExato = sugestoes.some(
    (s) => s.nome.toLowerCase() === termo.trim().toLowerCase()
  )

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        placeholder={placeholder}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => sugestoes.length > 0 && setAberto(true)}
        // Estilo integrado com o restante do sistema (alto contraste e bordas suaves)
        className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-500 font-medium"
      />
      
      {aberto && termo.trim().length >= 2 && (
        // Efeito Glassmorphism com animação de entrada
        <div className="absolute z-50 w-full mt-2 bg-zinc-900/70 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {sugestoes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelecionar(item)}
              // Padding e arredondamento que imitam menus nativos
              className="w-full text-left px-3 py-2.5 text-zinc-100 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
            >
              {item.nome}
            </button>
          ))}

          {!jaExisteExato && (
            <>
              {/* Linha divisória sutil apenas se houverem sugestões antes deste botão */}
              {sugestoes.length > 0 && (
                <div className="h-px bg-white/10 my-1.5 mx-2" />
              )}
              
              <button
                type="button"
                onClick={handleCriar}
                disabled={criando}
                className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span className="truncate">
                  {criando ? "Criando..." : `Criar "${termo.trim()}"`}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}