"use client";
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedSphere() {
  const ref = useRef<THREE.Points>(null);
  
  // Generate random sphere points
  const spherePoints = new Float32Array(5000 * 3);
  for (let i = 0; i < 5000; i++) {
    const radius = 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    spherePoints[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    spherePoints[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    spherePoints[i * 3 + 2] = radius * Math.cos(phi);
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      ref.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <Points ref={ref} positions={spherePoints} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#8B5CF6"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.8}
      />
    </Points>
  );
}

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        style={{ background: 'transparent' }}
        // Try to gracefully handle context loss in dev
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          const handleLost = (e: Event) => {
            e.preventDefault();
          };
          const handleRestored = () => {
            // drei/fiber will re-render; no-op
          };
          canvas.addEventListener('webglcontextlost', handleLost as EventListener, { passive: false });
          canvas.addEventListener('webglcontextrestored', handleRestored as EventListener);
        }}
      >
        <AnimatedSphere />
      </Canvas>
    </div>
  );
}
