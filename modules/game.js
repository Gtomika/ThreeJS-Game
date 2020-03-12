'use strict';

import * as MOVE from './move.js';
import * as COLLISION from './collision.js'
import * as WORLD_BUILDING from './world_building.js';
import * as GAMEPLAY from './gameplay.js';
import * as SOUNDS from './sound.js';
import {updateCoinRotationAngles} from './shaders.js';

let stats;
export let renderer;
export let scene;
export let camera;
export let controls;
export let listener; //hangokhoz kell

const cameraDir = new THREE.Vector3(); //hogy 'THREE.Camera: .getWorldDirection() target is now required' warning eltűnjön
export const CAMERA_BASE_HEIGHT = 15; //ezen a magasságon van a kamera alapértelmezetten 

//információk: pozíció és irány
const posDisplayer = document.getElementById("position"); 
const dirDisplayer = document.getElementById("direction");

export const arenaSize = 1000; //a bejárható terület mérete

function initScene() {
    // scene és camera
    scene = new THREE.Scene(); 
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,CAMERA_BASE_HEIGHT,0);
    listener = new THREE.AudioListener();
    camera.add(listener);
    
    //renderer létrehozása
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight); //nem teljes magasság
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById('canvasContainer').appendChild(renderer.domElement);
    //const axes = new THREE.AxesHelper(100); //3D segítő
    //scene.add(axes);

    createBasicEnvironment(); //skybox, talaj
    
    //alacsony intenzitású háttérfény
    const ambientLight = new THREE.AmbientLight(0xffffff,0.05);
    scene.add(ambientLight);

    //napfény szimulálása
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
    sunLight.position.set(500,200,500); //0,0,0-ba néz
    scene.add(sunLight);

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
    SOUNDS.loadSounds(); //hangok betöltése
    addStats();
    render(); //renderelés
}

export function pointerLockUnlocked() { //meghívódik ha pointer lock irányítást kikapcsolják
    const instructions = document.getElementById('instructions');
    document.getElementById('spanAction').textContent = "FOLYTATÁSHOZ";
    instructions.hidden = false;
    MOVE.stopMovement();
}

function createBasicEnvironment() {  //hozzáadja a talajt és a skyboxot
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('img/');
    const skyboxGeometry = loader.load([ 
        'miramar_lf.png','miramar_rt.png', //x irány
        'miramar_up.png','miramar_dn.png', //y irány
        'miramar_ft.png','miramar_bk.png'] //z irány
    );
    scene.background = skyboxGeometry;

     //talaj
     const textureLoader = new THREE.TextureLoader();
     const floorTexture = textureLoader.load('img/Ground.jpg');
     floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
     floorTexture.repeat.set(10,10);
     const floorMaterial = new THREE.MeshPhongMaterial({ map: floorTexture, side: THREE.DoubleSide });
     const floorGeometry = new THREE.PlaneGeometry(arenaSize, arenaSize, 1, 1);
     const floor = new THREE.Mesh(floorGeometry, floorMaterial);
     floor.rotation.x = Math.PI / 2;
     scene.add(floor);
}

function addStats() { //FPS statisztika doboz hozzáadása
    stats = new Stats();
    stats.setMode(0);
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);
}

const render = function() { //renderelő metódus
    stats.update();
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
    //az ütközések, játéktérből kilépések kezelése
    const cameraBounds = COLLISION.createCameraBounds();
    if(COLLISION.detectOutOfBounds() || COLLISION.detectCollisions(cameraBounds)) {
        MOVE.stopMovement();
    }
    //gravitáció szimulálása
    COLLISION.gravity(cameraBounds);

    //az 'érmék' forgatása
    updateCoinRotationAngles();

    requestAnimationFrame(render);
    renderer.render(scene, camera); 
}

function vecToString(vector) { //segéd metódus a pozíció, irány megjelenítéséhez
    return "("+vector.x.toFixed(2)+", "+vector.y.toFixed(2)+", "+vector.z.toFixed(2)+")";
}

window.addEventListener("resize", () => { //ablakméret változás kezelése
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
});

initScene();