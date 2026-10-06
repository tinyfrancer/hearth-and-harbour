/*
 * The people of Gullwick who stand about in town, and what they say: the three
 * whose work the player can use, and the villagers, who only talk. They do
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

export const ALEWIFE: Use = {
  name: 'Hesta Crane, alewife',
  lines: [],
  says: [
    'The ale’s brewed out the back. So is the stew. Don’t ask which barrel is which.',
    'First drink’s a welcome. Second’s a habit. Third, you’re singing, and I charge extra for that.',
    'The captain runs a tab. The tab runs to two pages and a map of somewhere.',
    'Odo comes in black to the elbows. I keep a stool by the door just for him, and a cloth on it.',
  ],
  duskSays: ['Can’t stop, love. Half the harbour’s in there and the other half’s on its way.'],
};

export const MARKET: Use = {
  name: 'Wenna Barley, market woman',
  lines: [],
  says: [
    'Eggs, herbs and news, and the news is fresher than the eggs.',
    'Mags has the stall. I have the basket. The basket goes where the people are.',
    'A gull had a whole loaf off me on Tuesday. Came back for the butter, bold as brass.',
  ],
  duskSays: ['Last of the herbs going cheap. They’ll keep, they say. They won’t.'],
};

export const DOCKER: Use = {
  name: 'Jory Tolley, docker',
  lines: [],
  says: [
    'Lift with your legs, not your back, and never with your pride.',
    'Them crates are bound for somewhere warmer. I’m bound for nowhere till they’re stacked.',
    'Tide comes in, tide goes out. Forty years I’ve watched it and it still won’t take a hint.',
    'That ship’s not loaded or unloaded a thing in a month. Pays to notice what isn’t happening.',
  ],
  duskSays: ['Shift’s done. My arms have gone to the tavern without me.'],
};

export const ELDER: Use = {
  name: 'Old Amos Wick',
  lines: [],
  says: [
    'I’ve sat on this bench since before it was a bench. It was a log. Better log, too.',
    'When I was your age the well was deeper and the sea was further off. Everything was.',
    'There was a light on that rock once, before the face. Ask me about it some time. Not now.',
    'Mind the captain. Not because he’s wicked. Because he owes me a shilling.',
  ],
  duskSays: ['Stars are out. I’ve counted them. There’s one missing, but I shan’t say which.'],
};
