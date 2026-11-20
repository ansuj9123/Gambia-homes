"use client";

import { startTransition, useActionState } from "react";

// Like useActionState, but submits via onSubmit so React does not clear the
// form when the server returns a validation error. `prepare` can add to the
// FormData first (e.g. resized photo files).
export function useFormSubmit<S>(
  action: (prev: S | null, fd: FormData) => Promise<S | null>,
  prepare?: (fd: FormData) => void,
) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    prepare?.(fd);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending] as const;
}
