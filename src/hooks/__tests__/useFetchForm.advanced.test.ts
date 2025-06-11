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

describe('useFetchForm - Testes Avançados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Resolvers Customizados', () => {
    it('deve executar resolvers customizados', async () => {
      const customResolver = vi.fn().mockResolvedValue({ message: 'Custom data' })

      const { result } = renderHook(() =>
        useFetchForm<TestUser, { customAction: () => Promise<{ message: string }> }>({
          resolvers: {
            customAction: customResolver
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.customAction).toEqual({ message: 'Custom data' })
      })

      let executeResult: any
      await act(async () => {
        executeResult = await result.current.executeResolver('customAction')
      })

      expect(executeResult).toEqual({ message: 'Custom data' })
      expect(customResolver).toHaveBeenCalled()
    })

    it('deve lançar erro para resolver inexistente', async () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {}
        })
      )

      await expect(
        act(async () => {
          await result.current.executeResolver('nonExistent' as any)
        })
      ).rejects.toThrow("Resolver 'nonExistent' não encontrado")
    })

    it('deve combinar resolvers customizados com get', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const customData = { stats: { views: 100 } }
      
      const getMock = vi.fn().mockResolvedValue(userData)
      const statsMock = vi.fn().mockResolvedValue(customData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser, { getStats: () => Promise<{ stats: { views: number } }> }>({
          id: 1,
          resolvers: {
            get: getMock,
            getStats: statsMock
          }
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
        expect(result.current.resolve.getStats).toEqual(customData)
      })

      expect(getMock).toHaveBeenCalledWith(1)
      expect(statsMock).toHaveBeenCalled()
    })
  })

  describe('Integração com Formulários', () => {
    it('deve fornecer props corretas para integração', () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      const formProps = result.current.getFormProps()

      expect(formProps.values).toEqual({ name: 'João', email: 'joao@test.com' })
      expect(typeof formProps.onChange).toBe('function')
      expect(typeof formProps.onSubmit).toBe('function')
      expect(typeof formProps.onReset).toBe('function')
    })

    it('deve funcionar com getFormProps onChange', () => {
      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {},
          initialData: { name: 'João', email: 'joao@test.com' }
        })
      )

      const formProps = result.current.getFormProps()

      act(() => {
        formProps.onChange({ name: 'Maria' })
      })

      expect(result.current.data).toEqual({
        name: 'Maria',
        email: 'joao@test.com'
      })
    })

    it('deve funcionar com getFormProps onReset', () => {
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

      const formProps = result.current.getFormProps()

      act(() => {
        formProps.onReset()
      })

      expect(result.current.data).toEqual(initialData)
    })
  })

  describe('Controle e Reload', () => {
    it('deve recarregar dados com reload', async () => {
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

      // Aguarda o carregamento inicial (pode ser chamado 2 vezes devido ao comportamento interno)
      await waitFor(() => {
        expect(getMock).toHaveBeenCalledTimes(2)
      })

      await act(async () => {
        await result.current.reload()
      })

      // Após reload, deve ter sido chamado mais uma vez
      expect(getMock).toHaveBeenCalledTimes(3)
    })

    it('deve recarregar resolver específico com reloadFetch', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const customData = { message: 'Custom data' }
      
      const getMock = vi.fn().mockResolvedValue(userData)
      const customMock = vi.fn().mockResolvedValue(customData)

      const { result } = renderHook(() =>
        useFetchForm<TestUser, { customAction: () => Promise<{ message: string }> }>({
          id: 1,
          resolvers: {
            get: getMock,
            customAction: customMock
          }
        })
      )

      // Aguarda o carregamento inicial (pode ser chamado 2 vezes devido ao comportamento interno)
      await waitFor(() => {
        expect(getMock).toHaveBeenCalledTimes(2)
        expect(customMock).toHaveBeenCalledTimes(2)
      })

      await act(async () => {
        await result.current.reloadFetch('customAction')
      })

      expect(getMock).toHaveBeenCalledTimes(2) // Não deve ter sido chamado novamente
      expect(customMock).toHaveBeenCalledTimes(3) // Deve ter sido chamado novamente
    })

    it('deve forçar recálculo com refreshUpdateDataCheck', async () => {
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
        result.current.refreshUpdateDataCheck()
      })

      // Deve manter o estado atual
      expect(result.current.isUpdateData).toBe(false)
    })
  })

  describe('Estados de Loading', () => {
    it('deve gerenciar estado de loading corretamente', async () => {
      const getMock = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: 1, name: 'João' }), 50))
      )

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          }
        })
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      }, { timeout: 1000 })
    })

    it('deve indicar isStarted corretamente', async () => {
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
        expect(result.current.isStarted).toBe(true)
      })
    })
  })

  describe('Casos Extremos', () => {
    it('deve lidar com transformData retornando dados parciais', async () => {
      const userData = { id: 1, name: 'joão', email: 'joao@test.com', age: 25 }
      const getMock = vi.fn().mockResolvedValue(userData)
      const transformDataMock = vi.fn().mockReturnValue({ name: 'João' }) // Só transforma o nome

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
        expect(result.current.data).toEqual({
          id: 1,
          name: 'João', // Transformado
          email: 'joao@test.com', // Original
          age: 25 // Original
        })
      })
    })

    it('deve normalizar valores vazios na detecção de mudanças', async () => {
      const userData = { id: 1, name: 'João', email: '' }
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
        result.current.updateDataKey('email', null as any)
      })

      expect(result.current.isUpdateData).toBe(false)

      act(() => {
        result.current.updateDataKey('email', undefined as any)
      })

      expect(result.current.isUpdateData).toBe(false)

      act(() => {
        result.current.updateDataKey('email', 'novo@email.com')
      })

      expect(result.current.isUpdateData).toBe(true)
    })

    it('deve lidar com erro no resolver get', async () => {
      const error = new Error('Erro ao carregar')
      const getMock = vi.fn().mockRejectedValue(error)
      const onErrorMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          },
          onError: onErrorMock
        })
      )

      await waitFor(() => {
        expect(result.current.loadError).toBe(true)
      })

      expect(onErrorMock).toHaveBeenCalledWith({ get: error })
    })

    it('deve lidar com resolver que retorna resultado inválido', async () => {
      const createMock = vi.fn().mockResolvedValue(null)
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
      expect(submitResult.error?.message).toBe('Resolver retornou resultado inválido')
      expect(onFailureMock).toHaveBeenCalledWith(expect.any(Error), 'create')
    })

    it('deve aplicar transformData no resultado da submissão', async () => {
      const formData = { name: 'João', email: 'joao@test.com' }
      const createdData = { id: 1, name: 'joão', email: 'joao@test.com' }
      const transformedResult = { id: 1, name: 'João', email: 'joao@test.com' }
      
      const createMock = vi.fn().mockResolvedValue(createdData)
      const transformDataMock = vi.fn().mockReturnValue({ name: 'João' })
      const onSuccessMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          resolvers: {
            create: createMock
          },
          initialData: formData,
          transformData: transformDataMock,
          onSuccess: onSuccessMock
        })
      )

      await act(async () => {
        await result.current.submitForm()
      })

      // O callback onSuccess deve receber dados originais (não transformados)
      expect(onSuccessMock).toHaveBeenCalledWith(createdData, 'create')
      
      // Mas os dados no formulário devem estar transformados
      expect(result.current.data).toEqual(transformedResult)
      
      expect(transformDataMock).toHaveBeenCalledWith(createdData)
    })
  })

  describe('Callbacks e Eventos', () => {
    it('deve chamar onStarted quando dados são carregados', async () => {
      const userData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)
      const onStartedMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          },
          onStarted: onStartedMock
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(userData)
      })

      expect(onStartedMock).toHaveBeenCalledWith({ get: userData })
    })

    it('deve chamar onStarted com dados originais (não transformados)', async () => {
      const userData = { id: 1, name: 'joão', email: 'joao@test.com' }
      const transformedData = { id: 1, name: 'João', email: 'joao@test.com' }
      const getMock = vi.fn().mockResolvedValue(userData)
      const transformDataMock = vi.fn().mockReturnValue({ name: 'João' })
      const onStartedMock = vi.fn()

      const { result } = renderHook(() =>
        useFetchForm<TestUser>({
          id: 1,
          resolvers: {
            get: getMock
          },
          transformData: transformDataMock,
          onStarted: onStartedMock
        })
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(transformedData)
      })

      // O onStarted deve receber os dados originais (não transformados)
      // conforme implementado no hook
      expect(onStartedMock).toHaveBeenCalledWith({ get: userData })
    })
  })
}) 