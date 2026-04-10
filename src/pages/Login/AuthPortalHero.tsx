import React, { useEffect, useMemo, useState } from 'react';
import AuthHeroScene3D from './AuthHeroScene3D';
import {
  GRAIN_DURATION_IN_MS,
  GRAIN_DURATION_OUT_MS,
  GRAIN_STAGGER_IN_MS,
  GRAIN_STAGGER_OUT_MS,
  sandJitter,
  sandTimelineForStory,
} from './authHeroSand';

type HeroStory = {
  title: string;
  desc: string;
  badge: string;
  metaA: string;
  metaB: string;
};

type AuthPortalHeroProps = {
  eyebrow: string;
  stories: HeroStory[];
};

type StoryPhase = 'enter' | 'hold' | 'exit';

function SandGrains({
  text,
  driftXvw,
  className,
  as: Tag = 'div',
}: {
  text: string;
  driftXvw: number;
  className?: string;
  as?: 'div' | 'span';
}) {
  const chars = useMemo(() => Array.from(text), [text]);
  const total = chars.length;

  if (total === 0) {
    return null;
  }

  return (
    <Tag className={className} style={{ '--sand-drift-x': driftXvw } as React.CSSProperties}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="login-page__story-grain-char"
          style={
            {
              '--sand-i': i,
              '--sand-total': total,
              '--sand-j': sandJitter(i),
            } as React.CSSProperties
          }
        >
          {ch}
        </span>
      ))}
    </Tag>
  );
}

const AuthPortalHero: React.FC<AuthPortalHeroProps> = ({ eyebrow, stories }) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [phase, setPhase] = useState<StoryPhase>('enter');
  const activeStory = useMemo(() => {
    if (!stories.length) {
      return null;
    }
    return stories[activeStoryIndex % stories.length];
  }, [activeStoryIndex, stories]);

  useEffect(() => {
    if (stories.length <= 1) {
      setPhase('hold');
      return;
    }

    const story = stories[activeStoryIndex % stories.length];

    const { enterMs, holdMs, exitMs } = sandTimelineForStory({
      title: story.title.length,
      desc: story.desc.length,
      metaA: story.metaA.length,
      metaB: story.metaB.length,
    });

    setPhase('enter');
    const enterToHoldTimer = window.setTimeout(() => {
      setPhase('hold');
    }, enterMs);
    const holdToExitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, enterMs + holdMs);
    const switchTimer = window.setTimeout(() => {
      setActiveStoryIndex((prev) => (prev + 1) % stories.length);
    }, enterMs + holdMs + exitMs);

    return () => {
      window.clearTimeout(enterToHoldTimer);
      window.clearTimeout(holdToExitTimer);
      window.clearTimeout(switchTimer);
    };
  }, [activeStoryIndex, stories]);

  const grainPhase: StoryPhase = stories.length > 1 ? phase : 'hold';

  const articleStyle = useMemo(
    () =>
      ({
        '--grain-dur-in': `${GRAIN_DURATION_IN_MS}ms`,
        '--grain-dur-out': `${GRAIN_DURATION_OUT_MS}ms`,
        '--grain-stagger-in': `${GRAIN_STAGGER_IN_MS}ms`,
        '--grain-stagger-out': `${GRAIN_STAGGER_OUT_MS}ms`,
      }) as React.CSSProperties,
    []
  );

  return (
    <div className="login-page__hero" aria-hidden>
      <AuthHeroScene3D className="login-page__hero-canvas" />
      <div className="login-page__mesh" />
      <div className="login-page__noise" />
      {activeStory ? (
        <div className="login-page__story-lane">
          <article
            className={`login-page__story login-page__story--${stories.length > 1 ? grainPhase : 'hold'}`}
            key={`${activeStoryIndex}`}
            style={articleStyle}
          >
            <div className="login-page__story-topline">
              <div className="login-page__story-eyebrow">{eyebrow}</div>
              <div className="login-page__story-badge">{activeStory.badge}</div>
            </div>
            <SandGrains text={activeStory.title} driftXvw={36} className="login-page__story-title" />
            <SandGrains text={activeStory.desc} driftXvw={30} className="login-page__story-desc" />
            <div className="login-page__story-media">
              <div className="login-page__story-media-core" />
              <div className="login-page__story-media-dot" />
            </div>
            <div className="login-page__story-meta">
              <span className="login-page__story-meta-chip">
                <SandGrains text={activeStory.metaA} driftXvw={22} as="span" />
              </span>
              <span className="login-page__story-meta-chip">
                <SandGrains text={activeStory.metaB} driftXvw={22} as="span" />
              </span>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
};

export default AuthPortalHero;
