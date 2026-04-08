/**
 * 流程「代码节点」源码：JSDoc + async function codeNode(dataHub, ctx) { ... }，
 * 运行时提取函数体后包进 async IIFE。
 */

/** 固定函数名（无后缀） */
export const FLOW_CODE_NODE_FN_NAME = 'codeNode';

const LOOSE_FN_HEAD_RE =
  /^(async\s+)?function\s+[\w$]+\s*\(\s*dataHub\s*,\s*ctx\s*\)\s*\{/;

/** 是否为「完整函数外壳」源码（可选顶部 JSDoc；函数名任意以兼容旧数据） */
export const isFlowCodeNodeWrappedSource = (source: string): boolean => {
  const trimmed = String(source ?? '').trim();
  const rest = stripLeadingJsDoc(trimmed).trimStart();
  return LOOSE_FN_HEAD_RE.test(rest);
};

/** 提取源码最顶部块注释的正文（slash-star 风格），无则 null；会去掉每行前缀星号。 */
export const extractLeadingJsDocInnerText = (source: string): string | null => {
  const m = String(source ?? '').match(/^\s*\/\*\*([\s\S]*?)\*\/\s*/);
  if (!m) {
    return null;
  }
  return m[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').trimEnd())
    .join('\n')
    .trim();
};

/** 去掉最顶部 JSDoc（若有），其余不变 */
export const stripLeadingJsDoc = (source: string): string => {
  return String(source ?? '').replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '');
};

/** 将备注格式化为顶部 JSDoc；note 为空则仅去掉已有顶部块、不添加 */
export const formatLeadingJsDocBlock = (note: string): string => {
  const raw = String(note ?? '').replace(/\r\n/g, '\n').trimEnd();
  if (!raw.trim()) {
    return '';
  }
  const lines = raw.split('\n');
  const body = lines.map((line) => ` * ${line}`).join('\n');
  return `/**\n${body}\n */\n`;
};

/** 用备注替换或插入顶部块注释；note 为空则删除顶部块。 */
export const setLeadingBlockComment = (code: string, note: string): string => {
  const rest = stripLeadingJsDoc(code);
  const block = formatLeadingJsDocBlock(note);
  return block + rest;
};

function tryExtractFlowCodeNodeParts(source: string): { innerBody: string } | null {
  const trimmed = source.trim();
  let rest = trimmed;
  if (extractLeadingJsDocInnerText(rest) !== null) {
    rest = stripLeadingJsDoc(rest).trimStart();
  }
  const m = rest.match(LOOSE_FN_HEAD_RE);
  if (!m || m.index !== 0) {
    return null;
  }
  const startBrace = m[0].length - 1;
  let depth = 0;
  for (let i = startBrace; i < rest.length; i += 1) {
    const c = rest[i];
    if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return { innerBody: rest.slice(startBrace + 1, i) };
      }
    }
  }
  return null;
}

/** 规范外壳：JSDoc + async function codeNode(dataHub, ctx) { innerBody } */
export function buildStrictFlowCodeSource(note: string, innerBody: string): string {
  const doc = formatLeadingJsDocBlock(String(note ?? ''));
  const body = innerBody.replace(/\r\n/g, '\n');
  return `${doc}async function ${FLOW_CODE_NODE_FN_NAME}(dataHub, ctx) {\n${body}\n}`;
}

export type NormalizeFlowCodeNodeResult = {
  code: string;
  repaired: boolean;
  fatal: boolean;
  fatalReason?: string;
};

/**
 * 应用前规范化：统一为 async function codeNode(dataHub, ctx)；
 * 若外壳损坏且无法解析则 fatal；若为历史仅函数体或旧函数名则 repaired。
 */
export function normalizeFlowCodeNodeSource(
  raw: string,
  fallbackNote: string,
): NormalizeFlowCodeNodeResult {
  const trimmed = raw.trim();
  const noteFromDoc = extractLeadingJsDocInnerText(trimmed);
  const note = noteFromDoc !== null ? noteFromDoc : String(fallbackNote ?? '');

  const parts = tryExtractFlowCodeNodeParts(trimmed);
  if (parts) {
    const rebuilt = buildStrictFlowCodeSource(note, parts.innerBody);
    const repaired = rebuilt.trim() !== trimmed;
    return { code: rebuilt, repaired, fatal: false };
  }

  const afterDoc = stripLeadingJsDoc(trimmed).trimStart();
  const hasFunctionKeyword = /^\s*(async\s+)?function\s+/m.test(afterDoc);
  const hasOurSignature = /^\s*(async\s+)?function\s+[\w$]+\s*\(\s*dataHub\s*,\s*ctx\s*\)\s*\{/.test(
    afterDoc,
  );

  if (hasFunctionKeyword && !hasOurSignature) {
    return {
      code: raw,
      repaired: false,
      fatal: true,
      fatalReason:
        '代码外壳损坏：需要 async function codeNode(dataHub, ctx) 形式，且参数名必须为 dataHub、ctx。',
    };
  }

  if (hasFunctionKeyword && hasOurSignature) {
    return {
      code: raw,
      repaired: false,
      fatal: true,
      fatalReason: '代码外壳损坏：函数体括号不匹配或结构不完整，请检查大括号配对。',
    };
  }

  const rebuilt = buildStrictFlowCodeSource(note, afterDoc);
  return { code: rebuilt, repaired: true, fatal: false };
}

/**
 * 从节点持久化字段推导草稿：优先采用源码顶部 JSDoc 作为备注；
 * 若为完整外壳且无 JSDoc，则用节点 note 写入源码顶部。
 */
export const deriveCodeNodeDraftFields = (
  rawCode: string,
  noteFromData: string,
): { note: string; code: string } => {
  const codeStr = String(rawCode ?? '');
  const extracted = extractLeadingJsDocInnerText(codeStr);
  if (extracted !== null) {
    return { note: extracted, code: codeStr };
  }
  if (isFlowCodeNodeWrappedSource(codeStr)) {
    return {
      note: noteFromData,
      code: setLeadingBlockComment(codeStr, noteFromData),
    };
  }
  return { note: noteFromData, code: codeStr };
};

/** 新建节点或空代码时写入编辑器的默认整段源码 */
export const buildFlowCodeNodeSourceTemplate = (note?: string): string => {
  let doc: string;
  if (note === undefined) {
    doc = formatLeadingJsDocBlock('注释信息');
  } else if (String(note).trim()) {
    doc = formatLeadingJsDocBlock(String(note));
  } else {
    doc = '';
  }
  return `${doc}async function ${FLOW_CODE_NODE_FN_NAME}(dataHub, ctx) {\n  \n}`;
};

/**
 * 从完整函数源码中取出函数体；若不符合标准外壳则视为历史「仅函数体」数据，原样返回。
 * 标准外壳：可选顶部 JSDoc + (async)? function 名(dataHub, ctx) { ... }（函数名任意以兼容旧保存）
 */
export const extractExecutableBodyFromFlowCodeNodeSource = (source: string): string => {
  const trimmed = source.trim();
  const re =
    /^\s*(?:\/\*\*[\s\S]*?\*\/\s*)?(async\s+)?function\s+[\w$]+\s*\(\s*dataHub\s*,\s*ctx\s*\)\s*\{/;
  const m = trimmed.match(re);
  if (!m || m.index !== 0) {
    return trimmed;
  }
  const startBrace = m[0].length - 1;
  let depth = 0;
  for (let i = startBrace; i < trimmed.length; i += 1) {
    const c = trimmed[i];
    if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(startBrace + 1, i);
      }
    }
  }
  return trimmed;
};

/** 应用/保存前：备注以顶部 JSDoc 为准，无则退回草稿里的 note */
export const resolveCodeNodeNoteForPersist = (code: string, fallbackNote: string): string => {
  const extracted = extractLeadingJsDocInnerText(code);
  if (extracted !== null) {
    return extracted;
  }
  return String(fallbackNote ?? '');
};

export const FLOW_CODE_NODE_SHELL_REPAIRED_MESSAGE =
  '检测到代码外壳与规范不一致，已自动恢复为 async function codeNode(dataHub, ctx)。请确认函数体与注释内容无误。';
