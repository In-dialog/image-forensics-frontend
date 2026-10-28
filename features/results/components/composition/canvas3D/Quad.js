"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { getFullImageUrl } from "@/features/results/config/dataSource";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { palette } from "@/features/results/lib/palette";

const grayscaleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const grayscaleFragmentShader = `
  uniform sampler2D map;
  varying vec2 vUv;
  void main() {
    vec4 texColor = texture2D(map, vUv);
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    gl_FragColor = vec4(vec3(gray), texColor.a);
  }
`;

function getSizeFromTexture(texture, maxSize = 2) {
  const img = texture?.image;
  if (!img || typeof img.naturalWidth !== "number") return [maxSize, maxSize];
  const w = img.naturalWidth || 1;
  const h = img.naturalHeight || 1;
  const aspect = w / h;
  if (aspect >= 1) return [maxSize, maxSize / aspect];
  return [maxSize * aspect, maxSize];
}

const loader = new THREE.TextureLoader();

export default function Quad({
  src: srcProp,
  width: widthProp,
  height: heightProp,
  maxSize = 2,
  grayscale = false,
  ...props
}) {
  const data = useImageData();
  const src = srcProp ?? getFullImageUrl(data?.basePath);
  const meshRef = useRef(null);
  const textureRef = useRef(null);
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    // GPU textures are disposable external resources; never render the prior one after disposal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexture(null);
    let cancelled = false;
    loader.load(
      src,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        textureRef.current = tex;
        setTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null);
      }
    );
    return () => {
      cancelled = true;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [src]);

  const [width, height] = useMemo(() => {
    if (widthProp != null && heightProp != null) return [widthProp, heightProp];
    return getSizeFromTexture(texture, maxSize);
  }, [texture, maxSize, widthProp, heightProp]);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} {...props}>
      <planeGeometry args={[width, height]} />
      {grayscale && texture ? (
        <shaderMaterial
          vertexShader={grayscaleVertexShader}
          fragmentShader={grayscaleFragmentShader}
          uniforms={{
            map: { value: texture },
          }}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.01}
        />
      ) : (
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          color={texture ? "#ffffff" : palette.canvas3dMesh}
          transparent
          alphaTest={0.01}
        />
      )}
    </mesh>
  );
}
