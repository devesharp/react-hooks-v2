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
  limit = 20,
  initialOffset = 0,
  initialSort = null,
  filtersDefault: filtersDefaultOriginal = {},
  initialFilters = {},
  treatmentResources = (r: IResource[]): IResource[] => r,
  resolves,
  firstLoad = true,
}: IUseViewListProps<IResource, IFilter, TResolves>) {
  const [resources, setResources] = useState<IResource[]>([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [filters, _setFilters] = useState<
    { offset: number; sort: SortValue | null } & Partial<IFilter>
  >({
    offset: initialOffset,
    sort: initialSort,
    ...filtersDefaultOriginal,
    ...initialFilters,
  });

  /**
   * Guarda o último conjunto de filtros utilizado em uma busca.
   * Isso permite que possamos executar `retry()` posteriormente
   * e também reverter o offset caso ocorra erro ao navegar entre páginas.
   */
  const lastAttemptedFiltersRef = useRef<{ offset: number; sort: SortValue | null } & Partial<IFilter>>(
    filters
  );

  const resolvesForm: TResolves & {
    resources: IResolve<IResponseResults<IResource>>;
  } = {
    ...(resolves ?? ({} as TResolves)),
    resources: () => resolveResources(filters),
  };

  const [statusInfoList, setStatusInfoList] = useImmerReducer<
    IStatusInfoViewList,
    Partial<IStatusInfoViewList>
  >((prevState, newState) => ({ ...prevState, ...newState }), {
    isSearching: true,
    isErrorOnSearching: false,
    isLastPage: false,
    isFirstPage: false,
  });

  const {
    statusInfo,
    setStatusInfo,
    reloadPage: reloadPageView,
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

  function reloadPage() {
    reloadPageView();
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
    } as { offset: number; sort: SortValue | null } & Partial<IFilter>;

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
      const response = await resolveResources(filtersToApply);
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
    filtersToApply: { offset: number; sort: SortValue | null } & Partial<IFilter>,
    previousOffset: number = filters.offset
  ) {
    // Memoriza a última requisição feita
    lastAttemptedFiltersRef.current = filtersToApply;

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

    // Atualiza filtros – já ajustamos o offset antes da requisição
    _setFilters(filtersToApply);

    try {
      const response = await resolveResources(filtersToApply);
      processSearch(response);
      
      // Chama callback após sucesso
      onAfterSearch?.({
        success: true,
        data: response,
        filters: filtersToApply,
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
        filters: filtersToApply,
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
    runSearchWithFilters(
      { ...filters, offset: filters.offset },
      filters.offset
    );
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
  function setSort(sort: SortValue | null) {
    runSearchWithFilters({ ...filters, sort }, filters.offset);
  }

  /**
   * Tenta novamente a última requisição que falhou (ou a última executada).
   */
  function retry() {
    runSearchWithFilters(lastAttemptedFiltersRef.current, filters.offset);
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

  return {
    ...statusInfo,
    ...statusInfoList,
    setStatusInfo,
    reloadPage,
    resolvesResponse,
    resources,
    resourcesTotal,
    filters,
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
  };
}
