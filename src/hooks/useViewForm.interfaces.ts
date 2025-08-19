import {
  IStatusInfo,
  IResolve,
  IUseViewProps,
  IExtractResolverType,
} from "./useView.interfaces";
// import * as Yup from 'yup';

export interface NestedErrors {
  [key: string]: string | NestedErrors;
}
export interface IStatusInfoViewForm extends IStatusInfo {
  isSaving: boolean;
  isNotFound: boolean;
  isNotAuthorization: boolean;
}

type FirstParam<T> = T extends (arg1: infer P, ...args: unknown[]) => unknown
  ? P
  : never;

type SecondParam<T> = T extends (
  arg1: unknown,
  arg2: infer P,
  ...args: unknown[]
) => unknown
  ? P
  : never;

// Tipo para converter keys em string dot
export type IPaths<T, Prev extends string = ""> = {
  [K in keyof T]: T[K] extends (infer U)[] // se for array
    ? U extends object
      ?
          | `${Prev}${K & string}`
          | `${Prev}${K & string}.${number}`
          | IPaths<U, `${Prev}${K & string}.${number}.`>
      : `${Prev}${K & string}` | `${Prev}${K & string}.${number}`
    : T[K] extends object
    ? `${Prev}${K & string}` | IPaths<T[K], `${Prev}${K & string}.`>
    : `${Prev}${K & string}`;
}[keyof T];

export type IPathValue<
  T,
  P extends string
> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends IPaths<T[Key]>
      ? IPathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;


export interface IUseViewFormProps<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>,
  TResolveGet extends IResolve = IResolve
> extends IUseViewProps<TResolves> {
  
  /**
   * Id do resource
   *
   * Se definido resolveGet irá ser ativado automaticamente juntos com os resolves na inicialização
   */
  id?: IDType;

  /**
   * Atualizar resource após salvar
   */
  updateResourceOnSave?: boolean;

  /**
   * Dados iniciais
   *
   */
  initialData?: Partial<DataForm>;

  /**
   * Faz o tratamento dos dados de resource para o que será definido em:
   * formRef.current.setData
   */
  handleInsertForm?: (
    v: IExtractResolverType<TResolveGet>
  ) => Partial<DataForm> | Promise<Partial<DataForm>>;

  /**
   * Se true, não será necessário informar o ID para o resolveGet
   */
  withoutId?: boolean;

  /**
   * Resolve para resgatar resource (sem necessidade de ID)
   */
  resolveGet?: TResolveGet;

  /**
   * Resolve para criar resource
   */
  resolveCreate?: IResolve<unknown, [unknown]>;

  /**
   * Alias de resolveCreate
   */
  resolveAction?: IResolve<unknown, [unknown]>;

  /**
   * Resolve para para atualizar resource
   */
  resolveUpdate?: IResolve<unknown, [IDType, unknown]>;

  /**
   * Resgatar chave do resource
   */
  getKeyResource?: (resource: unknown) => IDType;

  /**
   * Faz o tratamento de dados antes de ser enviado para a request
   */
  handleFormData?:
    | ((
        formData: Partial<DataForm>
      ) =>
        | FirstParam<TResolves["create"]>
        | SecondParam<TResolves["update"]>
        | FirstParam<TResolves["action"]>)
    | ((
        formData: Partial<DataForm>
      ) => Promise<
        | FirstParam<TResolves["create"]>
        | SecondParam<TResolves["update"]>
        | FirstParam<TResolves["action"]>
      >);

  /**
   * callback de retorno quando houver erro na validação
   */
  onErrorData?: (errors: Record<string, string>) => void;

  /**
   * callback ao validar formulário manualmente
   *
   * retornar true para validar formulário
   */
  validateData?: (
    formData:
      | FirstParam<TResolves["create"]>
      | SecondParam<TResolves["update"]>
      | FirstParam<TResolves["action"]>
      | Partial<DataForm>
  ) => NestedErrors | Promise<NestedErrors>;

  /**
   * callback de retorno de sucesso ao salvar formulário
   */
  onSuccess?: (
    resp:
      | IExtractResolverType<TResolves["create"]>
      | IExtractResolverType<TResolves["update"]>
      | IExtractResolverType<TResolves["action"]>,
    creating: boolean
  ) => void;

  /**
   * callback de retorno de falha ao salvar formulário
   */
  onFailed?: (resp: Error, creating: boolean) => void;
}