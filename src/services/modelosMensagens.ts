import { supabase } from "@/services/supabase"

export type TipoModeloMensagem = "cobranca" | "recibo"

export type ModelosMensagem = Record<TipoModeloMensagem, string>

export const MODELOS_MENSAGEM_PADRAO: ModelosMensagem = {
  cobranca:
    "Oi {{cliente}}! Passando pra lembrar {{parcela_texto}}, no valor de {{valor}}, com vencimento em {{vencimento}}. Qualquer dúvida, é só chamar 😊\n\n{{loja}}",
  recibo:
    "Oi {{cliente}}! Confirmando o recebimento {{parcela_texto}}, no valor de {{valor}}, em {{data_pagamento}}. Obrigado(a)! 🙏\n\n{{loja}}",
}

type ModeloMensagemBanco = {
  tipo: TipoModeloMensagem
  conteudo: string
}

export async function listarModelosMensagem(lojaId: string): Promise<ModelosMensagem> {
  const { data, error } = await supabase
    .from("modelos_mensagem")
    .select("tipo, conteudo")
    .eq("loja_id", lojaId)

  if (error) throw error

  const modelos: ModelosMensagem = { ...MODELOS_MENSAGEM_PADRAO }

  for (const registro of (data ?? []) as ModeloMensagemBanco[]) {
    if (registro.tipo === "cobranca" || registro.tipo === "recibo") {
      modelos[registro.tipo] = registro.conteudo
    }
  }

  return modelos
}

export async function listarModelosMensagemComFallback(
  lojaId: string | null | undefined
): Promise<ModelosMensagem> {
  if (!lojaId) return { ...MODELOS_MENSAGEM_PADRAO }

  try {
    return await listarModelosMensagem(lojaId)
  } catch (error) {
    console.error("Não foi possível carregar os modelos de mensagem.", error)
    return { ...MODELOS_MENSAGEM_PADRAO }
  }
}

export async function salvarModelosMensagem(lojaId: string, modelos: ModelosMensagem) {
  const cobranca = modelos.cobranca.trim()
  const recibo = modelos.recibo.trim()

  if (!cobranca || !recibo) {
    throw new Error("As mensagens de cobrança e recibo não podem ficar vazias.")
  }

  const { error } = await supabase.from("modelos_mensagem").upsert(
    [
      {
        loja_id: lojaId,
        tipo: "cobranca",
        conteudo: cobranca,
        updated_at: new Date().toISOString(),
      },
      {
        loja_id: lojaId,
        tipo: "recibo",
        conteudo: recibo,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "loja_id,tipo" }
  )

  if (error) throw error
}
