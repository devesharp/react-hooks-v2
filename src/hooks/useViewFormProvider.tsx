import React, { createContext, useContext, ReactNode } from "react";
import { useViewForm } from "./useViewForm";
import {
  IPaths,
  IPathValue,
} from "./useViewForm.interfaces";
import { IResolve } from "./useView.interfaces";

// Tipo para o retorno do useViewForm
type UseViewFormReturn<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
> = ReturnType<typeof useViewForm<DataForm, IDType, TResolves>>;

// Context para o formulário completo
const ViewFormContext = createContext<UseViewFormReturn | null>(null);

// Props do Provider - recebe os dados do useViewForm
interface ViewFormProviderProps<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
> extends UseViewFormReturn<DataForm, IDType, TResolves> {
  children: ReactNode;
}

// Provider Component
export function ViewFormProvider<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
>({
  children,
  ...formData
}: ViewFormProviderProps<DataForm, IDType, TResolves>) {
  return (
    <ViewFormContext.Provider value={formData as UseViewFormReturn}>
      {children}
    </ViewFormContext.Provider>
  );
}

// Hook para acessar o contexto completo do formulário
export function useFormContext<
  DataForm = unknown,
  IDType = string | number,
  TResolves extends Record<string, IResolve> = Record<string, IResolve>
>(): UseViewFormReturn<DataForm, IDType, TResolves> {
  const context = useContext(ViewFormContext);
  
  if (!context) {
    throw new Error("useFormContext deve ser usado dentro de um ViewFormProvider");
  }
  
  return context as UseViewFormReturn<DataForm, IDType, TResolves>;
}

// Hook para acessar um campo específico do formulário
export function useFormField<
  DataForm = unknown,
  K extends IPaths<DataForm> = IPaths<DataForm>
>(
  fieldName: K,
  defaultValue?: IPathValue<DataForm, K>
): {
  value: IPathValue<DataForm, K>;
  setValue: (value: IPathValue<DataForm, K>) => void;
  error: string | undefined;
  setError: (error: string) => void;
} {
  const context = useFormContext<DataForm>();
  
  if (!context) {
    throw new Error("useFormField deve ser usado dentro de um ViewFormProvider");
  }

  const { getField, setField, errors, setFieldErrors } = context;

  // Obter o valor atual do campo ou usar o valor padrão
  const value = getField(fieldName) ?? defaultValue;

  // Função para definir o valor do campo
  const setValue = (newValue: IPathValue<DataForm, K>) => {
    setField(fieldName, newValue);
  };

  // Obter o erro do campo
  const error = errors[fieldName as string];

  // Função para definir erro do campo
  const setError = (errorMessage: string) => {
    setFieldErrors(fieldName as string, errorMessage);
  };

  return {
    value: value as IPathValue<DataForm, K>,
    setValue,
    error,
    setError,
  };
}
