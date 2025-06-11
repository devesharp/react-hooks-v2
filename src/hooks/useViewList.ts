import { useState, useEffect, useLayoutEffect, useContext, useRef, useCallback } from 'react';
import { ResolveSync } from '@devesharp/react-utils/lib';
import { CreateRange, DeleteEmpty, ObjectExcept } from '@devesharp/react-utils/lib/Utils';
import formatISO from 'date-fns/formatISO';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import * as queryStringHelper from 'query-string';
import { Observable } from 'rxjs/internal/Observable';
import { from } from 'rxjs/internal/observable/from';
import { of } from 'rxjs/internal/observable/of';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { useImmer } from 'use-immer';
import { useDeepEffect } from '../useDeepEffect';
import { useDeepLayoutEffect } from '../useDeepLayoutEffect';
import { useDidUpdateLayoutEffect } from '../useDidUpdateLayoutEffect';
import { useListener } from '../useListener';
import { useQueryString, useQueryStringChange } from '../useQueryString/useQueryString';
import { useStateRef } from '../useStateRef';
import { useView } from '../useView';
import {
   IFilterOptions,
   IResourceViewList,
   IResponseResults,
   IStatusInfoViewList,
   IUseViewListProps,
   IViewList,
} from './useViewList.interfaces';

export function useViewList<IFilter = any, IQuery = any, IResource = any>({
   filtersDefault: filtersDefaultOriginal = {},
   limit = 20,
   skeletonShowCount = 20,
   infiniteScroll = false,
   disableQueryChange = false,
   ignoreFiltersInQuery = [],
   ignoreQueryInFilters = [],
   reverseItems = false,
   resolves = {},
   firstLoad = true,
   loadBidirecional = false,
   changeOnlyPath = null,
   changeOnlyQuery = {},
   initialResources = null,
   initialFilters = {},
   initialOffset,
   handleQueryString,
   enableAnimation = false,
   onTreatmentSearch = (r) => r,
   handleRequestBody: handleRequestBodyInitial = (filter: IFilter) => filter,
   handleFilterToQuery: handleFilterToQueryInitial = (filter: IFilter) => filter,
   handleQueryToFilter: handleQueryToFilterInitial = (filter: IQuery) => filter,
   history,
}: IUseViewListProps): IViewList<IFilter, IQuery, IResource> {
   const delayAnimations = {
      skeletonIn: 300,
      skeletonOut: 300,
      resourceIn: 300,
      resourceOut: 300,
      resourceNew: 300,
      resourceDelete: 300,
   };

   const {
      statusInfo,
      setStatusInfo,
      registerOnInit,
      registerOnCriticalError,
      registerOnInitError,
      getParamsResolve,
      registerResolveParams,
      registerOnBeforeLoad,
      $destroy,
      reloadPage,
      useOnInit,
      useOnInitError,
      useOnCriticalError,
      useOnBeforeLoad,
      useResolveParams,
      resolvesResponse,
   } = useView<any>({ resolves, firstLoad });

   const [skeletonResources, setSkeletonResources] = useState(
      CreateRange(skeletonShowCount).map((key) => ({ id: key, __animation_in__: false, __animation_out__: false })),
   );

   useLayoutEffect(() => {
      return registerOnBeforeLoad(() => {
         setSkeletonResources((r) => r.map((v) => ({ ...v, __animation_in__: true })));
      });
   }, []);

   /**
    * Filtros Defaults
    */
   const [filtersDefault, setFiltersDefault] = useStateRef<Partial<IFilter>>(filtersDefaultOriginal);
   useDeepLayoutEffect(() => {
      setFiltersDefault(filtersDefaultOriginal);
      if (setFilters) {
         setFilters((f) => f, {
            noRequest: true,
         });
      }
   }, [filtersDefaultOriginal]);

   /**
    * Items
    */
   const [resources, setResources] = useState<IResourceViewList<IResource>[]>(initialResources?.results ?? []);
   const [originalResources, setOriginalResources] = useState<IResourceViewList<IResource>[]>(
      initialResources?.results ?? [],
   );
   const [resourcesTotal, setResourceTotal] = useState<number>(initialResources?.count ?? 0);

   useLayoutEffect(() => {
      setResources(onTreatmentSearch(originalResources, resources));
   }, [originalResources]);

   /**
    * Valores iniciais
    */
   const hasInitialLoaded = useRef(false);
   useLayoutEffect(() => {
      if (hasInitialLoaded.current) return;
      hasInitialLoaded.current = true;

      setStatusInfo({
         searchingMore: false,
         searching: !!firstLoad, // Só ativa searching se houver um primeiro carregamento
         lastPage: false,
         firstPage: false,
         errorLoadMore: false,
      });
   }, []);

   /**
    *
    */
   useLayoutEffect(() => {
      if (initialResources) {
         insertResources(initialResources);
      }
   }, []);

   /**
    * Tratar dados do filter que serão enviados para o Body da Request
    */
   const [handleRequestBody, setHandleRequestBody] =
      useStateRef<(filter: IFilter | any) => any>(handleRequestBodyInitial);

   /**
    * Tratar dados do Filter que serão enviados para Url Query
    */
   const [handleFilterToQuery, setHandleFilterToQuery] =
      useStateRef<(query: IFilter | any) => any>(handleFilterToQueryInitial);

   /**
    * Tratar dados do Query que são enviados para o filtro
    */
   const [handleQueryToFilter, setHandleQueryToFilter] =
      useStateRef<(filter: IQuery | any) => any>(handleQueryToFilterInitial);

   /**
    * Url Query String
    */
   const queryString = useQueryString(changeOnlyPath, changeOnlyQuery);

   /**
    * Filtros
    *
    * Inicia com valores da URL Query ignorando valores de ignoreQueryInFilters
    */
   const [filters, __setFilters__] = useImmer<any>(
      ObjectExcept(
         {
            ...initialFilters,
            ...filtersDefault.current,
            ...handleQueryToFilter.current(queryString),
            ...(initialOffset ? { offset: initialOffset, offsetA: initialOffset } : {}),
         },
         ignoreQueryInFilters,
      ),
   );

   // Opções ao definir filtros
   const [filtersOptions, setFiltersOptions] = useImmer<IFilterOptions>({});
   const filtersOptionsRef = useRef<IFilterOptions>({});

   const setFilters = function setFilters(f: (draft: any) => any, options: IFilterOptions = {}): void {
      // Preservar as queries que estão sendo ignoradas
      // const preserveQuery = DeleteEmpty(Object.fromEntries(ignoreQueryInFilters.map((i) => [i, queryString[i]])));
      const preserveQuery = [];

      filtersOptionsRef.current = options;
      setFiltersOptions(() => options);
      __setFilters__((draft) => {
         const newDraft = f(draft);

         if (newDraft === undefined || newDraft === null) {
            draft = DeleteEmpty({ ...filtersDefault.current, ...preserveQuery, ...draft });
         } else {
            return DeleteEmpty({ ...filtersDefault.current, ...preserveQuery, ...newDraft });
         }
      });
   };

   // Quantos filtros estão ativos
   const [activeFilters, setActiveFilters] = useState(0);

   function countActiveFilters(): void {
      setActiveFilters(
         Object.entries(filters).filter(([key, value]) => {
            let accept = true;

            if (isEqual(filtersDefaultOriginal[key], value) && value != undefined) {
               accept = false;
            }

            if (value == undefined) {
               accept = false;
            }

            return accept;
         }).length,
      );
   }

   useDeepEffect(() => {
      countActiveFilters();
   }, [filters]);

   /**
    * Adicionar filtros para request do resolve Items
    *
    * handleRequestBody
    */
   useLayoutEffect(() => {
      registerResolveParams('resources', () => handleRequestBody.current({ ...filtersDefault.current, ...filters }));
   }, [filters]);

   /**
    * Registra uma função para ser chamada toda vez que for feito uma busca
    */
   const [registerOnSearch, callOnSearch] = useListener<(r: { [key: string]: any }) => void>();

   // Criar hook para registerOnLoadResource
   const useOnSearch = (fn: (r: { [key: string]: any }) => void, deps = []) =>
      useLayoutEffect(() => {
         return registerOnSearch(fn);
      }, deps);

   /**
    * Registra uma função para ser chamada no após load da request e quando a página realiza um nova busca (loadResources)
    */
   const [registerOnBeforeSearch, callOnBeforeSearch] = useListener<any>();

   // Criar hook para registerOnLoadResource
   const useOnBeforeSearch = (fn: (r: { [key: string]: any }) => void, deps = []) =>
      useLayoutEffect(() => {
         return registerOnBeforeSearch(fn);
      }, deps);

   /**
    * Resgatar dados da inicialização
    *
    * Resgatar resolve resources para definir items
    */
   useLayoutEffect(() => {
      return registerOnInit((res) => {
         if (res.resources) {
            // eslint-disable-next-line no-shadow
            const { resources } = res;

            if (enableAnimation) {
               setSkeletonResources((r) => r.map((v) => ({ ...v, __animation_out__: true })));

               setStatusInfo({
                  loading: true,
                  started: false,
                  searching: true,
                  errorLoadMore: false,
               });

               setTimeout(() => {
                  callOnBeforeSearch(resources);
                  insertResources(resources);

                  setStatusInfo({
                     loading: false,
                     started: true,
                     searching: false,
                     errorLoadMore: false,
                  });
               }, delayAnimations.skeletonOut);
            } else {
               callOnBeforeSearch(resources);
               insertResources(resources);

               setStatusInfo({
                  loading: false,
                  started: true,
                  searching: false,
                  errorLoadMore: false,
               });
            }
         } else {
            setStatusInfo({
               loading: false,
               started: true,
               searching: false,
               errorLoadMore: false,
            });
         }
      });
   }, []);

   /**
    * Inserir dados do resource no hook
    * @param _resources
    */
   function insertResources(_resources: IResponseResults<IResourceViewList<IResource>>): void {
      // Se não tiver menos resultados que o limit, quer dizer que é a ultima página
      if (limit > _resources.count || _resources.count === 0 || _resources.results.length >= _resources.count) {
         setStatusInfo({
            lastPage: true,
            firstPage: true,
         });
      }

      let resultsFinal = !reverseItems ? _resources.results : Array.from(_resources.results).reverse();

      if (enableAnimation) {
         resultsFinal = resultsFinal.map((i) => ({
            ...i,
            __animation_in__: false,
            __animation_out__: false,
         }));
      }

      setOriginalResources(() => resultsFinal);

      if (enableAnimation) {
         resultsFinal.forEach((i2, index) => {
            setTimeout(() => {
               setOriginalResources((draft2) => {
                  return draft2.map((i) => (i.id != i2.id ? i : { ...i, __animation_in__: true }));
               });
            }, index * delayAnimations.resourceIn);
         });
      }

      setResourceTotal(_resources.count);
   }

   // console.log(originalResources);
   /**
    * Em caso de erro na inicialização, atualiza status info
    */
   useLayoutEffect(() => {
      return registerOnInitError(() => {
         setStatusInfo({
            loading: false,
            searching: false,
            started: false,
            searchingMore: false,
         });
      });
   }, []);

   /**
    * - Atualizar query url
    * - Realizar nova request
    * Obs: Não atualiza na primeira renderização
    */
   useDidUpdateLayoutEffect(() => {
      if (!disableQueryChange && !filtersOptionsRef.current.disableQueryChange) {
         const filtersQuery = DeleteEmpty(
            ObjectExcept(handleFilterToQuery.current({ ...filtersDefault.current, ...filters }), ignoreFiltersInQuery),
         );

         // Converter Date para string
         for (const query in filtersQuery) {
            if (typeof filtersQuery[query]?.getMonth === 'function') {
               filtersQuery[query] = formatISO(filtersQuery[query]);
            }
         }

         let currentUrl = handleQueryString
            ? handleQueryString(filtersQuery)
            : `?${queryStringHelper.stringify(filtersQuery)}`;
         const defaultUrl = handleQueryString
            ? handleQueryString(ObjectExcept(filtersDefault.current, ignoreFiltersInQuery))
            : `?${queryStringHelper.stringify(ObjectExcept(filtersDefault.current, ignoreFiltersInQuery))}`;

         if (isEqual(currentUrl, defaultUrl)) {
            currentUrl = handleQueryString ? defaultUrl : '';
         }

         // Replace url
         if (typeof document !== 'undefined') {
            if (handleQueryString) {
               if (history) {
                  if (filtersOptionsRef.current.replaceUrl) {
                     history.replace(currentUrl);
                  } else {
                     history.push(currentUrl);
                  }
               }
            } else if (window.location.search != currentUrl) {
               if (filtersOptionsRef.current.replaceUrl) {
                  if (!history) {
                     window.location.replace(currentUrl as string);
                  } else {
                     history.replace({
                        search: currentUrl as string,
                     });
                  }
               } else if (!history) {
                  window.location.search = currentUrl as string;
               } else {
                  history.push({
                     search: currentUrl as string,
                  });
               }
            }
         }
      }

      // Se for primeira página
      const resetResources = (!filters.page || filters.page <= 1) && (!filters.offset || filters.offset == 0);

      // Não realizar request
      if (!filtersOptionsRef.current.noRequest) {
         // Chamar eventos
         callOnSearch();

         loadResources({
            push: infiniteScroll,
            reset: resetResources,
            loadPrev: filtersOptions.loadPrev,
         });
      }

      // Resetar opções de filtros
      setFiltersOptions(() => ({}));
   }, [filters]);

   /**
    * Atualizar filtro, quando houver alterações na query da url
    */
   // const ignoreFirstQueryString = useRef(false);
   useQueryStringChange(changeOnlyPath, changeOnlyQuery, (currentQueryString) => {
      setFilters(() => ObjectExcept(handleQueryToFilter.current({ ...currentQueryString }), ignoreQueryInFilters), {
         disableQueryChange: true,
      });
   });
   // console.log(queryString);
   // useDidUpdateEffect(() => {
   //    console.log('useQueryStringChange');
   //    setFilters(() => ObjectExcept(handleQueryToFilter.current(queryString), ignoreQueryInFilters), {
   //       disableQueryChange: true,
   //    });
   // }, [queryString]);

   /**
    * Resgatar items
    *
    * @param options
    */
   function loadResources(options: { push?: boolean; reset?: boolean; loadPrev?: boolean } = {}): void {
      if (resolves && resolves.resources) {
         if (options.push && !options.reset) {
            setStatusInfo({
               errorLoadMore: false,
               errorLoadData: false,
               searchingMore: true,
            });
         } else {
            setStatusInfo({
               errorLoadMore: false,
               errorLoadData: false,
               searching: true,
            });
         }

         // Cancelar requisição anterior
         $destroy.next();

         let resourceResolve: any = null;

         if (typeof resolves.resources !== 'function') {
            resourceResolve = of(resourceResolve).pipe(takeUntil($destroy));
         }

         if (!resourceResolve) {
            let filter = { ...filtersDefault.current, ...filters };

            if (options.loadPrev) {
               filter = { ...filtersDefault.current, ...filters, offset: filters.offsetA, limit: filters.offsetALimit };
            }

            try {
               resourceResolve = resolves.resources(handleRequestBody.current(filter));
            } catch (e) {
               if (options.push) {
                  setStatusInfo({
                     loading: false,
                     started: true,
                     errorLoadMore: true,
                     searchingMore: false,
                  });
                  setFilters(
                     (draft) => {
                        if (options.loadPrev) {
                           const offsetA = filters.offsetA + filters.offsetALimit;
                           return { ...draft, offsetA };
                        }
                        // console.log('sdsd')

                        const offset = (draft?.offset ?? 0) - limit;
                        return { ...draft, offset: offset < 0 ? 0 : offset };
                     },
                     {
                        noRequest: true,
                        disableQueryChange: true,
                     },
                  );
               } else {
                  setStatusInfo({
                     errorLoadData: true,
                     searching: false,
                     loading: false,
                     started: false,
                  });
               }

               return;
            }

            if (resourceResolve instanceof Promise) {
               resourceResolve = from(resourceResolve).pipe(takeUntil($destroy));
            } else if (resourceResolve instanceof Observable) {
               resourceResolve = resourceResolve.pipe(takeUntil($destroy));
            } else {
               resourceResolve = of(resourceResolve).pipe(takeUntil($destroy));
            }
         }

         resourceResolve.subscribe(
            (response) => {
               let lastPage = false;
               let firstPage = false;
               const offsetA = filters.offsetA ?? filters.offset ?? 0;

               if (!options.push || options.reset) {
                  setOriginalResources(() => (!reverseItems ? response.results : response.results.reverse()));
                  setResourceTotal(response.count);

                  if (
                     (filters?.offset ?? 0) + response.results.length >= response.count ||
                     response.results.length === 0
                  ) {
                     lastPage = true;
                  }

                  if (options.loadPrev && (filters?.offset ?? 0) + limit >= response.results.length) {
                     lastPage = true;
                  }
                  if (offsetA == 0 || (response.results.length === 0 && options.loadPrev)) {
                     firstPage = true;
                  }
               } else {
                  if (options.loadPrev) {
                     setOriginalResources((draft) =>
                        reverseItems ? [...draft, ...response.results.reverse()] : [...response.results, ...draft],
                     );
                  } else {
                     setOriginalResources((draft) =>
                        reverseItems ? [...response.results.reverse(), ...draft] : [...draft, ...response.results],
                     );
                  }
                  setResourceTotal(response.count);

                  // Verifica se é a ultima pagina
                  if (
                     originalResources.length + response.results.length >= response.count ||
                     response.results.length === 0
                  ) {
                     lastPage = true;
                  }

                  if (loadBidirecional && (filters?.offset ?? 0) + limit >= response.count) {
                     lastPage = true;
                  }

                  if (offsetA == 0 || (response.results.length === 0 && options.loadPrev)) {
                     firstPage = true;
                  }
               }

               // Chamar callback
               setTimeout(() => callOnBeforeSearch(response), 1);

               setStatusInfo({
                  errorLoadData: false,
                  errorLoadMore: false,
                  loading: false,
                  started: true,
                  searching: false,
                  searchingMore: false,
                  lastPage,
                  firstPage,
               });
            },
            () => {
               if (options.push) {
                  setStatusInfo({
                     loading: false,
                     started: true,
                     errorLoadMore: true,
                     searchingMore: false,
                  });

                  /**
                   * Atualizar offset para valor anterior antes do erro
                   *
                   * Não deve fazer nova request e nem alterar query da url
                   */
                  setFilters(
                     (draft) => {
                        if (options.loadPrev) {
                           const offsetA = filters.offsetA + filters.offsetALimit;
                           return { ...draft, offsetA };
                        }
                        // console.log('sdsd')

                        const offset = (draft?.offset ?? 0) - limit;
                        return { ...draft, offset: offset < 0 ? 0 : offset };
                     },
                     {
                        noRequest: true,
                        disableQueryChange: true,
                     },
                  );
               } else {
                  setStatusInfo({
                     errorLoadData: true,
                     searching: false,
                     loading: false,
                     started: false,
                  });
               }
            },
         );
      }
   }

   /**
    * Deletar 1 item da array
    *
    * @param id
    * @param softDelete Se deve deletar o item ou apenas atribuir a key delete nele
    */
   function removeResource(id: number | string, softDelete = false): void {
      setOriginalResources((i: any[]) => {
         const items = [...i];
         const index = items.findIndex((i: any) => i.id === id);

         if (index !== -1) {
            if (softDelete) {
               items[index].deleted = true;
               if (enableAnimation) {
                  items[index].__animation_deleted__ = true;
               }
            } else if (enableAnimation) {
               items[index].__animation_deleted__ = true;
            } else {
               items.splice(index, 1);
            }

            // Remove um offset para quando buscar novamente, não perder 1 item
            setFilters(
               (f) => {
                  if (f.offset) {
                     f.offset -= 1;
                  }
               },
               {
                  noRequest: true,
               },
            );
            // Remove 1 da quantidade total dos items
            setResourceTotal(resourcesTotal - 1);
         }

         return items;
      });

      if (enableAnimation) {
         setTimeout(() => {
            setOriginalResources((i: any[]) => {
               const items = [...i];
               const index = items.findIndex((i: any) => i.id === id);
               items.splice(index, 1);

               return items;
            });
         }, delayAnimations.resourceDelete);
      }
   }

   /**
    * Deletar muitos itens da array
    *
    * @param ids
    * @param softDelete
    */
   function removeManyResources(ids: (number | string)[], softDelete = false): void {
      let deletedItems = 0;
      setOriginalResources((i: any[]) => {
         const items = [...i];
         ids.forEach((id) => {
            const index = items.findIndex((i: any) => i.id === id);

            if (index !== -1) {
               if (softDelete) {
                  items[index].deleted = true;
               } else {
                  items.splice(index, 1);
               }

               deletedItems += 1;
            }
         });

         // Remove quantidade total dos items deletados
         setResourceTotal(resourcesTotal - deletedItems);

         return items;
      });
   }

   /**
    * Adicionar item
    * @param data
    * @param first
    */
   function pushResource(data: IResourceViewList<IResource>, first = false): void {
      setOriginalResources((i: any[]) => {
         const items = [...i];
         if (enableAnimation) {
            data.__animation_new__ = false;
         }

         if (first) {
            items.splice(0, 0, data);
         } else {
            items.push(data);
         }

         return items;
      });

      if (enableAnimation) {
         setTimeout(() => {
            setOriginalResources((i: any[]) => {
               const items = [...i];
               if (first) {
                  items[0].__animation_new__ = true;
               } else {
                  items[items.length - 1].__animation_new__ = true;
               }
               return items;
            });
         }, 1);
      }
      setResourceTotal((i) => i + 1);

      setFilters((i) => ({ ...i, offset: i.offset ? i.offset + 1 : 1 }), {
         noRequest: true,
         replaceUrl: true,
      });
   }

   /**
    * Atualizar posição do recurso
    *
    * @param id
    * @param index
    */
   function changePositionResource(id: number | string, index: number): void {
      setOriginalResources((i: any[]) => {
         const items = [...i];
         const item = items.find((i: any) => i.id === id);
         const currentIndex = items.findIndex((i: any) => i.id === id);

         if (currentIndex !== -1 && currentIndex != index) {
            items.splice(currentIndex, 1);
            items.splice(index, 0, item);
         }

         return items;
      });
   }

   /**
    * Atualizar resource
    *
    * @param id
    * @param data
    */
   function updateResource(
      id: number | string,
      data: (p: IResourceViewList<IResource>) => IResourceViewList<IResource>,
   ): void {
      setOriginalResources((i: any[]) => {
         const items = [...i];
         const index = items.findIndex((i: any) => i.id === id);

         if (index !== -1) {
            items[index] = data(cloneDeep(items[index]));
         }

         return items;
      });
   }

   /**
    * Atualizar muitos itens da array
    *
    * @param ids
    * @param data
    */
   function updateManyResources(
      ids: (number | string)[],
      data: (p: IResourceViewList<IResource>) => IResourceViewList<IResource>,
   ): void {
      setOriginalResources((i: any[]) => {
         const items = [...i];
         ids.forEach((id) => {
            const index = items.findIndex((i: any) => i.id === id);

            if (index !== -1) {
               items[index] = data({ ...items[index] });
            }
         });

         return items;
      });
   }

   /**
    * Atualizar resource
    *
    * @param id
    * @param data
    */
   function putResource(id: number | string, data: Partial<IResourceViewList<IResource>>): void {
      updateResource(id, (p) => ({ ...p, ...data }));
   }

   /**
    * Atualizar muitos itens da array
    *
    * @param ids
    * @param data
    */
   function putManyResources(ids: (number | string)[], data: Partial<IResourceViewList<IResource>>): void {
      updateManyResources(ids, (p) => ({ ...p, ...data }));
   }

   /**
    * Definir página
    *
    * Página precisa ser mair ou igual a 1
    *
    * @param page
    * @param options
    */
   const setPage = useCallback(
      function setPage(page: number, options?: IFilterOptions): void {
         if (page < 1) page = 1;

         setFilters((draft) => ({ ...draft, page: null, offset: (page - 1) * limit }), options);
      },
      [filters],
   );

   /**
    * Definir offset
    *
    * @param offset Offset precisa ser mair ou igual a 0
    * @param options
    */
   const setOffset = useCallback(
      function setOffset(offset: number, options?: IFilterOptions): void {
         setFilters((draft) => ({ ...draft, page: null, offset }), options);
      },
      [filters],
   );

   /**
    * Definir ordem dos items
    *
    * Faz um novo carregamento e limpa offset e pages
    *
    * @param sort
    * @param options
    */
   const setSort = useCallback(
      function setSort(sort: string, options?: IFilterOptions): void {
         setFilters((draft) => ({ ...draft, page: null, offset: 0, sort }), options);
      },
      [filters],
   );

   /**
    * Carrega items da próxima página
    *
    * Se infiniteScroll = true, adicionar nos items atuais
    * Se infiniteScroll = true e houver erro, volta offset anterior
    *
    * @param options
    */
   const loadNextPage = useCallback(
      function loadNextPage(options?: IFilterOptions): void {
         setFilters((draft) => ({ ...draft, offset: draft.offset ? draft.offset + limit : limit }), options);
      },
      [filters],
   );

   const loadPrevPage = useCallback(
      function loadNextPage(options?: IFilterOptions): void {
         let nextOffset = (filters.offsetA ?? filters.offset) - limit;
         let newLimit = limit;
         if (nextOffset < 0) {
            newLimit = limit + nextOffset;
            nextOffset = 0;
         }

         setFilters((draft) => ({ ...draft, offsetA: nextOffset, offsetALimit: newLimit }), {
            ...options,
            ...{
               loadPrev: true,
            },
         });
      },
      [filters],
   );

   /**
    * Recarregar items novamente (Atualização)
    *
    * @param wait1s
    * @param options
    */
   const reloadResources = useCallback(
      function reloadResources(wait1s = true, options?: IFilterOptions): void {
         loadResources({ reset: true });
      },
      [filters, resolves],
   );

   function reloadPageExtend(wait1s?: boolean): void {
      setStatusInfo({
         loading: true,
         started: false,
         searching: true,
         errorLoadMore: false,
      });

      reloadPage(wait1s);
   }

   /**
    * Reiniciar página
    *
    * @param wait1s
    * @param options
    */
   const resetPageViewList = useCallback(
      function resetPageViewList(wait1s = true, options?: IFilterOptions): void {
         setOriginalResources([]);
         setResourceTotal(0);

         setFilters(
            () => ({
               ...initialFilters,
            }),
            {
               noRequest: true,
            },
         );

         if (history && !disableQueryChange) {
            history.push(
               handleQueryString
                  ? handleQueryString({})
                  : {
                       search: `?`,
                    },
            );
         }

         reloadPageExtend(wait1s);
      },
      [filters, initialFilters],
   );

   return {
      ...(statusInfo as IStatusInfoViewList),
      isLoading: statusInfo.loading,
      isStarted: statusInfo.started,
      isErrorOnLoad: statusInfo.errorLoadData,
      isCriticalError: statusInfo.criticalError,
      isSearching: (statusInfo as IStatusInfoViewList).searching,
      isLastPage: (statusInfo as IStatusInfoViewList).lastPage,
      isFirstPage: (statusInfo as IStatusInfoViewList).firstPage,
      isSearchingMore: (statusInfo as IStatusInfoViewList).searchingMore,
      isErrorLoadMore: (statusInfo as IStatusInfoViewList).errorLoadMore,
      activeFilters,
      useOnInit,
      useOnInitError,
      useOnCriticalError,
      useOnBeforeLoad,
      useResolveParams,
      useOnSearch,
      useOnBeforeSearch,
      resolvesResponse,
      statusInfo,
      setStatusInfo,
      registerOnInit,
      registerOnInitError,
      registerOnBeforeLoad,
      registerOnCriticalError,
      getParamsResolve,
      registerResolveParams: registerResolveParams as any,
      $destroy,
      reloadPage: reloadPageExtend,
      replaceResources: insertResources,
      //
      registerOnSearch,
      registerOnBeforeSearch,
      skeletonResources,
      resources,
      resourcesTotal,
      pushResource,
      removeResource,
      removeManyResources,
      changePositionResource,
      updateResource,
      updateManyResources,
      putResource,
      putManyResources,
      filters,
      setFilters,
      limit,
      setHandleRequestBody,
      setHandleFilterToQuery,
      setHandleQueryToFilter,
      setPage,
      setOffset,
      setSort,
      loadNextPage,
      loadPrevPage,
      reloadResources,
      resetPageViewList,
      history,
   };
}
