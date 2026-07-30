/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { listarCondicionaisAbertas, listarCondicionaisFechadas } from "@/services/movimentacoes"
import { Plus, Calendar, Package, ArrowRightLeft, CheckCircle2 } from "lucide-react"

type ItemComProduto = {
  id: string
  descricao: string
  quantidade: number
  quantidade_vendida: number
  valor_unitario: number
  produtos: { nome: string } | null
}

type CondicionalComRelacoes = {
  id: string
  data_envio: string
  data_retorno: string | null
  valor_total: number
  status: string
  clientes: { nome: string } | null
  movimentacao_itens: ItemComProduto[]
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-")
  return `${dia}/${mes}/${ano}`
}

export function Condicionais() {
  const [abertas, setAbertas] = useState<CondicionalComRelacoes[]>([])
  const [fechadas, setFechadas] = useState<CondicionalComRelacoes[]>([])
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const [a, f] = await Promise.all([listarCondicionaisAbertas(), listarCondicionaisFechadas()])
    setAbertas(a as CondicionalComRelacoes[])
    setFechadas(f as CondicionalComRelacoes[])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Condicionais</h1>
        <Link to="/condicionais/nova">
          <Button className="bg-white text-black hover:bg-zinc-200 h-11 rounded-xl px-4 font-semibold text-sm transition-all active:scale-[0.98]">
            <Plus size={18} strokeWidth={2.5} className="mr-1.5" /> Nova
          </Button>
        </Link>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm font-medium tracking-tight">Carregando dados...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SESSÃO: ABERTAS */}
          <section>
            <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 mb-4 flex items-center gap-2">
              <ArrowRightLeft size={14} /> Em Andamento
            </h2>
            
            {abertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-white/2 border border-white/5 rounded-[2rem]">
                <p className="text-zinc-400 font-medium">Nenhuma condicional aberta.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {abertas.map((c) => (
                  <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
                    
                    {/* Header do Card */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-white font-medium text-lg tracking-tight">{c.clientes?.nome}</p>
                        <p className="text-zinc-500 text-sm font-medium mt-1 flex items-center gap-1.5">
                          <Calendar size={14} /> Enviado em {formatarData(c.data_envio)}
                        </p>
                      </div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                        <p className="text-white font-semibold tracking-tight text-sm">
                          R$ {c.valor_total.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </div>

                    {/* Lista de Itens (Inset Grouping) */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-2.5">
                      {c.movimentacao_itens.map((item) => (
                        <div key={item.id} className="flex items-start gap-2.5 text-sm">
                          <Package size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                          <p className="text-zinc-300 font-medium leading-tight">
                            <span className="text-white">{item.quantidade}x</span> {item.produtos?.nome ?? item.descricao}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Ação */}
                    <Link to={`/condicionais/${c.id}/retorno`} className="block pt-1">
                      <Button className="w-full bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-xl h-12 font-medium transition-all active:scale-[0.98]">
                        Registrar retorno
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SESSÃO: FECHADAS (HISTÓRICO) */}
          <section>
            <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-1 mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} /> Histórico Recente
            </h2>
            
            {fechadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-white/2 border border-white/5 rounded-[2rem]">
                <p className="text-zinc-500 text-sm">Nenhuma condicional fechada ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fechadas.map((c) => (
                  <div key={c.id} className="bg-white/3 border border-white/5 rounded-2xl p-5 space-y-4 opacity-90 hover:opacity-100 transition-opacity">
                    
                    {/* Header do Card (Fechadas) */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-white font-medium text-lg tracking-tight">{c.clientes?.nome}</p>
                        <p className="text-zinc-500 text-xs font-medium mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="flex items-center gap-1"><ArrowRightLeft size={12}/> {formatarData(c.data_envio)}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="flex items-center gap-1"><CheckCircle2 size={12}/> {c.data_retorno ? formatarData(c.data_retorno) : ""}</span>
                        </p>
                      </div>
                      
                      {/* Badge de valor com destaque Esmeralda (Sucesso) */}
                      <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shrink-0">
                        <p className="text-emerald-400 font-semibold tracking-tight text-sm">
                          R$ {c.valor_total.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </div>

                    {/* Lista de Itens Detalhada (Histórico) */}
                    <div className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-3">
                      {c.movimentacao_itens.map((item) => {
                        const voltou = item.quantidade - item.quantidade_vendida
                        return (
                          <div key={item.id} className="text-sm">
                            <p className="text-zinc-300 font-medium mb-1">
                              {item.produtos?.nome ?? item.descricao}
                            </p>
                            <div className="flex gap-3 text-xs font-medium bg-white/5 w-fit px-2 py-1 rounded-md">
                              <span className="text-zinc-500">Env: {item.quantidade}</span>
                              <span className="text-zinc-500">Voltou: {voltou}</span>
                              <span className="text-emerald-400">Vendeu: {item.quantidade_vendida}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Ação */}
                    <Link to={`/pagamentos/${c.id}`} className="block pt-1">
                      <Button className="w-full bg-transparent text-zinc-300 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl h-11 font-medium transition-all active:scale-[0.98]">
                        Ver pagamentos
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  )
}