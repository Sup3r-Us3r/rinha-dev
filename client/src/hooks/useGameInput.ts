import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PlayerInput } from '../../../shared/types';

const KEY_W = 'KeyW';
const KEY_A = 'KeyA';
const KEY_S = 'KeyS';
const KEY_D = 'KeyD';
const KEY_J = 'KeyJ';
const KEY_K = 'KeyK';

const EMPTY_INPUT: PlayerInput = {
  movement: { x: 0, z: 0 },
  actions: { punch: false, kick: false },
};

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable
  );
}

export function useGameInput() {
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const mousePunchQueuedRef = useRef(false);

  useEffect(() => {
    const pressedKeys = pressedKeysRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInField(event.target)) {
        return;
      }

      pressedKeys.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || isTypingInField(event.target)) {
        return;
      }
      mousePunchQueuedRef.current = true;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      pressedKeys.clear();
    };
  }, []);

  const getInput = useCallback((): PlayerInput => {
    const pressedKeys = pressedKeysRef.current;

    const x = Number(pressedKeys.has(KEY_D)) - Number(pressedKeys.has(KEY_A));
    const z = Number(pressedKeys.has(KEY_S)) - Number(pressedKeys.has(KEY_W));

    const input: PlayerInput = {
      movement: { x, z },
      actions: {
        punch: pressedKeys.has(KEY_J) || mousePunchQueuedRef.current,
        kick: pressedKeys.has(KEY_K),
      },
    };

    mousePunchQueuedRef.current = false;
    return input;
  }, []);

  const clear = useCallback((): void => {
    pressedKeysRef.current.clear();
    mousePunchQueuedRef.current = false;
  }, []);

  return useMemo(
    () => ({
      getInput,
      clear,
      emptyInput: EMPTY_INPUT,
    }),
    [clear, getInput],
  );
}
