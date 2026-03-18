import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type {
  AmbientLight,
  DirectionalLight,
  OrthographicCamera,
} from "three/webgpu";
import * as THREE from "three/webgpu";
import useViewer from "../../store/use-viewer";

interface LightConfig {
  intensity: { dark: number; light: number };
  color: { dark: string; light: string };
  shadowIntensity?: { dark: number; light: number };
}

const LIGHT_CONFIGS = {
  primary: {
    intensity: { dark: 0.8, light: 4 },
    color: { dark: "#e0e5ff", light: "#ffffff" },
    shadowIntensity: { dark: 0.8, light: 0.4 },
  },
  secondary: {
    intensity: { dark: 0.2, light: 0.75 },
    color: { dark: "#8090ff", light: "#ffffff" },
  },
  tertiary: {
    intensity: { dark: 0.3, light: 1 },
    color: { dark: "#a0b0ff", light: "#ffffff" },
  },
  ambient: {
    intensity: { dark: 0.15, light: 0.5 },
    color: { dark: "#a0b0ff", light: "#ffffff" },
  },
};

interface LightUpdateOptions {
  light: DirectionalLight | AmbientLight;
  config: LightConfig;
  state: {
    isDark: boolean;
    targetColor: THREE.Color;
    dt: number;
    instant: boolean;
  };
}

function applyLightValues({ light, config, state }: LightUpdateOptions) {
  const { isDark, targetColor, dt, instant } = state;
  const targetIntensity = isDark
    ? config.intensity.dark
    : config.intensity.light;
  const colorHex = isDark ? config.color.dark : config.color.light;

  if (instant) {
    light.intensity = targetIntensity;
    light.color.set(colorHex);
  } else {
    light.intensity = THREE.MathUtils.lerp(
      light.intensity,
      targetIntensity,
      dt
    );
    targetColor.set(colorHex);
    light.color.lerp(targetColor, dt);
  }

  if (
    config.shadowIntensity &&
    "shadow" in light &&
    light.shadow &&
    light.shadow.intensity !== undefined
  ) {
    const targetShadow = isDark
      ? config.shadowIntensity.dark
      : config.shadowIntensity.light;

    if (instant) {
      light.shadow.intensity = targetShadow;
    } else {
      light.shadow.intensity = THREE.MathUtils.lerp(
        light.shadow.intensity,
        targetShadow,
        dt
      );
    }
  }
}

export function Lights() {
  const theme = useViewer((state) => state.theme);
  const isDark = theme === "dark";

  const light1Ref = useRef<DirectionalLight>(null);
  const shadowCamera = useRef<OrthographicCamera>(null);
  const shadowCameraSize = 50;

  const light2Ref = useRef<DirectionalLight>(null);
  const light3Ref = useRef<DirectionalLight>(null);
  const ambientRef = useRef<AmbientLight>(null);

  const initialized = useRef(false);

  const targets = useMemo(
    () => ({
      l1Color: new THREE.Color(),
      l2Color: new THREE.Color(),
      l3Color: new THREE.Color(),
      ambColor: new THREE.Color(),
    }),
    []
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) * 4;
    const instant = !initialized.current;

    if (light1Ref.current) {
      applyLightValues({
        light: light1Ref.current,
        config: LIGHT_CONFIGS.primary,
        state: { isDark, targetColor: targets.l1Color, dt, instant },
      });
    }
    if (light2Ref.current) {
      applyLightValues({
        light: light2Ref.current,
        config: LIGHT_CONFIGS.secondary,
        state: { isDark, targetColor: targets.l2Color, dt, instant },
      });
    }
    if (light3Ref.current) {
      applyLightValues({
        light: light3Ref.current,
        config: LIGHT_CONFIGS.tertiary,
        state: { isDark, targetColor: targets.l3Color, dt, instant },
      });
    }
    if (ambientRef.current) {
      applyLightValues({
        light: ambientRef.current,
        config: LIGHT_CONFIGS.ambient,
        state: { isDark, targetColor: targets.ambColor, dt, instant },
      });
    }

    if (!initialized.current) {
      initialized.current = true;
    }
  });

  return (
    <>
      <directionalLight
        castShadow
        position={[10, 10, 10]}
        ref={light1Ref}
        shadow-bias={-0.002}
        shadow-mapSize={[1024, 1024]}
        shadow-normalBias={0.3}
        shadow-radius={3}
      >
        <orthographicCamera
          attach="shadow-camera"
          bottom={-shadowCameraSize}
          far={100}
          left={-shadowCameraSize}
          near={1}
          ref={shadowCamera}
          right={shadowCameraSize}
          top={shadowCameraSize}
        />
      </directionalLight>

      <directionalLight position={[-10, 10, -10]} ref={light2Ref} />

      <directionalLight position={[-10, 10, 10]} ref={light3Ref} />

      <ambientLight ref={ambientRef} />
    </>
  );
}
