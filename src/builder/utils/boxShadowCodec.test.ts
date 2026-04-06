import { describe, expect, it } from 'vitest';
import {
  parseBoxShadow,
  serializeBoxShadow,
  splitTopLevelBoxShadowLayers,
  type BoxShadowLayer,
} from './boxShadowCodec';

describe('splitTopLevelBoxShadowLayers', () => {
  it('does not split commas inside parens', () => {
    const s = '0 4px 8px rgba(0, 0, 0, 0.2), 0 2px 4px #000';
    expect(splitTopLevelBoxShadowLayers(s)).toHaveLength(2);
  });
});

describe('parseBoxShadow', () => {
  it('treats empty and none as none', () => {
    expect(parseBoxShadow('')).toEqual({ kind: 'none' });
    expect(parseBoxShadow('   ')).toEqual({ kind: 'none' });
    expect(parseBoxShadow('none')).toEqual({ kind: 'none' });
    expect(parseBoxShadow('NONE')).toEqual({ kind: 'none' });
  });

  it('parses typical single layer', () => {
    const r = parseBoxShadow('2px 4px 6px rgba(0,0,0,0.5)');
    expect(r.kind).toBe('single');
    if (r.kind === 'single') {
      expect(r.layer.offsetX).toBe('2px');
      expect(r.layer.offsetY).toBe('4px');
      expect(r.layer.blur).toBe('6px');
      expect(r.layer.spread).toBe('0');
      expect(r.layer.color).toBe('rgba(0,0,0,0.5)');
      expect(r.layer.inset).toBe(false);
    }
  });

  it('parses inset and spread', () => {
    const r = parseBoxShadow('inset 0 1px 3px 2px #112233');
    expect(r.kind).toBe('single');
    if (r.kind === 'single') {
      expect(r.layer.inset).toBe(true);
      expect(r.layer.offsetX).toBe('0');
      expect(r.layer.offsetY).toBe('1px');
      expect(r.layer.blur).toBe('3px');
      expect(r.layer.spread).toBe('2px');
      expect(r.layer.color).toBe('#112233');
    }
  });

  it('parses var() color', () => {
    const r = parseBoxShadow('0 4px 8px var(--td-shadow-1)');
    expect(r.kind).toBe('single');
    if (r.kind === 'single') {
      expect(r.layer.color).toBe('var(--td-shadow-1)');
    }
  });

  it('parses color-first single layer (computed style style)', () => {
    const r = parseBoxShadow('rgba(0, 0, 0, 0.15) 0px 4px 8px 0px');
    expect(r.kind).toBe('single');
    if (r.kind === 'single') {
      expect(r.layer.color).toBe('rgba(0, 0, 0, 0.15)');
      expect(r.layer.offsetX).toBe('0px');
      expect(r.layer.offsetY).toBe('4px');
      expect(r.layer.blur).toBe('8px');
      expect(r.layer.spread).toBe('0px');
    }
  });

  it('returns unparsed for two layers', () => {
    const raw = '1px 1px red, 2px 2px blue';
    expect(parseBoxShadow(raw)).toEqual({ kind: 'unparsed', raw });
  });

  it('serialize roundtrips single layer', () => {
    const layer: BoxShadowLayer = {
      offsetX: '0',
      offsetY: '4px',
      blur: '8px',
      spread: '0',
      color: 'rgba(0, 0, 0, 0.15)',
      inset: false,
    };
    const s = serializeBoxShadow(layer);
    const r = parseBoxShadow(s);
    expect(r.kind).toBe('single');
    if (r.kind === 'single') {
      expect(r.layer).toEqual(layer);
    }
  });

  it('serialize roundtrips inset layer', () => {
    const layer: BoxShadowLayer = {
      offsetX: '0',
      offsetY: '2px',
      blur: '4px',
      spread: '1px',
      color: 'var(--shadow)',
      inset: true,
    };
    const r = parseBoxShadow(serializeBoxShadow(layer));
    expect(r.kind).toBe('single');
    if (r.kind === 'single') {
      expect(r.layer).toEqual(layer);
    }
  });
});
