import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFetchSearch } from '../useFetchSearch'

describe('useFetchSearch - Tratamento de Erros', () => {
  // ========================================
  // TESTES DE ERROS BÁSICOS
  // ========================================
  
  describe('Erros Básicos', () => {
    it('deve lidar com erro na função search', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('Network error'))
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isSearching).toBe(false)
        expect(result.current.isStarted).toBe(false)
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Network error')
    })

    it('deve lidar com erro em treatmentSearch', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ invalid: 'data' })
      const treatmentSearch = vi.fn().mockImplementation(() => {
        throw new Error('Invalid data format')
      })
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentSearch,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isStarted).toBe(false)
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Invalid data format')
    })

    it('deve lidar com erro em treatmentResults', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const treatmentResults = vi.fn().mockImplementation(() => {
        throw new Error('Results processing failed')
      })
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentResults,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isStarted).toBe(false)
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Results processing failed')
    })

    it('deve usar dados padrão quando treatmentSearch falha silenciosamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue(null)

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([])
        expect(result.current.count).toBe(0)
        expect(result.current.isStarted).toBe(true) // Não falha, usa padrão
      })
    })
  })

  // ========================================
  // TESTES DE RECUPERAÇÃO DE ERROS
  // ========================================
  
  describe('Recuperação de Erros', () => {
    it('deve permitir nova busca após erro', async () => {
      const mockSearch = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          count: 1,
          results: [{ id: 1, name: 'João' }]
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      // Primeira busca falha
      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Nova busca deve funcionar
      act(() => {
        result.current.search({ name: 'test' })
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(false)
        expect(result.current.isStarted).toBe(true)
        expect(result.current.results).toEqual([{ id: 1, name: 'João' }])
      })
    })

    it('deve resetar estados de erro ao fazer nova busca', async () => {
      const mockSearch = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          count: 1,
          results: [{ id: 1, name: 'João' }]
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isStarted).toBe(false)
      })

      // Nova busca deve resetar estados
      act(() => {
        result.current.reloadSearch()
      })

      // Durante a busca
      expect(result.current.isSearching).toBe(true)
      expect(result.current.isErrorSearching).toBe(false)

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
        expect(result.current.isErrorSearching).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })
    })

    it('deve permitir reload após erro', async () => {
      const mockSearch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          count: 1,
          results: [{ id: 1, name: 'João' }]
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Reload deve funcionar
      act(() => {
        result.current.onReload()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })
    })
  })

  // ========================================
  // TESTES DE ERROS EM PAGINAÇÃO
  // ========================================
  
  describe('Erros em Paginação', () => {
    it('deve lidar com erro ao navegar para próxima página', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockRejectedValueOnce(new Error('Page load error'))

      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onError,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
        expect(result.current.pagination.currentPage).toBe(1)
      })

      // Tentar ir para próxima página
      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.pagination.currentPage).toBe(1) // Não mudou
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('deve manter dados da página anterior quando próxima página falha', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'Item 1' }]
        })
        .mockRejectedValueOnce(new Error('Page 2 failed'))

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([{ id: 1, name: 'Item 1' }])
      })

      // Tentar ir para próxima página
      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Dados da página anterior devem ser mantidos
      expect(result.current.results).toEqual([{ id: 1, name: 'Item 1' }])
    })
  })

  // ========================================
  // TESTES DE ERROS EM SCROLL INFINITO
  // ========================================
  
  describe('Erros em Scroll Infinito', () => {
    it('deve lidar com erro em loadMore', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'Item 1' }]
        })
        .mockRejectedValueOnce(new Error('Load more failed'))

      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Tentar carregar mais
      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isLoadingMore).toBe(false)
      })

      // Dados anteriores devem ser mantidos
      expect(result.current.results).toHaveLength(1)
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('deve lidar com erro em loadPrevious no modo bidirecional', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 1000,
          results: [{ id: 101, name: 'Item 101' }]
        })
        .mockRejectedValueOnce(new Error('Load previous failed'))

      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { 
            enabled: true, 
            bidirectional: true, 
            initialOffset: 100 
          },
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Tentar carregar anteriores
      act(() => {
        result.current.loadPrevious()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isLoadingPrevious).toBe(false)
      })

      // Dados anteriores devem ser mantidos
      expect(result.current.results).toHaveLength(1)
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('deve permitir retry após erro em scroll infinito', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'Item 1' }]
        })
        .mockRejectedValueOnce(new Error('Load more failed'))
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 2, name: 'Item 2' }]
        })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true }
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Primeira tentativa de loadMore falha
      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Segunda tentativa deve funcionar
      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(false)
        expect(result.current.results).toHaveLength(2)
      })
    })
  })

  // ========================================
  // TESTES DE ERROS EM CALLBACKS
  // ========================================
  
  describe('Erros em Callbacks', () => {
    it('deve lidar com erro em onBeforeSearch', async () => {
      const onBeforeSearch = vi.fn().mockRejectedValue(new Error('Before search failed'))
      const mockSearch = vi.fn()
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onBeforeSearch,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Search não deve ter sido chamado
      expect(mockSearch).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('deve lidar com erro em onAfterSearch', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const onAfterSearch = vi.fn().mockRejectedValue(new Error('After search failed'))
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onAfterSearch,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('After search failed')
    })

    it('deve continuar execução se onStarted falhar', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const onStarted = vi.fn().mockImplementation(() => {
        throw new Error('onStarted failed')
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onStarted
        })
      )

      await waitFor(() => {
        // Deve continuar funcionando mesmo com erro em onStarted
        expect(result.current.isStarted).toBe(true)
        expect(result.current.results).toEqual([{ id: 1, name: 'João' }])
      })
    })
  })

  // ========================================
  // TESTES DE EDGE CASES
  // ========================================
  
  describe('Edge Cases', () => {
    it('deve lidar com múltiplos erros simultâneos', async () => {
      const onBeforeSearch = vi.fn().mockRejectedValue(new Error('Before failed'))
      const treatmentSearch = vi.fn().mockImplementation(() => {
        throw new Error('Treatment failed')
      })
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: vi.fn(),
          onBeforeSearch,
          treatmentSearch,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Deve capturar o primeiro erro (onBeforeSearch)
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Before failed')
    })

    it('deve lidar com erro durante reset', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 1,
          results: [{ id: 1, name: 'João' }]
        })
        .mockRejectedValueOnce(new Error('Reset failed'))

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      // Reset que falha
      act(() => {
        result.current.resetFilters()
      })

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })
    })

    it('deve manter estado consistente após erro', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('Search failed'))

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active' }
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Estados devem estar consistentes
      expect(result.current.isSearching).toBe(false)
      expect(result.current.isStarted).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.results).toEqual([])
      expect(result.current.count).toBe(0)
      
      // Filtros devem ser mantidos
      expect(result.current.filters).toEqual({
        status: 'active',
        offset: 0,
        limit: 10
      })
    })

    it('deve lidar com timeout/cancelamento de requisição', async () => {
      const abortController = new AbortController()
      const mockSearch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'))
          }, 100)
        })
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      // Simular timeout
      setTimeout(() => {
        abortController.abort()
      }, 50)

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      }, { timeout: 200 })
    })
  })
}) 