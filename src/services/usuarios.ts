import { supabase } from "@/services/supabase"

export async function getUsuarioComLoja(userId: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, loja_id, lojas(id, nome, slug)")
    .eq("id", userId)
    .single()

  if (error) throw error

  // Supabase retorna 'lojas' como array mesmo sendo relação 1-para-1.
  // Aqui a gente "achata" pra um objeto único, que é o que realmente é.
  const loja = Array.isArray(data.lojas) ? data.lojas[0] : data.lojas

  return {
    id: data.id,
    nome: data.nome,
    loja_id: data.loja_id,
    loja,
  }
}