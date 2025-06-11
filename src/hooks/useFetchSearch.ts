import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Resolver, useFetch } from "./useFetch";

// Interface para o resultado tratado da busca
export interface SearchResult<T = unknown> {
  count: number;
  results: T[];
}

// Interface para filtros de busca
export interface SearchFilters extends Record<string, unknown> {
  offset?: number;
  limit?: number;
}

// Interface para configuração de paginação
export interface PaginationConfig {
  limit?: number;
  offsetKey?: string;
  limitKey?: string;
}

// Interface para configuração de scroll infinito
export interface InfiniteScrollConfig {
  enabled?: boolean;
  bidirectional?: boolean;
  initialOffset?: number;
}

// Interface para as props do useFetchSearch
export interface IFetchSearchProps<T = unknown, F extends SearchFilters = SearchFilters> {
  search: (filters: F) => unknown | Promise<unknown>;
  treatmentSearch?: (data: unknown) => SearchResult<T>;
  treatmentResults?: (results: T[]) => T[];
  initialFilters?: Partial<F>;
  defaultFilters?: Partial<F>;
  pagination?: PaginationConfig;
  infiniteScroll?: InfiniteScrollConfig;
  onStarted?: (results: SearchResult<T>) => void;
  onError?: (error: Error) => void;
  onBeforeSearch?: (filters: F) => void | Promise<void>;
  onAfterSearch?: (results: T[], searchResult: SearchResult<T>) => void | Promise<void>;
}

export function useFetchSearch<T = unknown, F extends SearchFilters = SearchFilters>({
  search: searchResolver,
  treatmentSearch = (d: any) => ({ count: d?.count || 0, results: d?.results || [] }),
  treatmentResults,
  initialFilters = {} as Partial<F>,
  defaultFilters = {} as Partial<F>,
  pagination = { limit: 10, offsetKey: 'offset', limitKey: 'limit' },
  infiniteScroll = { enabled: false, bidirectional: false, initialOffset: 0 },
  onStarted,
  onError,
  onBeforeSearch,
  onAfterSearch,
}: IFetchSearchProps<T, F>) {
  // Configuração de paginação com valores padrão
  const paginationConfig = useMemo(() => ({
    limit: 10,
    offsetKey: 'offset',
    limitKey: 'limit',
    ...pagination,
  }), [pagination]);

  // Configuração de scroll infinito com valores padrão
  const infiniteConfig = useMemo(() => ({
    enabled: false,
    bidirectional: false,
    initialOffset: 0,
    ...infiniteScroll,
  }), [infiniteScroll]);

  // Estado dos filtros atuais
  const [currentFilters, setCurrentFilters] = useState<F>(() => ({
    ...defaultFilters,
    ...initialFilters,
    [paginationConfig.offsetKey]: initialFilters[paginationConfig.offsetKey as keyof F] || infiniteConfig.initialOffset,
    [paginationConfig.limitKey]: initialFilters[paginationConfig.limitKey as keyof F] || defaultFilters[paginationConfig.limitKey as keyof F] || paginationConfig.limit,
  } as F));

  // Estados específicos de busca
  const [isSearching, setIsSearching] = useState(true);
  const [isErrorSearching, setIsErrorSearching] = useState(false);

  // Estados para scroll infinito
  const [loadedResults, setLoadedResults] = useState<T[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [hasReachedStart, setHasReachedStart] = useState(false);

  // Ref para controlar se é a primeira carga
  const isFirstLoadRef = useRef(true);

  // Informações de paginação calculadas
  const paginationInfo = useMemo(() => {
    const offset = Number(currentFilters[paginationConfig.offsetKey as keyof F]) || 0;
    const limit = Number(currentFilters[paginationConfig.limitKey as keyof F]) || paginationConfig.limit;
    const currentPage = Math.floor(offset / limit) + 1;
    
    return {
      offset,
      limit,
      currentPage,
      hasNextPage: false, // Será atualizado quando tivermos os dados
      hasPreviousPage: offset > 0,
    };
  }, [currentFilters, paginationConfig]);

  // Ref para armazenar os filtros mais recentes
  const latestFiltersRef = useRef(currentFilters);
  latestFiltersRef.current = currentFilters;

  // Resolver dinâmico que usa os filtros atuais
  const dynamicSearchResolver = useCallback(async () => {
    try {
      const filtersToUse = latestFiltersRef.current;
      
      // Chama onBeforeSearch antes de realizar a busca
      if (onBeforeSearch) {
        await onBeforeSearch(filtersToUse);
      }
      
      return searchResolver(filtersToUse);
    } catch (error) {
      throw error;
    }
  }, [searchResolver, onBeforeSearch]);

  // Callback para tratar os dados quando a busca for bem-sucedida
  const handleStarted = useCallback(
    async (results: { search: unknown }) => {
      try {
        setIsSearching(false);
        setIsErrorSearching(false);
        setIsLoadingMore(false);
        setIsLoadingPrevious(false);
        
        // Trata os dados da busca
        const treatedData = treatmentSearch(results.search);
        
        // Trata os results se a função for fornecida
        const finalResults = treatmentResults 
          ? treatmentResults(treatedData.results) 
          : treatedData.results;
        
        // Lógica para scroll infinito
        if (infiniteConfig.enabled) {
          const currentOffset = Number(currentFilters[paginationConfig.offsetKey as keyof F]) || 0;
          const limit = Number(currentFilters[paginationConfig.limitKey as keyof F]) || paginationConfig.limit;
          
          // Detecta se chegou no fim (retornou menos que o limit)
          const reachedEnd = finalResults.length < limit;
          const reachedStart = currentOffset === 0 && finalResults.length < limit;
          
          setHasReachedEnd(reachedEnd);
          setHasReachedStart(reachedStart);
          
          if (isFirstLoadRef.current) {
            // Primeira carga - substitui tudo
            console.log('First load, setting results:', finalResults);
            setLoadedResults(finalResults);
            isFirstLoadRef.current = false;
          } else {
            // Carregamento adicional
            setLoadedResults(prev => {
              if (isLoadingMore) {
                // Adiciona no final (loadMore)
                console.log('LoadMore: prev=', prev, 'new=', finalResults);
                const newResults = [...prev, ...finalResults];
                console.log('LoadMore: result=', newResults);
                return newResults;
              } else if (isLoadingPrevious) {
                // Adiciona no início (loadPrevious)
                console.log('LoadPrevious: prev=', prev, 'new=', finalResults);
                return [...finalResults, ...prev];
              } else {
                // Busca normal - substitui
                console.log('Normal search, replacing with:', finalResults);
                return finalResults;
              }
            });
          }
        }
        
        const finalSearchResult = {
          ...treatedData,
          results: finalResults,
        };
        
        // Atualiza os dados da última busca (apenas no modo normal)
        if (!infiniteConfig.enabled) {
          setLastSearchData(finalSearchResult);
        }
        
        // Chama onAfterSearch com os resultados corretos
        if (onAfterSearch) {
          if (infiniteConfig.enabled) {
            // No modo infinito, calcula os resultados que serão acumulados
            let resultsToPass = loadedResults; // Estado atual antes da atualização
            await onAfterSearch(resultsToPass, finalSearchResult);
          } else {
            await onAfterSearch(finalResults, finalSearchResult);
          }
        }
        
        // Chama onStarted com os dados finais
        onStarted?.(finalSearchResult);
      } catch (error) {
        setIsSearching(false);
        setIsErrorSearching(true);
        setIsLoadingMore(false);
        setIsLoadingPrevious(false);
        
        // Quando há erro no tratamento, limpa os dados
        if (!infiniteConfig.enabled) {
          setLastSearchData({ count: 0, results: [] });
        } else {
          setLoadedResults([]);
        }
        
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
      }
    },
    [treatmentSearch, treatmentResults, onAfterSearch, onStarted, onError, infiniteConfig.enabled, currentFilters, paginationConfig, isLoadingMore, isLoadingPrevious]
  );

  // Estado para armazenar os filtros anteriores em caso de erro
  const previousFiltersRef = useRef(currentFilters);

  // Callback para tratar erros
  const handleError = useCallback(
    (errors: { search?: Error }) => {
      setIsSearching(false);
      setIsErrorSearching(true);
      setIsLoadingMore(false);
      setIsLoadingPrevious(false);
      
      // Em caso de erro em paginação, reverte para os filtros anteriores
      if (!infiniteConfig.enabled && !isLoadingMore && !isLoadingPrevious) {
        setCurrentFilters(previousFiltersRef.current);
        latestFiltersRef.current = previousFiltersRef.current;
      }
      
      if (errors.search) {
        onError?.(errors.search);
      }
    },
    [onError, infiniteConfig.enabled, isLoadingMore, isLoadingPrevious]
  );

  // Usa o useFetch com o resolver de busca dinâmico
  const fetch = useFetch({
    resolvers: { search: dynamicSearchResolver },
    onStarted: handleStarted,
    onError: handleError,
  });

  // Dados tratados da busca
  // Estado para armazenar os dados tratados da última busca bem-sucedida
  const [lastSearchData, setLastSearchData] = useState<SearchResult<T>>({ count: 0, results: [] });

  // Dados tratados da busca - SEM DUPLICAÇÃO
  const searchData = useMemo(() => {
    if (infiniteConfig.enabled) {
      // No modo infinito, retorna os resultados acumulados
      return {
        count: 0, // Count não é relevante no modo infinito
        results: loadedResults,
      };
    }
    
    return lastSearchData;
  }, [infiniteConfig.enabled, loadedResults, lastSearchData]);

  // Informações de paginação atualizadas com dados da busca
  const updatedPaginationInfo = useMemo(() => {
    if (infiniteConfig.enabled) {
      return {
        ...paginationInfo,
        hasNextPage: !hasReachedEnd,
        hasPreviousPage: infiniteConfig.bidirectional ? !hasReachedStart && paginationInfo.offset > 0 : false,
        totalPages: 0,
        totalItems: loadedResults.length,
      };
    }
    
    const totalPages = Math.ceil(searchData.count / paginationInfo.limit);
    const hasNextPage = paginationInfo.currentPage < totalPages;
    
    return {
      ...paginationInfo,
      hasNextPage,
      totalPages,
      totalItems: searchData.count,
    };
  }, [paginationInfo, searchData.count, infiniteConfig.enabled, infiniteConfig.bidirectional, hasReachedEnd, hasReachedStart, loadedResults.length]);

  // Função para realizar busca com novos filtros
  const search = useCallback((newFilters: Partial<F>) => {
    // Salva os filtros atuais antes da mudança
    previousFiltersRef.current = currentFilters;
    
    const updatedFilters = {
      ...defaultFilters,
      ...newFilters,
      [paginationConfig.offsetKey]: newFilters[paginationConfig.offsetKey as keyof F] ?? (infiniteConfig.enabled ? infiniteConfig.initialOffset : 0),
      [paginationConfig.limitKey]: newFilters[paginationConfig.limitKey as keyof F] ?? defaultFilters[paginationConfig.limitKey as keyof F] ?? paginationConfig.limit,
    } as F;
    
    // Atualiza o ref imediatamente para garantir que o resolver use os filtros corretos
    latestFiltersRef.current = updatedFilters;
    
    setCurrentFilters(updatedFilters);
    setIsSearching(true);
    setIsErrorSearching(false);
    
    // Reset do scroll infinito se habilitado
    if (infiniteConfig.enabled) {
      setLoadedResults([]);
      setHasReachedEnd(false);
      setHasReachedStart(false);
      isFirstLoadRef.current = true;
    } else {
      // No modo normal, limpa dados anteriores em caso de erro
      setLastSearchData({ count: 0, results: [] });
    }
    
    // Força uma nova busca
    return fetch.onReload(false);
  }, [currentFilters, defaultFilters, paginationConfig, infiniteConfig, fetch.onReload]);

  // Função para carregar mais itens (scroll infinito para baixo)
  const loadMore = useCallback(() => {
    console.log('LoadMore called:', { enabled: infiniteConfig.enabled, hasReachedEnd, isLoadingMore });
    
    if (!infiniteConfig.enabled || hasReachedEnd || isLoadingMore) {
      console.log('LoadMore blocked:', { enabled: infiniteConfig.enabled, hasReachedEnd, isLoadingMore });
      return Promise.resolve();
    }
    
    const currentOffset = Number(currentFilters[paginationConfig.offsetKey as keyof F]) || 0;
    const limit = Number(currentFilters[paginationConfig.limitKey as keyof F]) || paginationConfig.limit;
    const newOffset = currentOffset + limit;
    
    console.log('LoadMore executing:', { currentOffset, limit, newOffset });
    
    const newFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: newOffset,
    } as F;
    
    // Atualiza o ref imediatamente para garantir que o resolver use os filtros corretos
    latestFiltersRef.current = newFilters;
    
    setCurrentFilters(newFilters);
    setIsLoadingMore(true);
    
    return fetch.onReload(false);
  }, [infiniteConfig.enabled, hasReachedEnd, isLoadingMore, currentFilters, paginationConfig, fetch.onReload]);

  // Função para carregar itens anteriores (scroll infinito para cima - bidirecional)
  const loadPrevious = useCallback(() => {
    if (!infiniteConfig.enabled || !infiniteConfig.bidirectional || hasReachedStart || isLoadingPrevious) {
      return Promise.resolve();
    }
    
    const currentOffset = Number(currentFilters[paginationConfig.offsetKey as keyof F]) || 0;
    const limit = Number(currentFilters[paginationConfig.limitKey as keyof F]) || paginationConfig.limit;
    const newOffset = Math.max(0, currentOffset - limit);
    
    const newFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: newOffset,
    } as F;
    
    // Atualiza o ref imediatamente para garantir que o resolver use os filtros corretos
    latestFiltersRef.current = newFilters;
    
    setCurrentFilters(newFilters);
    setIsLoadingPrevious(true);
    
    return fetch.onReload(false);
  }, [infiniteConfig.enabled, infiniteConfig.bidirectional, hasReachedStart, isLoadingPrevious, currentFilters, paginationConfig, fetch.onReload]);

  // Função para resetar scroll infinito
  const resetInfiniteScroll = useCallback(() => {
    if (!infiniteConfig.enabled) return;
    
    setLoadedResults([]);
    setHasReachedEnd(false);
    setHasReachedStart(false);
    isFirstLoadRef.current = true;
    
    const resetFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: infiniteConfig.initialOffset,
    } as F;
    
    // Atualiza o ref imediatamente para garantir que o resolver use os filtros corretos
    latestFiltersRef.current = resetFilters;
    
    setCurrentFilters(resetFilters);
    setIsSearching(true);
    setIsErrorSearching(false);
    
    return fetch.onReload(false);
  }, [infiniteConfig.enabled, infiniteConfig.initialOffset, currentFilters, paginationConfig, fetch.onReload]);

  // Função para ir para próxima página (modo normal)
  const nextPage = useCallback(() => {
    if (infiniteConfig.enabled) {
      return loadMore();
    }
    
    if (!updatedPaginationInfo.hasNextPage) return Promise.resolve();
    
    const newOffset = paginationInfo.offset + paginationInfo.limit;
    const newFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: newOffset,
    } as Partial<F>;
    
    return search(newFilters);
  }, [infiniteConfig.enabled, loadMore, updatedPaginationInfo.hasNextPage, paginationInfo.offset, paginationInfo.limit, currentFilters, paginationConfig.offsetKey, search]);

  // Função para ir para página anterior (modo normal)
  const previousPage = useCallback(() => {
    if (infiniteConfig.enabled && infiniteConfig.bidirectional) {
      return loadPrevious();
    }
    
    if (!updatedPaginationInfo.hasPreviousPage) return Promise.resolve();
    
    const newOffset = Math.max(0, paginationInfo.offset - paginationInfo.limit);
    const newFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: newOffset,
    } as Partial<F>;
    
    return search(newFilters);
  }, [infiniteConfig.enabled, infiniteConfig.bidirectional, loadPrevious, updatedPaginationInfo.hasPreviousPage, paginationInfo.offset, paginationInfo.limit, currentFilters, paginationConfig.offsetKey, search]);

  // Função para ir para uma página específica
  const goToPage = useCallback((page: number) => {
    if (infiniteConfig.enabled) return Promise.resolve();
    if (page < 1) return Promise.resolve();
    
    const newOffset = (page - 1) * paginationInfo.limit;
    const newFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: newOffset,
    } as Partial<F>;
    
    return search(newFilters);
  }, [infiniteConfig.enabled, paginationInfo.limit, currentFilters, paginationConfig.offsetKey, search]);

  // Função para alterar o limite de itens por página
  const changeLimit = useCallback((newLimit: number) => {
    if (newLimit < 1) return Promise.resolve();
    
    if (infiniteConfig.enabled) {
      // No modo infinito, apenas atualiza o limit para próximas cargas
      const newFilters = {
        ...currentFilters,
        [paginationConfig.limitKey]: newLimit,
      } as F;
      
      setCurrentFilters(newFilters);
      return Promise.resolve();
    }
    
    // Mantém o offset aproximado ao alterar o limite
    const currentOffset = paginationInfo.offset;
    // Calcula a nova página baseada no offset atual e novo limite
    const newPage = Math.floor(currentOffset / newLimit) + 1;
    const newOffset = (newPage - 1) * newLimit;
    
    const newFilters = {
      ...currentFilters,
      [paginationConfig.offsetKey]: newOffset,
      [paginationConfig.limitKey]: newLimit,
    } as Partial<F>;
    
    return search(newFilters);
  }, [infiniteConfig.enabled, currentFilters, paginationConfig, paginationInfo.offset, search]);

  // Função para recarregar apenas a busca com filtros atuais
  const reloadSearch = useCallback(() => {
    setIsSearching(true);
    setIsErrorSearching(false);
    
    if (infiniteConfig.enabled) {
      // No modo infinito, reseta e recarrega do início
      return resetInfiniteScroll();
    }
    
    // Força uma nova busca com os filtros atuais
    return fetch.onReload(false);
  }, [infiniteConfig.enabled, resetInfiniteScroll, fetch.onReload]);

  // Função para resetar filtros para os iniciais
  const resetFilters = useCallback(() => {
    const resetFilters = {
      ...defaultFilters,
      ...initialFilters,
      [paginationConfig.offsetKey]: infiniteConfig.enabled ? infiniteConfig.initialOffset : 0,
      [paginationConfig.limitKey]: paginationConfig.limit,
    } as F;
    
    setCurrentFilters(resetFilters);
    setIsSearching(true);
    setIsErrorSearching(false);
    
    if (infiniteConfig.enabled) {
      setLoadedResults([]);
      setHasReachedEnd(false);
      setHasReachedStart(false);
      isFirstLoadRef.current = true;
    }
    
    return fetch.onReload(false);
  }, [defaultFilters, initialFilters, paginationConfig, infiniteConfig, fetch.onReload]);

  // Função para atualizar filtros sem buscar
  const updateFilters = useCallback((newFilters: Partial<F>) => {
    const updatedFilters = {
      ...defaultFilters,
      ...newFilters,
      [paginationConfig.offsetKey]: newFilters[paginationConfig.offsetKey as keyof F] ?? currentFilters[paginationConfig.offsetKey as keyof F],
      [paginationConfig.limitKey]: newFilters[paginationConfig.limitKey as keyof F] ?? currentFilters[paginationConfig.limitKey as keyof F],
    } as F;
    
    setCurrentFilters(updatedFilters);
  }, [defaultFilters, paginationConfig, currentFilters]);

  return {
    // Dados da busca
    results: searchData.results,
    count: searchData.count,
    
    // Estados do fetch original
    isLoading: fetch.isLoading,
    isStarted: fetch.isStarted,
    isErrorOnLoad: fetch.isErrorOnLoad,
    
    // Estados específicos de busca
    isSearching,
    isErrorSearching,
    
    // Estados de scroll infinito
    isLoadingMore,
    isLoadingPrevious,
    hasReachedEnd,
    hasReachedStart,
    isInfiniteScroll: infiniteConfig.enabled,
    isBidirectional: infiniteConfig.bidirectional,
    
    // Filtros
    filters: currentFilters,
    
    // Informações de paginação
    pagination: updatedPaginationInfo,
    
    // Funções de controle
    search,
    reloadSearch,
    resetFilters,
    updateFilters,
    onReload: fetch.onReload,
    
    // Funções de paginação
    nextPage,
    previousPage,
    goToPage,
    changeLimit,
    
    // Funções de scroll infinito
    loadMore,
    loadPrevious,
    resetInfiniteScroll,
  };
}
