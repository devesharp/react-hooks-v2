import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFetchSearch } from '../useFetchSearch'

describe('useFetchSearch - Callbacks e Eventos', () => {
  // ========================================
  // TESTES DE CALLBACKS BÁSICOS
  // ========================================
  
  describe('Callbacks Básicos', () => {
    it('deve chamar onStarted quando busca é bem-sucedida', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [{ id: 1, name: 'João' }, { id: 2, name: 'Maria' }]
      })

      const onStarted = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onStarted
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(onStarted).toHaveBeenCalledWith({
        count: 2,
        results: [{ id: 1, name: 'João' }, { id: 2, name: 'Maria' }]
      })
    })

    it('deve chamar onError quando busca falha', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('Search failed'))
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Search failed')
    })

    it('deve chamar onError quando treatmentSearch falha', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ data: 'invalid' })
      const treatmentSearch = vi.fn().mockImplementation(() => {
        throw new Error('Treatment failed')
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
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Treatment failed')
    })

    it('deve chamar onError quando treatmentResults falha', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const treatmentResults = vi.fn().mockImplementation(() => {
        throw new Error('Results treatment failed')
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
      })

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Results treatment failed')
    })
  })

  // ========================================
  // TESTES DE onBeforeSearch
  // ========================================
  
  describe('onBeforeSearch', () => {
    it('deve chamar onBeforeSearch antes da busca', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const onBeforeSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onBeforeSearch,
          defaultFilters: { status: 'active' }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(onBeforeSearch).toHaveBeenCalledWith({
        status: 'active',
        offset: 0,
        limit: 10
      })

      // onBeforeSearch deve ser chamado antes do search
      expect(onBeforeSearch).toHaveBeenCalledBefore(mockSearch as any)
    })

    it('deve chamar onBeforeSearch em nova busca', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const onBeforeSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onBeforeSearch,
          defaultFilters: { status: 'active' }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      // Nova busca
      act(() => {
        result.current.search({ name: 'Maria' })
      })

      await waitFor(() => {
        expect(onBeforeSearch).toHaveBeenCalledTimes(2)
      })

      expect(onBeforeSearch).toHaveBeenLastCalledWith({
        status: 'active',
        name: 'Maria',
        offset: 0,
        limit: 10
      })
    })

    it('deve aguardar onBeforeSearch assíncrono', async () => {
      let resolveBeforeSearch: () => void
      const onBeforeSearch = vi.fn().mockImplementation(() => 
        new Promise(resolve => { resolveBeforeSearch = resolve })
      )
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onBeforeSearch
        })
      )

      // Deve estar aguardando onBeforeSearch
      expect(mockSearch).not.toHaveBeenCalled()

      // Resolve onBeforeSearch
      act(() => {
        resolveBeforeSearch()
      })

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalled()
        expect(result.current.isStarted).toBe(true)
      })
    })

    it('deve lidar com erro em onBeforeSearch', async () => {
      const onBeforeSearch = vi.fn().mockRejectedValue(new Error('Before search failed'))
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
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

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Before search failed')
    })
  })

  // ========================================
  // TESTES DE onAfterSearch
  // ========================================
  
  describe('onAfterSearch', () => {
    it('deve chamar onAfterSearch após busca bem-sucedida', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [{ id: 1, name: 'joão' }, { id: 2, name: 'maria' }]
      })
      const onAfterSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onAfterSearch
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(onAfterSearch).toHaveBeenCalledWith(
        [{ id: 1, name: 'joão' }, { id: 2, name: 'maria' }],
        {
          count: 2,
          results: [{ id: 1, name: 'joão' }, { id: 2, name: 'maria' }]
        }
      )
    })

    it('deve chamar onAfterSearch com resultados tratados', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [{ id: 1, name: 'joão' }, { id: 2, name: 'maria' }]
      })
      const treatmentResults = vi.fn((results: any[]) =>
        results.map(item => ({ ...item, name: item.name.toUpperCase() }))
      )
      const onAfterSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentResults,
          onAfterSearch
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(onAfterSearch).toHaveBeenCalledWith(
        [{ id: 1, name: 'JOÃO' }, { id: 2, name: 'MARIA' }], // Resultados tratados
        {
          count: 2,
          results: [{ id: 1, name: 'JOÃO' }, { id: 2, name: 'MARIA' }]
        }
      )
    })

    it('deve aguardar onAfterSearch assíncrono', async () => {
      let resolveAfterSearch: () => void
      const onAfterSearch = vi.fn().mockImplementation(() => 
        new Promise(resolve => { resolveAfterSearch = resolve })
      )
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
      const onStarted = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onAfterSearch,
          onStarted
        })
      )

      await waitFor(() => {
        expect(onAfterSearch).toHaveBeenCalled()
      })

      // onStarted não deve ter sido chamado ainda
      expect(onStarted).not.toHaveBeenCalled()

      // Resolve onAfterSearch
      act(() => {
        resolveAfterSearch()
      })

      await waitFor(() => {
        expect(onStarted).toHaveBeenCalled()
        expect(result.current.isStarted).toBe(true)
      })
    })

    it('deve lidar com erro em onAfterSearch', async () => {
      const onAfterSearch = vi.fn().mockRejectedValue(new Error('After search failed'))
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'João' }]
      })
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

    it('deve chamar onAfterSearch com dados acumulados no modo infinito', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'Item 1' }]
        })
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 2, name: 'Item 2' }]
        })
      const onAfterSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          pagination: { limit: 1 },
          onAfterSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Primeira chamada com dados iniciais
      expect(onAfterSearch).toHaveBeenCalledWith(
        [], // loadedResults ainda vazio na primeira chamada
        { count: 100, results: [{ id: 1, name: 'Item 1' }] }
      )

      // Carregar mais
      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2)
      })

      // Segunda chamada com dados acumulados
      expect(onAfterSearch).toHaveBeenLastCalledWith(
        [{ id: 1, name: 'Item 1' }], // loadedResults da primeira carga
        { count: 100, results: [{ id: 2, name: 'Item 2' }] }
      )
    })
  })

  // ========================================
  // TESTES DE INTEGRAÇÃO DE CALLBACKS
  // ========================================
  
  describe('Integração de Callbacks', () => {
    it('deve executar callbacks na ordem correta', async () => {
      const callOrder: string[] = []
      
      const onBeforeSearch = vi.fn().mockImplementation(() => {
        callOrder.push('onBeforeSearch')
      })
      
      const mockSearch = vi.fn().mockImplementation(() => {
        callOrder.push('search')
        return Promise.resolve({
          count: 1,
          results: [{ id: 1, name: 'João' }]
        })
      })
      
      const treatmentSearch = vi.fn().mockImplementation((data) => {
        callOrder.push('treatmentSearch')
        return { count: data.count, results: data.results }
      })
      
      const treatmentResults = vi.fn().mockImplementation((results) => {
        callOrder.push('treatmentResults')
        return results
      })
      
      const onAfterSearch = vi.fn().mockImplementation(() => {
        callOrder.push('onAfterSearch')
      })
      
      const onStarted = vi.fn().mockImplementation(() => {
        callOrder.push('onStarted')
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentSearch,
          treatmentResults,
          onBeforeSearch,
          onAfterSearch,
          onStarted
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(callOrder).toEqual([
        'onBeforeSearch',
        'search',
        'treatmentSearch',
        'treatmentResults',
        'onAfterSearch',
        'onStarted'
      ])
    })

    it('deve parar execução se onBeforeSearch falhar', async () => {
      const onBeforeSearch = vi.fn().mockRejectedValue(new Error('Before failed'))
      const mockSearch = vi.fn()
      const onAfterSearch = vi.fn()
      const onStarted = vi.fn()
      const onError = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onBeforeSearch,
          onAfterSearch,
          onStarted,
          onError
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      expect(mockSearch).not.toHaveBeenCalled()
      expect(onAfterSearch).not.toHaveBeenCalled()
      expect(onStarted).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()
    })

    it('deve chamar callbacks em todas as operações de paginação', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
        })
        .mockResolvedValueOnce({
          count: 100,
          results: Array.from({ length: 10 }, (_, i) => ({ id: i + 11 }))
        })

      const onBeforeSearch = vi.fn()
      const onAfterSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          onBeforeSearch,
          onAfterSearch,
          pagination: { limit: 10 }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(onBeforeSearch).toHaveBeenCalledTimes(1)
      expect(onAfterSearch).toHaveBeenCalledTimes(1)

      // Ir para próxima página
      act(() => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(2)
      })

      expect(onBeforeSearch).toHaveBeenCalledTimes(2)
      expect(onAfterSearch).toHaveBeenCalledTimes(2)
    })

    it('deve chamar callbacks em operações de scroll infinito', async () => {
      const mockSearch = vi.fn()
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 1, name: 'Item 1' }]
        })
        .mockResolvedValueOnce({
          count: 100,
          results: [{ id: 2, name: 'Item 2' }]
        })

      const onBeforeSearch = vi.fn()
      const onAfterSearch = vi.fn()

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          infiniteScroll: { enabled: true },
          onBeforeSearch,
          onAfterSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      expect(onBeforeSearch).toHaveBeenCalledTimes(1)
      expect(onAfterSearch).toHaveBeenCalledTimes(1)

      // Carregar mais
      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2)
      })

      expect(onBeforeSearch).toHaveBeenCalledTimes(2)
      expect(onAfterSearch).toHaveBeenCalledTimes(2)
    })
  })
}) 