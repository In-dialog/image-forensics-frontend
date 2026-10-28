"use client";
import { Suspense, useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import { useImageData } from "@/features/results/context/ImageDataContext";
import Quad from "./Quad";
import QuadsFromJson from "./QuadsFromJson";
import LinesToOriginalQuad from "./LinesToOriginalQuad";
import ContainerBox from "./ContainerBox";
import "./Canvas3D.css";

const ORTHO_SIZE = 2;

function OrthoMatchAspect() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    if (!camera.isOrthographicCamera) return;
    const aspect = size.width / size.height;
    const halfH = ORTHO_SIZE;
    const halfW = halfH * aspect;
    // Three.js cameras are mutable external objects, synchronized before paint.
    /* eslint-disable react-hooks/immutability */
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */
  }, [camera, size.width, size.height]);
  return null;
}

function OrbitControlsWithTarget() {
  const data = useImageData();
  const targetZ = data?.orbitTargetZ ?? 0;
  return (
    <OrbitControls
      target={[0, 0, targetZ]}
      enableDamping
      dampingFactor={0.1}
      minZoom={0.2}
      maxZoom={5}
    />
  );
}

function Scene() {
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[2, 2, 3]}
        zoom={1}
        left={-ORTHO_SIZE}
        right={ORTHO_SIZE}
        top={ORTHO_SIZE}
        bottom={-ORTHO_SIZE}
        near={0.1}
        far={1000}
      />
      <OrthoMatchAspect />
      <OrbitControlsWithTarget />
      <Suspense fallback={null}>
        <Quad grayscale />
        <QuadsFromJson />
        <LinesToOriginalQuad />
        <ContainerBox />
      </Suspense>
    </>
  );
}

export default function Canvas3D() {
  return (
    <div className="canvas3d">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
