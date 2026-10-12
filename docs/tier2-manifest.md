# Tier 2 manifest (S22)

Every id tier 2 adds, fixed from wave 19 on. Lane B draws from this list (art tests key on the
ids, so **no id here changes**); lane C builds Thistlewood Burrow against its row in
`src/data/dungeons.ts`. Levels and numbers live in `src/data/` and may still move with the
simulations; ids, names, kinds, slots and weapon classes do not.

Tier 2 opens on the first clear of Brinebeard's Grotto. Its content runs from level 20 to about 40.
Each skill follows tier 1's shape: three gathering actions a skill (Foraging four), one cooked
fish a catch, a metal set from the anvil, a cloth and leather line from Crafting, bows and arrows
from Fletching, four potions.

Columns: **kind** is resource, food, potion, equipment, ammunition or other. **Slot** is where it
is worn (head, body, legs, main hand, off hand, neck, wrist, ammunition). **Class** is how a weapon
is drawn swinging or loosing: _swing_ (blades, axes, clubs) or _bow_ (every weapon whose layer id
contains `bow`). **Layer** is the figure layer it is worn as: an existing id where one is drawn,
"new" where lane B draws one.

## Gathering

| Id              | Name          | Kind     | Skill, level   | Looks like                                                                                    | Tier 1 counterpart |
| --------------- | ------------- | -------- | -------------- | --------------------------------------------------------------------------------------------- | ------------------ |
| `driftwood`     | Driftwood     | resource | Woodcutting 20 | A sea-worn branch, bleached silver-grey and smooth as bone, a knot or two, no bark            | `pine_logs`        |
| `elm_logs`      | Elm logs      | resource | Woodcutting 27 | Logs with dark furrowed grey-brown bark and a warm mid-brown cut end with wavy rings          | `oak_logs`         |
| `yew_logs`      | Yew logs      | resource | Woodcutting 34 | Logs with thin flaking red-brown bark; the cut end a deep orange heart ringed by pale sapwood | `willow_logs`      |
| `raw_mackerel`  | Raw mackerel  | resource | Fishing 20     | A slim fish, green-blue back with dark wavy stripes, silver-white belly, facing left          | `raw_shrimp`       |
| `raw_halibut`   | Raw halibut   | resource | Fishing 27     | A big flatfish, mottled brown-olive on top, both eyes on one side, a white edge               | `raw_herring`      |
| `raw_swordfish` | Raw swordfish | resource | Fishing 34     | A long steel-blue fish with a tall back fin and a long flat sword of a bill                   | `raw_cod`          |
| `salt_iron_ore` | Salt-iron ore | resource | Mining 20      | A faceted lump of dark blue-grey rock with a crust of white salt crystals in its cracks       | `iron_ore`         |
| `silver_ore`    | Silver ore    | resource | Mining 27      | A pale grey lump threaded with bright white-silver veins                                      | `tin_ore`          |
| `gold_ore`      | Gold ore      | resource | Mining 34      | A brown-grey lump with buttery yellow nuggets set in it                                       | `copper_ore`       |
| `sea_holly`     | Sea holly     | resource | Foraging 20    | A spiky blue-grey seaside herb with thistle-like pale blue flower heads                       | `sageleaf`         |
| `nettles`       | Nettles       | resource | Foraging 25    | A bundle of dark green stinging nettle stalks with toothed leaves, tied with a stem           | `flax`             |
| `sea_glass`     | Sea-glass     | resource | Foraging 30    | Three frosted pebbles of old glass, soft green, pale blue and white                           | `seashells`        |
| `duskbloom`     | Duskbloom     | resource | Foraging 35    | A violet flower with a faint glow at its heart, petals curled open                            | `glowcap`          |

## Made things

| Id                     | Name                 | Kind     | Made by, level | Looks like                                                              | Tier 1 counterpart |
| ---------------------- | -------------------- | -------- | -------------- | ----------------------------------------------------------------------- | ------------------ |
| `cooked_mackerel`      | Cooked mackerel      | food     | Cooking 20     | The mackerel browned with two grill marks, the eye gone white           | `cooked_shrimp`    |
| `cooked_halibut`       | Cooked halibut       | food     | Cooking 27     | A thick white halibut steak, golden on top with grill marks             | `cooked_herring`   |
| `cooked_swordfish`     | Cooked swordfish     | food     | Cooking 34     | A thick round swordfish steak, seared dark at the edges                 | `cooked_cod`       |
| `salt_iron_bar`        | Salt-iron bar        | resource | Smithing 20    | An ingot of dark blue-grey steel with a pale salt bloom along its edges | `iron_bar`         |
| `silver_bar`           | Silver bar           | resource | Smithing 27    | A bright white-silver ingot                                             | `bronze_bar`       |
| `gold_bar`             | Gold bar             | resource | Smithing 34    | A buttery gold ingot                                                    | `bronze_bar`       |
| `salt_iron_arrowheads` | Salt-iron arrowheads | resource | Smithing 22    | A small pile of long, narrow dark blue-grey points                      | `iron_arrowheads`  |
| `nettle_cloth`         | Nettle cloth         | resource | Crafting 21    | A folded length of rough grey-green cloth                               | `linen`            |
| `thick_hide`           | Thick hide           | resource | from monsters  | A heavy dark brown pelt, shaggy, with four legs and a short tail        | `hide`             |
| `thick_leather`        | Thick leather        | resource | Crafting 20    | A roll of dark brown leather, thicker than leather's, tied with a thong | `leather`          |

## Potions (each in a shell vial, as tier 1's)

| Id                   | Name               | Alchemy | Does                                       | Looks like                                                | Tier 1 counterpart |
| -------------------- | ------------------ | ------: | ------------------------------------------ | --------------------------------------------------------- | ------------------ |
| `holly_tonic`        | Sea-holly tonic    |      20 | Gathering quicker                          | The shell vial, pale blue liquid, a cork                  | `sage_tonic`       |
| `forgehand_draught`  | Forgehand draught  |      26 | Artisan skills quicker                     | The shell vial, orange liquid, red wax stopper            | `steady_draught`   |
| `duskbloom_tincture` | Duskbloom tincture |      32 | Gathering finds an extra item now and then | The shell vial, glowing violet, a duskbloom stopper       | `glowcap_tincture` |
| `twilight_elixir`    | Twilight elixir    |      37 | Gathering and Artisan skills more XP       | The shell vial, deep blue with a gold shimmer, a lit wick | `midnight_oil`     |

## Things to wear and wield

The **salt-iron** set is the knight (tier 2's rung). Its pieces map one-to-one onto the knight's
layers lane B has drawn; the helm and the axe are new layers.

| Id                   | Name                  | Kind       | Slot                  | Class | Layer          | Made by / from | Looks like                                                                                                          | Tier 1 counterpart |
| -------------------- | --------------------- | ---------- | --------------------- | ----- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `salt_iron_sword`    | Salt-iron longsword   | equipment  | main hand             | swing | `knight_sword` | Smithing 24    | The knight's long sword: polished blade to the top of the canvas, gilt guard and pommel                             | `iron_sword`       |
| `salt_iron_axe`      | Salt-iron axe         | equipment  | main hand             | swing | new            | Smithing 21    | A knight's war axe: a polished plate-steel head with a long curved bit and a back spike, gilt collar on a dark haft | `iron_axe`         |
| `salt_iron_helm`     | Salt-iron helm        | equipment  | head                  |       | new            | Smithing 26    | A polished plate helm: rounded skull, a visor raised to show the face, a gilt band at the brow                      | `iron_helmet`      |
| `salt_iron_plate`    | Salt-iron plate       | equipment  | body                  |       | `knight_plate` | Smithing 35    | The knight's plate: ridged breastplate, pauldrons of three lames, couters, fauld                                    | `iron_breastplate` |
| `salt_iron_greaves`  | Salt-iron greaves     | equipment  | legs                  |       | `knight_knees` | Smithing 31    | The knight's knee cops and shin plates                                                                              | `iron_greaves`     |
| `salt_iron_shield`   | Salt-iron kite shield | equipment  | off hand              |       | `kite_shield`  | Smithing 29    | The knight's kite shield: blue with its gold cross                                                                  | `iron_shield`      |
| `red_cloak`          | Red cloak             | equipment  | neck (see below)      |       | `red_cloak`    | Crafting 31    | The knight's red cloak, from the shoulders to the calves                                                            | (none)             |
| `salt_iron_arrows`   | Salt-iron arrows      | ammunition | ammunition            |       | `arrow_quiver` | Fletching 23   | Long arrows with narrow blue-grey heads and white fletchings (in the quiver as iron's are)                          | `iron_arrows`      |
| `ranger_hood`        | Ranger’s hood         | equipment  | head                  |       | new            | Crafting 26    | A deep hood of dark green-brown thick leather with a short shoulder cape; the face shadowed, not hidden             | `leather_cap`      |
| `ranger_bracers`     | Ranger’s bracers      | equipment  | wrist                 |       | new            | Crafting 23    | Long dark brown thick-leather bracers to the elbow, laced, a stitched guard on the bow arm                          | `leather_bracers`  |
| `ranger_coat`        | Ranger’s coat         | equipment  | body                  |       | new            | Crafting 34    | A long dark green-brown leather coat to the knee, split at the front for striding, belted, high collar              | `leather_jerkin`   |
| `driftwood_shortbow` | Driftwood shortbow    | equipment  | main hand, both hands | bow   | new            | Fletching 20   | A shortbow of bleached silver-grey wood, knots showing, bound in tarred cord at the grip                            | `willow_shortbow`  |
| `elm_longbow`        | Elm longbow           | equipment  | main hand, both hands | bow   | new            | Fletching 28   | A longbow a head taller than the shortbows, warm brown elm, leather grip                                            | `poachers_longbow` |
| `yew_longbow`        | Yew longbow           | equipment  | main hand, both hands | bow   | new            | Fletching 35   | A tall longbow, its belly the orange heartwood and its back the pale sapwood, horn tips                             | `poachers_longbow` |
| `silver_bangle`      | Silver bangle         | equipment  | wrist                 |       | new            | Crafting 28    | A bright silver band at the wrist set with a green sea-glass stone                                                  | `shell_bracelet`   |
| `gold_amulet`        | Gold amulet           | equipment  | neck                  |       | new            | Crafting 37    | A gold disc on a gold chain with a pale blue sea-glass at its centre                                                | `shell_necklace`   |

**The cloak is worn in the neck slot.** It fastens at the throat, so it takes the place of a
necklace or charm: a knight chooses between the cloak and the gold amulet (or the trollstone).
No new slot, so no change to the save or to the character sheet's eight squares. Its figure layer
is lane B's `red_cloak`, drawn over the back as now; the necklace layers stay as they are (a
character wears one or the other in the game, never both).

### Drops and the bounty shop

| Id                 | Name             | Kind       | Slot                  | Class | Layer           | From              | Looks like                                                                                             | Tier 1 counterpart   |
| ------------------ | ---------------- | ---------- | --------------------- | ----- | --------------- | ----------------- | ------------------------------------------------------------------------------------------------------ | -------------------- |
| `ogre_maul`        | Ogre’s maul      | equipment  | main hand, both hands | swing | new             | Hill ogre (rare)  | A tree-trunk club as long as the hero, bound with three rusty iron bands; carried down like the anchor | `brinebeards_anchor` |
| `briar_charm`      | Briar charm      | equipment  | neck                  |       | new             | Briar hag (rare)  | A small wreath of dark thorns round one red berry, on a cord at the collar                             | `trollstone`         |
| `mossback_shield`  | Mossback shield  | equipment  | off hand              |       | new             | Moss golem (rare) | A rough slab of grey stone grown over with green moss, bound to the arm with roots                     | `wyrmscale_shield`   |
| `broadhead_arrows` | Broadhead arrows | ammunition | ammunition            |       | `barbed_quiver` | the bounty shop   | Arrows with broad triangular salt-iron heads and dark green fletchings, in the quiver                  | `barbed_arrows`      |

## Thistlewood Burrow (`thistlewood_burrow`)

Order 3 on the chart, recommended combat level 40, opened by the first clear of Brinebeard's
Grotto. **Coming soon this wave**: shown as a silhouette on the chart (the scene lands it on the
spare `unknown_1` spot), its name kept from the menus. Its cast ids are the shared contract.

| Id              | Name            | Level | Looks like                                                                                            |
| --------------- | --------------- | ----: | ----------------------------------------------------------------------------------------------------- |
| `spore_puff`    | Spore puff      |    34 | A small mushroom person, knee-high, round pale cap with brown spots; bursts into a yellow spore cloud |
| `lantern_moth`  | Lantern moth    |    36 | A big dusty grey-violet moth with eye spots on its wings that flies at lights and smothers them       |
| `cap_guard`     | Cap guard       |    38 | A mushroom soldier, man-high, holding its broad red cap before it like a shield, a twig spear         |
| `bramble_hound` | Bramble hound   |    40 | A dog-shaped tangle of brambles and thorns with glowing amber eyes that charges                       |
| `badger_king`   | The Badger King |    44 | A huge, very offended badger in a moth-eaten robe and a small crown, on his hind legs (the boss)      |

Its things:

| Id              | Name                    | Kind      | Slot                  | Class | Layer | Looks like                                                                                      |
| --------------- | ----------------------- | --------- | --------------------- | ----- | ----- | ----------------------------------------------------------------------------------------------- |
| `amber`         | Amber                   | other     |                       |       |       | A rounded nugget of warm golden amber with a tiny seed caught inside (the burrow's doubloon)    |
| `thornwood_bow` | Thornwood bow           | equipment | main hand, both hands | bow   | new   | A dark, twisted longbow grown rather than carved, small thorns along its back, green-bound grip |
| `capguard_helm` | Cap-guard helm          | equipment | head                  |       | new   | A broad red mushroom cap with white spots, worn as a helmet, a leather chin strap               |
| `badger_crown`  | The Badger King’s crown | other     |                       |       |       | A small, battered gold crown with three blunt points and one missing stone (a trophy, not worn) |

## Monsters

A new area for everyone and one for bounty hunters only.

| Id           | Name       | Level | Area                                        | Looks like                                                                                     |
| ------------ | ---------- | ----: | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `brigand`    | Brigand    |    23 | `thistlewood_edge` Thistlewood’s Edge       | A highway robber in a long brown coat and a red scarf over the lower face, a short sword       |
| `black_bear` | Black bear |    27 | `thistlewood_edge`                          | A big black bear on all fours, brown muzzle, small cross eyes                                  |
| `hobgoblin`  | Hobgoblin  |    31 | `thistlewood_edge`                          | A goblin's big cousin: man-sized, orange-brown skin, a dented helmet and a notched cleaver     |
| `dire_wolf`  | Dire wolf  |    35 | `thistlewood_edge`                          | A wolf the size of a pony, shaggy charcoal fur, pale eyes (bigger and darker than `grey_wolf`) |
| `hill_ogre`  | Hill ogre  |    39 | `thistlewood_edge`                          | A huge grey-green ogre with a pot belly, a tooth sticking up, and a tree-trunk club            |
| `briar_hag`  | Briar hag  |    29 | `the_deepthorn` The Deepthorn (bounty only) | A crooked old woman whose hair is a tangle of brambles, berries in it, a thorny staff          |
| `moss_golem` | Moss golem |    37 | `the_deepthorn` (bounty only)               | A hulking figure of stacked grey stones held together by moss and roots, small glowing eyes    |

## Thieving marks

Faces are optional (the card shows `portrait2(id)` when art has one).

| Id                     | Name                 | Level | Who or what                                                                   |
| ---------------------- | -------------------- | ----: | ----------------------------------------------------------------------------- |
| `steal_spice_merchant` | Spice merchant       |    20 | A plump trader in a striped turban behind sacks of bright spices              |
| `steal_customs_house`  | Customs house        |    24 | The harbour's customs clerk at a high desk stacked with seized goods          |
| `steal_noble`          | Visiting noble       |    28 | A powdered lord in a plum coat with a jewelled cane and a very full purse     |
| `steal_guild_coffer`   | Smiths’ guild coffer |    32 | A heavy iron-banded chest with the guild's hammer crest, and a sleepy guard   |
| `steal_counting_house` | Counting house       |    37 | A banker's ledger-lined room with scales, stacks of coin and a gold strongbox |

## Dungeon days and challenges

The burrow draws its days from new trades (ids worded so lane B's icon matcher places them):
`thick_caps` (tough), `fierce_brambles` (fierce), `swift_hounds` (swift), `deep_gloom` (dark) and
the grotto's `short_rations` (hungry). Its challenges: `thistlewood_burrow.swift` (time),
`thistlewood_burrow.nearly_unhurt` (untouched), `thistlewood_burrow.no_food` (hungry),
`thistlewood_burrow.badger_dodge` (dodge).

## Summary for art

- **Icons** (24 x 24): every item above (resources, food, potions, equipment, ammunition, other).
- **New figure layers**: `salt_iron_axe`, `salt_iron_helm`, `ranger_hood`, `ranger_bracers`,
  `ranger_coat`, `driftwood_shortbow`, `elm_longbow`, `yew_longbow`, `silver_bangle`,
  `gold_amulet`, `ogre_maul`, `briar_charm`, `mossback_shield`, `thornwood_bow`, `capguard_helm`.
- **Mapped to drawn layers** (`ITEM_LAYERS2` rows): `salt_iron_sword` → `knight_sword`,
  `salt_iron_plate` → `knight_plate`, `salt_iron_greaves` → `knight_knees`, `salt_iron_shield` →
  `kite_shield`, `red_cloak` → `red_cloak`, `salt_iron_arrows` → `arrow_quiver`,
  `broadhead_arrows` → `barbed_quiver`.
- **Foes** (figure and portrait): the seven monsters and the burrow's five.
- **Faces, optional**: the five marks.
