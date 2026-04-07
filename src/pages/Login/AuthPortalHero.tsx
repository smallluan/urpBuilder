import React, { useEffect, useMemo, useState } from 'react';
import AuthHeroScene3D from './AuthHeroScene3D';

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

const AuthPortalHero: React.FC<AuthPortalHeroProps> = ({ eyebrow, stories }) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
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

    setPhase('enter');
    const enterToHoldTimer = window.setTimeout(() => {
      setPhase('hold');
    }, 300);
    const holdToExitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, 3800);
    const switchTimer = window.setTimeout(() => {
      setActiveStoryIndex((prev) => (prev + 1) % stories.length);
    }, 4000);

    return () => {
      window.clearTimeout(enterToHoldTimer);
      window.clearTimeout(holdToExitTimer);
      window.clearTimeout(switchTimer);
    };
  }, [activeStoryIndex, stories.length]);

  return (
    <div className="login-page__hero" aria-hidden>
      <AuthHeroScene3D className="login-page__hero-canvas" />
      <div className="login-page__mesh" />
      <div className="login-page__noise" />
      {activeStory ? (
        <div className="login-page__story-lane">
          <article
            className={`login-page__story login-page__story--${stories.length > 1 ? phase : 'hold'}`}
            key={`${activeStory.title}-${activeStoryIndex}`}
          >
            <div className="login-page__story-topline">
              <div className="login-page__story-eyebrow">{eyebrow}</div>
              <div className="login-page__story-badge">{activeStory.badge}</div>
            </div>
            <div className="login-page__story-title">{activeStory.title}</div>
            <div className="login-page__story-desc">{activeStory.desc}</div>
            <div className="login-page__story-media">
              <div className="login-page__story-media-core" />
              <div className="login-page__story-media-dot" />
            </div>
            <div className="login-page__story-meta">
              <span>{activeStory.metaA}</span>
              <span>{activeStory.metaB}</span>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
};

export default AuthPortalHero;
