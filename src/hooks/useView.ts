import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useImmerReducer, useImmer } from "use-immer";
import {
  IStatusInfo,
  IUseViewProps,
  IResolve,
  IResolvedValues,
  IExtractResolverType,
} from "./useView.interfaces";

export function useView<T extends Record<string, IResolve>>({
  resolves: resolvesOriginal,
  firstLoad = true,
  onStarted,
  onErrorStarted,
}: IUseViewProps<T>) {
  /**
   * Resolves
   */
  const resolves = useRef(resolvesOriginal);

  useLayoutEffect(() => {
    resolves.current = resolvesOriginal;
  }, [resolvesOriginal]);

  /**
   * Resposta dos Observables do resolves
   */
  const [resolvesResponse, setResolvesResponse] = useImmer<
    Partial<IResolvedValues<T>>
  >({});

  /**
   * Status Info
   *
   * Gerenciamento do status da página
   */
  const [statusInfo, setStatusInfo] = useImmerReducer<
    IStatusInfo,
    Partial<IStatusInfo>
  >((prevState, newState) => ({ ...prevState, ...newState }), {
    isLoading: !!firstLoad,
    isStarted: !firstLoad,
    isErrorOnLoad: false,
    isCriticalError: false,
  });

  const runResolver = useCallback(async (key: keyof T, updateResolvesResponse = true) => {
    try {
      const resolver = resolves.current?.[key];

      if (!resolver) {
        throw new Error(`Resolver ${String(key)} not found`);
      }

      let result: unknown;

      // Se é uma Promise direta
      if (resolver instanceof Promise) {
        result = await resolver;
      }
      // Se é uma função
      else if (typeof resolver === "function") {
        const functionResult = resolver();
        // Se a função retorna uma Promise
        if (functionResult instanceof Promise) {
          result = await functionResult;
        } else {
          result = functionResult;
        }
      }

      if (updateResolvesResponse) {
        setResolvesResponse((draft) => ({
          ...(draft as Partial<IResolvedValues<T>>),
          [key]: result,
        }));
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      throw err;
    }
  }, []);

  /**
   * Controla se o carregamento inicial já foi executado
   * Evita recarregamentos desnecessários durante hot reload
   */
  const hasInitialLoaded = useRef(false);

  /**
   * Carregar resolves
   */
  const runAllResolver = useCallback(
    async (_firstLoad = true): Promise<Partial<IResolvedValues<T>>> => {
      let hasErrors = false;

      // Processa os resultados
      const successfulResults: Partial<IResolvedValues<T>> = {};
      const errorResults: { [K in keyof T]?: Error } = {};

      if (
        resolves.current &&
        Object.values(resolves.current).length > 0 &&
        _firstLoad
      ) {
        const keys = Object.keys(resolves.current) as (keyof T)[];
        const promises = keys.map(async (key) => {
          try {
            const result = await runResolver(key, false);
            return { key, result, success: true };
          } catch (error) {
            return { key, error, success: false };
          }
        });

        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const { key, result: data, success, error } = result.value;
            if (success) {
              successfulResults[key] = data as unknown as IExtractResolverType<
                T[keyof T]
              >;
            } else {
              errorResults[key] =
                error instanceof Error ? error : new Error(String(error));
              hasErrors = true;
            }
          }
        });
      }

      // Chama os callbacks
      if (!hasErrors && onStarted) {
        onStarted(successfulResults as IResolvedValues<T>);
      }

      if (hasErrors && onErrorStarted) {
        onErrorStarted(errorResults);
      }

      setStatusInfo({
        isLoading: false,
        isStarted: !hasErrors,
        isErrorOnLoad: hasErrors,
      });

      setResolvesResponse(successfulResults);

      return successfulResults;
    },
    [runResolver, setResolvesResponse, onStarted, onErrorStarted, setStatusInfo]
  );

  /**
   * Recarregar página
   *
   * @param wait1s Aguardar 1s para debounce
   */
  async function reloadPage(
    wait1s = true
  ): Promise<Partial<IResolvedValues<T>>> {
    setStatusInfo({
      isLoading: true,
      isStarted: false,
      isErrorOnLoad: false,
      isCriticalError: false,
    });

    setResolvesResponse({});

    if (wait1s) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return runAllResolver();
  }

  /**
   * Load resolves
   */
  useEffect(() => {
    // Só carrega se ainda não foi carregado anteriormente
    if (!hasInitialLoaded.current) {
      runAllResolver(firstLoad);
      hasInitialLoaded.current = true;
    }
  }, [runAllResolver, firstLoad]);

  return {
    ...(statusInfo as IStatusInfo),
    statusInfo,
    setStatusInfo,
    resolvesResponse,
    reloadPage,
    runResolver,
  };
}
