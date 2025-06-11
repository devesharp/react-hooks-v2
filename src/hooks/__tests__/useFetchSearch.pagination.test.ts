import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFetchSearch } from '../useFetchSearch'

describe('useFetchSearch - Paginação', () => {
  // ========================================
  // TESTES DE PAGINAÇÃO BÁSICA
  // ========================================
  
  describe('Navegação de Páginas', () => {
    it('deve navegar para próxima página corretamente', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
        expect(result.current.pagination.hasNextPage).toBe(true)
      })

      // Ir para próxima página
      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(2)
        expect(result.current.pagination.offset).toBe(10)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 10,
        limit: 10
      })
    })

    it('deve navegar para página anterior corretamente', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          initialFilters: { offset: 10 },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(2)
        expect(result.current.pagination.hasPreviousPage).toBe(true)
      })

      // Ir para página anterior
      act(() => {
        result.current.previousPage()
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
        expect(result.current.pagination.offset).toBe(0)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 0,
        limit: 10
      })
    })

    it('deve ir para página específica corretamente', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 41 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
      })

      // Ir para página 5
      act(() => {
        result.current.goToPage(5)
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(5)
        expect(result.current.pagination.offset).toBe(40)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 40,
        limit: 10
      })
    })

    it('não deve navegar para página inválida', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 10,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
      })

      const initialCallCount = mockSearch.mock.calls.length

      // Tentar ir para página 0 (inválida)
      act(() => {
        result.current.goToPage(0)
      })

      // Não deve fazer nova busca
      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })

    it('não deve navegar quando não há próxima página', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 5,
        results: Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.hasNextPage).toBe(false)
      })

      const initialCallCount = mockSearch.mock.calls.length

      // Tentar ir para próxima página quando não há
      act(() => {
        result.current.nextPage()
      })

      // Não deve fazer nova busca
      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })

    it('não deve navegar quando não há página anterior', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 10,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.hasPreviousPage).toBe(false)
      })

      const initialCallCount = mockSearch.mock.calls.length

      // Tentar ir para página anterior quando não há
      act(() => {
        result.current.previousPage()
      })

      // Não deve fazer nova busca
      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })
  })

  // ========================================
  // TESTES DE ALTERAÇÃO DE LIMITE
  // ========================================
  
  describe('Alteração de Limite', () => {
    it('deve alterar limite mantendo página aproximada', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 21 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 20 }, (_, i) => ({ id: i + 21 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          initialFilters: { offset: 20 }, // Página 3 com limit 10
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(3)
      })

      // Alterar limite para 20
      act(() => {
        result.current.changeLimit(20)
      })

      await waitFor(() => {
        expect(result.current.pagination.limit).toBe(20)
        expect(result.current.pagination.currentPage).toBe(2) // Página aproximada
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 20, // (página 2 - 1) * 20 = 20
        limit: 20
      })
    })

    it('não deve alterar limite para valor inválido', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 10,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.limit).toBe(10)
      })

      const initialCallCount = mockSearch.mock.calls.length

      // Tentar alterar para limite inválido
      act(() => {
        result.current.changeLimit(0)
      })

      // Não deve fazer nova busca
      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
      expect(result.current.pagination.limit).toBe(10)
    })
  })

  // ========================================
  // TESTES DE RESET E RELOAD
  // ========================================
  
  describe('Reset e Reload', () => {
    it('deve resetar filtros e voltar para página inicial', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 21 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active' },
          initialFilters: { name: 'João', offset: 20 },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(3)
        expect(result.current.filters.name).toBe('João')
      })

      // Reset filtros
      act(() => {
        result.current.resetFilters()
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
        expect(result.current.pagination.offset).toBe(0)
        expect(result.current.filters).toEqual({
          status: 'active',
          name: 'João', // initialFilters mantido
          offset: 0,
          limit: 10
        })
      })
    })

    it('deve recarregar busca mantendo filtros atuais', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'João' }]
        })
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'João Updated' }]
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          initialFilters: { name: 'João', offset: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results[0].name).toBe('João')
      })

      // Recarregar
      act(() => {
        result.current.reloadSearch()
      })

      await waitFor(() => {
        expect(result.current.results[0].name).toBe('João Updated')
      })

      // Deve manter os mesmos filtros
      expect(mockSearch).toHaveBeenLastCalledWith({
        name: 'João',
        offset: 10,
        limit: 10
      })
    })
  })

  // ========================================
  // TESTES DE CONFIGURAÇÃO CUSTOMIZADA
  // ========================================
  
  describe('Configuração Customizada', () => {
    it('deve usar chaves customizadas para offset e limit', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 100,
        results: Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: {
            limit: 25,
            offsetKey: 'skip',
            limitKey: 'take'
          }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.limit).toBe(25)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        skip: 0,
        take: 25
      })

      // Ir para próxima página
      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(mockSearch).toHaveBeenLastCalledWith({
          skip: 25,
          take: 25
        })
      })
    })

    it('deve calcular paginação corretamente com diferentes limites', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 157,
        results: Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 15 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination).toEqual({
          offset: 0,
          limit: 15,
          currentPage: 1,
          hasNextPage: true,
          hasPreviousPage: false,
          totalPages: 11, // Math.ceil(157 / 15)
          totalItems: 157
        })
      })
    })

    it('deve lidar com última página parcial', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 23,
        results: Array.from({ length: 3 }, (_, i) => ({ id: i + 21 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          initialFilters: { offset: 20 },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination).toEqual({
          offset: 20,
          limit: 10,
          currentPage: 3,
          hasNextPage: false, // Última página
          hasPreviousPage: true,
          totalPages: 3, // Math.ceil(23 / 10)
          totalItems: 23
        })
      })
    })
  })

  // ========================================
  // TESTES DE INTEGRAÇÃO COM FILTROS
  // ========================================
  
  describe('Integração com Filtros', () => {
    it('deve resetar offset ao fazer nova busca com filtros', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 21 }))
        })
        .mockResolvedValueOnce({
          count: 50,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          initialFilters: { offset: 20 },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(3)
      })

      // Nova busca com filtros
      act(() => {
        result.current.search({ name: 'Maria' })
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
        expect(result.current.pagination.offset).toBe(0)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        name: 'Maria',
        offset: 0, // Resetado
        limit: 10
      })
    })

    it('deve manter paginação ao navegar com filtros aplicados', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active' },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1)
      })

      // Ir para próxima página
      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(2)
      })

      // Deve manter os filtros padrão
      expect(mockSearch).toHaveBeenLastCalledWith({
        status: 'active',
        offset: 10,
        limit: 10
      })
    })
  })
}) 