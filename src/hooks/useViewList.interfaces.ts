import { IUseViewProps, IStatusInfo, IResolve } from "./useView.interfaces";

/**
 * Tipos de Schemas para ser usado nos filtros
 */
export interface IFilterOptions {
  noRequest?: boolean;
  disableQueryChange?: boolean;
  replaceUrl?: boolean;
  loadPrev?: boolean; // Se deve carregar items anteriores
}

export interface IResponseResults<T = unknown> {
  results: T[];
  count: number;
}

export type SortDirection = 'asc' | 'desc';

export interface ISortConfig {
  column: string | null;
  direction: SortDirection;
}

export type SortValue = null | ISortConfig;

export interface IStatusInfoViewList extends IStatusInfo {
  isSearching: boolean;
  isLastPage: boolean;
  isFirstPage: boolean;
  isErrorOnSearching: boolean;
}

export interface IUseViewListProps<
  IResource = unknown,
  IFilter = unknown,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
> extends IUseViewProps<TResolves> {
  limit?: number;

  initialOffset?: number;

  initialSort?: SortValue;

  filtersDefault?: Partial<IFilter>;

  initialFilters?: Partial<IFilter>;

  resolveResources: IResolve<IResponseResults<IResource>>;

  /**
   * Função para tratar/transformar a lista de resources retornados
   * pelo resolveResources antes de serem definidos no estado interno.
   */
  treatmentResources?: (resources: IResource[]) => IResource[];

  /**
   * Callback executado antes de iniciar uma busca.
   */
  onBeforeSearch?: (filters: { offset: number; sort: SortValue } & Partial<IFilter>) => void;

  /**
   * Callback executado após uma busca ser concluída (sucesso ou erro).
   */
  onAfterSearch?: (result: {
    success: boolean;
    data?: IResponseResults<IResource>;
    error?: Error;
    filters: { offset: number; sort: SortValue } & Partial<IFilter>;
  }) => void;

  /**
   * Callback executado quando os filtros são alterados.
   */
  onChangeFilters?: (
    newFilters: { offset: number; sort: SortValue } & Partial<IFilter>,
    previousFilters: { offset: number; sort: SortValue } & Partial<IFilter>
  ) => void;
}
