"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, StatsGl } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  imageUrl: string;
  rarity: string;
}

// ── Rarity → edge color ────────────────────────────────────────────

const RARITY_EDGE: Record<string, string> = {
  Common: "#666666",
  Uncommon: "#a0a0a0",
  Rare: "#d4af37",
  Epic: "#ff8c00",
  Legendary: "#ff4500",
  "Hyper Rare": "#cc00ff",
  Singularity: "#00ffcc",
};

// Card dimensions (2.5:3.5 trading card ratio)
const CARD_W = 2.5;
const CARD_H = 3.5;
const CARD_DEPTH = 0.03;
const CARD_RADIUS = 0.08;

// ── Rounded rect shape ─────────────────────────────────────────────

function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

// ── Card back texture ──────────────────────────────────────────────

function createCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 716;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, 512, 716);

  ctx.strokeStyle = "#333355";
  ctx.lineWidth = 8;
  ctx.roundRect(16, 16, 480, 684, 16);
  ctx.stroke();

  ctx.strokeStyle = "#222244";
  ctx.lineWidth = 2;
  ctx.roundRect(32, 32, 448, 652, 12);
  ctx.stroke();

  ctx.fillStyle = "#556688";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AGENTMON", 256, 358);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Card mesh ──────────────────────────────────────────────────────

function Card({ imageUrl, rarity, invalidate }: {
  imageUrl: string;
  rarity: string;
  invalidate: () => void;
}) {
  const { gl } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const edgeColor = RARITY_EDGE[rarity] || RARITY_EDGE.Common;
  const backTexture = useMemo(() => createCardBackTexture(), []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      imageUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        // Use GPU max — don't hardcode 16, which can exceed device limits
        tex.anisotropy = gl.capabilities.getMaxAnisotropy();
        setTexture(tex);
        // Repaint immediately now that the texture is ready
        invalidate();
      },
      undefined,
      (err) => console.warn("[CardViewer3D] Texture load failed:", err)
    );
  }, [imageUrl, gl, invalidate]);

  const geometry = useMemo(() => {
    const shape = createRoundedRectShape(CARD_W, CARD_H, CARD_RADIUS);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: CARD_DEPTH,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -CARD_DEPTH / 2);
    return geo;
  }, []);

  const frontGeo = useMemo(() => {
    const shape = createRoundedRectShape(CARD_W - 0.02, CARD_H - 0.02, CARD_RADIUS);
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group>
      {/* Edge slab */}
      <mesh geometry={geometry}>
        <meshStandardMaterial color={edgeColor} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Front — card image */}
      <mesh geometry={frontGeo} position={[0, 0, CARD_DEPTH / 2 + 0.001]}>
        {texture ? (
          <meshStandardMaterial map={texture} metalness={0.05} roughness={0.7} />
        ) : (
          <meshStandardMaterial color="#1a1a2e" />
        )}
      </mesh>

      {/* Back — "AGENTMON" */}
      <mesh geometry={frontGeo} position={[0, 0, -CARD_DEPTH / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial map={backTexture} metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── Scene (inner, has access to useThree) ──────────────────────────
//
// Demand-mode rendering strategy:
//   OrbitControls fires "change" every frame the camera moves — including
//   during damping. We pass invalidate() as the onChange handler.
//   Each change event → one more frame → OrbitControls updates → another
//   change event if still moving. Self-sustaining until damping settles.
//   No guessing frame counts, no stacking RAF loops.

function Scene({ imageUrl, rarity }: { imageUrl: string; rarity: string }) {
  const { invalidate } = useThree();

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-3, 2, 4]} intensity={0.6} />
      <directionalLight position={[0, -2, 3]} intensity={0.3} />

      <Card imageUrl={imageUrl} rarity={rarity} invalidate={invalidate} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        minDistance={2.5}
        maxDistance={14}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        onChange={() => invalidate()}
      />

      {/* Stats panel — offset below the navbar (≈56px) */}
      <StatsGl className="!fixed !top-16 !left-2 !right-auto" />
    </>
  );
}

// ── Main export ────────────────────────────────────────────────────

export default function CardViewer3D({ imageUrl, rarity }: Props) {
  return (
    // Fill whatever container is given — parent controls the size
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: "high-performance",
        }}
        frameloop="demand"
        onCreated={({ gl }) => gl.setClearColor("#111111", 1)}
      >
        <color attach="background" args={["#111111"]} />
        <Scene imageUrl={imageUrl} rarity={rarity} />
      </Canvas>
    </div>
  );
}
