import { useEffect, useState } from "react"
import { supabase } from "@/services/supabase"
import { getUsuarioComLoja } from "@/services/usuarios"
import type { User } from "@supabase/supabase-js"

type UsuarioComLoja = {
  id: string
  nome: string | null
  loja_id: string
  loja: { id: string; nome: string; slug: string } | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<UsuarioComLoja | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarUsuario(authUser: User | null) {
      setUser(authUser)
      if (authUser) {
        const dados = await getUsuarioComLoja(authUser.id)
        setUsuario(dados as UsuarioComLoja)
      } else {
        setUsuario(null)
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      carregarUsuario(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      carregarUsuario(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return { user, usuario, loading, login, logout }
}