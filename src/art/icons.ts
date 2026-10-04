/**
 * Pictures for things the game names by id. This is the art lane's door into
 * the menus: the UI asks for an icon wherever one would go and shows it if
 * there is one, so drawing an icon is a change here and nowhere else.
 *
 * Ids are plain strings on purpose. Art knows nothing about the game's
 * tables; an id with no picture is simply null.
 */
export function itemIcon(_itemId: string): Element | null {
  return null;
}

export function skillIcon(_skillId: string): Element | null {
  return null;
}
