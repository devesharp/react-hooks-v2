// Tipo para diferentes tipos de resolvers
type ResolverFunction<T = unknown, T2 extends unknown[] = unknown[]> = (...args: T2) => T | Promise<T>;
type ResolverPromise<T = unknown, T2 extends unknown[] = unknown[]> = (...args: T2) => Promise<T>;
export type IResolve<T = unknown, T2 = unknown> = ResolverFunction<T, T2> | ResolverPromise<T, T2> | undefined;

// Tipo para extrair o tipo de retorno de um resolver
export type IExtractResolverType<T> = T extends () => infer R
  ? R extends Promise<infer U>
    ? U
    : R
  : T extends Promise<infer U>
  ? U
  : never

export type IResolvedValues<T extends Record<string, IResolve>> = {
   [K in keyof T]: IExtractResolverType<T[K]>
 }

export interface IUseViewProps<T extends Record<string, IResolve>> {
  /**
   * Promises que devem ser iniciados antes do início da página
   */
  resolves?: T;

  /**
   * Se deve fazer o carregamento inicial dos resolves
   */
  firstLoad?: boolean;

  /**
   * Função que será chamada quando o carregamento dos resolves for iniciado
   */
  onStarted?: (v: IResolvedValues<T>) => void;

  /**
   * Função que será chamada quando o carregamento dos resolves for finalizado com erro
   */
  onErrorStarted?: (v: { [K in keyof T]?: Error }) => void;
}

export interface IStatusInfo {
  /**
   * Status: Carregando
   * @deprecated Use isLoading instead.
   */
  isLoading?: boolean;
  /**
   * Status: Iniciado
   * @deprecated Use isStarted instead.
   */
  isStarted?: boolean;
  /**
   * Status: Erro no carregmento dos resolves
   * @deprecated Use isErrorOnLoad instead.
   */
  isErrorOnLoad?: boolean;
  
  /**
   * Status: Erro crítico desconhecido
   * @deprecated Use isCriticalError instead.
   */
  isCriticalError?: boolean;
}


// export interface IViewResponse<T extends Record<string, IResolve>> {
//   /**
//    *  Status: Carregando
//    * @deprecated Use isLoading instead.
//    */
//   isLoading: boolean;
//   /**
//    *  Status: Iniciado
//    * @deprecated Use isStarted instead.
//    */
//   isStarted: boolean;
//   /**
//    *  Status: Erro no carregmento dos resolves
//    * @deprecated Use isErrorOnLoad instead.
//    */
//   isErrorOnLoad: boolean;
//   /**
//    *  Status: Erro crítico desconhecido
//    * @deprecated Use isCriticalError instead.
//    */
//   isCriticalError: boolean;

//   // Registrar funções que são chamadas na inicialização da página
//   registerOnInit: (
//     v: (v: { [Key in keyof Resolves]: any }) => void
//   ) => IUnsubListener;
//   useOnInit: (
//     fn: (v: { [Key in keyof Resolves]: any }) => void,
//     deps: any[]
//   ) => void;
//   // Registrar funções que são chamadas no erro na inicialização da página
//   registerOnInitError: (v: any) => IUnsubListener;
//   useOnInitError: (fn: (v: any) => void, deps: any[]) => void;
//   // Registrar funções que são chamadas em erro critico
//   registerOnCriticalError: (v: any) => IUnsubListener;
//   useOnCriticalError: (fn: (v: any) => void, deps: any[]) => void;
//   // Registra uma função para ser chamada antes do load da página
//   registerOnBeforeLoad: (v: any) => IUnsubListener;
//   useOnBeforeLoad: (fn: (v: any) => void, deps: any[]) => void;
//   // Recarregar página
//   reloadPage: (wait1s?: boolean) => void;
//   // Registrar nova função para parametro de resolver
//   registerResolveParams: (resolveName: keyof Resolves, fn: () => any) => void;
//   useResolveParams: (
//     resolveName: keyof Resolves,
//     fn: () => void,
//     deps: any[]
//   ) => void;
//   // Lista de funções que devem ser executadas no parametro de determinado resolver  (usado para extender novos hooks - não usado normalmente)
//   getParamsResolve: MutableRefObject<{ [key: string]: () => any }>;
//   // statusInfo (usado para extender novos hooks - não usado normalmente)
//   statusInfo: IStatusInfo;
//   // Resposta dos Observables do resolves
//   resolvesResponse: { [key: string]: any };
//   // Definir status da página (usado para extender novos hooks - não usado normalmente)
//   setStatusInfo: (v: any) => any;
//   // Subject para parar todos os resolves  (usado ao extender em novos hooks - não usado normalmente)
//   $destroy: Subject<any>;
// }
