import * as THREE from 'three';
import type { AnimationState } from '../../../shared/types';

export class PlayerCharacter {
  public mesh: THREE.Group;
  private rig: THREE.Group;

  private head: THREE.Mesh;
  private body: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftLeg: THREE.Mesh;

  private time = 0;
  private stateTime = 0;
  private currentState: AnimationState = 'idle';

  constructor(color: number) {
    this.mesh = new THREE.Group();
    this.rig = new THREE.Group();
    this.mesh.add(this.rig);

    const mat = new THREE.MeshStandardMaterial({ color });

    // Head
    const headGeo = new THREE.SphereGeometry(0.5);
    this.head = new THREE.Mesh(headGeo, mat);
    this.head.position.y = 2.5;
    this.rig.add(this.head);

    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1.5, 0.5);
    this.body = new THREE.Mesh(bodyGeo, mat);
    this.body.position.y = 1.25;
    this.rig.add(this.body);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2);
    armGeo.translate(0, -0.6, 0); // pivot at top

    this.rightArm = new THREE.Mesh(armGeo, mat);
    this.rightArm.position.set(0.7, 1.8, 0);
    this.rig.add(this.rightArm);

    this.leftArm = new THREE.Mesh(armGeo, mat);
    this.leftArm.position.set(-0.7, 1.8, 0);
    this.rig.add(this.leftArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2);
    legGeo.translate(0, -0.6, 0);

    this.rightLeg = new THREE.Mesh(legGeo, mat);
    this.rightLeg.position.set(0.3, 1.2, 0);
    this.rig.add(this.rightLeg);

    this.leftLeg = new THREE.Mesh(legGeo, mat);
    this.leftLeg.position.set(-0.3, 1.2, 0);
    this.rig.add(this.leftLeg);
  }

  update(delta: number, state: AnimationState) {
    if (state !== this.currentState) {
      this.currentState = state;
      this.stateTime = 0;
    }

    this.time += delta;
    this.stateTime += delta;

    let rightArmX = 0;
    let leftArmX = 0;
    let rightLegX = 0;
    let leftLegX = 0;
    let bodyY = 1.25;
    let headY = 2.5;
    let rigPitch = 0;
    let hitRecoilZ = 0;

    switch (state) {
      case 'idle':
        bodyY += Math.sin(this.time * 3.5) * 0.07;
        headY += Math.sin(this.time * 3.5) * 0.07;
        break;
      case 'walk':
        rightLegX = Math.sin(this.time * 9) * 0.7;
        leftLegX = -Math.sin(this.time * 9) * 0.7;
        rightArmX = -Math.sin(this.time * 9) * 0.45;
        leftArmX = Math.sin(this.time * 9) * 0.45;
        bodyY += Math.sin(this.time * 9) * 0.04;
        break;
      case 'punch':
        rightArmX = -punchProgress(this.stateTime) * 1.6;
        leftArmX = 0.1;
        bodyY += 0.02;
        break;
      case 'kick':
        rightLegX = -kickProgress(this.stateTime) * 1.5;
        leftLegX = 0.2;
        rightArmX = 0.15;
        leftArmX = -0.15;
        break;
      case 'hit':
        rigPitch = -0.25;
        hitRecoilZ = -0.12;
        break;
      case 'dead':
        rigPitch = -Math.PI / 2;
        bodyY = 0.52;
        headY = 0.72;
        break;
    }

    this.rightArm.rotation.x = THREE.MathUtils.lerp(
      this.rightArm.rotation.x,
      rightArmX,
      0.25,
    );
    this.leftArm.rotation.x = THREE.MathUtils.lerp(
      this.leftArm.rotation.x,
      leftArmX,
      0.25,
    );
    this.rightLeg.rotation.x = THREE.MathUtils.lerp(
      this.rightLeg.rotation.x,
      rightLegX,
      0.25,
    );
    this.leftLeg.rotation.x = THREE.MathUtils.lerp(
      this.leftLeg.rotation.x,
      leftLegX,
      0.25,
    );

    this.body.position.y = THREE.MathUtils.lerp(
      this.body.position.y,
      bodyY,
      0.2,
    );
    this.head.position.y = THREE.MathUtils.lerp(
      this.head.position.y,
      headY,
      0.2,
    );
    this.rig.rotation.x = THREE.MathUtils.lerp(
      this.rig.rotation.x,
      rigPitch,
      0.2,
    );
    this.rig.position.z = THREE.MathUtils.lerp(
      this.rig.position.z,
      hitRecoilZ,
      0.2,
    );
  }
}

function punchProgress(time: number): number {
  const attackDuration = 0.18;
  const t = Math.min(time / attackDuration, 1);
  return Math.sin(t * Math.PI);
}

function kickProgress(time: number): number {
  const attackDuration = 0.24;
  const t = Math.min(time / attackDuration, 1);
  return Math.sin(t * Math.PI);
}
