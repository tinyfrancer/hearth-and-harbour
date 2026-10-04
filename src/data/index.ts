import type { Content } from '../core/content';
import { ACTIONS } from './actions';
import { ITEMS } from './items';
import { SKILLS } from './skills';

/** Every table the rules read, in one piece. */
export const CONTENT: Content = { skills: SKILLS, items: ITEMS, actions: ACTIONS };
