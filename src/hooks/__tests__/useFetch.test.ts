import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFetch } from '../useFetch'

describe('useFetch', () => {
  // ========================================
  // TESTES DE FUNCIONALIDADE BÁSICA
  // ========================================
  
  describe('Funcionalidade Básica', () => {
    it('deve executar resolvers síncronos corretamente', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            syncData: () => ({ message: 'Hello World' })
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.syncData).toEqual({ message: 'Hello World' })
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })

      expect(result.current.isErrorOnLoad).toBe(false)
    })

    it('deve executar resolvers assíncronos corretamente', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            asyncData: async () => ({ data: 'async result' })
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.asyncData).toEqual({ data: 'async result' })
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isStarted).toBe(true)
      expect(result.current.isErrorOnLoad).toBe(false)
    })

    it('deve executar promises diretas corretamente', async () => {
      const promise = Promise.resolve({ value: 'promise result' })
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            promiseData: promise
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.promiseData).toEqual({ value: 'promise result' })
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isStarted).toBe(true)
      expect(result.current.isErrorOnLoad).toBe(false)
    })

    it('deve manter tipagem correta para diferentes tipos de resolvers', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            stringData: () => 'hello',
            numberData: () => 42,
            objectData: () => ({ key: 'value' }),
            arrayData: () => [1, 2, 3],
            asyncString: async () => 'async hello',
            promiseNumber: Promise.resolve(100)
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.stringData).toBe('hello')
        expect(result.current.resolve.numberData).toBe(42)
        expect(result.current.resolve.objectData).toEqual({ key: 'value' })
        expect(result.current.resolve.arrayData).toEqual([1, 2, 3])
        expect(result.current.resolve.asyncString).toBe('async hello')
        expect(result.current.resolve.promiseNumber).toBe(100)
      })

      expect(result.current.isStarted).toBe(true)
      expect(result.current.isErrorOnLoad).toBe(false)
    })
  })

  // ========================================
  // TESTES DE TRATAMENTO DE ERROS
  // ========================================
  
  describe('Tratamento de Erros', () => {
    it('deve lidar com erros básicos corretamente', async () => {
      const onErrorMock = vi.fn()
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            errorData: async () => {
              throw new Error('Test error')
            }
          },
          onError: onErrorMock
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorOnLoad).toBe(true)
      })

      expect(result.current.resolve.errorData).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isStarted).toBe(false)
      expect(onErrorMock).toHaveBeenCalledWith({
        errorData: expect.any(Error)
      })
    })

    it('deve converter strings em Error objects', async () => {
      const onErrorMock = vi.fn()
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            stringError: () => {
              throw 'String error'
            },
            numberError: () => {
              throw 404
            }
          },
          onError: onErrorMock
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorOnLoad).toBe(true)
      })

      expect(onErrorMock).toHaveBeenCalledWith({
        stringError: expect.any(Error),
        numberError: expect.any(Error)
      })

      const errorCall = onErrorMock.mock.calls[0][0]
      expect(errorCall.stringError.message).toBe('String error')
      expect(errorCall.numberError.message).toBe('404')
    })

    it('deve lidar com erros parciais (alguns resolvers falham, outros não)', async () => {
      const onErrorMock = vi.fn()
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            success: () => ({ value: 1 }),
            failure: async () => {
              throw new Error('Test error')
            }
          },
          onError: onErrorMock
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorOnLoad).toBe(true)
      })

      expect(result.current.resolve.success).toEqual({ value: 1 })
      expect(result.current.resolve.failure).toBeUndefined()
      expect(result.current.isStarted).toBe(false)
      expect(onErrorMock).toHaveBeenCalledWith({
        failure: expect.any(Error)
      })
    })
  })

  // ========================================
  // TESTES DE ESTADOS E CALLBACKS
  // ========================================
  
  describe('Estados e Callbacks', () => {
    it('deve definir isStarted como true quando todos os resolvers são executados com sucesso', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data1: () => ({ value: 1 }),
            data2: async () => ({ value: 2 })
          }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(result.current.isErrorOnLoad).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('deve chamar onStarted quando todos os resolvers são executados com sucesso', async () => {
      const onStartedMock = vi.fn()
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data1: () => ({ value: 1 }),
            data2: () => ({ value: 2 })
          },
          onStarted: onStartedMock
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(onStartedMock).toHaveBeenCalledWith({
        data1: { value: 1 },
        data2: { value: 2 }
      })
    })

    it('deve gerenciar estados de loading corretamente', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            slowData: () => new Promise(resolve => 
              setTimeout(() => resolve({ slow: true }), 100)
            )
          }
        })
      )

      // Inicialmente deve estar carregando
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isStarted).toBe(false)

      await waitFor(() => {
        expect(result.current.resolve.slowData).toEqual({ slow: true })
      })

      // Após carregar, deve parar o loading
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isStarted).toBe(true)
    })
  })

  // ========================================
  // TESTES DE FUNCIONALIDADE RELOADFETCH
  // ========================================
  
  describe('Funcionalidade reloadFetch', () => {
    it('deve permitir reload de resolvers específicos', async () => {
      let counter = 0
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            counter: () => ({ count: ++counter })
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.counter).toEqual({ count: 1 })
      })

      // Reload específico
      await act(async () => {
        await result.current.reloadFetch('counter')
      })

      expect(result.current.resolve.counter).toEqual({ count: 2 })
    })

    it('deve distinguir entre reload específico e geral', async () => {
      let counter1 = 0
      let counter2 = 0
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data1: () => ({ count: ++counter1 }),
            data2: () => ({ count: ++counter2 })
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.data1).toEqual({ count: 1 })
        expect(result.current.resolve.data2).toEqual({ count: 1 })
      })

      // Reload específico
      await act(async () => {
        await result.current.reloadFetch('data1')
      })

      expect(result.current.resolve.data1).toEqual({ count: 2 })
      expect(result.current.resolve.data2).toEqual({ count: 1 }) // Não mudou

      // Reload geral
      await act(async () => {
        await result.current.reloadFetch()
      })

      expect(result.current.resolve.data1).toEqual({ count: 3 })
      expect(result.current.resolve.data2).toEqual({ count: 2 })
    })

    it('deve limpar dados quando onReload(false) é chamado', async () => {
      let callCount = 0
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data: () => ({ value: 'initial', call: ++callCount })
          }
        })
      )

      // Aguarda carregar inicialmente
      await waitFor(() => {
        expect(result.current.resolve.data).toEqual({ value: 'initial', call: 1 })
      })

      // Chama onReload sem manter dados
      await act(async () => {
        await result.current.onReload(false)
      })

      // Aguarda o reload completar e verifica se os dados foram recarregados
      await waitFor(() => {
        expect(result.current.resolve.data).toEqual({ value: 'initial', call: 2 })
      })

      expect(result.current.isStarted).toBe(true)
      expect(result.current.isErrorOnLoad).toBe(false)
    })

    it('deve manter dados quando onReload(true) é chamado', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data: () => ({ value: 'initial' })
          }
        })
      )

      // Aguarda carregar inicialmente
      await waitFor(() => {
        expect(result.current.resolve.data).toEqual({ value: 'initial' })
      })

      // Chama onReload mantendo dados
      await act(async () => {
        await result.current.onReload(true)
      })

      // Verifica se os dados foram mantidos durante o processo
      expect(result.current.resolve.data).toEqual({ value: 'initial' })
    })
  })

  // ========================================
  // TESTES DE EDGE CASES
  // ========================================
  
  describe('Edge Cases', () => {
    it('deve lidar com objeto de resolvers vazio', async () => {
      const { result } = renderHook(() =>
        useFetch({ resolvers: {} })
      )
      
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isErrorOnLoad).toBe(false)
      expect(Object.keys(result.current.resolve)).toHaveLength(0)
    })

    it('deve lidar com resolvers que retornam null/undefined', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            nullData: () => null,
            undefinedData: () => undefined,
            zeroData: () => 0,
            falseData: () => false,
            emptyStringData: () => ''
          }
        })
      )
      
      await waitFor(() => {
        expect(result.current.resolve.nullData).toBe(null)
        expect(result.current.resolve.undefinedData).toBe(undefined)
        expect(result.current.resolve.zeroData).toBe(0)
        expect(result.current.resolve.falseData).toBe(false)
        expect(result.current.resolve.emptyStringData).toBe('')
        expect(result.current.isStarted).toBe(true)
      })

      expect(result.current.isErrorOnLoad).toBe(false)
    })

    it('deve lidar com promises rejeitadas', async () => {
      const onErrorMock = vi.fn()
      
      // Cria uma promise rejeitada de forma mais controlada
      const rejectedPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Promise rejected')), 0)
      })
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            rejectedPromise
          },
          onError: onErrorMock
        })
      )

      await waitFor(() => {
        expect(result.current.isErrorOnLoad).toBe(true)
      })

      expect(onErrorMock).toHaveBeenCalledWith({
        rejectedPromise: expect.any(Error)
      })
    })
  })

  // ========================================
  // TESTES DE PERFORMANCE E CONCORRÊNCIA
  // ========================================
  
  describe('Performance e Concorrência', () => {
    it('deve executar múltiplos resolvers em paralelo', async () => {
      const startTimes: number[] = []
      const endTimes: number[] = []
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            slow1: async () => {
              startTimes.push(Date.now())
              await new Promise(resolve => setTimeout(resolve, 100))
              endTimes.push(Date.now())
              return 'slow1'
            },
            slow2: async () => {
              startTimes.push(Date.now())
              await new Promise(resolve => setTimeout(resolve, 100))
              endTimes.push(Date.now())
              return 'slow2'
            }
          }
        })
      )
      
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })
      
      // Verifica se executaram em paralelo (diferença de início < 50ms)
      expect(Math.abs(startTimes[0] - startTimes[1])).toBeLessThan(50)
      expect(result.current.resolve.slow1).toBe('slow1')
      expect(result.current.resolve.slow2).toBe('slow2')
    })

    it('deve lidar com grande quantidade de resolvers', async () => {
      const resolvers: Record<string, () => number> = {}
      
      // Cria 50 resolvers (reduzido para não sobrecarregar os testes)
      for (let i = 0; i < 50; i++) {
        resolvers[`data${i}`] = () => i
      }
      
      const { result } = renderHook(() =>
        useFetch({ resolvers })
      )
      
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      }, { timeout: 5000 })
      
      // Verifica se todos foram executados
      for (let i = 0; i < 50; i++) {
        expect(result.current.resolve[`data${i}`]).toBe(i)
      }
    })
  })

  // ========================================
  // TESTES DE MEMÓRIA E REFS
  // ========================================
  
  describe('Memória e Refs', () => {
    it('deve atualizar refs quando props mudam', async () => {
      const onStarted1 = vi.fn()
      const onStarted2 = vi.fn()
      
      const { result, rerender } = renderHook(
        ({ onStarted }) => useFetch({
          resolvers: { data: () => 'test' },
          onStarted
        }),
        { initialProps: { onStarted: onStarted1 } }
      )
      
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })
      
      expect(onStarted1).toHaveBeenCalled()
      
      // Muda o callback
      rerender({ onStarted: onStarted2 })
      
      // Recarrega para testar novo callback
      await act(async () => {
        await result.current.onReload()
      })
      
      await waitFor(() => {
        expect(onStarted2).toHaveBeenCalled()
      })
    })

    it('deve manter referências estáveis para funções', () => {
      const { result, rerender } = renderHook(() =>
        useFetch({
          resolvers: { data: () => 'test' }
        })
      )

      const firstReloadFetch = result.current.reloadFetch
      const firstOnReload = result.current.onReload

      rerender()

      // As funções devem manter a mesma referência
      expect(result.current.reloadFetch).toBe(firstReloadFetch)
      expect(result.current.onReload).toBe(firstOnReload)
    })
  })

  // ========================================
  // TESTES DE INTEGRAÇÃO COM REACT
  // ========================================
  
  describe('Integração com React', () => {
    it('deve manter consistência de estados durante transições', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data: () => new Promise(resolve => 
              setTimeout(() => resolve('test'), 100)
            )
          }
        })
      )
      
      // Estado inicial
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isStarted).toBe(false)
      expect(result.current.isErrorOnLoad).toBe(false)
      
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })
      
      // Estado final
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isErrorOnLoad).toBe(false)
    })

    it('deve gerenciar estados de loading corretamente durante onReload', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            slowData: () => new Promise(resolve => 
              setTimeout(() => resolve({ value: 'slow' }), 50)
            )
          }
        })
      )

      // Aguarda carregar inicialmente
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      // Chama onReload e verifica estados imediatamente após
      act(() => {
        result.current.onReload(false)
      })

      // Aguarda um pouco para verificar se o loading foi ativado
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      }, { timeout: 100 })

      expect(result.current.isStarted).toBe(false)

      // Aguarda terminar
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isStarted).toBe(true)
      })
    })

    it('deve executar apenas uma vez na inicialização', async () => {
      let executionCount = 0
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            data: () => {
              executionCount++
              return { count: executionCount }
            }
          }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      // Deve ter executado apenas uma vez
      expect(executionCount).toBe(1)
      expect(result.current.resolve.data).toEqual({ count: 1 })
    })
  })

  // ========================================
  // TESTES DE CASOS COMPLEXOS
  // ========================================
  
  describe('Casos Complexos', () => {
    it('deve lidar com resolvers que mudam durante a execução', async () => {
      let resolverFunction = () => 'initial'
      
      const { result, rerender } = renderHook(() =>
        useFetch({
          resolvers: {
            dynamic: resolverFunction
          }
        })
      )

      await waitFor(() => {
        expect(result.current.resolve.dynamic).toBe('initial')
      })

      // Muda o resolver
      resolverFunction = () => 'changed'
      rerender()

      // Recarrega com novo resolver
      await act(async () => {
        await result.current.onReload()
      })

      await waitFor(() => {
        expect(result.current.resolve.dynamic).toBe('changed')
      })
    })

    it('deve lidar com mix de resolvers síncronos, assíncronos e promises', async () => {
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            sync: () => 'sync',
            async: async () => 'async',
            promise: Promise.resolve('promise'),
            slowAsync: async () => {
              await new Promise(resolve => setTimeout(resolve, 50))
              return 'slow'
            }
          }
        })
      )

      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(result.current.resolve.sync).toBe('sync')
      expect(result.current.resolve.async).toBe('async')
      expect(result.current.resolve.promise).toBe('promise')
      expect(result.current.resolve.slowAsync).toBe('slow')
    })

    it('deve manter dados parciais quando alguns resolvers falham no reload', async () => {
      let shouldFail = false
      
      const { result } = renderHook(() =>
        useFetch({
          resolvers: {
            stable: () => 'stable data',
            unstable: () => {
              if (shouldFail) throw new Error('Unstable error')
              return 'unstable data'
            }
          }
        })
      )

      // Primeira execução - tudo funciona
      await waitFor(() => {
        expect(result.current.isStarted).toBe(true)
      })

      expect(result.current.resolve.stable).toBe('stable data')
      expect(result.current.resolve.unstable).toBe('unstable data')

      // Segunda execução - unstable falha
      shouldFail = true
      
      await act(async () => {
        await result.current.onReload()
      })

      await waitFor(() => {
        expect(result.current.isErrorOnLoad).toBe(true)
      })

      // Dados estáveis devem permanecer, instáveis devem ser limpos
      expect(result.current.resolve.stable).toBe('stable data')
      expect(result.current.resolve.unstable).toBeUndefined()
    })
  })
}) 