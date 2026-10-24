import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Runs an async loader every time the screen gains focus and whenever the
 * loader identity changes, so lists and totals refresh after a form screen
 * saves and pops. Pass a memoised loader:
 *
 *   const load = useCallback(() => getDashboardSummary(month), [month]);
 *   const { data, loading, error, reload } = useFocusedQuery(load);
 *
 * `loading` is only true until the first result arrives so refreshes do not
 * flash a spinner over existing content.
 */
export function useFocusedQuery(loader) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    requestId.current += 1;
    const current = requestId.current;
    try {
      const result = await loader();
      if (current === requestId.current) {
        setState({ data: result, error: null, loading: false });
      }
    } catch (error) {
      if (current === requestId.current) {
        setState((previous) => ({ ...previous, error, loading: false }));
      }
    }
  }, [loader]);

  useFocusEffect(
    useCallback(() => {
      run();
      return () => {
        // Ignore results that arrive after the screen loses focus or the
        // loader changes (e.g. the selected month moved on).
        requestId.current += 1;
      };
    }, [run])
  );

  return { ...state, reload: run };
}
