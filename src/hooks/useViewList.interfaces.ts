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

  initialSort?: string;

  filtersDefault?: Partial<IFilter>;

  initialFilters?: Partial<IFilter>;

  resolveResources: IResolve<IResponseResults<IResource>>;

  /**
   * Função para tratar/transformar a lista de resources retornados
   * pelo resolveResources antes de serem definidos no estado interno.
   */
  treatmentResources?: (resources: IResource[]) => IResource[];
}
