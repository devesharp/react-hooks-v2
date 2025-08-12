import { renderHook, act } from '@testing-library/react';
import { useViewList } from '../useViewList';
import { IResponseResults, SortValue } from '../useViewList.interfaces';
import { convertObjetToQuery, convertQueryToObject } from '../useViewList.utils';

// Mock para use-immer - versão simplificada que funciona
vi.mock('use-immer', async () => {
  const actual = await vi.importActual('react');
  return {
    useImmer: <T>(initialState: T) => {
      return (actual as typeof import('react')).useState(initialState);
    },
    useImmerReducer: <T, A>(reducer: (state: T, action: A) => T, initialState: T) => {
      const [state, setState] = (actual as typeof import('react')).useState(initialState);
      const dispatch = (action: A) => {
        setState((prev: T) => reducer(prev, action));
      };
      return [state, dispatch];
    },
  };
});

describe('useViewList Utils', () => {
  describe('convertObjetToQuery', () => {
    it('basic', () => {
      const convert = convertObjetToQuery({
        offset: 0,
        sort: null,
        search: 'test',
        status: 'active',
      });

      expect(convert).toBe('offset=0&sort=&search=test&status=active');
    });

    it('Data', () => {
      const convert = convertObjetToQuery({
        date: new Date('2025-01-01 11:00:00'),
      });

      expect(convert).toBe('date=2025-01-01T14%3A00%3A00.000Z');
    });

    it('Complex data', () => {
      const convert = convertObjetToQuery({
        user: {
          logo: 'https://example.com/logo.png',
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
      });

      expect(convert).toBe('user%5Blogo%5D=https%3A%2F%2Fexample.com%2Flogo.png&user%5Bname%5D=John%20Doe&user%5Bemail%5D=john.doe%40example.com');
    });
    
  });

  describe('convertQueryToObject', () => {
    it('basic', () => {
      const convert = convertQueryToObject('offset=0&sort=&search=test&status=active');

      expect(convert).toEqual({
        offset: 0,
        search: 'test',
        status: 'active',
      });
    });

    it('Data', () => {
      const convert = convertQueryToObject('date=2025-01-01T14%3A00%3A00.000Z');

      expect(convert).toEqual({
        date: new Date('2025-01-01 11:00:00'),
      });
    });

    it('Complex data', () => {
      const convert = convertQueryToObject('user%5Blogo%5D=https%3A%2F%2Fexample.com%2Flogo.png&user%5Bname%5D=John%20Doe&user%5Bemail%5D=john.doe%40example.com');

      expect(convert).toEqual({
        user: {
          logo: 'https://example.com/logo.png',
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
      });
    });
    
  });
}); 