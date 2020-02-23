//ebben a modulban vannak definiálva a térben lévő objektumok

//import * as THREE from './three.module.js';
import { registerCollidableObject, TYPE_NORMAL, TYPE_LETHAL } from './collision.js';
import { scene, renderer } from './game.js';
import { RoughnessMipmapper } from './RoughnessMipmapper.js';

export function addObjects() {
    const cube = new  THREE.Mesh(new THREE.BoxGeometry(20,20,20), new THREE.MeshPhongMaterial({color: 0x00ff00}));
    cube.position.set(30,10,0);
    registerCollidableObject(cube, TYPE_NORMAL);
    scene.add(cube);

    const cuboid = new THREE.Mesh(new THREE.BoxGeometry(40,10,20), new THREE.MeshPhongMaterial({color: 0xE2732B}));
    cuboid.position.set(70, 35, 20);
    registerCollidableObject(cuboid, TYPE_NORMAL);
    scene.add(cuboid);

    createSpikeField([125,0,20], 40, 40);

    const removeableCube = new THREE.Mesh(new THREE.BoxGeometry(10,10,10), new THREE.MeshPhongMaterial({color: 0x00ff00}));
    removeableCube.position.set(100,5,100);
    registerCollidableObject(removeableCube, TYPE_NORMAL, true);
    scene.add(removeableCube);
}

const SPIKE_RADIUS = 2;
const SPIKE_HEIGHT = 10;
const SPIKE_GAP = 1;

function createSpikeField(center, width, length) { //segéd metódus sebző részek készítésére. width: x, length: z
    //a center körüli width/2, length/2 téglalapra rakja a tüskéket
    let spikePosition = [center[0]-width/2+SPIKE_RADIUS, center[1]+SPIKE_HEIGHT/2, center[2]-length/2+SPIKE_RADIUS];

    while(spikePosition[0] < center[0]+width/2-SPIKE_RADIUS) { //tüskék helyezése x irányban

        while(spikePosition[2] < center[2]+length/2-SPIKE_RADIUS) { //tüskék helyezése z irányban

            const spike = new THREE.Mesh(
                new THREE.ConeGeometry(SPIKE_RADIUS, SPIKE_HEIGHT),
                new THREE.MeshPhongMaterial({ color: 0x7E7E7E })); //szürke
            spike.position.x = spikePosition[0];
            spike.position.y = spikePosition[1];
            spike.position.z = spikePosition[2];
            scene.add(spike);

            spikePosition[2] += 2*SPIKE_RADIUS + SPIKE_GAP;
        }
        spikePosition[0] += 2*SPIKE_RADIUS + SPIKE_GAP;
        spikePosition[2] = center[2]-length/2+SPIKE_RADIUS; //z alaphelyzetbe
    }

    //az ütközésdetektálást 1 befoglaló téglatest hajtja végre. A spike field halálos
    const spikeFieldBounds = createInvisibleBounds(center, [width, SPIKE_HEIGHT, length]);
    registerCollidableObject(spikeFieldBounds, TYPE_LETHAL);
}

let gltfLoader;
let roughnessMipmapper;

export function addModels() { //3d modellek betöltése, pozícionálása és a színtérhez adása
    gltfLoader = new THREE.GLTFLoader();
    roughnessMipmapper = new RoughnessMipmapper(renderer);
    loadModel('models/car_rusty/scene.gltf', 0.7, [200, 0, 50], {boundsSize: [20,20,50], type: TYPE_NORMAL}); //Készítő: Renafox
    roughnessMipmapper.dispose();
}

//collisionData: opcionális, ha van, akkor a befoglaló doboz méretét tartalmazza.
function loadModel(path, scale = 1, positionArray = [0, 0, 0], collisionData) { //betölti a megadott modelt
    gltfLoader.load(path, function ( gltf ) {  
        gltf.scene.position.set(positionArray[0], positionArray[1], positionArray[2]);
        gltf.scene.traverse( function (child) {
            if (child.isMesh) {
                roughnessMipmapper.generateMipmaps(child.material);
            }
            child.scale.set(scale, scale, scale);
        });
        if(collisionData !== undefined) { //be kell venni az ütközés detektálásba
            const boundsMesh = createInvisibleBounds(positionArray, collisionData.boundsSize);
            registerCollidableObject(boundsMesh, collisionData.type);
        }
        scene.add(gltf.scene);
    }, undefined, function ( error ) {
        console.error(error);
    });
}

//ez a láthatatlan objektum fogja a modell ütközésdetektálását megvalósítani
function createInvisibleBounds(position, boundsSize) { 
    const material = new THREE.MeshBasicMaterial();
    material.transparent = true;
    const boundMesh = new THREE.Mesh(new THREE.BoxGeometry(boundsSize[0], boundsSize[1], boundsSize[2]), material);
    boundMesh.position.set(position[0], position[1], position[2]);
    return boundMesh;
}