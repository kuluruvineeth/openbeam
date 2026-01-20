"use client";

import { useCallback, useState } from "react";

const MAX_LENGTH = 4000;

interface UseChatInputOptions {
  maxLength?: number;
  onSubmit?: (value: string) => void;
}

interface UseChatInputReturn {
  value: string;
  setValue: (value: string) => void;
  isEmpty: boolean;
  isTooLong: boolean;
  characterCount: number;
  maxLength: number;
  handleChange: (value: string) => void;
  handleSubmit: () => void;
  reset: () => void;
}

export function useChatInput(
  options: UseChatInputOptions = {}
): UseChatInputReturn {
  const { maxLength = MAX_LENGTH, onSubmit } = options;
  const [value, setValue] = useState("");

  const isEmpty = value.trim().length === 0;
  const isTooLong = value.length > maxLength;
  const characterCount = value.length;

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const handleSubmit = useCallback(() => {
    if (isEmpty || isTooLong) {
      return;
    }
    onSubmit?.(value.trim());
    setValue("");
  }, [isEmpty, isTooLong, value, onSubmit]);

  const reset = useCallback(() => {
    setValue("");
  }, []);

  return {
    value,
    setValue,
    isEmpty,
    isTooLong,
    characterCount,
    maxLength,
    handleChange,
    handleSubmit,
    reset,
  };
}
