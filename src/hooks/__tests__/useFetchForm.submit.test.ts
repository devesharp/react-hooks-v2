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

describe('useFetchForm - Testes de Submissão', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Submissão - Create', () => {
    it('deve criar novo registro com sucesso', async () => {
      const formData = { name: 'João', email: 'joao@test.com' }
      const createdData = { id: 1, ...formData }
      const createMock = vi.fn().mockResolvedValue(createdData)
      const onSuccessMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: formData,
          onSuccess: onSuccessMock
        })
      )

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(true)
      expect(submitResult.data).toEqual(createdData)
      expect(createMock).toHaveBeenCalledWith(formData)
      expect(onSuccessMock).toHaveBeenCalledWith(createdData, 'create')
    })

    it('deve aplicar transformSubmitData antes de criar', async () => {
      const formData = { name: 'joão', email: 'joao@test.com' }
      const transformedData = { name: 'João', email: 'joao@test.com' }
      const createdData = { id: 1, ...transformedData }
      
      const createMock = vi.fn().mockResolvedValue(createdData)
      const transformSubmitDataMock = vi.fn().mockReturnValue(transformedData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: formData,
          transformSubmitData: transformSubmitDataMock
        })
      )

      await act(async () => {
        await result.current.submitForm()
      })

      expect(transformSubmitDataMock).toHaveBeenCalledWith(formData)
      expect(createMock).toHaveBeenCalledWith(transformedData)
    })

    it('deve lidar com erro na criação', async () => {
      const error = new Error('Erro ao criar')
      const createMock = vi.fn().mockRejectedValue(error)
      const onFailureMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: { name: 'João', email: 'joao@test.com' },
          onFailure: onFailureMock
        })
      )

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(false)
      expect(submitResult.error).toEqual(error)
      expect(result.current.submitError).toEqual(error)
      expect(onFailureMock).toHaveBeenCalledWith(error, 'create')
    })

    it('deve retornar erro quando resolver create não existe', async () => {
      const onFailureMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData: { name: 'João', email: 'joao@test.com' },
          onFailure: onFailureMock
        })
      )

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(false)
      expect(submitResult.error?.message).toBe('Resolver para create não foi fornecido')
      expect(onFailureMock).toHaveBeenCalledWith(expect.any(Error), 'create')
    })

    it('deve submeter com dados customizados', async () => {
      const createMock = vi.fn().mockResolvedValue({ id: 1, name: 'Custom', email: 'custom@test.com' })

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      const customData = { name: 'Custom', email: 'custom@test.com' }

      await act(async () => {
        const submitResult = await result.current.submitForm(customData)
        expect(submitResult.success).toBe(true)
      })

      expect(createMock).toHaveBeenCalledWith(customData)
    })
  })

  describe('Submissão - Update', () => {
    it('deve atualizar registro existente com sucesso', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const updatedData = { id: 1, name: 'João Silva', email: 'joao@test.com' }
      
      const getMock = vi.fn().mockResolvedValue(userData)
      const updateMock = vi.fn().mockResolvedValue(updatedData)
      const onSuccessMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock,
            update: updateMock
          },
          onSuccess: onSuccessMock
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      act(() => {
        result.current.updateDataKey('name', 'João Silva')
      })

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(true)
      expect(submitResult.data).toEqual(updatedData)
      expect(updateMock).toHaveBeenCalledWith(1, { id: 1, name: 'João Silva', email: 'joao@test.com' })
      expect(onSuccessMock).toHaveBeenCalledWith(updatedData, 'update')
      expect(result.current.originalData).toEqual(updatedData)
    })

    it('deve aplicar transformSubmitData antes de atualizar', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const formData = { id: 1, name: 'joão silva', email: 'joao@test.com' }
      const transformedData = { id: 1, name: 'João Silva', email: 'joao@test.com' }
      const updatedData = { id: 1, name: 'João Silva', email: 'joao@test.com' }
      
      const getMock = vi.fn().mockResolvedValue(userData)
      const updateMock = vi.fn().mockResolvedValue(updatedData)
      const transformSubmitDataMock = vi.fn().mockReturnValue(transformedData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock,
            update: updateMock
          },
          transformSubmitData: transformSubmitDataMock
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      act(() => {
        result.current.updateData(formData)
      })

      await act(async () => {
        await result.current.submitForm()
      })

      expect(transformSubmitDataMock).toHaveBeenCalledWith(formData)
      expect(updateMock).toHaveBeenCalledWith(1, transformedData)
    })

    it('deve lidar com erro na atualização', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const error = new Error('Erro ao atualizar')
      
      const getMock = vi.fn().mockResolvedValue(userData)
      const updateMock = vi.fn().mockRejectedValue(error)
      const onFailureMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock,
            update: updateMock
          },
          onFailure: onFailureMock
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(false)
      expect(submitResult.error).toEqual(error)
      expect(result.current.submitError).toEqual(error)
      expect(onFailureMock).toHaveBeenCalledWith(error, 'update')
    })

    it('deve retornar erro quando resolver update não existe', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)
      const onFailureMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          },
          onFailure: onFailureMock
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(false)
      expect(submitResult.error?.message).toBe('Resolver para update não foi fornecido')
      expect(onFailureMock).toHaveBeenCalledWith(expect.any(Error), 'update')
    })
  })

  describe('Estados de Submissão', () => {
    it('deve gerenciar estado de submitting corretamente', async () => {
      const createMock = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 1, name: 'João' }), 50))
      )

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      expect(result.current.isSubmitting).toBe(false)

      act(() => {
        result.current.submitForm()
      })

      expect(result.current.isSubmitting).toBe(true)

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false)
      }, { timeout: 1000 })
    })

    it('deve limpar erro de submissão ao submeter novamente', async () => {
      const error = new Error('Erro inicial')
      const createMock = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ id: 1, name: 'João', email: 'joao@test.com' })

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      // Primeira submissão com erro
      await act(async () => {
        await result.current.submitForm()
      })

      expect(result.current.submitError).toEqual(error)

      // Segunda submissão com sucesso
      await act(async () => {
        await result.current.submitForm()
      })

      expect(result.current.submitError).toBeNull()
    })
  })

  describe('Resolvers Síncronos', () => {
    it('deve lidar com resolvers síncronos para create', async () => {
      const createdData = { id: 1, name: 'João', email: 'joao@test.com' }
      const createMock = vi.fn().mockReturnValue(createdData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(true)
      expect(submitResult.data).toEqual(createdData)
      expect(createMock).toHaveBeenCalled()
    })

    it('deve lidar com resolvers síncronos para update', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const updatedData = { id: 1, name: 'João Silva', email: 'joao@test.com' }
      
      const getMock = vi.fn().mockReturnValue(userData)
      const updateMock = vi.fn().mockReturnValue(updatedData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock,
            update: updateMock
          }
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      act(() => {
        result.current.updateDataKey('name', 'João Silva')
      })

      let submitResult: any
      await act(async () => {
        submitResult = await result.current.submitForm()
      })

      expect(submitResult.success).toBe(true)
      expect(submitResult.data).toEqual(updatedData)
      expect(updateMock).toHaveBeenCalledWith(1, { id: 1, name: 'João Silva', email: 'joao@test.com' })
    })
  })
}) 