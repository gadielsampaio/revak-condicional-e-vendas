import { useEffect, useRef, useState } from "react"
import { RotateCcw, Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import {
  listarModelosMensagem,
  MODELOS_MENSAGEM_PADRAO,
  salvarModelosMensagem,
  type ModelosMensagem,
  type TipoModeloMensagem,
} from "@/services/modelosMensagens"
import { mensagemComprovante, mensagemLembrete } from "@/services/whatsapp"

const VARIAVEIS = [
  { valor: "{{cliente}}", descricao: "Nome do cliente" },
  { valor: "{{loja}}", descricao: "Nome da loja" },
  { valor: "{{valor}}", descricao: "Valor bruto pago pelo cliente" },
  { valor: "{{parcela_texto}}", descricao: "Parcela 1/3 ou pagamento único" },
  { valor: "{{vencimento}}", descricao: "Data de vencimento" },
  { valor: "{{data_pagamento}}", descricao: "Data do recebimento" },
  { valor: "{{forma_pagamento}}", descricao: "Pix, dinheiro, cartão ou promissória" },
]

type EditorModeloProps = {
  tipo: TipoModeloMensagem
  titulo: string
  descricao: string
  conteudo: string
  nomeLoja: string
  onChange: (conteudo: string) => void
  onRestaurar: () => void
}

function EditorModelo({
  tipo,
  titulo,
  descricao,
  conteudo,
  nomeLoja,
  onChange,
  onRestaurar,
}: EditorModeloProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function inserirVariavel(variavel: string) {
    const textarea = textareaRef.current

    if (!textarea) {
      onChange(`${conteudo}${variavel}`)
      return
    }

    const inicio = textarea.selectionStart
    const fim = textarea.selectionEnd
    const novoConteudo = `${conteudo.slice(0, inicio)}${variavel}${conteudo.slice(fim)}`
    onChange(novoConteudo)

    requestAnimationFrame(() => {
      const novaPosicao = inicio + variavel.length
      textarea.focus()
      textarea.setSelectionRange(novaPosicao, novaPosicao)
    })
  }

  const previa =
    tipo === "cobranca"
      ? mensagemLembrete({
          modelo: conteudo,
          nomeCliente: "Lari",
          parcela: 1,
          totalParcelas: 3,
          valor: 100,
          vencimento: "2026-08-10",
          formaPagamento: "promissoria",
          nomeLoja,
        })
      : mensagemComprovante({
          modelo: conteudo,
          nomeCliente: "Lari",
          parcela: 1,
          totalParcelas: 3,
          valor: 100,
          dataPagamento: "2026-07-29",
          formaPagamento: "promissoria",
          nomeLoja,
        })

  return (
    <section className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white text-xl font-semibold tracking-tight">{titulo}</h2>
          <p className="text-zinc-500 text-sm mt-1">{descricao}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onRestaurar}
          className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl"
        >
          <RotateCcw size={15} />
          Padrão
        </Button>
      </div>

      <Textarea
        ref={textareaRef}
        value={conteudo}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-40 bg-black/30 border-white/10 text-white rounded-2xl p-4 leading-relaxed"
        maxLength={2000}
      />

      <div className="space-y-2">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          Inserir variável
        </p>
        <div className="flex flex-wrap gap-2">
          {VARIAVEIS.map((variavel) => (
            <button
              key={variavel.valor}
              type="button"
              onClick={() => inserirVariavel(variavel.valor)}
              title={variavel.descricao}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-white/10 hover:text-white active:scale-95 transition-all"
            >
              {variavel.valor}
            </button>
          ))}
        </div>
        <p className="text-zinc-600 text-xs">
          <span className="text-zinc-400">{"{{parcela_texto}}"}</span> vira “da parcela 1/3” em vendas parceladas e “do pagamento único” quando houver somente um pagamento.
        </p>
      </div>

      <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles size={14} /> Prévia
        </p>
        <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{previa}</p>
      </div>
    </section>
  )
}

export function ConfiguracaoMensagens() {
  const { usuario } = useAuth()
  const [modelos, setModelos] = useState<ModelosMensagem>({ ...MODELOS_MENSAGEM_PADRAO })
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")

  useEffect(() => {
    async function carregar() {
      if (!usuario?.loja_id) return

      setCarregando(true)
      setErro("")
      try {
        setModelos(await listarModelosMensagem(usuario.loja_id))
      } catch (falha) {
        setErro(
          falha instanceof Error
            ? falha.message
            : "Não foi possível carregar as mensagens. Verifique se o script do Supabase foi aplicado."
        )
      } finally {
        setCarregando(false)
      }
    }

    void carregar()
  }, [usuario?.loja_id])

  function alterarModelo(tipo: TipoModeloMensagem, conteudo: string) {
    setModelos((atual) => ({ ...atual, [tipo]: conteudo }))
    setSucesso("")
  }

  async function salvar() {
    if (!usuario?.loja_id) return

    setSalvando(true)
    setErro("")
    setSucesso("")
    try {
      await salvarModelosMensagem(usuario.loja_id, modelos)
      setModelos({ cobranca: modelos.cobranca.trim(), recibo: modelos.recibo.trim() })
      setSucesso("Mensagens salvas com sucesso.")
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar as mensagens."
      )
    } finally {
      setSalvando(false)
    }
  }

  const nomeLoja = usuario?.loja?.nome ?? "Minha loja"

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-white text-3xl font-semibold tracking-tighter">Mensagens</h1>
        <p className="text-zinc-500 text-sm mt-1 font-medium">
          Personalize os textos enviados pelo WhatsApp.
        </p>
      </div>

      {erro && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <p className="text-red-400 text-sm">{erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-emerald-400 text-sm">{sucesso}</p>
        </div>
      )}

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm font-medium">Carregando mensagens...</p>
        </div>
      ) : (
        <>
          <EditorModelo
            tipo="cobranca"
            titulo="Mensagem de cobrança"
            descricao="Usada no lembrete de parcelas pendentes."
            conteudo={modelos.cobranca}
            nomeLoja={nomeLoja}
            onChange={(conteudo) => alterarModelo("cobranca", conteudo)}
            onRestaurar={() => alterarModelo("cobranca", MODELOS_MENSAGEM_PADRAO.cobranca)}
          />

          <EditorModelo
            tipo="recibo"
            titulo="Mensagem de recibo"
            descricao="Usada para confirmar um pagamento recebido."
            conteudo={modelos.recibo}
            nomeLoja={nomeLoja}
            onChange={(conteudo) => alterarModelo("recibo", conteudo)}
            onRestaurar={() => alterarModelo("recibo", MODELOS_MENSAGEM_PADRAO.recibo)}
          />

          <div className="sticky bottom-24 z-20">
            <Button
              onClick={salvar}
              disabled={salvando}
              className="w-full h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold text-base shadow-2xl"
            >
              <Save size={18} />
              {salvando ? "Salvando..." : "Salvar mensagens"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
