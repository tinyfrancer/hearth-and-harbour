type Child = Node | string | null | false | undefined;

interface Props {
  class?: string;
  text?: string;
  attrs?: Record<string, string>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void }>;
}

/** A small element builder: the menus are plain DOM, with no framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) {
    el.setAttribute(name, value);
  }
  for (const [type, handler] of Object.entries(props.on ?? {})) {
    el.addEventListener(type, handler as EventListener);
  }
  for (const child of children) {
    if (child) el.append(child);
  }
  return el;
}

export function button(label: string, onClick: () => void, variant = ''): HTMLButtonElement {
  return h('button', {
    class: `btn ${variant}`.trim(),
    text: label,
    attrs: { type: 'button' },
    on: { click: onClick },
  });
}

/** A heading with its icon in front, when art has drawn one. */
export function titled(icon: Element | null, text: string): HTMLElement {
  return h('h2', { class: icon ? 'titled' : '' }, [icon, text]);
}
