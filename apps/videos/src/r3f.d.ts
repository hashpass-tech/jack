/**
 * Global JSX augmentation for @react-three/fiber.
 *
 * R3F 9.x extends JSX.IntrinsicElements with Three.js primitives
 * (mesh, boxGeometry, meshStandardMaterial, etc.).
 *
 * Due to React 18/19 type conflicts in monorepos (Remotion ships
 * @types/react@18 internally), we re-export the ThreeElements
 * interface into both the global JSX namespace and React.JSX.
 */
import type { ThreeElements } from "@react-three/fiber";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
