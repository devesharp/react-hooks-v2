import { useEffect, useState, useCallback, useMemo } from "react";
import { IFetchProps, Resolver, useFetch } from "./useFetch";

// Interface para os resolvers do formulário
export interface IFetchFormProps<
  T extends Record<string, any>,
  R extends Record<string, Resolver> = {}
> extends Omit<IFetchProps<any>, "resolvers"> {
  id?: string | number | null;
  resolvers: {
    get?: Resolver<T>;
    update?: (id: string | number, data: Partial<T>) => T | Promise<T>;
    create?: (data: Partial<T>) => T | Promise<T>;
  } & R; // Permite resolvers adicionais customizados
  onSuccess?: (data: T, action: "create" | "update") => void;
  onFailure?: (error: Error, action: "create" | "update") => void;
  initialData?: Partial<T>;
  // Função para transformar dados antes de chegar em `data`
  transformData?: (data: T) => Partial<T>;
  // Função para transformar dados antes de enviar para create/update
  transformSubmitData?: (data: Partial<T>) => Partial<T>;
}

export function useFetchForm<
  T extends Record<string, any>,
  R extends Record<string, Resolver> = {}
>({
  id,
  resolvers,
  onStarted,
  onError,
  onSuccess,
  onFailure,
  initialData = {},
  transformData,
  transformSubmitData,
}: IFetchFormProps<T, R>) {
  const [data, setData] = useState<Partial<T>>(initialData);
  const [originalData, setOriginalData] = useState<Partial<T> | null>(null); // Valor original do get
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  // Separa os resolvers especiais dos customizados
  const { get, update, create, ...customResolvers } = resolvers;

  // Cria os resolvers para o useFetch incluindo get e resolvers customizados
  const fetchResolvers = {
    ...(get && { get }),
    ...customResolvers,
  };

  const fetch = useFetch({
    resolvers: fetchResolvers,
    onStarted: (results) => {
      // Se temos dados do get, atualiza o formulário e salva o original
      if (results.get) {
        let getData = results.get as T;

        // Aplica transformação nos dados se fornecida
        if (transformData) {
          getData = { ...getData, ...transformData(getData) } as T;
        }

        setData((prev) => ({ ...prev, ...getData }));
        setOriginalData(getData); // Salva o valor original (já transformado)
      }
      onStarted?.(results);
    },
    onError,
  });

  // Função para atualizar os dados do formulário
  const updateData = useCallback(
    (updates: Partial<T> | ((prev: Partial<T>) => Partial<T>)) => {
      if (typeof updates === "function") {
        setData(updates);
      } else {
        setData((prev) => ({ ...prev, ...updates }));
      }
    },
    []
  );

  // Função para atualizar uma chave específica do data
  const updateDataKey = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Função para obter uma chave específica do data
  const getDataKey = useCallback(
    <K extends keyof T>(key: K): T[K] | undefined => {
      return data[key];
    },
    [data]
  );

  // Função para obter uma chave específica do originalData
  const getOriginalDataKey = useCallback(
    <K extends keyof T>(key: K): T[K] | undefined => {
      return originalData?.[key];
    },
    [originalData]
  );

  // Função para resetar os dados do formulário
  const resetData = useCallback(
    (newData?: Partial<T>) => {
      if (newData) {
        setData(newData);
      } else if (originalData) {
        // Se temos dados originais, volta para eles
        setData(originalData);
      } else {
        // Senão, volta para os dados iniciais
        setData(initialData);
      }
    },
    [initialData, originalData]
  );

  // Função para resetar para os dados originais
  const resetToOriginal = useCallback(() => {
    if (originalData) {
      setData(originalData);
    }
  }, [originalData]);

  // Função para submeter o formulário
  const submitForm = useCallback(
    async (formData?: Partial<T>) => {
      let dataToSubmit = formData || data;

      // Aplica transformação nos dados antes de enviar se fornecida
      if (transformSubmitData) {
        dataToSubmit = transformSubmitData(dataToSubmit);
      }

      const isUpdate = id !== null && id !== undefined;
      const resolver = isUpdate ? update : create;
      const action = isUpdate ? "update" : "create";

      if (!resolver) {
        const error = new Error(`Resolver para ${action} não foi fornecido`);
        setSubmitError(error);
        onFailure?.(error, action);
        return { success: false, error };
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        let result: T;

        if (isUpdate && update) {
          // Para update, sempre passa (id, data)
          const functionResult = update(id, dataToSubmit);

          if (functionResult instanceof Promise) {
            result = await functionResult;
          }
        } else if (!isUpdate && create) {
          // Para create, executa o resolver normalmente
          const functionResult = create(dataToSubmit as T);

          if (functionResult instanceof Promise) {
            result = await functionResult;
          }
        } else {
          throw new Error("Resolver inválido");
        }

        if (!result) {
          throw new Error("Resolver inválido");
        }

        // Aplica transformação no resultado se fornecida
        let transformedResult = result;
        if (transformData) {
          transformedResult = { ...result, ...transformData(result) } as T;
        }

        // Atualiza os dados com o resultado transformado
        setData((prev) => ({ ...prev, ...transformedResult }));

        // Se foi um update bem-sucedido, atualiza também o originalData
        if (isUpdate) {
          setOriginalData((prev) => ({ ...prev, ...transformedResult }));
        }

        onSuccess?.(result, action); // Callback recebe dados originais (não transformados)
        setIsSubmitting(false);

        return { success: true, data: result };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setSubmitError(err);
        setIsSubmitting(false);
        onFailure?.(err, action);

        return { success: false, error: err };
      }
    },
    [
      data,
      id,
      update,
      create,
      onSuccess,
      onFailure,
      transformSubmitData,
      transformData,
    ]
  );

  // Função para executar resolvers customizados
  const executeResolver = useCallback(
    async (resolverKey: keyof R) => {
      if (resolverKey in customResolvers) {
        return fetch.reloadFetch(resolverKey as keyof typeof fetchResolvers);
      }
      throw new Error(`Resolver '${String(resolverKey)}' não encontrado`);
    },
    [customResolvers, fetch.reloadFetch]
  );

  // Carrega os dados iniciais se temos um ID e um resolver get
  useEffect(() => {
    if (id && get) {
      fetch.onReload(false);
    }
  }, [id, get]);

  // Função para integração com react-hook-form ou outros gerenciadores
  const getFormProps = useCallback(
    () => ({
      values: data,
      onChange: updateData,
      onSubmit: submitForm,
      onReset: resetData,
    }),
    [data, updateData, submitForm, resetData]
  );

  // Função para verificar se os dados foram modificados (otimizada com useMemo)
  const isDirty = useMemo(() => {
    if (!originalData) return Object.keys(data).length > 0;

    return JSON.stringify(data) !== JSON.stringify(originalData);
  }, [data, originalData]);

  // Função otimizada para verificar se há dados não salvos (usando useMemo)
  const isUpdateData = useMemo(() => {
    // Se não temos dados originais, considera que há mudanças se há dados no formulário
    if (!originalData) {
      return Object.keys(data).some((key) => {
        const value = data[key];
        return value !== null && value !== undefined && value !== "";
      });
    }

    // Compara cada campo individualmente para detectar mudanças
    const dataKeys = new Set([
      ...Object.keys(data),
      ...Object.keys(originalData),
    ]);

    for (const key of dataKeys) {
      const currentValue = data[key];
      const originalValue = originalData[key];

      // Normaliza valores vazios para comparação
      const normalizedCurrent =
        currentValue === "" ||
        currentValue === null ||
        currentValue === undefined
          ? null
          : currentValue;
      const normalizedOriginal =
        originalValue === "" ||
        originalValue === null ||
        originalValue === undefined
          ? null
          : originalValue;

      if (normalizedCurrent !== normalizedOriginal) {
        return true;
      }
    }

    return false;
  }, [data, originalData]); // Só recalcula quando data ou originalData mudarem

  // Função para forçar recálculo do isUpdateData (caso necessário)
  const refreshUpdateDataCheck = useCallback(() => {
    // Esta função força uma re-renderização que recalculará isUpdateData
    // Útil se você modificar data de forma que não trigger o useMemo
    setData((prev) => ({ ...prev }));
  }, []);

  return {
    // Dados do formulário
    data,
    originalData, // Dados originais do get
    updateData,
    updateDataKey, // Atualiza uma chave específica
    getDataKey, // Obtém uma chave específica do data
    getOriginalDataKey, // Obtém uma chave específica do originalData
    resetData,
    resetToOriginal, // Reset específico para dados originais

    // Estados de carregamento
    isLoading: fetch.isLoading,
    isSubmitting,

    // Estados de erro
    submitError,
    loadError: fetch.isErrorOnLoad,

    // Estados de sucesso
    isStarted: fetch.isStarted,

    // Funções principais
    submitForm,
    executeResolver, // Para executar resolvers customizados

    // Funções de controle
    reload: fetch.onReload,
    reloadFetch: fetch.reloadFetch,
    refreshUpdateDataCheck, // Força recálculo do isUpdateData

    // Dados resolvidos do fetch (inclui resolvers customizados)
    resolve: fetch.resolve,

    // Props para integração com gerenciadores de form
    getFormProps,

    // Utilitários
    isEditing: id !== null && id !== undefined,
    isCreating: id === null || id === undefined,
    isDirty, // Verifica se os dados foram modificados (otimizado)
    isUpdateData, // Verifica se há alterações não salvas (otimizado)
  };
}
