import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PlayerInput } from '../../../shared/types';

const KEYS = {
  W: 'KeyW',
  A: 'KeyA',
  S: 'KeyS',
  D: 'KeyD',
  SPACE: 'Space',
  J: 'KeyJ',
  K: 'KeyK',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
} as const;

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
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
  const queuedPunchRef = useRef(false);
  const queuedKickRef = useRef(false);

  useEffect(() => {
    const pressedKeys = pressedKeysRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInField(event.target)) {
        return;
      }

      pressedKeys.add(event.code);

      if (!event.repeat) {
        if (event.code === KEYS.SPACE || event.code === KEYS.K) {
          queuedKickRef.current = true;
        }

        if (event.code === KEYS.J) {
          queuedPunchRef.current = true;
        }
      }

      if (
        event.code === KEYS.LEFT ||
        event.code === KEYS.RIGHT ||
        event.code === KEYS.UP ||
        event.code === KEYS.DOWN ||
        event.code === KEYS.SPACE
      ) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || isTypingInField(event.target)) {
        return;
      }

      queuedPunchRef.current = true;
    };

    const onWindowBlur = () => {
      pressedKeys.clear();
      queuedPunchRef.current = false;
      queuedKickRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('blur', onWindowBlur);
      pressedKeys.clear();
      queuedPunchRef.current = false;
      queuedKickRef.current = false;
    };
  }, []);

  const getInput = useCallback((): PlayerInput => {
    const pressedKeys = pressedKeysRef.current;
    const punch = queuedPunchRef.current;
    const kick = queuedKickRef.current;

    queuedPunchRef.current = false;
    queuedKickRef.current = false;

    const input: PlayerInput = {
      left: pressedKeys.has(KEYS.LEFT) || pressedKeys.has(KEYS.A),
      right: pressedKeys.has(KEYS.RIGHT) || pressedKeys.has(KEYS.D),
      up: pressedKeys.has(KEYS.UP) || pressedKeys.has(KEYS.W),
      down: pressedKeys.has(KEYS.DOWN) || pressedKeys.has(KEYS.S),
      punch,
      kick,
    };

    return input;
  }, []);

  const clear = useCallback((): void => {
    pressedKeysRef.current.clear();
    queuedPunchRef.current = false;
    queuedKickRef.current = false;
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
