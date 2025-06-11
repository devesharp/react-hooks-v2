import {
  useRef,
  useEffect,
  useCallback,
} from "react";
import cloneDeep from "clone-deep";
import isPromise from "is-promise";
import { useImmer, useImmerReducer } from "use-immer";
import { useView } from "./useView";
import { isAxiosError } from "axios";
import {
  IStatusInfoViewForm,
  IUseViewFormProps,
  IPaths,
  IPathValue,
} from "./useViewForm.interfaces";
import {
  IExtractResolverType,
  IResolve,
  IResolvedValues,
} from "./useView.interfaces";

export function useViewForm<
  DataForm = unknown,
  IDType = string | number
>({
  id,
  onStarted,
  onErrorStarted,
  updateResourceOnSave = false,
  resolveGet,
  initialData = {},
  resolveAction,
  resolveCreate,
  resolveUpdate,
  onSuccess,
  onFailed,
  handleFormData,
  onErrorData,
  validateData,
  handleInsertForm = (v) => v as Partial<DataForm>,
  resolves = {},
  firstLoad = true,
}: IUseViewFormProps<DataForm, IDType>) {
  // Se houver ID, faz primeira request
  const resolvesForm = { ...resolves };

  if (id && resolveGet) resolvesForm.get = () => resolveGet(id);

  const [statusInfoForm, setStatusInfoForm] = useImmerReducer<
    IStatusInfoViewForm,
    Partial<IStatusInfoViewForm>
  >((prevState, newState) => ({ ...prevState, ...newState }), {
    isSaving: false,
    isNotFound: false,
    isNotAuthorization: false,
  });

  const {
    statusInfo,
    setStatusInfo,
    reloadPage: reloadPageView,
    resolvesResponse,
  } = useView<{
    get?: IResolve;
    [key: string]: IResolve;
  }>({
    resolves: resolvesForm,
    firstLoad,
    onStarted: (s) => {
      onStarted?.(s);
      onStartedForm(s.get as IExtractResolverType<T["get"]> | undefined);
    },
    onErrorStarted: (e) => {
      onErrorStarted?.(e);
      onErrorStartedForm(e);
    },
  });

  /**
   * Dado original só é alterado no load, reload do hook
   */
  const [resource, setResource] = useImmer<Partial<DataForm>>(initialData);
  const [originalResource, setOriginalResource] = useImmer<Partial<DataForm>>(
    {}
  );

  // Ref para rastrear o ID anterior e evitar execuções desnecessárias durante hot reload
  const previousIdRef = useRef(id);

  /**
   * Erros
   */
  const [errors, setErrors] = useImmer<Record<string, string>>({});

  /**
   * gerenciar dados
   */

  function setField<K extends IPaths<DataForm>>(
    keyDot: K,
    value: IPathValue<DataForm, K>
  ) {
    setResource((r) => {
      const res = cloneDeep(r ?? {});

      (keyDot as string).split(".").reduce((o, i, index, arr) => {
        if (index === arr.length - 1) {
          o[i] = value;
        } else if (!o[i]) o[i] = {};
        return o[i];
      }, res ?? {});

      return res;
    });
  }

  function getField<K extends IPaths<DataForm>>(keyDot: K) {
    return (keyDot as string)
      .split(".")
      .reduce((o, i) => (o ? o[i] : undefined), resource) as IPathValue<
      DataForm,
      K
    >;
  }

  function getOriginalField<K extends IPaths<DataForm>>(keyDot: K) {
    return (keyDot as string)
      .split(".")
      .reduce((o, i) => (o ? o[i] : undefined), originalResource) as IPathValue<
      DataForm,
      K
    >;
  }

  function onStartedForm(get?: IExtractResolverType<T["get"]>) {
    if (get) {
      setResource(() => handleInsertForm({ ...get }));
      setOriginalResource(() => ({ ...(get ?? {}) } as DataForm));
    } else {
      setResource(() => initialData);
      setOriginalResource(() => ({} as DataForm));
    }

    setStatusInfoForm({
      isSaving: false,
      isNotFound: false,
      isNotAuthorization: false,
    });
  }

  function onErrorStartedForm(error: { [K in keyof T]?: Error }) {
    if (error.get) {
      // Verificar se é erro do Axios
      if (
        (isAxiosError(error.get) && error.get.response?.status === 404) ||
        // Verificar se é erro do Fetch
        (error.get instanceof Response && error.get.status === 404) ||
        // Verificar se tem propriedade status_code customizada
        (error.get as unknown as { status_code: number }).status_code === 404
      ) {
        setStatusInfoForm({
          isSaving: false,
          isNotFound: true,
          isNotAuthorization: false,
        });
      }

      if (
        (isAxiosError(error.get) && error.get.response?.status === 401) ||
        (error.get instanceof Response && error.get.status === 401) ||
        (error.get as unknown as { status_code: number }).status_code === 401
      ) {
        setStatusInfoForm({
          isSaving: false,
          isNotFound: false,
          isNotAuthorization: true,
        });
      }
    }
  }

  async function checkErrors(
    data?: Partial<DataForm>
  ): Promise<Record<string, string> | Promise<Record<string, string>>> {
    let formData = data ?? getData(true);

    if (formData instanceof Promise) {
      formData = await formData;
    }

    return validateData ? validateData(formData) : {};
  }

  async function submitForm(): Promise<void> {
    let newData = getData(true);

    if (newData instanceof Promise) {
      newData = await newData;
    }

    // Validar dados do form
    if (validateData) {
      let valid = validateData(newData);

      if (isPromise(valid)) {
        valid = await valid;
      }

      if (Object.keys(valid).length > 0) {
        onErrorData?.(Object.values(valid));
        return;
      }
    }

    setStatusInfoForm({
      isSaving: true,
    });

    if (!id) {
      const action = resolveAction || resolveCreate;

      if (action) {
        try {
          let resultAction = action(newData);
          if (isPromise(resultAction)) {
            resultAction = await resultAction;
          }

          setStatusInfoForm({ isSaving: false });

          if (onSuccess)
            onSuccess(
              resultAction as
                | IExtractResolverType<T["create"]>
                | IExtractResolverType<T["update"]>
                | IExtractResolverType<T["action"]>,
              true
            );

          return;
        } catch (error) {
          setStatusInfoForm({ isSaving: false });
          onFailed?.(error as Error, true);
          return;
        }
      } else {
        setStatusInfoForm({
          isSaving: false,
        });

        if (onSuccess)
          onSuccess(
            newData as
              | IExtractResolverType<T["create"]>
              | IExtractResolverType<T["update"]>
              | IExtractResolverType<T["action"]>,
            true
          );
      }
    } else {
      if (resolveUpdate) {
        try {
          let resultAction = resolveUpdate(id, newData);
          if (isPromise(resultAction)) {
            resultAction = await resultAction;
          }

          setStatusInfoForm({ isSaving: false });

          if (onSuccess)
            onSuccess(
              resultAction as
                | IExtractResolverType<T["create"]>
                | IExtractResolverType<T["update"]>
                | IExtractResolverType<T["action"]>,
              true
            );

          // Atualizar resource atual
          if (updateResourceOnSave) {
            if (resultAction) {
              setResource(() =>
                handleInsertForm(resultAction as IExtractResolverType<T["get"]>)
              );
              setOriginalResource(
                () => resultAction as IExtractResolverType<T["get"]>
              );
            }
          }

          return;
        } catch (error) {
          setStatusInfoForm({ isSaving: false });
          onFailed?.(error as Error, true);
          return;
        }
      } else {
        setStatusInfoForm({
          isSaving: false,
        });

        if (onSuccess)
          onSuccess(
            newData as
              | IExtractResolverType<T["create"]>
              | IExtractResolverType<T["update"]>
              | IExtractResolverType<T["action"]>,
            false
          );
      }
    }
  }

  function getData(treatment = false) {
    if (!treatment) {
      return resource;
    } else {
      return handleFormData
        ? handleFormData(cloneDeep({ ...resource }))
        : resource;
    }
  }

  function setData(data: Partial<DataForm>): void {
    setResource(() => data);
  }

  const reloadPage = useCallback(
    async function reloadPage(
      wait1s = true
    ): Promise<Partial<IResolvedValues<T>>> {
      setStatusInfoForm({
        isSaving: false,
        isNotFound: false,
        isNotAuthorization: false,
      });

      return reloadPageView(wait1s) as Partial<IResolvedValues<T>>;
    },
    [reloadPageView]
  );

  /**
   * Reset quando ID muda (resistente ao hot reload)
   * Só executa quando há uma mudança real no ID, não durante hot reload
   */
  useEffect(() => {
    if (previousIdRef.current !== id) {
      setResource(initialData);
      setOriginalResource({});
      previousIdRef.current = id;
      reloadPage(false);
    }
  }, [id, initialData, reloadPage, setResource, setOriginalResource]);

  return {
    isEditing: !!id,
    ...(statusInfo as IStatusInfoViewForm),
    ...statusInfoForm,
    resolvesResponse,
    statusInfo,
    setStatusInfo,
    reloadPage,
    checkErrors,
    initialData,
    resource,
    setResource,
    originalResource,
    getData,
    setData,
    setField,
    getField,
    getOriginalField,
    submitForm,
  };
}