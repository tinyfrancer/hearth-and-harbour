import type { Content } from '../core/content';
import { ACHIEVEMENTS } from './achievements';
import { ACTIONS } from './actions';
import { DUNGEONS } from './dungeons';
import { ITEMS } from './items';
import { AREAS, MONSTERS } from './monsters';
import { SHOP } from './shop';
import { SKILLS } from './skills';
import { STORE } from './store';

/** Every table the rules read, in one piece. */
export const CONTENT: Content = {
  skills: SKILLS,
  items: ITEMS,
  actions: ACTIONS,
  areas: AREAS,
  monsters: MONSTERS,
  shop: SHOP,
  store: STORE,
  dungeons: DUNGEONS,
  achievements: ACHIEVEMENTS,
};
