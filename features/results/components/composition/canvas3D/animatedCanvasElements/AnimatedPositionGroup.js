"use client";

import { useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DURATION_MS = 400;
const EASE_OUT = (t) => 1 - (1 - t) * (1 - t); // ease out quad

/**
 * Single animation: lerp from A to B over duration. Forward = depth 0 → target; reverse = target → 0.
 */
function runDepthAnimation(groupRef, from, to, t) {
  if (!groupRef.current) return;
  const eased = EASE_OUT(Math.min(1, t));
  groupRef.current.position.lerpVectors(from, to, eased);
}

/**
 * Wraps children in a group that animates position along Z (depth).
 * Same logic for enter and exit: one lerp from A→B; forward (enter) = 0→z, reverse (exit) = z→0.
 */
export default function AnimatedPositionGroup({
  targetPosition,
  isExiting = false,
  onExitComplete,
  children,
}) {
  const groupRef = useRef(null);
  const fromRef = useRef(new THREE.Vector3());
  const toRef = useRef(new THREE.Vector3());
  const startTimeRef = useRef(null);
  const reverseRef = useRef(false); // false = forward (enter), true = reverse (exit)
  const exitCompleteCalledRef = useRef(false);

  const [tx, ty, tz] = targetPosition;

  useLayoutEffect(() => {
    if (!groupRef.current) return;
    if (isExiting && !reverseRef.current) {
      reverseRef.current = true;
      groupRef.current.position.set(tx, ty, tz);
      fromRef.current.set(tx, ty, tz);
      toRef.current.set(tx, ty, 0);
      startTimeRef.current = null;
    }
  }, [isExiting, tx, ty, tz]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const now = state.clock.elapsedTime * 1000;

    if (startTimeRef.current == null) {
      startTimeRef.current = now;
      if (!reverseRef.current) {
        fromRef.current.set(tx, ty, 0);
        toRef.current.set(tx, ty, tz);
        groupRef.current.position.set(tx, ty, 0);
      }
    }

    const elapsed = now - startTimeRef.current;
    const t = elapsed / DURATION_MS;
    runDepthAnimation(groupRef, fromRef.current, toRef.current, t);

    if (t >= 1 && reverseRef.current && onExitComplete && !exitCompleteCalledRef.current) {
      exitCompleteCalledRef.current = true;
      onExitComplete();
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
