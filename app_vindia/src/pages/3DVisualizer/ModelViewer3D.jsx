// src/pages/3DVisualizer/ModelViewer3D.jsx
// Lightweight GLB/GLTF viewer: rotate (drag), zoom (scroll), pan (right-drag/two-finger),
// basic lighting, loading + error states. Non-GLB/GLTF files fall back to a
// download/info card since browser preview isn't practical for fbx/obj/zip.
import { Suspense, useState } from "react";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF, Html } from "@react-three/drei";
import "./ModelViewer3D.css";

function GLTFModel({ url }) {
  const { scene } = useGLTF(url, true);
  return <primitive object={scene} />;
}

function Loader() {
  return (
    <Html center>
      <div className="mv3d-loader">
        <div className="mv3d-loader__spinner" />
        Loading model…
      </div>
    </Html>
  );
}

function ViewerError({ message }) {
  return (
    <div className="mv3d-error">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

// Error boundary since useGLTF throws inside Suspense on bad/missing files
class ModelErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error("[ModelViewer3D]", err); }
  render() {
    if (this.state.hasError) return <ViewerError message="Could not load this 3D model. The file may be corrupted or unreachable." />;
    return this.props.children;
  }
}

export default function ModelViewer3D({ fileUrl, fileType, fileName, height = 420 }) {
  const [ready, setReady] = useState(false);
  const previewable = ["glb", "gltf"].includes((fileType || "").toLowerCase());

  if (!fileUrl) {
    return (
      <div className="mv3d-empty" style={{ height }}>
        No file uploaded for this model yet.
      </div>
    );
  }

  if (!previewable) {
    return (
      <div className="mv3d-fallback" style={{ height }}>
        <svg className="mv3d-fallback__icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <p className="mv3d-fallback__title">
          Live preview isn't available for .{fileType} files
        </p>
        <p className="mv3d-fallback__hint">
          Browser preview supports .glb and .gltf. Download the file to view it in your 3D software.
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          className="mv3d-fallback__download"
        >
          Download {fileName || "file"}
        </a>
      </div>
    );
  }

  return (
    <div className="mv3d-canvas-wrap" style={{ height }}>
      <ModelErrorBoundary>
        <Canvas camera={{ position: [3, 2, 5], fov: 45 }} onCreated={() => setReady(true)}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
          <directionalLight position={[-5, -3, -5]} intensity={0.3} />
          <Suspense fallback={<Loader />}>
            <Stage environment="city" intensity={0.5} adjustCamera>
              <GLTFModel url={fileUrl} />
            </Stage>
          </Suspense>
          <OrbitControls makeDefault enablePan enableZoom enableRotate />
        </Canvas>
      </ModelErrorBoundary>
      {!ready && <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />}
      <div className="mv3d-hint">
        Drag to rotate · Scroll to zoom · Right-drag to pan
      </div>
    </div>
  );
}