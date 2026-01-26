"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getAmplitude } from "@/lib/audio/amplitude";

interface TeacherAvatar3DProps {
  isSpeaking?: boolean;
  audioElement?: HTMLAudioElement | null;
  amplitude?: number;
}

/**
 * Avatar mesh component - renders the VRM model with mouth animation
 */
function AvatarMesh({
  isSpeaking,
  audioElement,
  externalAmplitude,
}: {
  isSpeaking?: boolean;
  audioElement?: HTMLAudioElement | null;
  externalAmplitude?: number;
}) {
  const vrmRef = useRef<VRM | null>(null);
  const [vrm, setVrm] = useState<VRM | null>(null);
  const mouthSmoothedRef = useRef(0);
  const lastAmplitudeRef = useRef(0);

  const { camera, gl } = useThree();

  // Load VRM model on mount
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // Try to load the VRM
    loader.load(
      "/avatars/teacher.vrm",
      (gltf) => {
        const loadedVrm = gltf.userData.vrm as VRM;
        if (loadedVrm) {
          loadedVrm.scene.position.z = 0;
          loadedVrm.scene.scale.set(0.8, 0.8, 0.8);
          vrmRef.current = loadedVrm;
          setVrm(loadedVrm);
        }
      },
      (progress) => {
        console.log(
          "VRM loading progress:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Failed to load VRM model:", error);
        // Fall back to a simple 3D model
        createFallbackAvatar();
      }
    );

    return () => {
      if (vrmRef.current) {
        vrmRef.current.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (node.material instanceof THREE.Material) {
              node.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  // Create a fallback 3D avatar if VRM fails to load
  const createFallbackAvatar = () => {
    const group = new THREE.Group();

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a9eff,
      shininess: 60,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 0.62, 0.25);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 0.62, 0.25);
    group.add(leftEye, rightEye);

    // Mouth (for animation)
    const mouthGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.02);
    const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b9d });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 0.42, 0.3);
    mouth.name = "mouth";
    group.add(mouth);

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.2);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x3a7dd8,
      shininess: 40,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.1;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Platform
    const platformGeometry = new THREE.CylinderGeometry(0.4, 0.45, 0.1, 32);
    const platformMaterial = new THREE.MeshPhongMaterial({
      color: 0x2a4a6a,
      shininess: 50,
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -0.25;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    vrmRef.current = {
      scene: group,
      humanoid: null,
      blendShapeProxy: {
        getWeight: () => 0,
        setWeight: () => {},
        deleteExpression: () => {},
        addExpression: () => {},
      },
    } as any;
    setVrm(vrmRef.current);
  };

  // Update avatar each frame
  useFrame(() => {
    if (!vrm) return;

    // Get current amplitude
    let currentAmplitude = externalAmplitude ?? getAmplitude(audioElement ?? null);

    // If not speaking, quickly fade amplitude to 0
    if (!isSpeaking && audioElement?.paused !== false) {
      currentAmplitude *= 0.8;
    }

    // Smooth the mouth opening to avoid jitter
    const smoothingFactor = 0.15;
    const targetMouthOpen = Math.max(0, Math.min(1, currentAmplitude * 1.5));
    mouthSmoothedRef.current +=
      (targetMouthOpen - mouthSmoothedRef.current) * smoothingFactor;

    // Apply mouth animation to VRM blendshape
    if (vrm.blendShapeProxy) {
      // Try to find "A" vowel expression (common in VRM)
      try {
        // Set mouth blendshape
        vrm.blendShapeProxy.setValue("mouthOpen", mouthSmoothedRef.current);
        vrm.blendShapeProxy.setValue("mouthA", mouthSmoothedRef.current * 0.7);
      } catch (e) {
        // Silently fail if expression not available
      }
    }

    // Fallback: animate mouth geometry directly if no blendshapes
    const mouth = vrm.scene.getObjectByName("mouth");
    if (mouth && mouth instanceof THREE.Mesh) {
      const scaleY = 1 + mouthSmoothedRef.current * 2;
      mouth.scale.y = scaleY;
    }

    // Update lastAmplitude for potential use elsewhere
    lastAmplitudeRef.current = currentAmplitude;
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

/**
 * Main TeacherAvatar3D component
 * Renders a 3D VRM avatar with real-time mouth animation driven by audio
 *
 * Props:
 * - isSpeaking: whether teacher is currently speaking
 * - audioElement: HTML audio element to extract amplitude from
 * - amplitude: manual amplitude override (0..1)
 */
export const TeacherAvatar3D = ({
  isSpeaking = false,
  audioElement = null,
  amplitude,
}: TeacherAvatar3DProps) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{
          position: [0, 0.6, 1.2],
          fov: 50,
        }}
        gl={{
          antialias: true,
          alpha: true,
        }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <pointLight
          position={[2, 2, 2]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-2, 1, 1]} intensity={0.4} />

        {/* Avatar */}
        <AvatarMesh
          isSpeaking={isSpeaking}
          audioElement={audioElement}
          externalAmplitude={amplitude}
        />

        {/* Camera controls */}
        <OrbitControls
          autoRotate
          autoRotateSpeed={2}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={(Math.PI * 2) / 3}
        />
      </Canvas>
    </div>
  );
};

export default TeacherAvatar3D;
