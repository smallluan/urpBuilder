export const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((item) => ({
  label: item,
  value: item,
}));

export const BODY_TYPE_OPTIONS = [
  { label: 'none', value: 'none' },
  { label: 'json', value: 'json' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
  { label: 'raw', value: 'raw' },
];

export const ERROR_OPTIONS = [
  { label: 'throw', value: 'throw' },
  { label: 'continue', value: 'continue' },
  { label: 'useFallback', value: 'useFallback' },
];

export const CODE_LANGUAGE_OPTIONS = [
  { label: 'javascript', value: 'javascript' },
  { label: 'typescript', value: 'typescript' },
  { label: 'json', value: 'json' },
  { label: 'css', value: 'css' },
];