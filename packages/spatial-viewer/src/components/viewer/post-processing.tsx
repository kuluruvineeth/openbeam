import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, Layers, UnsignedByteType } from "three";
import { outline } from "three/addons/tsl/display/OutlineNode.js";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import {
  add,
  colorToDirection,
  diffuseColor,
  directionToColor,
  float,
  mix,
  mrt,
  normalView,
  oscSine,
  output,
  pass,
  sample,
  time,
  uniform,
  vec4,
  velocity,
} from "three/tsl";

import { RenderPipeline, type WebGPURenderer } from "three/webgpu";
import { SCENE_LAYER, ZONE_LAYER } from "../../lib/layers";
import useViewer from "../../store/use-viewer";

export const SSGI_PARAMS = {
  enabled: true,
  sliceCount: 2,
  stepCount: 8,
  radius: 1,
  expFactor: 1.5,
  thickness: 0.5,
  backfaceLighting: 0.5,
  aoIntensity: 1.5,
  giIntensity: 0.5,
  useLinearThickness: false,
  useScreenSpaceSampling: true,
  useTemporalFiltering: true,
};

const DARK_BG = "#1f2433";
const LIGHT_BG = "#ffffff";

const PostProcessingPasses = () => {
  const { gl: renderer, scene, camera } = useThree();
  const renderPipelineRef = useRef<RenderPipeline | null>(null);
  const hasPipelineErrorRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initBg = useViewer.getState().theme === "dark" ? DARK_BG : LIGHT_BG;
  const bgUniform = useRef(uniform(new Color(initBg)));
  const bgCurrent = useRef(new Color(initBg));
  const bgTarget = useRef(new Color());

  const zoneLayers = useMemo(() => {
    const l = new Layers();
    l.enable(ZONE_LAYER);
    l.disable(SCENE_LAYER);
    return l;
  }, []);

  useEffect(() => {
    let mounted = true;

    const initRenderer = async () => {
      try {
        if (renderer && "init" in renderer) {
          await (renderer as unknown as { init: () => Promise<void> }).init();
        }

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error(
          "[viewer] Failed to initialize renderer for post-processing.",
          error
        );
        if (mounted) {
          setIsInitialized(false);
        }
      }
    };

    initRenderer();

    return () => {
      mounted = false;
    };
  }, [renderer]);

  useEffect(() => {
    if (!(renderer && scene && camera && isInitialized)) {
      return;
    }

    hasPipelineErrorRef.current = false;

    try {
      const scenePass = pass(scene, camera);
      scenePass.setMRT(
        mrt({
          output,
          diffuseColor,
          normal: directionToColor(normalView),
          velocity,
        })
      );

      const scenePassColor = scenePass.getTextureNode("output");
      const scenePassDiffuse = scenePass.getTextureNode("diffuseColor");
      const scenePassDepth = scenePass.getTextureNode("depth");
      const scenePassNormal = scenePass.getTextureNode("normal");
      const scenePassVelocity = scenePass.getTextureNode("velocity");

      const diffuseTexture = scenePass.getTexture("diffuseColor");
      diffuseTexture.type = UnsignedByteType;

      const normalTexture = scenePass.getTexture("normal");
      normalTexture.type = UnsignedByteType;

      const sceneNormal = sample((uv) =>
        colorToDirection(scenePassNormal.sample(uv))
      );

      const zonePass = pass(scene, camera);
      zonePass.setLayers(zoneLayers);
      const giPass = ssgi(
        scenePassColor,
        scenePassDepth,
        sceneNormal,
        camera as unknown as Parameters<typeof ssgi>[3]
      );

      giPass.sliceCount.value = SSGI_PARAMS.sliceCount;
      giPass.stepCount.value = SSGI_PARAMS.stepCount;
      giPass.radius.value = SSGI_PARAMS.radius;
      giPass.expFactor.value = SSGI_PARAMS.expFactor;
      giPass.thickness.value = SSGI_PARAMS.thickness;
      giPass.backfaceLighting.value = SSGI_PARAMS.backfaceLighting;
      giPass.aoIntensity.value = SSGI_PARAMS.aoIntensity;
      giPass.giIntensity.value = SSGI_PARAMS.giIntensity;
      giPass.useLinearThickness.value = SSGI_PARAMS.useLinearThickness;
      giPass.useScreenSpaceSampling.value = SSGI_PARAMS.useScreenSpaceSampling;
      giPass.useTemporalFiltering = SSGI_PARAMS.useTemporalFiltering;

      const gi = giPass.rgb;
      const ao = giPass.a;

      const hasGeometry = scenePassColor.a;
      const contentAlpha = hasGeometry.max(zonePass.a);

      const compositePass = vec4(
        add(
          scenePassColor.rgb.mul(ao),
          add(zonePass.rgb, scenePassDiffuse.rgb.mul(gi))
        ),
        contentAlpha
      );

      function generateSelectedOutlinePass() {
        const edgeStrength = uniform(3);
        const edgeGlow = uniform(0);
        const edgeThickness = uniform(1);
        const visibleEdgeColor = uniform(new Color(0xff_ff_ff));
        const hiddenEdgeColor = uniform(new Color(0xf3_ff_47));

        const outlinePass = outline(scene, camera, {
          selectedObjects: useViewer.getState().outliner.selectedObjects,
          edgeGlow,
          edgeThickness,
        });
        const { visibleEdge, hiddenEdge } = outlinePass;

        const outlineColor = visibleEdge
          .mul(visibleEdgeColor)
          .add(hiddenEdge.mul(hiddenEdgeColor))
          .mul(edgeStrength);

        return outlineColor;
      }

      function generateHoverOutlinePass() {
        const edgeStrength = uniform(5);
        const edgeGlow = uniform(0.5);
        const edgeThickness = uniform(1.5);
        const pulsePeriod = uniform(3);
        const visibleEdgeColor = uniform(new Color(0x00_aa_ff));
        const hiddenEdgeColor = uniform(new Color(0xf3_ff_47));

        const outlinePass = outline(scene, camera, {
          selectedObjects: useViewer.getState().outliner.hoveredObjects,
          edgeGlow,
          edgeThickness,
        });
        const { visibleEdge, hiddenEdge } = outlinePass;

        const period = time.div(pulsePeriod).mul(2);
        const osc = oscSine(period).mul(0.5).add(0.5);

        const outlineColor = visibleEdge
          .mul(visibleEdgeColor)
          .add(hiddenEdge.mul(hiddenEdgeColor))
          .mul(edgeStrength);
        const outlinePulse = pulsePeriod
          .greaterThan(0)
          .select(outlineColor.mul(osc), outlineColor);

        return outlinePulse;
      }

      const selectedOutlinePass = generateSelectedOutlinePass();
      const hoverOutlinePass = generateHoverOutlinePass();

      const compositeWithOutlines = SSGI_PARAMS.enabled
        ? vec4(
            add(compositePass.rgb, selectedOutlinePass.add(hoverOutlinePass)),
            compositePass.a
          )
        : vec4(
            add(scenePassColor.rgb, selectedOutlinePass.add(hoverOutlinePass)),
            scenePassColor.a
          );

      const traaOutput = traa(
        compositeWithOutlines,
        scenePassDepth,
        scenePassVelocity,
        camera
      );

      const traaRgb = (
        traaOutput as unknown as { rgb: typeof compositePass.rgb }
      ).rgb;
      const colorSource = mix(compositePass.rgb, traaRgb, hasGeometry);
      const finalOutput = vec4(
        mix(bgUniform.current, colorSource, contentAlpha),
        float(1)
      );

      const renderPipeline = new RenderPipeline(
        renderer as unknown as WebGPURenderer
      );
      renderPipeline.outputNode = finalOutput;
      renderPipelineRef.current = renderPipeline;
    } catch (error) {
      hasPipelineErrorRef.current = true;
      console.error(
        "[viewer] Failed to set up post-processing pipeline. Rendering without post FX.",
        error
      );
      if (renderPipelineRef.current) {
        renderPipelineRef.current.dispose();
      }
      renderPipelineRef.current = null;
    }

    return () => {
      if (renderPipelineRef.current) {
        renderPipelineRef.current.dispose();
      }
      renderPipelineRef.current = null;
    };
  }, [renderer, scene, camera, isInitialized, zoneLayers]);

  useFrame((_, delta) => {
    bgTarget.current.set(
      useViewer.getState().theme === "dark" ? DARK_BG : LIGHT_BG
    );
    bgCurrent.current.lerp(bgTarget.current, Math.min(delta, 0.1) * 4);
    bgUniform.current.value.copy(bgCurrent.current);

    if (hasPipelineErrorRef.current || !renderPipelineRef.current) {
      return;
    }

    try {
      (
        renderer as unknown as { setClearAlpha: (alpha: number) => void }
      ).setClearAlpha(0);
      renderPipelineRef.current.render();
    } catch (error) {
      hasPipelineErrorRef.current = true;
      console.error(
        "[viewer] Post-processing render pass failed. Disabling post FX for this session.",
        error
      );
      renderPipelineRef.current.dispose();
      renderPipelineRef.current = null;
    }
  }, 1);

  return null;
};

export default PostProcessingPasses;
