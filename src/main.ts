
// Original code by Adam Mally, additions by Nathan Devlin

import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Cube from './geometry/Cube';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 6,
  'Load Scene': loadScene, // A function pointer, essentially
  LightPosTheta: 0,
  LightPosDistance: 20,
  LightPosAzimuth: 90
};

// Controller that allows user color input
const colorObject = 
{
  // Light Blue
  OceanColor: [ 0, 100, 255 ], // RGB array
};

// Controller that allows user color input
const lightColor = 
{
  // 5000 Kelvin in RGB
  LightColor: [ 255, 228, 206 ], // RGB array
};

let icosphere: Icosphere;

let square: Square;

let cube: Cube;

let prevTesselations: number = 6;

// Used as a clock
let currTick: number = 0.0;

// Takes in spherical coordinates and returns a corresponding vec4 in cartesian coordinates
function convertSphericalToCartesian(thetaDeg: number, distance: number, azimuthDeg: number) : vec4
{
  let theta: number = thetaDeg * 0.01745329252;
  let azimuth: number = azimuthDeg * 0.01745329252;

  let z: number = distance * Math.sin(azimuth) * Math.cos(theta);
  let x: number = distance * Math.sin(azimuth) * Math.sin(theta);
  let y: number = distance * Math.cos(azimuth);

  return vec4.fromValues(x, y, z, 1.0);
}


function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();

  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();

  // Cube constructor takes in object origin
  cube = new Cube(vec3.fromValues(3, 3, -3));
  cube.create();
}


function main() 
{
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.add(controls, 'Load Scene');
  

  gui.add(controls, 'LightPosTheta', -720, 720).step(1);
  gui.add(controls, 'LightPosDistance', 5, 50).step(0.1);
  gui.add(controls, 'LightPosAzimuth', 10, 170).step(1);

  // Color control; RGB input
  gui.addColor(colorObject, 'OceanColor');

    // Color control; RGB input
  gui.addColor(lightColor, 'LightColor');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);

  renderer.setClearColor(0.2, 0.2, 0.2, 1);

  gl.enable(gl.DEPTH_TEST);

  // Standard lambert shader
  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  // Noise-based vertex and fragment shaders
  const custom = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() 
  {
    // Increment the clock
    currTick += 1.0;

    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }

    // Render with lambert shader
    /*
    renderer.render(camera, lambert, [
      icosphere,
      cube,
    ],
    // Divide by 256 to convert from web RGB to shader 0-1 values
    vec4.fromValues(colorObject.actualColor[0] / 256.0, colorObject.actualColor[1] / 256.0, colorObject.actualColor[2] / 256.0, 1),
    currTick
    );
    */

    // Convert Light Position Spherical Coordinates to CartesianCoordinates
    let lightPos: vec4 = convertSphericalToCartesian(controls.LightPosTheta, controls.LightPosDistance, controls.LightPosAzimuth);

    // Render with custom noise-based shader
    renderer.render(camera, custom, [icosphere, cube],  // Draw Cube as a reference for now
    // Divide by 256 to convert from web RGB to shader 0-1 values
    vec4.fromValues(colorObject.OceanColor[0] / 256.0, colorObject.OceanColor[1] / 256.0, colorObject.OceanColor[2] / 256.0, 1),
    vec4.fromValues(lightColor.LightColor[0] / 256.0, lightColor.LightColor[1] / 256.0, lightColor.LightColor[2] / 256.0, 1),
    currTick,
    lightPos
    );
    
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
