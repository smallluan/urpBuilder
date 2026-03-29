import type { BuilderContextValue } from '../context/BuilderContext';

let builderDragPreviewContext: BuilderContextValue | null = null;

export function setBuilderDragPreviewContext(value: BuilderContextValue | null): void {
  builderDragPreviewContext = value;
}

export function getBuilderDragPreviewContext(): BuilderContextValue | null {
  return builderDragPreviewContext;
}
