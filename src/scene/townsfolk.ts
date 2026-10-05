/*
 * The people of Gullwick who stand about in town, and what they say. They do
 * not walk. Each says the next of their lines on each visit, in order and
 * then round again, with a line or two of their own after dark.
 */
import type { Use } from './things';

export const SMITH: Use = {
  name: 'Odo Flint, smith',
  lines: [],
  says: [
    'Iron wants to be a sword. Most of it. Some of it wants to be a hinge, and there’s no arguing with that.',
    'Bring me bars, not excuses. Excuses won’t take a temper.',
    'Keep your elbows in when you swing. I’ve seen what happens to the other sort.',
    'That captain on the pier asked for a cannon. I told him I do hinges, horseshoes and hope.',
    'Forge has been lit since my grandmother’s day. She’d want me to mention it was her that lit it.',
  ],
  duskSays: [
    'Fire’s at its best after dark. So am I, though nobody’s ever stayed up to check.',
    'Mind the sparks. They don’t mind you.',
  ],
  button: { label: 'Go to Smithing', opens: { skill: 'smithing' } },
  portrait: 'smith',
};

export const TRADER: Use = {
  name: 'Mags Fenwick, trader',
  lines: [],
  says: [
    'Fish, apples, cheese and bottles. If you need anything else, you need it less than you think.',
    'I’ll mind your things for you. I mind everyone’s. It’s most of what I do.',
    'The apples are local. The cheese is local. The bottles have been further than you have.',
    'Nobody off that ship has bought a thing. Pirates browse.',
    'There’s to be a proper shop, I’m told. Walls, a roof, the lot. I’ll believe it when I’m indoors.',
  ],
  duskSays: ['Packing up. Whatever’s left tonight is tomorrow’s bargain, at tonight’s price.'],
  button: { label: 'Open the bank', opens: { tab: 'bank' } },
  portrait: 'trader',
};

export const CAPTAIN: Use = {
  name: 'Captain Corwin Lusk',
  lines: [],
  portrait: 'pirate',
  says: [
    'Fine morning for it. For what, I couldn’t tell you. That’s half the fun.',
    'The ship? She’s resting. Ships need their rest. Don’t look at the hole.',
    'I’m waiting on a tide. A particular tide. You’d know it if you saw it, and you won’t.',
    'Brinebeard? Never met the man. Don’t believe what they say about him. Especially the nice bits.',
    'Your smith won’t make me a cannon and your trader won’t sell me a map. Lovely town.',
  ],
  duskSays: [
    'Lights out on the rock again. Nothing to worry about. Go and worry about something else.',
  ],
};
