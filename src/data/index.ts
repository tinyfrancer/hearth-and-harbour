import type { Content } from '../core/content';
import { ACTIONS } from './actions';
import { ITEMS } from './items';
import { AREAS, MONSTERS } from './monsters';
import { SHOP } from './shop';
import { SKILLS } from './skills';

/** Every table the rules read, in one piece. */
export const CONTENT: Content = {
  skills: SKILLS,
  items: ITEMS,
  actions: ACTIONS,
  areas: AREAS,
  monsters: MONSTERS,
  shop: SHOP,
};
