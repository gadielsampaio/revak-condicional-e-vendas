import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getCondicionalPorId, fecharCondicional } from "@/services/movimentacoes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PackageOpen, CheckCircle2 } from "lucide-react"

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
}

export function RegistrarRetorno() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState("")
  const [itens, setItens] = useState<ItemForm[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carregar() {
      const dados = await getCondicionalPorId(id!)
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
    carregar()
  }, [id])

  function atualizarFicou(itemId: string, valor: string) {
    setItens((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ficou: valor } : item))
    )
  }

  const itensCalculados = itens.map((item) => {
    const ficou = Math.min(parseInt(item.ficou) || 0, item.quantidadeEnviada)
    const vendida = item.quantidadeEnviada - ficou
    return { ...item, ficou, vendida, valorVendido: vendida * item.valorUnitario }
  })

  const valorTotalVendido = itensCalculados.reduce((soma, i) => soma + i.valorVendido, 0)

  async function handleConfirmar() {
    if (!id) return

    setSalvando(true)
    try {
      await fecharCondicional(
        id,
        itensCalculados.map((item) => ({
          item_id: item.id,
          quantidade_vendida: item.vendida,
        })),
        valorTotalVendido
      )
      navigate(valorTotalVendido > 0 ? `/pagamento/${id}` : "/condicionais")
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Não foi possível fechar a condicional.")
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
          Informe abaixo a quantidade de peças que <strong className="text-white">voltaram para a loja</strong> (não foram vendidas).
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
                  <span className="text-zinc-300 text-xs font-semibold">Enviado: {item.quantidadeEnviada} un</span>
                </div>
              </div>
            </div>

            {/* Grid de conferência: Voltou vs Vendeu */}
            <div className="grid grid-cols-2 gap-4 items-center bg-black/30 p-4 rounded-2xl border border-white/5">
              
              {/* O que voltou */}
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 block">Voltou (Estoque)</label>
                <Input
                  type="number"
                  min={0}
                  max={item.quantidadeEnviada}
                  value={item.ficou}
                  onChange={(e) => atualizarFicou(item.id, e.target.value)}
                  className="bg-white/10 border-white/10 text-white rounded-xl h-12 px-4 text-lg font-medium focus-visible:ring-1 focus-visible:ring-white/30 text-center"
                />
              </div>

              {/* O que foi vendido */}
              <div className="space-y-2 flex flex-col items-end">
                <label className="text-emerald-500/80 text-xs font-semibold uppercase tracking-widest pr-1 block">Vendeu (Lucro)</label>
                <div className="h-12 flex items-center justify-end px-2">
                  <p className="text-emerald-400 text-2xl font-bold tracking-tighter">
                    {item.vendida} <span className="text-sm font-medium text-emerald-500/70">un</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-zinc-500 text-sm">Subtotal vendido: </span>
              <span className="text-white font-medium tracking-tight">R$ {item.valorVendido.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Card de Fechamento de Venda Fixo */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 text-center space-y-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)]">
        <div>
          <p className="text-emerald-500/80 text-sm font-semibold uppercase tracking-widest mb-1">Total da Venda</p>
          <p className="text-emerald-400 font-bold text-5xl tracking-tighter">
            R$ {valorTotalVendido.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <Button 
          className="w-full bg-emerald-500 text-white hover:bg-emerald-600 h-14 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] border border-emerald-400/50" 
          disabled={salvando} 
          onClick={handleConfirmar}
        >
          {salvando ? "Processando..." : (
            <><CheckCircle2 className="mr-2" size={22} strokeWidth={2.5}/> Confirmar e Receber</>
          )}
        </Button>
      </div>
    </div>
  )
}