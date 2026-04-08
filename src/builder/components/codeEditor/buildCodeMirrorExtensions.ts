import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import type { Extension } from '@codemirror/state';
import { CODE_EDITOR_JS_GLOBAL_COMPLETIONS } from '../../../constants/codeEditor';
import type { CodeEditorDynamicCompletionContext } from './dynamicCompletions';

export interface BuildCodeMirrorExtensionsOptions {
  language?: string;
  extraCompletions?: Completion[];
  extraExtensions?: Extension[];
  completionMode?: 'append' | 'replace';
  dynamicCompletionContext?: CodeEditorDynamicCompletionContext;
}

const normalizeLanguage = (language?: string) => String(language ?? 'javascript').trim().toLowerCase();

const buildJsCompletions = (
  extraCompletions: Completion[],
  completionMode: 'append' | 'replace',
): Completion[] => {
  if (completionMode === 'replace') {
    return extraCompletions;
  }

  return [...CODE_EDITOR_JS_GLOBAL_COMPLETIONS, ...extraCompletions];
};

type StringCompletionMode =
  | { kind: 'component-key'; prefix: string }
  | { kind: 'component-ref'; prefix: string }
  | { kind: 'component-prop-by-key'; prefix: string; componentKey: string }
  | { kind: 'component-prop-by-ref'; prefix: string; componentRef: string };

const toLower = (value: unknown) => String(value ?? '').toLowerCase();

const buildComponentKeyCompletions = (ctx?: CodeEditorDynamicCompletionContext): Completion[] => {
  const components = ctx?.components ?? [];
  return components.map((item) => ({
    label: item.key,
    type: 'variable',
    detail: item.type ? `${item.label} · ${item.type}` : item.label,
    info: `组件编码：${item.key}${item.type ? `\n组件类型：${item.type}` : ''}`,
  }));
};

const buildComponentRefCompletions = (ctx?: CodeEditorDynamicCompletionContext): Completion[] => {
  const components = ctx?.components ?? [];
  return components.map((item) => ({
    label: item.ref,
    type: 'variable',
    detail: item.type ? `${item.label} · ${item.type}` : item.label,
    info: `组件引用：${item.ref}`,
  }));
};

const buildComponentPropCompletionsByKey = (
  componentKey: string,
  ctx?: CodeEditorDynamicCompletionContext,
): Completion[] => {
  const normalizedKey = String(componentKey ?? '').trim();
  const target = (ctx?.components ?? []).find((item) => item.key === normalizedKey);
  if (!target) {
    return [];
  }
  return target.propKeys.map((propKey) => ({
    label: propKey,
    type: 'property',
    detail: `${target.label} (${target.key})`,
    info: `来自组件 ${target.key} 的可读属性`,
  }));
};

const buildComponentPropCompletionsByRef = (
  componentRef: string,
  ctx?: CodeEditorDynamicCompletionContext,
): Completion[] => {
  const normalizedRef = String(componentRef ?? '').trim();
  const target = (ctx?.components ?? []).find((item) => item.ref === normalizedRef);
  if (!target) {
    return [];
  }
  return target.propKeys.map((propKey) => ({
    label: propKey,
    type: 'property',
    detail: `${target.label} (${target.ref})`,
    info: `来自组件 ${target.ref} 的可读属性`,
  }));
};

const resolveStringCompletionMode = (linePrefix: string): StringCompletionMode | null => {
  const firstArgByKey = /dataHub\.(getComponentState|getComponentProp|composeRef)\(\s*(['"])([^'"]*)$/i.exec(linePrefix);
  if (firstArgByKey) {
    return {
      kind: 'component-key',
      prefix: firstArgByKey[3] ?? '',
    };
  }

  const firstArgByRef = /dataHub\.(getComponentStateByRef|getComponentPropByRef)\(\s*(['"])([^'"]*)$/i.exec(linePrefix);
  if (firstArgByRef) {
    return {
      kind: 'component-ref',
      prefix: firstArgByRef[3] ?? '',
    };
  }

  const secondArgByKey = /dataHub\.getComponentProp\(\s*(['"])([^'"]*)\1\s*,\s*(['"])([^'"]*)$/i.exec(linePrefix);
  if (secondArgByKey) {
    return {
      kind: 'component-prop-by-key',
      componentKey: secondArgByKey[2] ?? '',
      prefix: secondArgByKey[4] ?? '',
    };
  }

  const secondArgByRef = /dataHub\.getComponentPropByRef\(\s*(['"])([^'"]*)\1\s*,\s*(['"])([^'"]*)$/i.exec(linePrefix);
  if (secondArgByRef) {
    return {
      kind: 'component-prop-by-ref',
      componentRef: secondArgByRef[2] ?? '',
      prefix: secondArgByRef[4] ?? '',
    };
  }

  return null;
};

const buildCodeCompletionSource = (
  completions: Completion[],
  dynamicCompletionContext?: CodeEditorDynamicCompletionContext,
) => {
  return (context: CompletionContext): CompletionResult | null => {
    const position = context.pos;
    const line = context.state.doc.lineAt(position);
    const linePrefix = line.text.slice(0, position - line.from);
    const stringMode = resolveStringCompletionMode(linePrefix);
    if (stringMode) {
      let options: Completion[] = [];
      if (stringMode.kind === 'component-key') {
        options = buildComponentKeyCompletions(dynamicCompletionContext);
      } else if (stringMode.kind === 'component-ref') {
        options = buildComponentRefCompletions(dynamicCompletionContext);
      } else if (stringMode.kind === 'component-prop-by-key') {
        options = buildComponentPropCompletionsByKey(stringMode.componentKey, dynamicCompletionContext);
      } else if (stringMode.kind === 'component-prop-by-ref') {
        options = buildComponentPropCompletionsByRef(stringMode.componentRef, dynamicCompletionContext);
      }

      const normalizedPrefix = toLower(stringMode.prefix);
      const filtered = options.filter((item) => toLower(item.label).startsWith(normalizedPrefix));
      return {
        from: position - stringMode.prefix.length,
        options: filtered,
        validFor: /^[^'"\\]*$/,
      };
    }

    const token = context.matchBefore(/[A-Za-z_$][\w$.]*/);
    if (!token) {
      if (!context.explicit) {
        return null;
      }
      return {
        from: position,
        options: completions,
      };
    }

    if (!context.explicit && token.from === token.to) {
      return null;
    }

    const prefix = token.text;
    const normalizedPrefix = toLower(prefix);
    const filtered = completions.filter((item) => {
      const label = toLower(item.label);
      return label.startsWith(normalizedPrefix);
    });
    return {
      from: token.from,
      options: filtered,
      validFor: /^[\w$.]*$/,
    };
  };
};

export const buildCodeMirrorExtensions = ({
  language = 'javascript',
  extraCompletions = [],
  extraExtensions = [],
  completionMode = 'append',
  dynamicCompletionContext,
}: BuildCodeMirrorExtensionsOptions): Extension[] => {
  const lang = normalizeLanguage(language);
  const extensions: Extension[] = [];

  if (lang === 'typescript') {
    const completions = buildJsCompletions(extraCompletions, completionMode);
    const completionSource = buildCodeCompletionSource(completions, dynamicCompletionContext);
    const jsCompletion = javascriptLanguage.data.of({
      autocomplete: completionSource,
    });
    extensions.push(javascript({ typescript: true }), jsCompletion, autocompletion({ activateOnTyping: true }));
  } else if (lang === 'json') {
    extensions.push(json(), autocompletion({ activateOnTyping: true }));
  } else if (lang === 'css') {
    extensions.push(css(), autocompletion({ activateOnTyping: true }));
  } else {
    const completions = buildJsCompletions(extraCompletions, completionMode);
    const completionSource = buildCodeCompletionSource(completions, dynamicCompletionContext);
    const jsCompletion = javascriptLanguage.data.of({
      autocomplete: completionSource,
    });
    extensions.push(javascript(), jsCompletion, autocompletion({ activateOnTyping: true }));
  }

  if (extraExtensions.length > 0) {
    extensions.push(...extraExtensions);
  }

  return extensions;
};

