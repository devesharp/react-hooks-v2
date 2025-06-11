import { Resolve } from '@devesharp/react-utils/lib/Resolve';
import { History, LocationDescriptor, LocationState } from 'history';
import { IUseViewProps, IViewResponse, IStatusInfo, IResolve } from '../useView/useView.interfaces';

/**
 * Tipos de Schemas para ser usado nos filtros
 */
export interface IFilterOptions {
   noRequest?: boolean;
   disableQueryChange?: boolean;
   replaceUrl?: boolean;
   loadPrev?: boolean; // Se deve carregar items anteriores
}

export interface IResponseResults<T = any> {
   results: T[];
   count: number;
   [key: string]: any;
}

export type IResourceViewList<T extends {}> = T & {
   id?: string | number;
   __animation_deleted__?: boolean;
   __animation_new__?: boolean;
};

export interface IStatusInfoViewList extends IStatusInfo {
   errorLoadMore: boolean;
   searchingMore: boolean;
   searching: boolean;
   lastPage: boolean;
   firstPage: boolean;
}

export interface IUseViewListProps<
   T extends {
      [key: string]: any;
   } = any,
> extends IUseViewProps<T> {
   /**
    * Observables que devem ser iniciados antes do inicio da página
    */
   resolves?:
      | {
           resources?: IResolve<
              any,
              {
                 results: any[];
                 count: number;
              }
           >;
        }
      | { [k in keyof T]?: IResolve<any> | null };

   // Filtros default
   filtersDefault?: any;
   // Schema do Filtro
   schemaFilter?: any;
   // Limite de items na API
   limit?: number;
   // Número de skeleton que
   skeletonShowCount?: number;
   // Offset inicial
   initialOffset?: number;
   // Se deve adicionar items ao final da array ou substituir array
   infiniteScroll?: boolean;
   // Inverte os items da array "items". O primeiro elemento do array se torna o último e o último torna-se o primeiro. Se infiniteScroll estiver ativo, todos os items serão adicionados no começo da array
   reverseItems?: boolean;
   // Habilitar variáveis de animações nos resources
   enableAnimation?: boolean;
   // Não deve mudar query da url
   disableQueryChange?: boolean;
   // Se pode carregar items anteriores
   loadBidirecional?: boolean;
   // Não deve passar esses filtros para query da url
   ignoreFiltersInQuery?: any[];
   // Não deve passar determinadas keys da query para o filtro
   ignoreQueryInFilters?: any[];
   // Só verificar alteração na query, se for a mesma routa definida
   changeOnlyPath?: string;
   // Só verificar alteração na query, se for a mesmas queries definidas
   changeOnlyQuery?: any;
   // Recursos inicias
   initialResources?: {
      count: number;
      results: any[];
   };
   // Filtros iniciais
   initialFilters?: any;
   // Tratar dados do filter que serão enviados para o Body da Request
   handleRequestBody?: (filter: any) => any;
   // Tratar dados do Filter que serão enviados para Url Query
   handleFilterToQuery?: (query: any) => any;
   // Tratar dados do Query que são enviados para o filtro
   handleQueryToFilter?: (filter: any) => any;
   // Tratar dados do Query que são enviados para o filtro
   handleQueryString?: (filter: any) => LocationDescriptor<LocationState>;
   //
   history?: History<any>;
   //
   onTreatmentSearch?: (originalResources: any, currentResources: any) => any[];
}

export interface IViewList<IFilter = any, IQuery = any, IResource = any> extends IViewResponse {
   isSearching: boolean;
   isLastPage: boolean;
   isFirstPage: boolean;
   isSearchingMore: boolean;
   isErrorLoadMore: boolean;
   activeFilters: number;

   useOnSearch: (fn: (r: { [key: string]: any }) => void, deps: any[]) => void;
   useOnBeforeSearch: (fn: (r: any) => void, deps: any[]) => void;

   // Status: Buscando items se infiniteScroll = true
   searchingMore: boolean;
   // Status: Buscando items se infiniteScroll = false
   searching: boolean;
   // Status: Se chegou na página inicial
   lastPage: boolean;
   // Status: Erro ao carregar mais items se infiniteScroll = true
   errorLoadMore: boolean;
   // Array ser usado com skeleton
   skeletonResources: IResourceViewList<any>[];
   // Array de items
   resources: IResourceViewList<IResource>[];
   // Quantidade de items totais
   resourcesTotal: number;
   // Mudar ordem do item da array
   changePositionResource: (id: number | string, index: number) => void;
   // Remover item da array
   removeResource: (id: number | string, softDelete: boolean) => void;
   // Remover diversos itens da array
   removeManyResources: (ids: (number | string)[], softDelete: boolean) => void;
   // Atualizar item da array
   updateResource: (
      id: number | string,
      data: (p: IResourceViewList<IResource>) => IResourceViewList<IResource>,
   ) => void;
   // Atualizar diversos itens da array
   updateManyResources: (
      ids: (number | string)[],
      data: (p: IResourceViewList<IResource>) => IResourceViewList<IResource>,
   ) => void;
   // Adicionar item na array
   pushResource: (data: IResourceViewList<IResource>, first?: boolean) => void;
   // Adicionar item na array
   replaceResources: (data: IResponseResults<IResourceViewList<IResource>>) => void;
   // Inserir dados em um item da array
   putResource: (id: number | string, data: Partial<IResourceViewList<IResource>>) => void;
   // Inserir dados em diversos itens da array
   putManyResources: (ids: (number | string)[], data: Partial<IResourceViewList<IResource>>) => void;
   // Tratar dados do filter que serão enviados para o Body da Request
   setHandleRequestBody: (f: (filter: IFilter) => any) => void;
   // Tratar dados do Filter que serão enviados para Url Query
   setHandleFilterToQuery: (f: (query: IFilter) => IQuery) => void;
   // Tratar dados do Query que são enviados para o filtro
   setHandleQueryToFilter: (f: (filter: IQuery) => IFilter) => void;
   // Registrar funções que são chamadas na busca de dados
   registerOnSearch: (f: () => void) => void;
   // Registrar funções que são chamadas após a request de busca
   registerOnBeforeSearch: (f: (r: any) => void) => void;
   // Array de items
   filters: IFilter;
   // Array de items
   setFilters: (f: (draft: IFilter) => IFilter, options?: IFilterOptions) => void;
   // Limite de recursos por página
   limit: number;
   // Define página da lista
   setPage: (page: number, options?: IFilterOptions) => void;
   // Define offset atual da lista
   setOffset: (offset: number, options?: IFilterOptions) => void;
   // Define ordem dos items
   setSort: (sort: string, options?: IFilterOptions) => void;
   // Carrega próxima página
   loadNextPage: (options?: IFilterOptions) => void;
   // Carrega página anterior
   loadPrevPage: (options?: IFilterOptions) => void;
   // Recarrega página atual
   reloadResources: (wait1s?: boolean, options?: IFilterOptions) => void;
   // Reinicia todos os filtros, query e faz uma nova request
   resetPageViewList: (wait1s?: boolean, options?: IFilterOptions) => void;
   /**
    * react dom v5, history serve para poder enviar para determinadas rotas de busca
    * Exemplo: /search?page=2&name=John
    */
   history?: History<any>;
}
