import { BrowserRouter, Routes, Route } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Login } from "@/pages/Login"
import { Layout } from "@/components/Layout"
import { Dashboard } from "@/pages/Dashboard"
import { Clientes } from "@/pages/Clientes"
import { Produtos } from "@/pages/Produtos"
import { Condicionais } from "@/pages/Condicionais"
import { Vendas } from "@/pages/Vendas"
import { NovaCondicional } from "@/pages/Condicionais/NovaCondicional"
import { RegistrarRetorno } from "@/pages/Condicionais/RegistrarRetorno"
import { NovaVenda } from "@/pages/Vendas/NovaVenda"
import { DetalhePagamentos } from "@/pages/Pagamentos"
import { Financeiro } from "@/pages/Financeiro"
import { Pagamento } from "@/pages/Pagamento"
import { ConfiguracaoMensagens } from "@/pages/Configuracoes/Mensagens"











function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      // Fundo preto puro para tela cheia, integrando perfeitamente com displays OLED/Apple
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          {/* Spinner refinado de alto contraste */}
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm font-medium tracking-tight">
            Carregando o sistema...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* O componente Layout agora será o responsável por manter o fundo escuro e a interface do usuário */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/condicionais" element={<Condicionais />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/condicionais/nova" element={<NovaCondicional />} />
          <Route path="/condicionais/:id/retorno" element={<RegistrarRetorno />} />
          <Route path="/vendas/nova" element={<NovaVenda />} />
          <Route path="/pagamentos/:movimentacaoId" element={<DetalhePagamentos />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/pagamento/:movimentacaoId" element={<Pagamento />} />
          <Route path="/configuracoes/mensagens" element={<ConfiguracaoMensagens />} />

        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App