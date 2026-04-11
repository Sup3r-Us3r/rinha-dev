import * as THREE from 'three';
import { PlayerCharacter } from './PlayerCharacter';
import type {
  AnimationState,
  GameState,
  PlayerId,
  PlayerInput,
} from '../../../shared/types';

const ARENA_HALF_SIZE = 8;
const REMOTE_LERP_FACTOR = 0.18;
const LOCAL_LERP_FACTOR = 0.12;
const LOCAL_PREDICTION_SPEED = 4.1;

interface RenderTarget {
  position: THREE.Vector3;
  rotationY: number;
  animation: AnimationState;
}

export class GameScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  private readonly players: Map<PlayerId, PlayerCharacter> = new Map();
  private readonly targetByPlayerId: Partial<Record<PlayerId, RenderTarget>> =
    {};

  private readonly canvas: HTMLCanvasElement;
  private readonly myPlayerId: PlayerId;
  private localInput: PlayerInput = {
    movement: { x: 0, z: 0 },
    actions: { punch: false, kick: false },
  };

  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, myPlayerId: PlayerId) {
    this.canvas = canvas;
    this.myPlayerId = myPlayerId;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(13, 13, 13);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const floorGeo = new THREE.PlaneGeometry(
      ARENA_HALF_SIZE * 2.4,
      ARENA_HALF_SIZE * 2.4,
    );
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const ambient = new THREE.AmbientLight(0xffffff, 0.52);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.05);
    dirLight.position.set(9, 15, 7);
    this.scene.add(dirLight);

    const axisBounds = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(ARENA_HALF_SIZE * 2, ARENA_HALF_SIZE * 2),
      ),
      new THREE.LineBasicMaterial({ color: 0x1f6132 }),
    );
    axisBounds.rotation.x = -Math.PI / 2;
    axisBounds.position.y = 0.02;
    this.scene.add(axisBounds);

    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize();
    this.animate();
  }

  onWindowResize = () => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  updateState(state: GameState) {
    const serverPlayers = [state.players[1], state.players[2]].filter(Boolean);

    for (const playerState of serverPlayers) {
      if (!playerState) continue;
      const playerId = playerState.playerId;

      let char = this.players.get(playerId);

      if (!char) {
        const color = playerId === 1 ? 0x7b1f1f : 0x355d9f;
        char = new PlayerCharacter(color);
        this.players.set(playerId, char);
        this.scene.add(char.mesh);
        char.mesh.position.set(
          playerState.position.x,
          0,
          playerState.position.z,
        );
        char.mesh.rotation.y = playerState.rotationY;
      }

      this.targetByPlayerId[playerId] = {
        position: new THREE.Vector3(
          playerState.position.x,
          0,
          playerState.position.z,
        ),
        rotationY: playerState.rotationY,
        animation: playerState.animation,
      };
    }

    for (const id of this.players.keys()) {
      if (!state.players[id]) {
        const char = this.players.get(id);
        if (char) {
          this.scene.remove(char.mesh);
        }
        this.players.delete(id);
        delete this.targetByPlayerId[id];
      }
    }
  }

  setLocalInput(input: PlayerInput) {
    this.localInput = input;
  }

  private animate = () => {
    const delta = this.clock.getDelta();

    for (const [playerId, character] of this.players.entries()) {
      const target = this.targetByPlayerId[playerId];
      if (!target) continue;

      if (playerId === this.myPlayerId) {
        this.applyLocalPrediction(character, delta, target.animation);
      }

      const lerpFactor =
        playerId === this.myPlayerId ? LOCAL_LERP_FACTOR : REMOTE_LERP_FACTOR;
      character.mesh.position.lerp(target.position, lerpFactor);
      character.mesh.position.x = clamp(
        character.mesh.position.x,
        -ARENA_HALF_SIZE,
        ARENA_HALF_SIZE,
      );
      character.mesh.position.z = clamp(
        character.mesh.position.z,
        -ARENA_HALF_SIZE,
        ARENA_HALF_SIZE,
      );

      const wrappedDelta = normalizeAngle(
        target.rotationY - character.mesh.rotation.y,
      );
      character.mesh.rotation.y += wrappedDelta * lerpFactor;

      character.update(delta, target.animation);
    }

    this.renderer.render(this.scene, this.camera);
    this.rafId = window.requestAnimationFrame(this.animate);
  };

  private applyLocalPrediction(
    character: PlayerCharacter,
    delta: number,
    animation: AnimationState,
  ): void {
    if (animation === 'dead' || animation === 'hit') {
      return;
    }

    const { x, z } = this.localInput.movement;
    const length = Math.hypot(x, z);
    if (length === 0) {
      return;
    }

    const nx = x / length;
    const nz = z / length;
    const dx = nx * LOCAL_PREDICTION_SPEED * delta;
    const dz = nz * LOCAL_PREDICTION_SPEED * delta;

    character.mesh.position.x = clamp(
      character.mesh.position.x + dx,
      -ARENA_HALF_SIZE,
      ARENA_HALF_SIZE,
    );
    character.mesh.position.z = clamp(
      character.mesh.position.z + dz,
      -ARENA_HALF_SIZE,
      ARENA_HALF_SIZE,
    );
  }

  cleanup() {
    window.removeEventListener('resize', this.onWindowResize);

    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.renderer.dispose();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number): number {
  let output = angle;
  while (output > Math.PI) output -= Math.PI * 2;
  while (output < -Math.PI) output += Math.PI * 2;
  return output;
}
