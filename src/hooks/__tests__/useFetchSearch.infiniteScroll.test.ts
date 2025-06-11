import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFetchSearch } from '../useFetchSearch'

describe('useFetchSearch - Scroll Infinito e Bidirecional', () => {
  // ========================================
  // TESTES DE SCROLL INFINITO BÁSICO
  // ========================================
  
  describe('Scroll Infinito Básico', () => {
    it('deve carregar dados iniciais no modo infinito', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 100,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
        expect(result.current.isInfiniteScroll).toBe(true)
        expect(result.current.hasReachedEnd).toBe(false)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        offset: 0,
        limit: 10
      })
    })

    it('deve carregar mais itens com loadMore', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11, name: `Item ${i + 11}` }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.loadMore()
      })

      expect(result.current.isLoadingMore).toBe(true)

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
        expect(result.current.isLoadingMore).toBe(false)
      })

      expect(result.current.results[0]).toEqual({ id: 1, name: 'Item 1' })
      expect(result.current.results[10]).toEqual({ id: 11, name: 'Item 11' })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 10,
        limit: 10
      })
    })

    it('deve detectar fim quando retorna menos itens que o limit', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 5 }, (_, i) => ({ id: i + 11 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
        expect(result.current.hasReachedEnd).toBe(false)
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(15)
        expect(result.current.hasReachedEnd).toBe(true)
      })
    })

    it('não deve carregar mais quando chegou no fim', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.hasReachedEnd).toBe(true)
      })

      const initialCallCount = mockSearch.mock.calls.length

      act(() => {
        result.current.loadMore()
      })

      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })

    it('não deve carregar mais quando já está carregando', async () => {
      let resolveSearch: (value: any) => void
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockImplementationOnce(() => 
          new Promise(resolve => { resolveSearch = resolve })
        )

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.loadMore()
      })

      expect(result.current.isLoadingMore).toBe(true)

      const callCountAfterFirst = mockSearch.mock.calls.length

      act(() => {
        result.current.loadMore()
      })

      expect(mockSearch).toHaveBeenCalledTimes(callCountAfterFirst)
    })
  })

  // ========================================
  // TESTES DE CARREGAMENTO BIDIRECIONAL
  // ========================================
  
  describe('Carregamento Bidirecional', () => {
    it('deve carregar dados iniciais com offset inicial', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1000,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 101, name: `Item ${i + 101}` }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 100 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
        expect(result.current.isBidirectional).toBe(true)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        offset: 100,
        limit: 10
      })
    })

    it('deve carregar itens anteriores com loadPrevious', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 101, name: `Item ${i + 101}` }))
        })
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 91, name: `Item ${i + 91}` }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 100 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.loadPrevious()
      })

      expect(result.current.isLoadingPrevious).toBe(true)

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
        expect(result.current.isLoadingPrevious).toBe(false)
      })

      expect(result.current.results[0]).toEqual({ id: 91, name: 'Item 91' })
      expect(result.current.results[10]).toEqual({ id: 101, name: 'Item 101' })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 90,
        limit: 10
      })
    })

    it('deve carregar mais itens para baixo com loadMore', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 101, name: `Item ${i + 101}` }))
        })
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 111, name: `Item ${i + 111}` }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 100 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
      })

      expect(result.current.results[0]).toEqual({ id: 101, name: 'Item 101' })
      expect(result.current.results[10]).toEqual({ id: 111, name: 'Item 111' })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 110,
        limit: 10
      })
    })

    it('deve detectar início quando offset é 0 e retorna menos que limit', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11, name: `Item ${i + 11}` }))
        })
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 10 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
        expect(result.current.hasReachedStart).toBe(false)
      })

      act(() => {
        result.current.loadPrevious()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(15)
        expect(result.current.hasReachedStart).toBe(true)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 0,
        limit: 10
      })
    })

    it('não deve carregar anterior quando chegou no início', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1000,
        results: Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 0 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.hasReachedStart).toBe(true)
      })

      const initialCallCount = mockSearch.mock.calls.length

      act(() => {
        result.current.loadPrevious()
      })

      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })

    it('não deve permitir loadPrevious quando não é bidirecional', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 100,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true, bidirectional: false },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.isBidirectional).toBe(false)
      })

      const initialCallCount = mockSearch.mock.calls.length

      act(() => {
        result.current.loadPrevious()
      })

      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })
  })

  // ========================================
  // TESTES DE RESET E INTEGRAÇÃO
  // ========================================
  
  describe('Reset e Integração', () => {
    it('deve resetar scroll infinito corretamente', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 101 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 100 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
      })

      act(() => {
        result.current.resetInfiniteScroll()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
        expect(result.current.hasReachedEnd).toBe(false)
        expect(result.current.hasReachedStart).toBe(false)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        offset: 100,
        limit: 10
      })
    })

    it('deve resetar ao fazer nova busca com filtros', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }))
        })
        .mockResolvedValueOnce({
          count: 50,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 201 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
      })

      act(() => {
        result.current.search({ name: 'test' })
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
        expect(result.current.results[0].id).toBe(201)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        name: 'test',
        offset: 0,
        limit: 10
      })
    })

    it('deve integrar nextPage com loadMore no modo infinito', async () => {
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
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
      })
    })

    it('deve integrar previousPage com loadPrevious no modo bidirecional', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 101 }))
        })
        .mockResolvedValueOnce({
          count: 1000,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 91 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 100 
          },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      act(() => {
        result.current.previousPage()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
      })
    })

    it('deve atualizar informações de paginação no modo infinito', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 5 }, (_, i) => ({ id: i + 11 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination).toEqual({
          offset: 0,
          limit: 10,
          currentPage: 1,
          hasNextPage: true,
          hasPreviousPage: false,
          totalPages: 0,
          totalItems: 10
        })
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.pagination).toEqual({
          offset: 10,
          limit: 10,
          currentPage: 2,
          hasNextPage: false,
          hasPreviousPage: false,
          totalPages: 0,
          totalItems: 15
        })
      })
    })
  })

  // ========================================
  // TESTES DE CONFIGURAÇÃO E EDGE CASES
  // ========================================
  
  describe('Configuração e Edge Cases', () => {
    it('deve funcionar com configuração de paginação customizada', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 20 }, (_, i) => ({ id: i + 21 }))
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: {
            limit: 20,
            offsetKey: 'skip',
            limitKey: 'take'
          }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(20)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        skip: 0,
        take: 20
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(40)
      })

      expect(mockSearch).toHaveBeenLastCalledWith({
        skip: 20,
        take: 20
      })
    })

    it('deve lidar com changeLimit no modo infinito', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 100,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.pagination.limit).toBe(10)
      })

      const initialCallCount = mockSearch.mock.calls.length

      act(() => {
        result.current.changeLimit(20)
      })

      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
      expect(result.current.pagination.limit).toBe(20)
    })

    it('não deve permitir goToPage no modo infinito', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 100,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(10)
      })

      const initialCallCount = mockSearch.mock.calls.length

      act(() => {
        result.current.goToPage(3)
      })

      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)
    })
  })
}) 