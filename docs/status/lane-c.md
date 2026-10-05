# Lane C: scenes

**Next session: S12a: The town on the engine** (brief in `docs/lanes.md`, wave 2).

## Done

- **S11: Scene engine.** The Town tab shows a test room on a canvas that fills the screen area.
  - `tileMap.ts`: a map is rows of characters plus a key to tile kinds; which kinds are solid is
    data. Tiles are 16 art pixels. Off the map counts as solid.
  - `path.ts`: one Dijkstra search over the grid (8-way, no cutting a wall's corner) answers both
    the route and the nearest reachable tile; the route is then straightened by testing straight
    lines for the walker's 8 × 8 feet box. Tapping a solid tile, or off the map, walks to the
    nearest reachable tile.
  - `walker.ts`: walking speed is 64 art pixels a second, advanced by elapsed time; long frames
    carry over corners, so cutting time into frames does not change where a walk ends.
  - `camera.ts`: follows the walker, stops at the map's edges, centres a map smaller than the view,
    and lands on whole art pixels.
  - `scale.ts`: a whole number of device pixels per art pixel, the largest that shows at least 270
    art pixels across and 160 down (4 on a 390-wide phone at 3x). The canvas's device-pixel size
    comes from a ResizeObserver, so rotation and resizes are handled.
  - `draw.ts` (the only part that touches a canvas): the map is painted once at one pixel per art
    pixel and copied each frame at the whole-number scale; placeholder figure and target marker.
  - `stage.ts`: the reusable scene view (dungeons can use it). It runs its own
    `requestAnimationFrame` loop and stops it on the first frame it is off the page; it redraws
    only when something moved or resized.
  - `testRoom.ts`: a 30 × 44 tile room (480 × 704 art pixels) with a gated wall, a cup and a
    walled pocket to walk around, a pond, crates and a pier.
  - `colours.ts`: placeholder colours, each a step from the style guide's base ramps, named once.
  - Tests in `tests/scene/`: pathing (path found, around a wall, no corner cutting, nearest
    reachable, no path), the camera clamp, scaling for a range of phones, device-pixel sizing, tap
    to world, walking, and the view's loop starting and stopping.

## Deferred

- Hold-and-drag to steer (only taps move the walker).
- Depth sorting: the walker is drawn over everything, so its head overlaps a wall tile above it.
  The town's buildings will need sprites sorted by their feet.
- Real art: tiles, the hero and day/dusk all wait for lane B's palette and sprites (S12).

## Needs from another lane

- Nothing. Both S11 requests were met before wave 2: `update` now arrives every frame, and the
  shell styles the Town tab's screen. `townView` also now receives a `Shell`.

## Notes for this lane's next session

- The walker's position lives in a module variable in `townView.ts`, so it survives the shell
  rebuilding the tab (level-ups, an action stopping) and switching tabs; it is not saved.
- Headless Chromium emulating a phone reports `devicePixelContentBoxSize` in CSS pixels;
  `deviceSize` in `scale.ts` falls back to CSS size × ratio when the two disagree. Real phones
  were not available to check.
- The canvas's top edge sits at a fractional CSS position (the top bar's height); screenshots at
  3x show every art pixel exactly 4 device pixels with no blended colours, but this has only been
  checked in Chromium.
