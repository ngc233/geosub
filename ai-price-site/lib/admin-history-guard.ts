/** Preserve router-owned state; add only our position marker. No extra entries. */
const marker = '__geosubAdminPosition';
type State = Record<string, unknown> | null;
export function guardAdminHistory(win: Window, hasChanges: () => boolean, confirmLeave: () => boolean) {
  const history = win.history;
  const push = history.pushState, replace = history.replaceState;
  let position = typeof history.state?.[marker] === 'number' ? history.state[marker] as number : 0;
  let href = win.location.href;
  let disposed = false;
  let pending: { target: number; delta: number } | undefined;
  let approved: number | undefined;
  const tagged = (state: State, index: number) => ({ ...(state || {}), [marker]: index });
  replace.call(history, tagged(history.state, position), '', href);
  const wrappedPush: History['pushState'] = function(state, title, url) {
    push.call(history, tagged(state, position + 1), title, url);
    position++; href = win.location.href;
  };
  const wrappedReplace: History['replaceState'] = function(state, title, url) {
    replace.call(history, tagged(state, position), title, url);
    href = win.location.href;
  };
  history.pushState = wrappedPush;
  history.replaceState = wrappedReplace;
  const pop = (event: PopStateEvent) => {
    const target = event.state?.[marker];
    if (pending) {
      event.stopImmediatePropagation();
      if (target !== position) return;
      const request = pending;
      pending = undefined;
      // Native history has returned before a blocking dialog opens.
      setTimeout(() => {
        if (disposed || !confirmLeave()) return;
        approved = request.target;
        history.go(request.delta);
      }, 0);
      return;
    }
    if (approved === target && approved !== undefined) {
      approved = undefined; position = target; href = win.location.href; return;
    }
    const samePage = win.location.href.split('#')[0] === href.split('#')[0];
    if (typeof target !== 'number' || target === position || samePage || !hasChanges()) {
      if (typeof target === 'number') position = target;
      href = win.location.href; return;
    }
    event.stopImmediatePropagation();
    pending = { target, delta: target - position };
    history.go(position - target);
  };
  // Capture precedes the router's bubble listener: canceled routes never render.
  win.addEventListener('popstate', pop, true);
  return () => {
    disposed = true;
    win.removeEventListener('popstate', pop, true);
    if (history.pushState === wrappedPush) history.pushState = push;
    if (history.replaceState === wrappedReplace) history.replaceState = replace;
  };
}
