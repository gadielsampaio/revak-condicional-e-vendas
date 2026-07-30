import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const error = await login(email, password)
    setCarregando(false)
    if (error) setErro("E-mail ou senha incorretos.")
  }

  return (
    // Fundo escuro profundo (estilo Apple Pro) com iluminação ambiente sutil
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 selection:bg-white/30">
      
      {/* Efeito de brilho de fundo opcional (Background Glow) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>

      <form 
        onSubmit={handleSubmit} 
        className="relative z-10 w-full max-w-100 p-10 rounded-[2rem] bg-zinc-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          {/* Tipografia no estilo San Francisco */}
          <h1 className="text-white text-3xl font-semibold tracking-tighter">
            Revak
          </h1>
          <p className="text-zinc-400 text-sm font-medium tracking-tight">
            Faça login para continuar
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300 text-sm font-medium pl-1">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nome@exemplo.com"
              // Ajustes para as inputs (requer que o componente Input do shadcn permita essas classes)
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <Label htmlFor="password" className="text-zinc-300 text-sm font-medium">
                Senha
              </Label>
              <a href="#" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                Esqueceu a senha?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-transparent transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        {erro && (
          <p className="text-red-400 text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
            {erro}
          </p>
        )}

        {/* Botão de alto contraste característico dos novos designs da Apple */}
        <Button 
          type="submit" 
          disabled={carregando}
          className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
        >
          {carregando ? "Autenticando..." : "Entrar"}
        </Button>
      </form>
    </div>
  )
}