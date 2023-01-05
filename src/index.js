import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import * as Tone from "tone";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";
import { MathUtils } from "three";

let scene, camera, renderer;
let colour, intensity, light;
let ambientLight;
let gridHelper;

let orbit;

let sceneHeight, sceneWidth;

let clock, delta, interval;

let modelLoaded;
let robot, flamingo;

let loader;
let mixers;

let player, meter;

let startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

function init() {
  Tone.start();
  modelLoaded = false;

  // remove overlay
  let overlay = document.getElementById("overlay");
  overlay.remove();

  //create our clock and set interval at 30 fpx
  clock = new THREE.Clock();
  delta = 0;
  interval = 1 / 25;

  //create our scene
  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdedede);

  //create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 10;
  //specify our renderer and add it to our document
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //create the orbit controls instance so we can use the mouse move around our scene
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  // lighting
  colour = 0xffffff;
  intensity = 1;
  light = new THREE.DirectionalLight(colour, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  player = new Tone.Player("./sounds/Warrpy_Beat.mp3", () => {
    player.loop = true;
    player.autostart = true;
  }).toDestination();

  meter = new Tone.Meter();
  meter.smoothing = 0.8;

  player.connect(meter);

  gridHelper = new THREE.GridHelper(1000, 100);
  scene.add(gridHelper);

  mixers = [];
  loadModels();

  window.addEventListener("resize", onWindowResize, false); //resize callback
  play();
}

// stop animating (not currently used)
function stop() {
  renderer.setAnimationLoop(null);
}

// simple render function

function render() {
  renderer.render(scene, camera);
}

// start animating

function play() {
  //using the new setAnimationLoop method which means we are WebXR ready if need be
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

//our update function

function update() {
  orbit.update();
  //update stuff in here
  delta += clock.getDelta();

  if (delta > interval) {
    // The draw or time dependent code are here
    for (let i = 0; i < mixers.length; i++) {
      mixers[i].update(delta);
    }

    if (modelLoaded) {
      robot.position.z = MathUtils.mapLinear(
        meter.getValue(),
        -60,
        12,
        0.0,
        4.0
      );
    }
    delta = delta % interval;
  }
}

function onWindowResize() {
  //resize & align
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
}

function loadModels() {
  loader = new GLTFLoader();

  // this callback handles loading a flamingo GLTF model with animation data
  const onLoadAnimation = function (gltf, position) {
    flamingo = gltf.scene.children[0]; // look for the first child of the scene contained in the gltf - this is our flamingo model
    flamingo.scale.multiplyScalar(0.125); // scale our model to make it smaller
    flamingo.position.copy(position); // set the desired position

    const animation = gltf.animations[0]; // get animation data from the gltf file and assign it to a varible called animation

    const mixer = new THREE.AnimationMixer(flamingo); //create a new ThreeJS animation mixer and pass our flamingo model to it

    mixers.push(mixer); // add our animation mixer to our mixers array

    const action = mixer.clipAction(animation); // pass the animation data to the animation scheduler in the animation mixer
    action.play(); // start the animation

    scene.add(flamingo); // add our animated flamingo model to our scene
  };

  const onLoadStatic = function (gltf, position) {
    robot = gltf.scene.children[0];
    robot.scale.multiplyScalar(1.125);
    robot.position.copy(position);
    modelLoaded = true;
    scene.add(robot);
  };

  // the loader will report the loading progress to this function
  const onProgress = function () {
    console.log("progress");
  };

  // the loader will send any error messages to this function
  const onError = function (errorMessage) {
    console.log(errorMessage);
  };

  // desired position of our flamingo
  const flamingoPosition = new THREE.Vector3(-7.5, 0, -10);

  // load the GLTF file with all required callback functions
  loader.load(
    "models/Flamingo.glb", // specify our file path
    function (gltf) {
      // specify the callback function to call once the model has loaded
      onLoadAnimation(gltf, flamingoPosition);
    },
    onProgress, // specify progress callback
    onError // specify error callback
  );

  const robotPosition = new THREE.Vector3(0, 0, 0);

  loader.load(
    "models/robot.gltf",
    function (gltf) {
      onLoadStatic(gltf, robotPosition);
    },
    onProgress,
    onError
  );
}
