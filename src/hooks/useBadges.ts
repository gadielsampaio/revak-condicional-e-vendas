/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react"
import { contarClientesSemTelefone } from "@/services/clientes"
import { contarProdutosSemPreco } from "@/services/produtos"
import { contarClientesComPagamentoVencido } from "@/services/financeiro"

type Badges = {
  clientes: number
  produtos: number
  vendas: number
}

const BADGES_REFRESH_EVENT = "badges:refresh"

export function atualizarBadgesDoLayout() {
  window.dispatchEvent(new Event(BADGES_REFRESH_EVENT))
}

export function useBadges() {
  const [badges, setBadges] = useState<Badges>({
    clientes: 0,
    produtos: 0,
    vendas: 0,
  })

  const carregarBadges = useCallback(async () => {
    try {
      const [clientes, produtos, vendas] = await Promise.all([
        contarClientesSemTelefone(),
        contarProdutosSemPreco(),
        contarClientesComPagamentoVencido(),
      ])

      setBadges({
        clientes,
        produtos,
        vendas,
      })
    } catch (error) {
      console.error("Erro ao carregar badges:", error)
    }
  }, [])

  useEffect(() => {
    void carregarBadges()

    function handleAtualizarBadges() {
      void carregarBadges()
    }

    window.addEventListener(
      BADGES_REFRESH_EVENT,
      handleAtualizarBadges
    )

    return () => {
      window.removeEventListener(
        BADGES_REFRESH_EVENT,
        handleAtualizarBadges
      )
    }
  }, [carregarBadges])

  return badges
}