import { useState } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, Package, RefreshCw, ShoppingBag, User, MessageSquareText } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useBadges } from "@/hooks/useBadges"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function Layout() {
  const { user, usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [perfilAberto, setPerfilAberto] = useState(false)
  const badges = useBadges()

  const links = [
    { to: "/", label: "Início", icon: LayoutDashboard, badge: 0 },
    { to: "/condicionais", label: "Condicional", icon: RefreshCw, badge: 0 },
    { to: "/vendas", label: "Vendas", icon: ShoppingBag, badge: badges.vendas },
    { to: "/clientes", label: "Clientes", icon: Users, badge: badges.clientes },
    { to: "/produtos", label: "Produtos", icon: Package, badge: badges.produtos },
  ]

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 font-sans selection:bg-white/30">

      <header className="sticky top-0 z-40 bg-[#000000]/60 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex justify-between items-center transition-all">
        <p className="text-white font-semibold text-lg tracking-tight">
          {usuario?.loja?.nome ?? "Minha loja"}
        </p>

        <button
          onClick={() => setPerfilAberto(true)}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 active:scale-95 transition-all"
        >
          <User className="text-zinc-300" size={20} strokeWidth={2.5} />
        </button>
      </header>

      <main className="p-4 mx-auto max-w-5xl animate-in fade-in duration-500">
        <Outlet />
      </main>

      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50 pointer-events-none">
        <nav className="pointer-events-auto w-full max-w-md bg-zinc-900/60 backdrop-blur-2xl border border-white/10 flex justify-around items-center py-2 px-2 rounded-3xl shadow-2xl">
          {links.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `group relative flex flex-col items-center gap-1.5 p-2 min-w-16 transition-all duration-300 rounded-2xl ${
                  isActive
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative transition-transform duration-300 ${isActive ? "scale-110" : "scale-100 group-active:scale-90"}`}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    {badge > 0 && (
  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-black" />
)}
                  </div>
                  <span className="text-[10px] font-medium tracking-tight">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <Dialog open={perfilAberto} onOpenChange={setPerfilAberto}>
        <DialogContent className="bg-zinc-900/70 backdrop-blur-3xl border border-white/10 sm:rounded-[2rem] p-6 shadow-2xl w-[90vw] max-w-sm">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-white text-xl font-semibold tracking-tight">Minha Conta</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Loja</span>
              <span className="text-white font-medium text-lg tracking-tight truncate">
                {usuario?.loja?.nome ?? "Minha loja"}
              </span>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Usuário</span>
              <span className="text-white font-medium truncate">
                {user?.email}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setPerfilAberto(false)
                navigate("/configuracoes/mensagens")
              }}
              className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/10 active:scale-[0.99] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300">
                <MessageSquareText size={20} />
              </div>
              <div>
                <p className="text-white font-medium">Mensagens do WhatsApp</p>
                <p className="text-zinc-500 text-xs mt-0.5">Editar cobrança e recibo</p>
              </div>
            </button>
          </div>

          <Button
            variant="destructive"
            className="w-full mt-6 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 h-12 rounded-xl font-medium text-base transition-all active:scale-[0.98]"
            onClick={logout}
          >
            Sair da conta
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}