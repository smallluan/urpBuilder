import type { ComponentRegistry } from '../componentContext';
import { registerBasicComponents } from './basicComponents';
import { registerLayoutComponents } from './layoutComponents';
import { registerFormComponents } from './formComponents';
import { registerFeedbackComponents } from './feedbackComponents';
import { registerDisplayComponents } from './displayComponents';
import { registerDataComponents } from './dataComponents';
import { registerAntdComponents } from './antdComponents';

function buildRegistry(): ComponentRegistry {
  const registry: ComponentRegistry = new Map();
  registerBasicComponents(registry);
  registerLayoutComponents(registry);
  registerFormComponents(registry);
  registerFeedbackComponents(registry);
  registerDisplayComponents(registry);
  registerDataComponents(registry);
  registerAntdComponents(registry);
  return registry;
}

/** 全局单例注册表，模块加载时构建一次 */
export const registry = buildRegistry();
