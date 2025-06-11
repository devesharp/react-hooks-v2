import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { useFetchForm } from '../useFetchForm'

// Tipos de teste
interface TestUser {
  id: number
  name: string
  email: string
  age?: number
}

describe('useFetchForm - Testes Básicos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Inicialização', () => {
    it('deve inicializar com dados iniciais', () => {
      const initialData = { name: 'João', email: 'joao@test.com' }
      
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData
        })
      )

      expect(result.current.data).toEqual(initialData)
      expect(result.current.originalData).toBeNull()
      expect(result.current.isCreating).toBe(true)
      expect(result.current.isEditing).toBe(false)
    })

    it('deve carregar dados quando tem ID e resolver get', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          }
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
        expect(result.current.originalData).toEqual(userData)
        expect(result.current.isEditing).toBe(true)
        expect(result.current.isCreating).toBe(false)
      })

      expect(getMock).toHaveBeenCalledWith(1)
    })

    it('deve aplicar transformData nos dados carregados', async () => {
      const userData = { id: 1, name: 'joão', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)
      const transformDataMock = vi.fn().mockReturnValue({ name: 'João' })

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          },
          transformData: transformDataMock
        })
      )

      await waitFor(() => {
        expect(result.current.data.name).toBe('João')
        expect(result.current.originalData?.name).toBe('João')
      })

      expect(transformDataMock).toHaveBeenCalledWith(userData)
    })
  })

  describe('Manipulação de Dados', () => {
    it('deve atualizar dados com updateData', () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      act(() => {
        result.current.updateData({ name: 'Maria' })
      })

      expect(result.current.data).toEqual({
        name: 'Maria',
        email: 'joao@test.com'
      })
    })

    it('deve atualizar chave específica com updateDataKey', () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      act(() => {
        result.current.updateDataKey('name', 'Maria')
      })

      expect(result.current.data.name).toBe('Maria')
      expect(result.current.data.email).toBe('joao@test.com')
    })

    it('deve obter chave específica com getDataKey', () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      expect(result.current.getDataKey('name')).toBe('João')
      expect(result.current.getDataKey('email')).toBe('joao@test.com')
      expect(result.current.getDataKey('age')).toBeUndefined()
    })

    it('deve resetar dados corretamente', () => {
      const initialData = { name: 'João', email: 'joao@test.com' }
      
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData
        })
      )

      act(() => {
        result.current.updateData({ name: 'Maria' })
      })

      expect(result.current.data.name).toBe('Maria')

      act(() => {
        result.current.resetData()
      })

      expect(result.current.data).toEqual(initialData)
    })

    it('deve resetar para dados originais quando disponíveis', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          }
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      act(() => {
        result.current.updateData({ name: 'Maria' })
      })

      expect(result.current.data.name).toBe('Maria')

      act(() => {
        result.current.resetToOriginal()
      })

      expect(result.current.data).toEqual(userData)
    })
  })

  describe('Estados', () => {
    it('deve identificar corretamente modo de criação e edição', () => {
      const { result: createResult } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {}
        })
      )

      expect(createResult.current.isCreating).toBe(true)
      expect(createResult.current.isEditing).toBe(false)

      const { result: editResult } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {}
        })
      )

      expect(editResult.current.isCreating).toBe(false)
      expect(editResult.current.isEditing).toBe(true)
    })

    it('deve lidar com ID null/undefined corretamente', () => {
      const { result: nullResult } = renderHook(() =>
        useFetchForm<TestUser>({
          id: null,
          resolvers: {}
        })
      )

      expect(nullResult.current.isCreating).toBe(true)
      expect(nullResult.current.isEditing).toBe(false)

      const { result: undefinedResult } = renderHook(() =>
        useFetchForm<TestUser>({
          id: undefined,
          resolvers: {}
        })
      )

      expect(undefinedResult.current.isCreating).toBe(true)
      expect(undefinedResult.current.isEditing).toBe(false)
    })
  })

  describe('Detecção de Mudanças', () => {
    it('deve detectar isDirty corretamente sem dados originais', () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {}
        })
      )

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.updateData({ name: 'João' })
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('deve detectar isDirty corretamente com dados originais', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          }
        })
      )

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false)
      })

      act(() => {
        result.current.updateDataKey('name', 'Maria')
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.updateDataKey('name', 'João')
      })

      expect(result.current.isDirty).toBe(false)
    })

    it('deve detectar isUpdateData corretamente', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          }
        })
      )

      await waitFor(() => {
        expect(result.current.isUpdateData).toBe(false)
      })

      act(() => {
        result.current.updateDataKey('name', 'Maria')
      })

      expect(result.current.isUpdateData).toBe(true)
    })
  })
}) 