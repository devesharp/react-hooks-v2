import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFetchSearch } from '../useFetchSearch'

describe('useFetchSearch - Funcionalidade Básica', () => {
  // ========================================
  // TESTES DE FUNCIONALIDADE BÁSICA
  // ========================================
  
  describe('Busca Simples', () => {
    it('deve executar busca básica corretamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [
          { id: 1, name: 'João' },
          { id: 2, name: 'Maria' }
        ]
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([
          { id: 1, name: 'João' },
          { id: 2, name: 'Maria' }
        ])
        expect(result.current.count).toBe(2)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        offset: 0,
        limit: 10
      })
    })

    it('deve usar treatmentSearch padrão corretamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: 'Test' }]
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([{ id: 1, name: 'Test' }])
        expect(result.current.count).toBe(1)
      })
    })

    it('deve lidar com dados vazios corretamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([])
        expect(result.current.count).toBe(0)
        expect(result.current.isStarted).toBe(true)
      })
    })

    it('deve lidar com dados malformados usando treatmentSearch padrão', async () => {
      const mockSearch = vi.fn().mockResolvedValue(null)

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([])
        expect(result.current.count).toBe(0)
      })
    })
  })

  // ========================================
  // TESTES DE TRATAMENTO DE DADOS
  // ========================================
  
  describe('Tratamento de Dados', () => {
    it('deve usar treatmentSearch customizado', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        total: 3,
        users: [
          { id: 1, firstName: 'João', lastName: 'Silva' },
          { id: 2, firstName: 'Maria', lastName: 'Santos' }
        ]
      })

      const treatmentSearch = vi.fn((data: any) => ({
        count: data.total,
        results: data.users
      }))

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentSearch
        })
      )

      await waitFor(() => {
        expect(result.current.count).toBe(3)
        expect(result.current.results).toEqual([
          { id: 1, firstName: 'João', lastName: 'Silva' },
          { id: 2, firstName: 'Maria', lastName: 'Santos' }
        ])
      })

      expect(treatmentSearch).toHaveBeenCalledWith({
        total: 3,
        users: [
          { id: 1, firstName: 'João', lastName: 'Silva' },
          { id: 2, firstName: 'Maria', lastName: 'Santos' }
        ]
      })
    })

    it('deve usar treatmentResults para processar resultados', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [
          { id: 1, name: 'joão' },
          { id: 2, name: 'maria' }
        ]
      })

      const treatmentResults = vi.fn((results: any[]) =>
        results.map(item => ({
          ...item,
          name: item.name.toUpperCase(),
          displayName: `User: ${item.name}`
        }))
      )

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentResults
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([
          { id: 1, name: 'JOÃO', displayName: 'User: joão' },
          { id: 2, name: 'MARIA', displayName: 'User: maria' }
        ])
      })

      expect(treatmentResults).toHaveBeenCalledWith([
        { id: 1, name: 'joão' },
        { id: 2, name: 'maria' }
      ])
    })

    it('deve aplicar treatmentSearch e treatmentResults em sequência', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        data: {
          items: [{ id: 1, value: 'test' }],
          total: 1
        }
      })

      const treatmentSearch = vi.fn((data: any) => ({
        count: data.data.total,
        results: data.data.items
      }))

      const treatmentResults = vi.fn((results: any[]) =>
        results.map(item => ({ ...item, processed: true }))
      )

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          treatmentSearch,
          treatmentResults
        })
      )

      await waitFor(() => {
        expect(result.current.results).toEqual([
          { id: 1, value: 'test', processed: true }
        ])
        expect(result.current.count).toBe(1)
      })

      expect(treatmentSearch).toHaveBeenCalledWith({
        data: {
          items: [{ id: 1, value: 'test' }],
          total: 1
        }
      })
      expect(treatmentResults).toHaveBeenCalledWith([{ id: 1, value: 'test' }])
    })
  })

  // ========================================
  // TESTES DE FILTROS
  // ========================================
  
  describe('Sistema de Filtros', () => {
    it('deve usar defaultFilters corretamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active', category: 'user' }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        status: 'active',
        category: 'user',
        offset: 0,
        limit: 10
      })
    })

    it('deve usar initialFilters corretamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active' },
          initialFilters: { name: 'João', status: 'inactive' }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        status: 'inactive', // initialFilters sobrescreve defaultFilters
        name: 'João',
        offset: 0,
        limit: 10
      })
    })

    it('deve combinar defaultFilters com novos filtros na busca', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active', limit: 20 }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      // Primeira chamada com filtros iniciais
      expect(mockSearch).toHaveBeenCalledWith({
        status: 'active',
        offset: 0,
        limit: 20
      })

      // Nova busca com filtros adicionais
      act(() => {
        result.current.search({ name: 'Maria', category: 'admin' })
      })

      await waitFor(() => {
        expect(mockSearch).toHaveBeenLastCalledWith({
          status: 'active', // defaultFilters mantido
          limit: 20,        // defaultFilters mantido
          name: 'Maria',    // novo filtro
          category: 'admin', // novo filtro
          offset: 0         // resetado para 0
        })
      })
    })

    it('deve retornar filtros atuais', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active' },
          initialFilters: { name: 'João' }
        })
      )

      await waitFor(() => {
        expect(result.current.filters).toEqual({
          status: 'active',
          name: 'João',
          offset: 0,
          limit: 10
        })
      })
    })

    it('deve atualizar filtros sem buscar', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
          defaultFilters: { status: 'active' }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      const initialCallCount = mockSearch.mock.calls.length

      act(() => {
        result.current.updateFilters({ name: 'Maria' })
      })

      // Não deve fazer nova busca
      expect(mockSearch).toHaveBeenCalledTimes(initialCallCount)

      // Mas deve atualizar os filtros
      expect(result.current.filters).toEqual({
        status: 'active',
        name: 'Maria',
        offset: 0,
        limit: 10
      })
    })
  })

  // ========================================
  // TESTES DE ESTADOS
  // ========================================
  
  describe('Estados de Busca', () => {
    it('deve gerenciar estados isSearching e isErrorSearching', async () => {
      let resolveSearch: (value: any) => void
      const mockSearch = vi.fn().mockImplementation(() => 
        new Promise(resolve => { resolveSearch = resolve })
      )

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      // Inicialmente deve estar carregando
      expect(result.current.isSearching).toBe(true)
      expect(result.current.isErrorSearching).toBe(false)

      // Resolve a busca
      act(() => {
        resolveSearch({ count: 1, results: [{ id: 1 }] })
      })

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
        expect(result.current.isErrorSearching).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })
    })

    it('deve definir isErrorSearching em caso de erro', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('Search failed'))

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
        expect(result.current.isErrorSearching).toBe(true)
        expect(result.current.isStarted).toBe(false)
      })
    })

    it('deve resetar estados ao fazer nova busca', async () => {
      const mockSearch = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ count: 1, results: [{ id: 1 }] })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch
        })
      )

      // Primeira busca falha
      await waitFor(() => {
        expect(result.current.isErrorSearching).toBe(true)
      })

      // Segunda busca deve resetar estados
      act(() => {
        result.current.search({ name: 'test' })
      })

      expect(result.current.isSearching).toBe(true)
      expect(result.current.isErrorSearching).toBe(false)

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false)
        expect(result.current.isErrorSearching).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })
    })
  })

  // ========================================
  // TESTES DE CONFIGURAÇÃO DE PAGINAÇÃO
  // ========================================
  
  describe('Configuração de Paginação', () => {
    it('deve usar configuração de paginação customizada', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 0,
        results: []
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
        expect(result.current.isStarted).toBe(true)
      })

      expect(mockSearch).toHaveBeenCalledWith({
        skip: 0,
        take: 25
      })
    })

    it('deve calcular informações de paginação corretamente', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 100,
        results: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
      })

      const { result } = renderHook(() =>
        useFetchSearch({
          search: mockSearch,
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
          totalPages: 10,
          totalItems: 100
        })
      })
    })
  })
}) 