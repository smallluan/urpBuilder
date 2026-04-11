import { Image, Avatar, Swiper, Divider, Typography, Statistic, MessagePlugin } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';
import { getMediaAssetUrlFromDrop } from '../../../utils/mediaAssetDrag';

export function registerDisplayComponents(registry: ComponentRegistry): void {
  registry.set('Statistic', (ctx) => {
    const { getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const trend = getStringProp('trend');

    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Statistic
          title={getStringProp('title')}
          value={getFiniteNumberProp('value') ?? 0}
          unit={getStringProp('unit') || undefined}
          decimalPlaces={getFiniteNumberProp('decimalPlaces')}
          separator={getStringProp('separator') || ','}
          color={getStringProp('color') as any}
          trend={trend === 'increase' || trend === 'decrease' ? trend : undefined}
          trendPlacement={getStringProp('trendPlacement') as any}
          loading={getBooleanProp('loading')}
          animationStart={getBooleanProp('animationStart')}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Image', (ctx) => {
    const {
      getStringProp,
      getBooleanProp,
      mergeStyle,
      handleActivateSelf,
      data,
      isNodeActive,
      setActiveNode,
      updateActiveNodeProp,
    } = ctx;
    const imageDropHandlers: Pick<React.HTMLAttributes<HTMLDivElement>, 'onDragOver' | 'onDrop'> = {
      onDragOver: (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      },
      onDrop: (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = getMediaAssetUrlFromDrop(e);
        if (!url || !data?.key) {
          return;
        }
        setActiveNode(data.key);
        updateActiveNodeProp('src', url);
        MessagePlugin.success('已应用素材地址');
      },
    };

    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Image
          src={getStringProp('src')}
          alt={getStringProp('alt')}
          fit={getStringProp('fit') as any}
          shape={getStringProp('shape') as any}
          gallery={getBooleanProp('gallery')}
          {...(imageDropHandlers as Record<string, unknown>)}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Avatar', (ctx) => {
    const {
      getStringProp,
      getBooleanProp,
      mergeStyle,
      handleActivateSelf,
      data,
      isNodeActive,
      setActiveNode,
      updateActiveNodeProp,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <div
          style={{ display: 'inline-block', maxWidth: '100%', verticalAlign: 'top' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = getMediaAssetUrlFromDrop(e);
            if (!url || !data?.key) {
              return;
            }
            setActiveNode(data.key);
            updateActiveNodeProp('image', url);
            MessagePlugin.success('已应用素材地址');
          }}
        >
          <Avatar
            image={getStringProp('image')}
            alt={getStringProp('alt')}
            content={getStringProp('content')}
            shape={getStringProp('shape') as any}
            size={getStringProp('size')}
            hideOnLoadFailed={getBooleanProp('hideOnLoadFailed')}
            style={mergeStyle()}
          />
        </div>
      </ActivateWrapper>
    );
  });

  registry.set('Swiper', (ctx) => {
    const { getNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive, getSwiperImages } = ctx;
    const imageList = getSwiperImages();
    const height = getNumberProp('height') ?? 240;
    if (imageList.length === 0) return null;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Swiper autoplay height={height} style={{ width: '100%' }}>
          {imageList.map((imageItem, index) => (
            <Swiper.SwiperItem key={`${data?.key ?? 'swiper'}-${index}`}>
              <div style={{ width: '100%', height: '100%' }}>
                <Image
                  src={imageItem.src}
                  fallback={imageItem.fallback || undefined}
                  lazy={imageItem.lazy}
                  fit={imageItem.objectFit as any}
                  style={{ width: '100%', height: '100%', objectPosition: imageItem.objectPosition }}
                />
              </div>
            </Swiper.SwiperItem>
          ))}
        </Swiper>
      </ActivateWrapper>
    );
  });

  registry.set('Divider', (ctx) => {
    const { getStringProp, getBooleanProp, getNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Divider
          align={getStringProp('align') as any}
          dashed={getBooleanProp('dashed')}
          size={getNumberProp('size')}
          content={getStringProp('content')}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Typography.Title', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Typography.Title level={getStringProp('level') as any} style={mergeStyle()}>
          {getStringProp('content')}
        </Typography.Title>
      </ActivateWrapper>
    );
  });

  registry.set('Typography.Paragraph', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Typography.Paragraph style={mergeStyle()}>
          {getStringProp('content')}
        </Typography.Paragraph>
      </ActivateWrapper>
    );
  });

  registry.set('Typography.Text', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Typography.Text
          theme={getStringProp('theme') as any}
          strong={getBooleanProp('strong')}
          underline={getBooleanProp('underline')}
          delete={getBooleanProp('delete')}
          code={getBooleanProp('code')}
          mark={getBooleanProp('mark')}
          style={mergeStyle()}
        >
          {getStringProp('content')}
        </Typography.Text>
      </ActivateWrapper>
    );
  });
}
