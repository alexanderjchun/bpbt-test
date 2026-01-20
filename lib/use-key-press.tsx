import { useEffect, useEffectEvent } from "react";

type KeyPressEventType = "keydown" | "keyup" | "keypress";

export function useKeyPress(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    event?: KeyPressEventType;
    target?: Document | HTMLElement | Window | null;
    eventOptions?: AddEventListenerOptions;
  } = {},
) {
  const {
    event = "keydown",
    target = typeof window === "undefined" ? null : window,
    eventOptions,
  } = options;
  const onListen = useEffectEvent(callback);

  useEffect(() => {
    if (!target) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === key) {
        onListen(event);
      }
    };

    if (target instanceof Document) {
      target.addEventListener(event, handler, eventOptions);
    } else if (target instanceof HTMLElement) {
      target.addEventListener(event, handler, eventOptions);
    } else {
      target.addEventListener(event, handler, eventOptions);
    }

    return () => {
      if (target instanceof Document) {
        target.removeEventListener(event, handler, eventOptions);
      } else if (target instanceof HTMLElement) {
        target.removeEventListener(event, handler, eventOptions);
      } else {
        target.removeEventListener(event, handler, eventOptions);
      }
    };
  }, [key, target, event, eventOptions]);
}
