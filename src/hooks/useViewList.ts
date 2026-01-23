import { useState, useRef } from "react";
import { useImmerReducer } from "use-immer";
import { useView } from "./useView";
import { IResolve } from "./useView.interfaces";
import {
  IResponseResults,
  IStatusInfoViewList,
  IUseViewListProps,
  SortValue,
} from "./useViewList.interfaces";
import omitBy from "lodash/omitBy";
import isEqual from "lodash/isEqual";
import { convertObjetToQuery, convertQueryToObject } from "./useViewList.utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect } from "react";
import { useDidEffect } from "./useDidEffect";

function useInitialFiltersQuery() {
  const searchParams = useSearchParams();
  return convertQueryToObject(searchParams.toString());
}

function useQueryChange({
  filters,
  setFilters,
}: {
  filters: Record<string, unknown>;
  setFilters: (filters: Record<string, unknown>) => Promise<void>;
}) {
  const nav = useRouter();
  const searchParams = useSearchParams();
  const prevQuery = useRef<string>(
    convertObjetToQuery(convertQueryToObject(searchParams.toString()))
  );

  useLayoutEffect(() => {
    const newFilters = omitBy(
      filters,
      (value, key) =>
        value === "" || value === null || (key === "offset" && value == 0)
    );

    const queryStr = convertObjetToQuery(newFilters);
    if (queryStr !== prevQuery.current) {
      prevQuery.current = queryStr;
      nav.replace("?" + prevQuery.current, {
        scroll: false,
      });
    }
  }, [filters]);

  useDidEffect(() => {
    const queryStr = convertObjetToQuery(
      convertQueryToObject(searchParams.toString())
    );
    if (queryStr !== prevQuery.current) {
      prevQuery.current = queryStr;
      setFilters(convertQueryToObject(queryStr));
    }
  }, [searchParams.toString()]);
}

export function useViewList<
  IResource extends { id: string | number } = { id: string | number },
  IFilter = Record<string, unknown>,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
>({
  resolveResources,
  onStarted,
  onErrorStarted,
  onErrorSearch,
  onBeforeSearch,
  onAfterSearch,
  onChangeFilters,
  handleFilters,
  limit = 20,
  initialOffset = 0,
  initialSort = null,
  lazyLoading = false,
  filtersDefault: filtersDefaultOriginal = {},
  initialFilters = {},
  treatmentResources = (r: IResource[]): IResource[] => r,
  resolves,
  firstLoad = true,
  useNextRouterParams = false,
}: IUseViewListProps<IResource, IFilter, TResolves>) {
  const [resources, setResources] = useState<IResource[]>([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);

  const initialFiltersQuery = useNextRouterParams
    ? useInitialFiltersQuery()
    : {};

  const [filters, _setFilters] = useState<
    { offset: number; sort: SortValue } & Partial<IFilter>
  >({
    offset: initialOffset,
    sort: initialSort,
    ...filtersDefaultOriginal,
    ...initialFilters,
    ...initialFiltersQuery,
  });

  const [filtersCount, setFiltersCount] = useState(0);
  const [filtersOverrides, setFiltersOverrides] = useState<string[]>([]);

  useLayoutEffect(() => {
    const filtersRest = omitBy(
      filters,
      (value, key2) =>
        value == null ||
        (typeof value == "string" && value == "") ||
        (key2 === "offset" && value == 0) ||
        isEqual(
          value,
          {
            offset: "0",
            sort: initialSort,
            ...filtersDefaultOriginal,
          }[key2 as keyof typeof filters]
        )
    );
    setFiltersCount(Object.keys(filtersRest).length);
    setFiltersOverrides(Object.keys(filtersRest));
  }, [filters]);

  /**
   * Guarda o último conjunto de filtros utilizado em uma busca.
   * Isso permite que possamos executar `retry()` posteriormente
   * e também reverter o offset caso ocorra erro ao navegar entre páginas.
   */
  const lastAttemptedFiltersRef = useRef<
    { offset: number; sort: SortValue } & Partial<IFilter>
  >(filters);

  const resolvesForm: TResolves & {
    resources: IResolve<IResponseResults<IResource>>;
  } = {
    ...(resolves ?? ({} as TResolves)),
    resources: () => resolveResources(applyHandleFilters(filters)),
  };

  const [statusInfoList, setStatusInfoList] = useImmerReducer<
    IStatusInfoViewList,
    Partial<IStatusInfoViewList>
  >((prevState, newState) => ({ ...prevState, ...newState }), {
    isSearching: true,
    isErrorOnSearching: false,
    isErrorOnSearchingInfinitScroll: false,
    isLastPage: false,
    isFirstPage: false,
  });

  const {
    statusInfo,
    setStatusInfo,
    reloadPage: reloadPageView,
    reloadPageSoft: reloadPageSoftView,
    resolvesResponse,
  } = useView<typeof resolvesForm>({
    resolves: resolvesForm,
    firstLoad,
    onStarted: (s) => {
      onStarted?.(s);
      onStartedList(s.resources);
    },
    onErrorStarted: (e) => {
      onErrorStarted?.(e);
      onErrorStartedList(e);
    },
  });

  function onStartedList(resources: IResponseResults<IResource>) {
    processSearch(resources);
  }

  function onErrorStartedList(error: {
    [K in keyof typeof resolvesForm]?: Error;
  }) {
    setStatusInfoList({
      isSearching: false,
      isErrorOnSearching: !!error.resources,
    });

    if (error.resources) {
      onErrorSearch?.(error.resources);
    }
  }

  function processSearch(resources: IResponseResults<IResource>) {
    setResources(treatmentResources(resources.results));
    setResourcesTotal(resources.count);

    setStatusInfoList({
      isFirstPage: !filters.offset,
      isLastPage: filters.offset + limit >= resources.count,
      isSearching: false,
      isErrorOnSearching: false,
    });
  }

  function reloadPage(wait1s = false) {
    reloadPageView(wait1s);
  }

  /**
   * Aplica handleFilters se fornecido, caso contrário retorna os filtros sem modificação
   */
  function applyHandleFilters(
    filtersToApply: { offset: number; sort: SortValue } & Partial<IFilter>
  ): { offset: number; sort: SortValue } & Partial<IFilter> {
    return handleFilters ? handleFilters(filtersToApply) : filtersToApply;
  }

  /**
   * Atualiza os filtros e dispara novamente a busca de resources.
   *
   * @param newFilters Filtros que devem ser aplicados
   * @param options    Definições extras (ex.: { force: true } para forçar a busca mesmo se não houver mudança)
   */
  async function setFilters(
    newFilters: Partial<IFilter>,
    options?: { force?: boolean }
  ) {
    // Novo estado de filtros a ser considerado
    const filtersToApply = {
      offset: initialOffset,
      sort: initialSort,
      ...filtersDefaultOriginal,
      ...newFilters,
    } as { offset: number; sort: SortValue } & Partial<IFilter>;

    // Verifica se houve mudança efetiva nos filtros
    const hasChanged =
      JSON.stringify(filtersToApply) !== JSON.stringify(filters);

    // Se não mudou e não foi solicitado forçar, apenas retorna
    if (!hasChanged && !options?.force) {
      return;
    }

    // Chama callback antes da busca
    onBeforeSearch?.(filtersToApply);

    // Define estado de busca iniciada
    setStatusInfoList({
      isSearching: true,
      isErrorOnSearching: false,
    });

    // Chama callback de mudança de filtros
    const previousFilters = filters;
    onChangeFilters?.(filtersToApply, previousFilters);

    // Atualiza filtros – isso irá ocasionar novo render, mas já fazemos a busca abaixo
    _setFilters(filtersToApply);

    try {
      // Executa a busca diretamente com os filtros atualizados
      const response = await resolveResources(applyHandleFilters(filtersToApply));
      processSearch(response);

      // Chama callback após sucesso
      onAfterSearch?.({
        success: true,
        data: response,
        filters: filtersToApply,
      });
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));

      // Chama callback após erro
      onAfterSearch?.({
        success: false,
        error: errorInstance,
        filters: filtersToApply,
      });

      onErrorSearch?.(errorInstance);
    }
  }

  /**
   * Executa a busca com determinado conjunto de filtros, mantendo
   * controle do offset anterior para rollback em caso de erro.
   */
  async function runSearchWithFilters(
    filtersToApply: { offset: number; sort: SortValue } & Partial<IFilter>,
    previousOffset: number = filters.offset
  ) {
    // Aplica handleFilters antes de usar os filtros
    const processedFilters = filtersToApply;
    
    // Memoriza a última requisição feita
    lastAttemptedFiltersRef.current = processedFilters;

    // Chama callback antes da busca
    onBeforeSearch?.(processedFilters);

    // Define estado de busca iniciada
    setStatusInfoList({
      isSearching: true,
      isErrorOnSearching: false,
    });

    // Chama callback de mudança de filtros
    const previousFilters = filters;
    onChangeFilters?.(processedFilters, previousFilters);

    // Atualiza filtros – já ajustamos o offset antes da requisição
    _setFilters(processedFilters);

    try {
      const response = await resolveResources(applyHandleFilters(processedFilters));
      processSearch(response);

      // Chama callback após sucesso
      onAfterSearch?.({
        success: true,
        data: response,
        filters: processedFilters,
      });
    } catch (err) {
      // Reverte o offset em caso de falha
      _setFilters((prev) => ({ ...prev, offset: previousOffset }));

      setStatusInfoList({
        isSearching: false,
        isErrorOnSearching: true,
      });

      const errorInstance = err instanceof Error ? err : new Error(String(err));

      // Chama callback após erro
      onAfterSearch?.({
        success: false,
        error: errorInstance,
        filters: processedFilters,
      });

      onErrorSearch?.(errorInstance);
    }
  }

  /**
   * Avança para a próxima página.
   * Utilizamos o offset atual, pois ele já representa o início da próxima página
   * (o processo de busca incrementa o offset após obter os resultados).
   */
  function nextPage() {
    if (!lazyLoading) {
      // Mantém comportamento padrão
      runSearchWithFilters(
        { ...filters, offset: filters.offset },
        filters.offset
      );
      return;
    }

    // Modo Lazy Loading (Infinite Scroll): busca próxima página e faz append sem duplicar
    const nextOffset = filters.offset + limit;
    const filtersToApply = { ...filters, offset: nextOffset } as {
      offset: number;
      sort: SortValue;
    } & Partial<IFilter>;

    // Memoriza a tentativa para possível retry
    lastAttemptedFiltersRef.current = filtersToApply;

    // Callbacks e status inicial
    onBeforeSearch?.(filtersToApply);
    setStatusInfoList({
      isSearching: true,
      isErrorOnSearching: false,
      isErrorOnSearchingInfinitScroll: false,
    });
    const previousFilters = filters;
    onChangeFilters?.(filtersToApply, previousFilters);
    _setFilters(filtersToApply);

    Promise.resolve(resolveResources(applyHandleFilters(filtersToApply)))
      .then((response: IResponseResults<IResource>) => {
        // Deduplicação por id
        setResources((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newItems = treatmentResources(
            response.results.filter((item: IResource) => !existingIds.has(item.id))
          );
          return [...prev, ...newItems];
        });
        setResourcesTotal(response.count);

        setStatusInfoList({
          isFirstPage: !nextOffset,
          isLastPage: nextOffset + limit >= response.count,
          isSearching: false,
          isErrorOnSearching: false,
          isErrorOnSearchingInfinitScroll: false,
        });

        onAfterSearch?.({
          success: true,
          data: response,
          filters: filtersToApply,
        });
      })
      .catch((err: unknown) => {
        // Não altera offset em caso de erro; marca erro específico de infinite scroll
        setStatusInfoList({
          isSearching: false,
          isErrorOnSearchingInfinitScroll: true,
        });

        const errorInstance = err instanceof Error ? err : new Error(String(err));
        onAfterSearch?.({
          success: false,
          error: errorInstance,
          filters: filtersToApply,
        });
        onErrorSearch?.(errorInstance);
      });
  }

  /**
   * Volta para a página anterior.
   * Calcula um novo offset reduzindo o limite, mas nunca deixando-o negativo.
   */
  function previousPage() {
    const newOffset = Math.max(0, filters.offset - limit);
    runSearchWithFilters({ ...filters, offset: newOffset }, filters.offset);
  }

  /**
   * Navega para uma página específica.
   * @param page Número da página (começando em 0)
   */
  function setPage(page: number) {
    // Garante que a página não seja negativa
    const safePage = Math.max(0, page);
    // Calcula o offset baseado na página e no limite
    const newOffset = safePage * limit;
    runSearchWithFilters({ ...filters, offset: newOffset }, filters.offset);
  }

  /**
   * Atualiza a ordenação e executa nova busca mantendo o offset atual.
   * @param sort Nova ordenação a ser aplicada (null para remover ordenação)
   */
  function setSort(sort: SortValue) {
    runSearchWithFilters({ ...filters, sort }, filters.offset);
  }

  /**
   * Tenta novamente a última requisição que falhou (ou a última executada).
   */
  function retry() {
    runSearchWithFilters(lastAttemptedFiltersRef.current, filters.offset);
  }

  /**
   * Carrega itens novos iniciando do offset 0. Itens ainda não presentes
   * serão adicionados no início da lista e o offset atual será incrementado
   * pela quantidade de itens realmente novos encontrados.
   */
  function loadNewsResource() {
    const filtersToApply = { ...filters, offset: 0 } as {
      offset: number;
      sort: SortValue;
    } & Partial<IFilter>;

    // Callbacks e status inicial
    onBeforeSearch?.(filtersToApply);
    setStatusInfoList({
      isSearching: true,
      isErrorOnSearching: false,
      // não é caso de infinite scroll; limpar flag específica
      isErrorOnSearchingInfinitScroll: false,
    });
    const previousFilters = filters;
    onChangeFilters?.(filtersToApply, previousFilters);

    Promise.resolve(resolveResources(applyHandleFilters(filtersToApply)))
      .then((response: IResponseResults<IResource>) => {
        let numNew = 0;
        setResources((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newItems = treatmentResources(
            response.results.filter((item: IResource) => !existingIds.has(item.id))
          );
          numNew = newItems.length;
          if (numNew === 0) return prev;
          return [...newItems, ...prev];
        });

        // Atualiza total conforme backend
        setResourcesTotal(response.count);
        // Ajusta offset somando apenas o número de itens novos
        _setFilters((prev) => ({ ...prev, offset: prev.offset + numNew }));

        const newOffset = filters.offset + numNew;
        setStatusInfoList({
          isFirstPage: !newOffset,
          isLastPage: newOffset + limit >= response.count,
          isSearching: false,
          isErrorOnSearching: false,
          isErrorOnSearchingInfinitScroll: false,
        });

        onAfterSearch?.({
          success: true,
          data: response,
          filters: filtersToApply,
        });
      })
      .catch((err: unknown) => {
        setStatusInfoList({
          isSearching: false,
          isErrorOnSearching: true,
        });

        const errorInstance = err instanceof Error ? err : new Error(String(err));
        onAfterSearch?.({
          success: false,
          error: errorInstance,
          filters: filtersToApply,
        });
        onErrorSearch?.(errorInstance);
      });
  }

  /**
   * Adiciona um novo recurso à lista.
   * @param resource Recurso a ser adicionado
   * @param push Se true, adiciona no final; se false, adiciona no início
   */
  function pushResource(resource: IResource, push: boolean = true) {
    setResources((prev) => {
      return push ? [...prev, resource] : [resource, ...prev];
    });

    // Ajusta o total de recursos
    setResourcesTotal((prev) => prev + 1);

    _setFilters((prev) => ({ ...prev, offset: prev.offset + 1 }));
  }

  /**
   * Substitui completamente um recurso existente.
   * @param resourceId ID do recurso a ser substituído
   * @param resource Novo recurso
   */
  function updateResource(resourceId: string | number, resource: IResource) {
    setResources((prev) => {
      return prev.map((item) => (item.id === resourceId ? resource : item));
    });
  }

  /**
   * Atualiza parcialmente um recurso existente (merge).
   * @param resourceId ID do recurso a ser atualizado
   * @param resource Propriedades a serem atualizadas
   */
  function putResource(
    resourceId: string | number,
    resource: Partial<IResource>
  ) {
    setResources((prev) => {
      return prev.map((item) =>
        item.id === resourceId ? { ...item, ...resource } : item
      );
    });
  }

  /**
   * Remove um recurso da lista.
   * @param resourceId ID do recurso a ser removido
   */
  function deleteResource(resourceId: string | number) {
    let wasDeleted = false;

    setResources((prev) => {
      const newResources = prev.filter((item) => {
        if (item.id === resourceId) {
          wasDeleted = true;
          return false;
        }
        return true;
      });
      return newResources;
    });

    if (wasDeleted) {
      // Ajusta o total de recursos
      setResourcesTotal((prev) => prev - 1);
      // Decrementa o offset
      _setFilters((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - 1),
      }));
    }
  }

  /**
   * Remove múltiplos recursos da lista.
   * @param resourcesIds Array de IDs dos recursos a serem removidos
   */
  function deleteManyResources(resourcesIds: (string | number)[]) {
    let deletedCount = 0;

    setResources((prev) => {
      const newResources = prev.filter((item) => {
        if (resourcesIds.includes(item.id)) {
          deletedCount++;
          return false;
        }
        return true;
      });
      return newResources;
    });

    if (deletedCount > 0) {
      // Ajusta o total de recursos
      setResourcesTotal((prev) => prev - deletedCount);
      // Decrementa o offset
      _setFilters((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - deletedCount),
      }));
    }
  }

  /**
   * Muda a posição de um recurso na lista.
   * @param resourceId ID do recurso a ser movido
   * @param newPosition Nova posição (índice) do recurso
   */
  function changePosition(resourceId: string | number, newPosition: number) {
    setResources((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === resourceId);
      if (currentIndex === -1) return prev;

      const newResources = [...prev];
      const [movedItem] = newResources.splice(currentIndex, 1);

      // Garante que a nova posição está dentro dos limites
      const targetPosition = Math.max(
        0,
        Math.min(newPosition, newResources.length)
      );
      newResources.splice(targetPosition, 0, movedItem);

      return newResources;
    });
  }

  /**
   * Atualiza múltiplos recursos com as mesmas propriedades.
   * @param partialResource Propriedades a serem atualizadas
   * @param ids Array de IDs dos recursos a serem atualizados (opcional - se não fornecido, atualiza todos)
   */
  function putManyResource(
    partialResource: Partial<IResource>,
    ids?: (string | number)[]
  ) {
    setResources((prev) => {
      return prev.map((item) => {
        // Se IDs foram especificados, só atualiza os recursos com esses IDs
        if (ids && !ids.includes(item.id)) {
          return item;
        }
        // Se IDs não foram especificados, atualiza todos
        return { ...item, ...partialResource };
      });
    });
  }

  if (useNextRouterParams) {
    useQueryChange({
      filters,
      setFilters: (filters) => setFilters(filters as Partial<IFilter>),
    });
  }

  function reloadPageSoft(wait1s = false) {
    reloadPageSoftView(wait1s);
  }

  return {
    ...statusInfo,
    ...statusInfoList,
    setStatusInfo,
    reloadPage,
    reloadPageSoft,
    resolvesResponse,
    resources,
    resourcesTotal,
    filters,
    filtersCount,
    filtersOverrides,
    limit,
    setFilters,
    nextPage,
    previousPage,
    setPage,
    setSort,
    retry,
    pushResource,
    updateResource,
    putResource,
    deleteResource,
    deleteManyResources,
    changePosition,
    putManyResource,
    loadNewsResource,
  };
}
