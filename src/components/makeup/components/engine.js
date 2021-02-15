import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import * as THREE from "three";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-backend-webgl";
import Stats from "stats.js";
import { setupCamera, stopCamera } from "../methods/camera";
import Resize from "./resize";
import { cssCam, cssCanvasBase, cssCanvasDraw, cssWrapper } from "../style";
import {
  getCamera,
  getTextureMaterial,
  getGeometry,
  paintFace,
} from "../methods/three";

const IMAGE =
  "https://samarthgulati.com/ar-face-filters/assets/cherial-mask.jpg";

const Engine = ({ skin, lip, eyeShadow, onReady }) => {
  const [ready, setReady] = useState(false);
  const color = useRef({ skin, lip, eyeShadow });
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasCamRef = useRef(null);
  const webcamRef = useRef(null);
  const VIDEO_WIDTH = 640;
  const VIDEO_HEIGHT = 480;

  useEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);

  useEffect(() => {
    /* set color props to color ref
    in paiting methods we are using ref instead of props to avoid depedencies
    that cause re-render and re-init the whole things when user do some changes */
    color.current = { skin, lip, eyeShadow };
  }, [skin, lip, eyeShadow]);

  useEffect(() => {
    let video = webcamRef.current;
    let canvas = canvasRef.current;

    let videoWidth, videoHeight, model;
    let camera, material, scene, renderer, geometry, predictions, positions;
    let recursive = true;
    const stats = new Stats();

    const renderThree = async () => {
      stats.begin();
  
      requestAnimationFrame(renderThree);

      if (positions.length === 0) return;

      const positionBuffer = positions.reduce(
        (acc, pos) => acc.concat(pos),
        []
      );
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionBuffer, 3)
      );
  
      geometry.attributes.position.needsUpdate = true;

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
    
      renderer.render(scene, camera);
  
      stats.end();
    };

    const init = async () => {
      await tf.setBackend("webgl");
      stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
      wrapperRef.current.appendChild(stats.dom);

      await setupCamera(video, VIDEO_WIDTH, VIDEO_HEIGHT);
      video.play();
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;

      video.width = videoWidth;
      video.height = videoHeight;
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        {
          maxContinuousChecks: 5,
          detectionConfidence: 0.9,
          maxFaces: 1,
          iouThreshold: 0.3,
          scoreThreshold: 0.75,
        }
      );

      predictions = await model.estimateFaces({
        input: video,
      });

      if(predictions.length === 0) return;
      positions = predictions[0].scaledMesh;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        canvas: canvas,
      });

      /* create scene */
      scene = new THREE.Scene();

      /* create camera */
      camera = getCamera(canvas);

      /* create light */
      const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
      scene.add(light);

      /* load material */
      material = getTextureMaterial(IMAGE);

      geometry = getGeometry();

      await renderThree();
      setReady(true);
    }
  
    init();

    /* component unmount */
    return () => {
      /* end predictAndPaint recursive call */
      recursive = false;
      /* stop webcam */
      stopCamera(webcamRef);
    };
  }, []);

  return (
    <div ref={wrapperRef} className={cssWrapper}>
      {/* <video ref={webcamRef} playsInline className={cssCam} /> */}
      <video ref={webcamRef} className={cssCanvasBase} />
      <canvas ref={canvasRef} className={cssCanvasDraw} />
      {/* <Resize>
        <canvas ref={canvasRef} className={cssCanvasDraw} />
      </Resize> */}
    </div>
  );
};

export default Engine;
