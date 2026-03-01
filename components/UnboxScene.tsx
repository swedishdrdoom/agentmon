"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import type { CardRecord } from "@/lib/db";

// ── Types ──────────────────────────────────────────────────────────

interface Props {
  card: CardRecord;
  phase: "sealed" | "opening";
  onOpen: () => void;
  onRevealComplete: () => void;
}

// ── Rarity → color/intensity mapping ───────────────────────────────

const RARITY_GLOW: Record<string, { color: string; intensity: number }> = {
  Common: { color: "#888888", intensity: 0.3 },
  Uncommon: { color: "#c0c0c0", intensity: 0.5 },
  Rare: { color: "#ffd700", intensity: 0.8 },
  Epic: { color: "#ff8c00", intensity: 1.2 },
  Legendary: { color: "#ff4500", intensity: 1.8 },
  "Hyper Rare": { color: "#ff00ff", intensity: 2.5 },
  Singularity: { color: "#00ffff", intensity: 3.0 },
};

// ── Pack component ─────────────────────────────────────────────────

function Pack({
  phase,
  onOpen,
  onRevealComplete,
  rarity,
  imageUrl,
}: {
  phase: "sealed" | "opening";
  onOpen: () => void;
  onRevealComplete: () => void;
  rarity: string;
  imageUrl: string;
}) {
  const packRef = useRef<THREE.Group>(null);
  const foilRef = useRef<THREE.Mesh>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [cardTexture, setCardTexture] = useState<THREE.Texture | null>(null);
  const animProgress = useRef(0);
  const glowConfig = RARITY_GLOW[rarity] || RARITY_GLOW.Common;

  // Load card image as texture with error handling
  useEffect(() => {
    if (!imageUrl) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      imageUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setCardTexture(tex);
      },
      undefined,
      (err) => {
        console.warn("[UnboxScene] Failed to load card texture:", err);
        // Card will render with fallback color — non-fatal
      }
    );
  }, [imageUrl]);

  // Cursor style
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.style.cursor = phase === "sealed" && hovered ? "pointer" : "default";
    return () => {
      gl.domElement.style.cursor = "default";
    };
  }, [hovered, phase, gl]);

  // Opening animation
  useFrame((_, delta) => {
    if (phase !== "opening") return;

    animProgress.current += delta * 0.6;
    const t = Math.min(animProgress.current, 1);

    // Foil peels back
    if (foilRef.current) {
      const peelT = Math.min(t * 2, 1);
      foilRef.current.rotation.x = -peelT * Math.PI * 0.8;
      foilRef.current.position.y = 1.85 + peelT * 0.3;
      foilRef.current.position.z = peelT * -0.5;
      if (peelT >= 1) foilRef.current.visible = false;
    }

    // Card slides out after foil is halfway
    if (cardRef.current) {
      const cardT = Math.max((t - 0.3) / 0.7, 0);
      const eased = 1 - Math.pow(1 - cardT, 3);
      cardRef.current.position.y = eased * 4.5;
      cardRef.current.rotation.y = eased * Math.PI;
      const scale = 1 + eased * 0.15;
      cardRef.current.scale.set(scale, scale, scale);
    }

    // Pack shrinks as card emerges
    if (packRef.current && t > 0.5) {
      const fadeT = (t - 0.5) / 0.5;
      const scale = 1 - fadeT * 0.3;
      packRef.current.scale.set(scale, scale, scale);
      packRef.current.position.y = -fadeT * 1.5;
    }

    if (t >= 1) {
      onRevealComplete();
    }
  });

  return (
    <group ref={packRef}>
      {/* Pack body — light silver/blue so it pops on dark bg */}
      <mesh
        position={[0, 0, 0]}
        onClick={() => phase === "sealed" && onOpen()}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[3.2, 4.4, 0.5]} />
        <meshStandardMaterial
          color="#7888a0"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>

      {/* Pack face — lighter panel */}
      <mesh position={[0, 0, 0.26]}>
        <planeGeometry args={[3.0, 4.2]} />
        <meshStandardMaterial
          color="#9aaccc"
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>

      {/* Foil top seal */}
      <mesh ref={foilRef} position={[0, 1.85, 0.28]}>
        <planeGeometry args={[3.0, 0.6]} />
        <meshStandardMaterial
          color={glowConfig.color}
          metalness={0.95}
          roughness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Edge glow based on rarity */}
      <pointLight
        position={[0, 0, 1.5]}
        color={glowConfig.color}
        intensity={
          phase === "sealed"
            ? glowConfig.intensity * (hovered ? 1.5 : 1)
            : glowConfig.intensity * 2
        }
        distance={5}
      />

      {/* Card inside the pack */}
      <mesh ref={cardRef} position={[0, 0, 0.2]}>
        <planeGeometry args={[2.9, 4.0]} />
        {cardTexture ? (
          <meshStandardMaterial
            map={cardTexture}
            metalness={0.1}
            roughness={0.6}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color="#2a2a4a"
            metalness={0.3}
            roughness={0.5}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>

      {/* Particles for higher rarities during opening */}
      {phase === "opening" && glowConfig.intensity > 0.8 && (
        <RarityParticles color={glowConfig.color} intensity={glowConfig.intensity} />
      )}
    </group>
  );
}

// ── Particle system for rare+ reveals ──────────────────────────────

function RarityParticles({ color, intensity }: { color: string; intensity: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = Math.floor(intensity * 40);

  // Stable positions — computed once
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = Math.random() * 5 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += delta * (1 + Math.random()) * 2;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -1;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ── Main scene ─────────────────────────────────────────────────────

export default function UnboxScene({ card, phase, onOpen, onRevealComplete }: Props) {
  return (
    <div className="w-full h-full min-h-[60vh]">
      <Canvas
        camera={{ position: [0, 0.5, 7], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl: renderer }) => {
          renderer.setClearColor("#111111", 1);
        }}
      >
        <color attach="background" args={["#111111"]} />

        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 5, 5]} intensity={1.5} />
        <directionalLight position={[-3, 3, 4]} intensity={0.8} />

        <Float
          speed={phase === "sealed" ? 2 : 0}
          rotationIntensity={phase === "sealed" ? 0.1 : 0}
          floatIntensity={phase === "sealed" ? 0.3 : 0}
        >
          <Pack
            phase={phase}
            onOpen={onOpen}
            onRevealComplete={onRevealComplete}
            rarity={card.rarity}
            imageUrl={card.image_url}
          />
        </Float>
      </Canvas>
    </div>
  );
}
