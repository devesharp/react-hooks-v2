import { useEffect, useState, useCallback, useRef } from 'react'
import { IFetchProps, Resolver, useFetch } from './useFetch'

// Interface para os resolvers
export interface IFetchFormProps<T extends Record<string, Resolver>> extends IFetchProps<T> {
}

export function useFetchForm<T extends Record<string, Resolver>>(
  { resolvers, onStarted, onError }: IFetchFormProps<T>
) {
  
  const fetch = useFetch({ resolvers, onStarted, onError });

} 