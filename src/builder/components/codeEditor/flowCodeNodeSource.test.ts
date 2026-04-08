import { describe, expect, it } from 'vitest';
import {
  buildFlowCodeNodeSourceTemplate,
  extractExecutableBodyFromFlowCodeNodeSource,
  extractLeadingJsDocInnerText,
  FLOW_CODE_NODE_FN_NAME,
  normalizeFlowCodeNodeSource,
} from './flowCodeNodeSource';

describe('extractLeadingJsDocInnerText', () => {
  it('extracts multiline jsdoc text', () => {
    const src = `/**\n * hello\n * world\n */\nasync function f() {}`;
    expect(extractLeadingJsDocInnerText(src)).toBe('hello\nworld');
  });

  it('returns null when no jsdoc', () => {
    expect(extractLeadingJsDocInnerText('async function f() {}')).toBe(null);
  });
});

describe('extractExecutableBodyFromFlowCodeNodeSource', () => {
  it('extracts body after jsdoc and fixed fn name', () => {
    const src = `/**\n * n\n */\nasync function ${FLOW_CODE_NODE_FN_NAME}(dataHub, ctx) {\n  return { a: 1 };\n}`;
    expect(extractExecutableBodyFromFlowCodeNodeSource(src).trim()).toBe('return { a: 1 };');
  });

  it('handles nested braces in body', () => {
    const src = `async function ${FLOW_CODE_NODE_FN_NAME}(dataHub, ctx) {\n  return { x: { y: 1 } };\n}`;
    expect(extractExecutableBodyFromFlowCodeNodeSource(src).trim()).toBe('return { x: { y: 1 } };');
  });

  it('legacy body-only passes through', () => {
    const legacy = 'return { visible: true };';
    expect(extractExecutableBodyFromFlowCodeNodeSource(legacy)).toBe('return { visible: true };');
  });
});

describe('buildFlowCodeNodeSourceTemplate', () => {
  it('uses fixed function name', () => {
    const t = buildFlowCodeNodeSourceTemplate('hi');
    expect(t).toContain(`function ${FLOW_CODE_NODE_FN_NAME}(dataHub, ctx)`);
    expect(extractLeadingJsDocInnerText(t)).toBe('hi');
  });

  it('default uses 注释信息', () => {
    const t = buildFlowCodeNodeSourceTemplate();
    expect(extractLeadingJsDocInnerText(t)).toBe('注释信息');
  });
});

describe('normalizeFlowCodeNodeSource', () => {
  it('repairs old function identifier to codeNode', () => {
    const raw = `async function urpCodeNode(dataHub, ctx) {\n  return 1;\n}`;
    const n = normalizeFlowCodeNodeSource(raw, '');
    expect(n.fatal).toBe(false);
    expect(n.repaired).toBe(true);
    expect(n.code).toContain(`function ${FLOW_CODE_NODE_FN_NAME}(dataHub, ctx)`);
  });

  it('fatal when wrong params', () => {
    const raw = 'async function codeNode(a, b) {\n}';
    const n = normalizeFlowCodeNodeSource(raw, '');
    expect(n.fatal).toBe(true);
  });
});
