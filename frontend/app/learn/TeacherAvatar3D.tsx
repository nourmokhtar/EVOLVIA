"use client";

import { useEffect, useRef, useState } from "react";

export function TeacherAvatar3D({
  isSpeaking = false,
  audioElement = null,
  amplitude,
}: {
  isSpeaking?: boolean;
  audioElement?: HTMLAudioElement | null;
  amplitude?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const mouthSmoothRef = useRef(0);
  const mouthMorphRef = useRef<{ mesh: any; index: number } | null>(null);
  const timeRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);

  // Keep speaking state in ref to avoid rebuilding scene
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Lazy load Three.js and GLTFLoader
    const loadThreeScene = async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

        // Scene setup with transparent background
        const scene = new THREE.Scene();
        scene.background = null;

        const width = containerRef.current!.clientWidth;
        const height = containerRef.current!.clientHeight;
        const camera = new THREE.PerspectiveCamera(
          55,
          width / height,
          0.1,
          1000
        );
        camera.position.set(0, 0.5, 2.5);
        camera.lookAt(0, 0.5, 0);

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        containerRef.current!.appendChild(renderer.domElement);
        sceneRef.current = { scene, camera, renderer };

        // Lighting - Key, Fill, Rim setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(3, 4, 2);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.4);
        fillLight.position.set(-2, 2, -3);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xff6b9d, 0.3);
        rimLight.position.set(0, 1, -3);
        scene.add(rimLight);

        // Load model
        const loader = new GLTFLoader();
        loader.load(
          "/avatars/RobotExpressive.glb",
          (gltf) => {
            const model = gltf.scene;
            model.position.y = -0.5;
            model.scale.set(1.5, 1.5, 1.5);
            scene.add(model);
            modelRef.current = model;

            // Find morph target for mouth animation
            findMouthMorph(model);

            setIsLoading(false);
          },
          undefined,
          (error) => {
            console.error("Error loading RobotExpressive.glb:", error);
            setIsLoading(false);
          }
        );

        // Find morph target for mouth
        const findMouthMorph = (model: any) => {
          const mouthTargetNames = [
            "JawOpen", "jawOpen", "mouthOpen", "MouthOpen",
            "viseme_aa", "Viseme_aa", "Mouth_Open"
          ];

          model.traverse((node: any) => {
            if (node.morphTargetDictionary) {
              for (const targetName of mouthTargetNames) {
                if (targetName in node.morphTargetDictionary) {
                  const index = node.morphTargetDictionary[targetName];
                  mouthMorphRef.current = { mesh: node, index };
                  console.log(`Found mouth morph target: ${targetName}`);
                  return;
                }
              }
            }
          });
        };

        // Animation loop
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);
          timeRef.current += 0.016; // ~60fps

          if (modelRef.current) {
            // Idle rotation
            modelRef.current.rotation.y = Math.sin(timeRef.current * 0.35) * 0.15;

            // Subtle head bob while speaking
            if (isSpeakingRef.current) {
              modelRef.current.position.y = -0.5 + Math.sin(timeRef.current * 2) * 0.05;
            } else {
              modelRef.current.position.y = -0.5;
            }
          }

          // Mouth animation
          if (mouthMorphRef.current) {
            const { mesh, index } = mouthMorphRef.current;

            // Calculate target mouth value
            let target = 0;
            if (isSpeakingRef.current) {
              if (amplitude !== undefined) {
                target = Math.min(amplitude * 2.0, 1.0);
              } else {
                // Fallback: oscillate when speaking
                target = 0.4 + 0.3 * Math.sin(timeRef.current * 6);
              }
            }

            // Smooth transition
            mouthSmoothRef.current += (target - mouthSmoothRef.current) * 0.15;
            mesh.morphTargetInfluences[index] = mouthSmoothRef.current;
          }

          renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current) return;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        window.addEventListener("resize", handleResize);

        // Cleanup function
        const cleanup = () => {
          window.removeEventListener("resize", handleResize);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          renderer.dispose();
          if (renderer.domElement.parentNode === containerRef.current) {
            renderer.domElement.remove();
          }
        };

        return cleanup;
      } catch (error) {
        console.error("Error loading Three.js scene:", error);
        setIsLoading(false);
        return () => { };
      }
    };

    let cleanup: (() => void) | undefined;

    const initScene = async () => {
      cleanup = await loadThreeScene();
    };

    initScene();

    return () => {
      cleanup?.();
    };
  }, []); // Empty dependency array - scene created once

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 rounded-lg overflow-hidden"
    >
      {isLoading && (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="text-white text-sm">Loading 3D Avatar...</div>
          <div className="text-xs text-gray-400 mt-2">Status: {isSpeaking ? "Speaking" : "Idle"}</div>
        </div>
      )}
    </div>
  );
}
