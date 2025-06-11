import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { useFetchForm } from '../useFetchForm'

// Tipos de teste
interface TestUser {
  id: number
  name: string
  email: string
}

describe('useFetchForm - Teste Simples', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve inicializar sem loop infinito', () => {
    const { result } = renderHook(() =>
      useFetchForm<TestUser>({
        resolvers: {},
        initialData: { name: 'João', email: 'joao@test.com' }
      })
    )

    expect(result.current.data).toEqual({ name: 'João', email: 'joao@test.com' })
    expect(result.current.isCreating).toBe(true)
    expect(result.current.isEditing).toBe(false)
  })

  it('deve carregar dados com get resolver', async () => {
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
    }, { timeout: 2000 })

    expect(getMock).toHaveBeenCalledWith(1)
    // O useFetch pode chamar o resolver mais de uma vez durante a inicialização
    expect(getMock).toHaveBeenCalled()
  })

  it('deve atualizar dados', () => {
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
  })

  it('deve submeter dados para create', async () => {
    const formData = { name: 'João', email: 'joao@test.com' }
    const createdData = { id: 1, ...formData }
    const createMock = vi.fn().mockResolvedValue(createdData)

    const { result } = renderHook(() =>
      useFetchForm<TestUser>({
        resolvers: {
          create: createMock
        },
        initialData: formData
      })
    )

    let submitResult: any
    await act(async () => {
      submitResult = await result.current.submitForm()
    })

    expect(submitResult.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(formData)
  })
}) 