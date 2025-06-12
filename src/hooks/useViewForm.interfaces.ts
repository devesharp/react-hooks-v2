import {
  IStatusInfo,
  IResolve,
  IUseViewProps,
  IExtractResolverType,
} from "./useView.interfaces";
// import * as Yup from 'yup';

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
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
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
    v?: IExtractResolverType<TResolves["get"]>
  ) => Partial<DataForm> | Promise<Partial<DataForm>>;

  /**
   * Resolve para resgatar resource
   */
  resolveGet?: IResolve;

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
  onErrorData?: (errors: string[]) => void;

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
  ) => Record<string, string> | Promise<Record<string, string>>;

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

// export interface IViewFormResponse<T = any> extends IViewResponse {
//   /**
//    * resource adquirado em resolveGet
//    */
//   resource: T;
//   setResource: (f: ((draft: Draft<T> | T) => void) | T) => void;

//   isSaving: boolean;
//   isEditing: boolean;
//   isNotFound: boolean;
//   isNotAuthorization: boolean;

//   //
//   initialData?: any;

//   /**
//    * resource adquirado em resolveGet que nunca será alterado
//    */
//   originalResource: T;

//   /**
//    * Unform ref
//    */
//   formRef: MutableRefObject<FormHandles>;

//   formManager: {
//     getFieldValue(fieldName: string): any;
//     setFieldValue(fieldName: string, value: any): void | boolean;
//     getFieldError(fieldName: string): string | undefined;
//     setFieldError(fieldName: string, error: string): void;
//     clearField(fieldName: string): void;
//     getData(): Record<string, any>;
//     setData(data: Record<string, any>): void;
//     getErrors(): UnformErrors;
//     setErrors(errors: Record<string, string>): void;
//     reset(data?: Record<string, any>): void;
//   };

//   /**
//    * Status de salvando form
//    */
//   saving: boolean;

//   /**
//    * Se não encontrou recurso
//    */
//   notFound: boolean;

//   /**
//    * Se não tiver permissão para ver recurso
//    */
//   notAuthorization: boolean;

//   /**
//    * Registrar funções que são chamadas ao carregar recurso
//    */
//   registerOnLoadResource: (resource: any) => void;
//   useOnLoadResource: (
//     fn: (r: { [key: string]: any }) => void,
//     deps: any[]
//   ) => any;

//   /**
//    * Registrar funções que são chamadas ao carregar recurso
//    */
//   registerOnAfterLoadResource: (resource: any) => void;
//   useOnAfterLoadResource: (
//     fn: (r: { [key: string]: any }) => void,
//     deps: any[]
//   ) => any;

//   /**
//    * Mostra erros do formulário sem enviar
//    *
//    * util para mostrar erros em telas que estavam inativas
//    */
//   checkErrors: () => void;

//   /**
//    * callback para unform
//    *
//    * <Form onSubmit={onSubmitForm} />
//    */
//   onSubmitForm(data: any): Promise<void>;

//   /**
//    * Forçar data manual no form
//    */
//   onSubmitManual(
//     data: any,
//     validateData: { validateData?: boolean; handleFormData?: boolean }
//   ): Promise<void>;

//   /**
//    * Força submit
//    */
//   forceSubmit(): void;

//   /**
//    * Resgatar campo de extraFormDara
//    */
//   getFieldValueExtraForm(fieldName: string): any;

//   /**
//    * Definir campo de extraFormDara
//    */
//   setFieldValueExtraForm(fieldName: string, value: any): void;

//   /**
//    * Limpar campo de extraFormDara
//    */
//   clearFieldExtraForm(fieldName: string): void;

//   /**
//    * Resgatar body do form
//    */
//   getData(): any;

//   /**
//    * Inserir dados no formRef ou extraFormData
//    */
//   setData(data: any): void;

//   /**
//    * Inserir valor do recurso
//    * @param key
//    * @param value
//    */
//   setLocalField(key: string, value: any): void;

//   /**
//    * Resgatar valor do recurso
//    * @param key
//    */
//   getLocalField(key: string): any;

//   /**
//    * Resgatar valor original do recurso
//    * @param key
//    */
//   getOriginalField(key: string): any;
// }
