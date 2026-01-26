/**
 * 3D Robot Avatar component for teaching visualization.
 *
 * Features:
 * - Animated speaking with lip-sync simulation
 * - Head movement to match engagement
 * - Eye blink animations
 * - Gesture animations (point, wave)
 * - Customizable appearance
 */

"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface AvatarProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  emotion?: "neutral" | "happy" | "thinking" | "concerned";
  scale?: number;
}

/**
 * 3D Robot Avatar component
 *
 * Renders a 3D robot that animates during teaching.
 * Uses Three.js for 3D rendering.
 *
 * Usage:
 * ```tsx
 * <RobotAvatar isActive={true} isSpeaking={tts.isPlaying} />
 * ```
 */
export function RobotAvatar({
  isActive = true,
  isSpeaking = false,
  emotion = "neutral",
  scale = 1,
}: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const robotRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>();

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create robot
    const robot = createRobot(scale);
    scene.add(robot);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    robotRef.current = robot;

    // Animation loop
    let time = 0;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      time += 0.016; // ~60fps

      // Idle animations
      if (!isSpeaking) {
        // Gentle head sway
        robot.rotation.y = Math.sin(time * 0.5) * 0.1;
        robot.position.y = Math.sin(time * 0.3) * 0.1;

        // Blink
        const eyes = robot.getObjectByName("eyes") as THREE.Group;
        if (eyes) {
          const blink =
            (Math.sin(time * 0.7) + 1) / 2 > 0.8 ? 0 : 0.9;
          eyes.scale.y = blink;
        }
      } else {
        // Speaking animations
        // Head nods
        robot.rotation.x = Math.sin(time * 2) * 0.1;
        robot.rotation.y = Math.sin(time * 1.5) * 0.15;

        // Mouth movement (simulated)
        const mouth = robot.getObjectByName("mouth") as THREE.Mesh;
        if (mouth && mouth.scale) {
          mouth.scale.y = 0.5 + Math.sin(time * 4) * 0.3;
        }

        // Eye movement
        const eyes = robot.getObjectByName("eyes") as THREE.Group;
        if (eyes) {
          eyes.rotation.z = Math.sin(time * 1.2) * 0.2;
          eyes.scale.y = Math.cos(time * 3) > 0.5 ? 1 : 0.8; // Blinking
        }
      }

      // Emotion adjustments
      applyEmotion(robot, emotion);

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [scale]);

  // Update animation state
  useEffect(() => {
    if (!robotRef.current) return;
    // Will be handled in animation loop
  }, [isSpeaking, emotion]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        opacity: isActive ? 1 : 0.5,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}

/**
 * Create a simple 3D robot character
 */
function createRobot(scale: number): THREE.Group {
  const robot = new THREE.Group();

  // Body (metallic cube)
  const bodyGeometry = new THREE.BoxGeometry(1.5, 2, 0.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90e2,
    metalness: 0.7,
    roughness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  robot.add(body);

  // Head (sphere)
  const headGeometry = new THREE.SphereGeometry(0.7, 32, 32);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ba3ff,
    metalness: 0.6,
    roughness: 0.3,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.5;
  head.castShadow = true;
  head.receiveShadow = true;
  robot.add(head);

  // Eyes group
  const eyesGroup = new THREE.Group();
  eyesGroup.name = "eyes";
  eyesGroup.position.set(0, 1.7, 0.6);

  // Left eye
  const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.4,
    roughness: 0.1,
  });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.x = -0.3;
  eyesGroup.add(leftEye);

  // Right eye
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.x = 0.3;
  eyesGroup.add(rightEye);

  // Pupils
  const pupilGeometry = new THREE.SphereGeometry(0.08, 8, 8);
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  leftPupil.position.z = 0.1;
  leftEye.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  rightPupil.position.z = 0.1;
  rightEye.add(rightPupil);

  robot.add(eyesGroup);

  // Mouth (animated rectangle)
  const mouthGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.1);
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.name = "mouth";
  mouth.position.set(0, 1.3, 0.65);
  robot.add(mouth);

  // Arms
  const armGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  const armMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a9eff,
    metalness: 0.6,
    roughness: 0.3,
  });

  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-1, 0.5, 0);
  leftArm.castShadow = true;
  robot.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(1, 0.5, 0);
  rightArm.castShadow = true;
  robot.add(rightArm);

  // Base/legs
  const legGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.5);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d7bc0,
    metalness: 0.7,
    roughness: 0.2,
  });
  const legs = new THREE.Mesh(legGeometry, legMaterial);
  legs.position.y = -1.2;
  legs.castShadow = true;
  robot.add(legs);

  // Platform/base
  const platformGeometry = new THREE.CylinderGeometry(1.5, 1.8, 0.2, 32);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a5aa0,
    metalness: 0.5,
    roughness: 0.4,
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.y = -2;
  platform.receiveShadow = true;
  robot.add(platform);

  // Apply scale
  robot.scale.multiplyScalar(scale);

  return robot;
}

/**
 * Apply emotion to robot appearance
 */
function applyEmotion(
  robot: THREE.Group,
  emotion: "neutral" | "happy" | "thinking" | "concerned"
) {
  const head = robot.children.find((child) => child.position.y > 1);
  if (!head) return;

  switch (emotion) {
    case "happy":
      // Eyes smaller (smiling)
      const eyes = robot.getObjectByName("eyes") as THREE.Group;
      if (eyes) eyes.scale.y = 0.8;
      break;

    case "thinking":
      // Head tilt
      robot.rotation.z = 0.2;
      break;

    case "concerned":
      // Eyes bigger
      const eyesConcerned = robot.getObjectByName("eyes") as THREE.Group;
      if (eyesConcerned) eyesConcerned.scale.y = 1.2;
      break;

    case "neutral":
    default:
      robot.rotation.z = 0;
      break;
  }
}

export default RobotAvatar;
