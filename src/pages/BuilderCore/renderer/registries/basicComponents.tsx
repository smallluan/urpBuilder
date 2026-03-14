import { Button, Link, BackTop, Progress } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';
import { renderNamedIcon } from '../../../../constants/iconRegistry';

export function registerBasicComponents(registry: ComponentRegistry): void {
  registry.set('Button', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const isBlockButton = getBooleanProp('block') === true;
    const prefixIcon = renderNamedIcon(getStringProp('prefixIconName'));
    const suffixIcon = renderNamedIcon(getStringProp('suffixIconName'));
    return (
      <ActivateWrapper
        style={mergeStyle(isBlockButton ? { width: '100%' } : undefined)}
        onActivate={handleActivateSelf}
        nodeKey={data?.key}
        active={isNodeActive}
      >
        <Button
          theme={getStringProp('theme') as any}
          shape={getStringProp('shape') as any}
          size={getStringProp('size') as any}
          variant={getStringProp('variant') as any}
          icon={prefixIcon as any}
          suffix={suffixIcon as any}
          block={isBlockButton}
          style={mergeStyle(isBlockButton ? { width: '100%', display: 'flex' } : undefined)}
        >
          {getStringProp('content')}
        </Button>
      </ActivateWrapper>
    );
  });

  registry.set('Link', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const prefixIcon = renderNamedIcon(getStringProp('prefixIconName'));
    const suffixIcon = renderNamedIcon(getStringProp('suffixIconName'));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Link
          content={getStringProp('content')}
          href={getStringProp('href') || undefined}
          target={getStringProp('target') || undefined}
          theme={getStringProp('theme') as any}
          size={getStringProp('size') as any}
          hover={getStringProp('hover') as any}
          prefixIcon={prefixIcon as any}
          suffixIcon={suffixIcon as any}
          underline={getBooleanProp('underline')}
          disabled={getBooleanProp('disabled')}
          onClick={(event) => { event.preventDefault(); }}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Icon', (ctx) => {
    const { getStringProp, getNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const iconNode = renderNamedIcon(getStringProp('iconName'), {
      size: getNumberProp('size') ?? 16,
      strokeWidth: getNumberProp('strokeWidth') ?? 2,
    });
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        {iconNode}
      </ActivateWrapper>
    );
  });

  registry.set('BackTop', (ctx) => {
    const {
      getStringProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getBackTopOffsetProp, getBackTopContainerProp, getBackTopTargetProp,
      getBackTopVisibleHeightProp, getBackTopContentNode,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <BackTop
          className="builder-back-top"
          content={getBackTopContentNode()}
          duration={getFiniteNumberProp('duration')}
          offset={getBackTopOffsetProp('offset') as any}
          shape={getStringProp('shape') as any}
          size={getStringProp('size') as any}
          target={getBackTopTargetProp('target') as any}
          container={getBackTopContainerProp() as any}
          theme={getStringProp('theme') as any}
          visibleHeight={getBackTopVisibleHeightProp('visibleHeight') as any}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Progress', (ctx) => {
    const {
      getStringProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getProgressColorProp, getProgressLabelProp, getProgressSizeProp, getProgressStatusProp,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Progress
          className={getStringProp('className') || undefined}
          color={getProgressColorProp('color') as any}
          label={getProgressLabelProp() as any}
          percentage={getFiniteNumberProp('percentage') ?? 0}
          size={getProgressSizeProp('size') as any}
          status={getProgressStatusProp() as any}
          strokeWidth={getProgressSizeProp('strokeWidth') as any}
          theme={getStringProp('theme') as any}
          trackColor={getStringProp('trackColor') || undefined}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });
}
