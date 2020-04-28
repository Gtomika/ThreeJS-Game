/**
 * @summary Főmodul
 * @file Itt épül fel a színtér és itt van megírva a render loop. Ez a modul van meghívva a HTML fájlból.
 * @author Gáspár Tamás
 * @since I. mérföldkő
 * @module game
 */
'use strict';

import * as MOVE from './move.js';
import * as COLLISION from './collision.js';
import * as WORLD_BUILDING from './world_building.js';
import * as GAMEPLAY from './gameplay.js';
import * as SOUNDS from './sound.js';
import { updateCoinShader } from './shaders.js';
import  * as DAY_NIGHT from './day_night.js';
import { RenderPass, EffectPass, EffectComposer, SMAAEffect } from './postprocessing.esm.js';

/**
 * Statisztikákat megjelenítő objektum, [stats.js]{@link https://github.com/mrdoob/stats.js/} használatával.
 * @var
 * @private
 * @type {Stats}
 */
let stats;
/**
 * WebGL renderer, ami a színteret megrajzolja.
 * @var
 * @type {THREE.WebGLRenderer}
 */
export let renderer;
/**
 * A színtér.
 * @var
 * @type {THREE.Scene}
 */
export let scene;
/**
 * A kamera, ami azonos a játékossal. A játékost mozgató metódusok valójában ezt mozgatják.
 * @var
 * @type {THREE.PerspectiveCamera}
 */
export let camera;
/**
 * A kamera mozgatását a [pointer lock API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API} 
 * segítségével megvalósító objektum. [Forrás]{@link https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js}.
 * @var
 * @type {THREE.PointerLockControls}
 */
export let controls;
/**
 * Kamerához hozzáadott objektum, amivel a színtérben lévő hangokat lehet 'meghallani'.
 * @var
 * @type {THREE.AudioListener}
 */
export let listener;
/**
 * Egy vektor, amiben a kamera iránya lesz elmentve, így nem kell mindig példányosítani.
 * @constant
 * @private
 * @type {THREE.Vector3} 
 */
const cameraDir = new THREE.Vector3();
/**
 * A kamera magassága a színtértben alaphelyzetben. Ez alapján készül el a játékos [befoglaló doboza]{@link module:collision.createCameraBounds} 
 * és ezt ellenőrzi a [gravitáció]{@link module:collision.gravity}, hogy kell-e lefele mozgatni a játékost.
 * @constant
 */ 
export const CAMERA_BASE_HEIGHT = 15;
/**
 * HTML objektum ami a játékos pozícióját jeleníti meg.
 * @constant
 * @type {HTMLElement}
 */
const posDisplayer = document.getElementById("position");
/**
 * HTML objektum ami a játékos irányát jeleníti meg.
 * @constant
 * @type {HTMLElement}
 */ 
const dirDisplayer = document.getElementById("direction");
/**
 * A bejárható terület mérete az X és Z tengely mentén.
 * @constant 
 */
export const arenaSize = 1000;
/**
 * Eddig lát a kamera és eddig tart a köd hatása.
 * @constant
 * @private
 */
const CAMERA_FAR = 2 * arenaSize; 
/**
 * [Háttérfény]{@link https://threejs.org/docs/#api/en/lights/AmbientLight} intenzitás.
 */
export const AMBIENT_LIGHT_INTENSITY = 0.05; 

/**
 * @summary Főmetódus
 * @description Minden más modul metódusai innen hívódnak meg. Létrhehozza a színteret és megtölti objektumokkal.
 * @function
 * @since I. mérföldkő
 */
function initScene() { 
    // scene és camera
    scene = new THREE.Scene(); 
    scene.fog = new THREE.Fog(0xD3D3D3, 1, CAMERA_FAR); //szürke, lineáris köd

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, CAMERA_FAR);
    camera.position.set(0,CAMERA_BASE_HEIGHT,0);

    listener = new THREE.AudioListener();
    SOUNDS.loadSounds(); //hangok betöltése
    camera.add(listener);
    
    //renderer létrehozása
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.width = arenaSize;
    renderer.shadowMap.height = arenaSize;
    document.getElementById('canvasContainer').appendChild(renderer.domElement);
    //const axes = new THREE.AxesHelper(100); //3D segítő
    //scene.add(axes);

    createBasicEnvironment(); //skybox, talaj
    
    //alacsony intenzitású háttérfény
    const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
    scene.add(ambientLight);

    DAY_NIGHT.initiateDayNightCycle();

    posDisplayer.textContent = vecToString(camera.position); //kezdeti pozíció, irány
    dirDisplayer.textContent = vecToString(camera.getWorldDirection(cameraDir));
    
    controls = new THREE.PointerLockControls(camera, renderer.domElement); //first person irányítás
    const instructions = document.getElementById('instructions');
    instructions.addEventListener( 'click', function () { //pointer lock bekapcsolás
        controls.lock();
        instructions.hidden = true;
    }, false );
    controls.addEventListener('unlock', pointerLockUnlocked); //pointer lock kikapcsolás kezelése
    
    window.addEventListener('keydown', MOVE.keyDownHandler); //billentyűzetkezelés hozzáadása
    window.addEventListener('keyup', MOVE.keyUpHandler);

    WORLD_BUILDING.addObjects(); //a térbeli objektumok hozzáadása 
    WORLD_BUILDING.addModels(); //textúrázott 3D modellek hozzáadása
    WORLD_BUILDING.addCoins(); //gyűjtendő érmék hozzáadása a színtérhez

    GAMEPLAY.initiateUserInterface(); //hp bar, stb...
    addStats();
    initiatePostprocessing(); //composer beállítása
    render(); //renderelés
}
/**
 * A postprocessing objektumokat összefogó objektum.
 * @var
 * @type {EffectCommposer}
 */
let composer;
/**
 * @summary Postprocessing
 * @description Elkészíti a posztprocessinghez szükséges ojektumokat. Ahhoz, hogy ez működjön, a 
 * [day_night modul inicializáló metódusát]{@link module:day_night.crateLightPostprocessing} már meg kell hívni előtte.
 * @function
 * @since II. mérföldkő
 */
function initiatePostprocessing() {
    const renderPass = new RenderPass(scene, camera);
    const areaImage = new Image(); //anti aliasing
    areaImage.src = SMAAEffect.areaImageDataURL;
    const searchImage = new Image();
    searchImage.src = SMAAEffect.searchImageDataURL;
    const smaaEffect = new SMAAEffect(searchImage,areaImage,1);

    const effectPass = new EffectPass(camera, smaaEffect, DAY_NIGHT.godRays);
    effectPass.renderToScreen = true;

    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(effectPass);
}
/**
 * @summary Poointer lock kezelés
 * @description Meghívódik ha pointer lock irányítást kikapcsolják (játékos megnyomja az escape-et, vagy meghal). Megjeleníti 
 * azt a HTML objektumot, amivel vissza lehet kapcsolni az irányítást.
 * @function
 * @callback
 * @since I. mérföldkő
 */
export function pointerLockUnlocked() {
    const instructions = document.getElementById('instructions');
    document.getElementById('spanAction').textContent = "FOLYTATÁSHOZ";
    instructions.hidden = false;
    MOVE.stopMovement();
}
/**
 * @summary Környezet létrehozása
 * @description Elkészíti a színtértben a talajt és a skybox-ot.
 * @function
 * @since I. mérföldkő.
 */
function createBasicEnvironment() {
     //talaj
     const textureLoader = new THREE.TextureLoader();
     const floorTexture = textureLoader.load('img/Ground.jpg');
     floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
     floorTexture.repeat.set(10,10);
     const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture, side: THREE.SingleSide });
     //nagyobb mint a bejárható terület, hogy a játékos ne lássa a 'világ szélét'
     const floorGeometry = new THREE.PlaneGeometry(arenaSize*2, arenaSize*2, 1, 1);
     const floor = new THREE.Mesh(floorGeometry, floorMaterial);
     floor.receiveShadow = true;
     floor.rotation.x = - Math.PI / 2;
     scene.add(floor);
}
/**
 * @summary FPS statisztikák
 * @description Elkészíti a statisztikákat  mutató objektumot.
 * @see module:game.stats
 * @function
 * @since I. mérföldkő
 */
function addStats() { 
    stats = new Stats();
    stats.setMode(0);
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
}
/**
 * @summary Render loop
 * @description Itt történik a statisztikák frissítése, a játékos mozgatása, a gravitáció meghívása és az animációk, 
 * shaderek változóinak frissítése.
 * @function
 * @since I. mérföldkő
 */
const render = function() { 
    stats.update(); //FPS statisztika firssítése
    TWEEN.update(); //tween animációk frissítése

    posDisplayer.textContent = vecToString(camera.position); //frissített pozíció
    dirDisplayer.textContent = vecToString(camera.getWorldDirection(cameraDir)); //frissített irány

    if(MOVE.movingForward) { //mozgások végrehajtása
        controls.moveForward(MOVE.sprinting ? MOVE.SPRINT_SPEED : MOVE.SPEED);
    } else if(MOVE.movingRight) {
        controls.moveRight(MOVE.sprinting ? MOVE.SPRINT_SPEED : MOVE.SPEED);
    } else if(MOVE.movingBack) {
        controls.moveForward(MOVE.sprinting ? -MOVE.SPRINT_SPEED : -MOVE.SPEED);
    } else if(MOVE.movingLeft) {
        controls.moveRight(MOVE.sprinting ? -MOVE.SPRINT_SPEED : -MOVE.SPEED);
    }
    if(MOVE.jumping) { //ugrás végrehajtása
        camera.position.y += MOVE.JUMP_SPEED;
    }     
    //gravitáció szimulálása
    COLLISION.gravity();

    //az ütközések, játéktérből kilépések kezelése
    const cameraBounds = COLLISION.createCameraBounds();
    if(COLLISION.detectOutOfBounds() || COLLISION.detectCollisions(cameraBounds)) {
        MOVE.stopMovement();
    }

    //az érmék uniformjainak frissítése
    updateCoinShader(DAY_NIGHT.sunPosition, DAY_NIGHT.sunLightIntensity);

    composer.render(0.1);
    requestAnimationFrame(render);
}

/**
 * @summary Vektor megjelenítő
 * @description Segéd metódus, ami egy vektort stringgé alakít.
 * @function
 * @since I. mérföldkő
 * @param {THREE.Vector3} vector A vektor.
 */
export function vecToString(vector) { 
    if(vector.z !== undefined) {
        return "("+vector.x.toFixed(2)+", "+vector.y.toFixed(2)+", "+vector.z.toFixed(2)+")";
    } else {
        return "("+vector.x.toFixed(2)+", "+vector.y.toFixed(2)+")";
    }
}

window.addEventListener("resize", () => { //ablakméret változás kezelése
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
});

initScene();