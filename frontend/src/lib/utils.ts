type ClassInput =
  | string
  | number
  | null
  | undefined
  | boolean
  | Record<string, boolean | null | undefined>
  | ClassInput[];

const resolveClassName = (input: ClassInput): string => {
  if (!input) {
    return '';
  }

  if (typeof input === 'string' || typeof input === 'number') {
    return String(input);
  }

  if (Array.isArray(input)) {
    return input.map(resolveClassName).filter(Boolean).join(' ');
  }

  if (typeof input === 'object') {
    return Object.keys(input)
      .filter((key) => Boolean(input[key]))
      .join(' ');
  }

  return '';
};

export function cn(...inputs: ClassInput[]) {
  return inputs.map(resolveClassName).filter(Boolean).join(' ');
}