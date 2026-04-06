import { autocompletion, completeFromList, type Completion } from '@codemirror/autocomplete';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import type { Extension } from '@codemirror/state';
import { CODE_EDITOR_JS_GLOBAL_COMPLETIONS } from '../../../constants/codeEditor';

export interface BuildCodeMirrorExtensionsOptions {
  language?: string;
  extraCompletions?: Completion[];
  extraExtensions?: Extension[];
  completionMode?: 'append' | 'replace';
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

export const buildCodeMirrorExtensions = ({
  language = 'javascript',
  extraCompletions = [],
  extraExtensions = [],
  completionMode = 'append',
}: BuildCodeMirrorExtensionsOptions): Extension[] => {
  const lang = normalizeLanguage(language);
  const extensions: Extension[] = [];

  if (lang === 'typescript') {
    const completions = buildJsCompletions(extraCompletions, completionMode);
    const jsCompletion = javascriptLanguage.data.of({
      autocomplete: completeFromList(completions),
    });
    extensions.push(javascript({ typescript: true }), jsCompletion, autocompletion({ activateOnTyping: true }));
  } else if (lang === 'json') {
    extensions.push(json(), autocompletion({ activateOnTyping: true }));
  } else if (lang === 'css') {
    extensions.push(css(), autocompletion({ activateOnTyping: true }));
  } else {
    const completions = buildJsCompletions(extraCompletions, completionMode);
    const jsCompletion = javascriptLanguage.data.of({
      autocomplete: completeFromList(completions),
    });
    extensions.push(javascript(), jsCompletion, autocompletion({ activateOnTyping: true }));
  }

  if (extraExtensions.length > 0) {
    extensions.push(...extraExtensions);
  }

  return extensions;
};

