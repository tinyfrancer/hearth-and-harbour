export const TABS = [
  { id: 'skills', label: 'Skills' },
  { id: 'bank', label: 'Bank' },
  { id: 'character', label: 'Character' },
  { id: 'town', label: 'Town' },
  { id: 'menu', label: 'Menu' },
] as const;

export type TabId = (typeof TABS)[number]['id'];
