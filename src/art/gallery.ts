/**
 * Everything drawn so far, on one page, reached from Menu. It is how art is
 * looked at and judged on a phone before the game has a place to use it.
 * Owned by the art lane.
 */
export function artGallery(): HTMLElement {
  const page = document.createElement('section');
  page.className = 'panel empty';
  const note = document.createElement('p');
  note.className = 'muted';
  note.textContent = 'Nothing drawn yet.';
  page.append(note);
  return page;
}
