import { useEffect, useState, useCallback, useRef } from 'react'

// Tipo para diferentes tipos de resolvers
type ResolverFunction<T = unknown> = () => T | Promise<T>
type ResolverPromise<T = unknown> = Promise<T>
export type Resolver<T = unknown> = ResolverFunction<T> | ResolverPromise<T>

// Interface para os resolvers
export interface IFetchProps<T extends Record<string, Resolver>> {
  resolvers: T
  onStarted?: (results: Partial<ResolvedValues<T>>) => void
  onError?: (errors: { [K in keyof T]?: Error }) => void
}

// Tipo para extrair o tipo de retorno de um resolver
type ExtractResolverType<T> = T extends () => infer R
  ? R extends Promise<infer U>
    ? U
    : R
  : T extends Promise<infer U>
  ? U
  : never

// Tipo para mapear todos os resolvers para seus tipos de retorno
type ResolvedValues<T extends Record<string, Resolver>> = {
  [K in keyof T]: ExtractResolverType<T[K]>
}

export function useFetch<T extends Record<string, Resolver>>(
  { resolvers, onStarted, onError }: IFetchProps<T>
) {
  const resolversRef = useRef(resolvers)
  const onStartedRef = useRef(onStarted)
  const onErrorRef = useRef(onError)
  
  resolversRef.current = resolvers
  onStartedRef.current = onStarted
  onErrorRef.current = onError

  // Estados separados com responsabilidades únicas
  const [resolveData, setResolveData] = useState<Partial<ResolvedValues<T>>>(() => ({}))
  
  const [globalLoading, setGlobalLoading] = useState<boolean>(false)
  
  const [executionStatus, setExecutionStatus] = useState<{
    isStarted: boolean
    isErrorOnLoad: boolean
  }>(() => ({
    isStarted: false,
    isErrorOnLoad: false
  }))

  // Função auxiliar para atualizar dados resolvidos
  const updateResolveData = useCallback((key: keyof T, data: unknown) => {
    setResolveData(prev => ({ ...prev, [key]: data }))
  }, [])

  const executeResolver = useCallback(async (key: keyof T) => {
    try {
      const resolver = resolversRef.current[key]
      let result: unknown

      // Se é uma Promise direta
      if (resolver instanceof Promise) {
        result = await resolver
      }
      // Se é uma função
      else if (typeof resolver === 'function') {
        const functionResult = resolver()
        // Se a função retorna uma Promise
        if (functionResult instanceof Promise) {
          result = await functionResult
        } else {
          result = functionResult
        }
      }

      updateResolveData(key, result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      throw err
    }
  }, [updateResolveData])

  const executeAll = useCallback(async () => {
    // Marca como iniciando
    setGlobalLoading(true)
    setExecutionStatus({
      isStarted: false,
      isErrorOnLoad: false
    })

    const keys = Object.keys(resolversRef.current) as (keyof T)[]
    const promises = keys.map(async (key) => {
      try {
        const result = await executeResolver(key)
        return { key, result, success: true }
      } catch (error) {
        return { key, error, success: false }
      }
    })
    
    const results = await Promise.allSettled(promises)
    
    // Processa os resultados
    const successfulResults: Partial<ResolvedValues<T>> = {}
    const errorResults: { [K in keyof T]?: Error } = {}
    let hasErrors = false

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { key, result: data, success, error } = result.value
        if (success) {
          successfulResults[key] = data as unknown as ExtractResolverType<T[keyof T]>
        } else {
          errorResults[key] = error instanceof Error ? error : new Error(String(error))
          hasErrors = true
        }
      }
    })

    // Atualiza o status de execução
    setGlobalLoading(false)
    setExecutionStatus({
      isStarted: !hasErrors,
      isErrorOnLoad: hasErrors
    })

    // Chama os callbacks
    if (!hasErrors && onStartedRef.current) {
      onStartedRef.current(successfulResults)
    }
    
    if (hasErrors && onErrorRef.current) {
      onErrorRef.current(errorResults)
    }
    
    return results
  }, [executeResolver])

  const reloadFetch = useCallback((key?: keyof T) => {
    if (key) {
      return executeResolver(key)
    } else {
      return executeAll()
    }
  }, [executeResolver, executeAll])

  const onReload = useCallback((keepData: boolean = false) => {
    if (!keepData) {
      // Limpa os dados antes de recarregar
      setResolveData({})
      setExecutionStatus({
        isStarted: false,
        isErrorOnLoad: false
      })
    }
    
    return executeAll()
  }, [executeAll])

  // Executa todos os resolvers na inicialização apenas uma vez
  useEffect(() => {
    executeAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    resolve: resolveData,  
    isLoading: globalLoading,
    isStarted: executionStatus.isStarted,
    isErrorOnLoad: executionStatus.isErrorOnLoad,
    reloadFetch,
    onReload
  }
} 