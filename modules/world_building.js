//ebben a modulban vannak definiálva a térben lévő objektumok

//import * as THREE from './three.module.js';
import { registerCollidableObject, TYPE_NORMAL, TYPE_LETHAL, TYPE_POINT, createInvisibleBounds } from './collision.js';
import { scene, renderer } from './game.js';
import { RoughnessMipmapper } from './RoughnessMipmapper.js';
import * as SHADERS from './shaders.js';

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

    loadModel('models/car_rusty/scene.gltf', 0.7, [-240, 0, 168], {boundsSize: [20,20,50], type: TYPE_NORMAL}); 
    loadModel('models/old_truck/scene.gltf', 1.75, [-270, 15, 270], {boundsSize: [20, 30,50], type: TYPE_NORMAL});
    loadModel('models/mi_24_heli/scene.gltf', 0.8, [-75, 20, 360], {boundsSize: [90,30,30], type: TYPE_NORMAL});

    roughnessMipmapper.dispose();
}

//betölti a megadott modelt
//collisionData: opcionális, ha van, akkor a befoglaló doboz méretét tartalmazza, ütközés típusát.
function loadModel(path, scale = 1, positionArray = [0, 0, 0], collisionData = undefined) { 
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

export let maximumCoins = 0; //a megtalálható maximális mennyíségű érme. az érmehozzáadó metódus növeli

export function addCoins() { //hozzáadja a gyűjtendő érméket
    createCoinHelperText();
    createCoin([30,10,-60]); //bemutató érme a felirat mellett
    createCoin([-295,10,270]); //old truck modell mögött
    createCoin([-240,25,160]); //rusty car modell tetején
    createCoin([-132,10,380]); //helikopter mögött
    createCoin([-75,10,380]); //helikopter mögött

    createCoin([70,50,20]); //barna lapon 

    document.getElementById('coinCounter').textContent = 'Érmék: 0/' + maximumCoins; //számoló szöveg inicializálása 
}

function createCoin(position) { //létrehoz egy forgó, felszedhető érmét
    const coinUniforms = { 
        angle: { type: 'float', value: 0.0 }
    }
    SHADERS.COIN_ANGLE_UNIFORMS.push(coinUniforms.angle); //később ez lesz frissítve
    const coinMaterial = new THREE.ShaderMaterial({
        uniforms: coinUniforms,
        wireframe: false,
        side: THREE.DoubleSide,
        vertexShader: SHADERS.coinRotationShader(), //ez végzi a forgatást
        fragmentShader: SHADERS.coinFragmentShader()
    });
    const coinGeometry = new THREE.TorusGeometry(5, 2, 8, 30);
    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    coinMesh.position.set(position[0], position[1], position[2]);
    registerCollidableObject(coinMesh, TYPE_POINT, true); //ütközéskor el lesz távolítva
    scene.add(coinMesh);
    maximumCoins++;
}

function createCoinHelperText() { //tájékoztató szöveget ad a színtérhez
    const loader = new THREE.FontLoader();
    loader.load( 'fonts/helvetiker.json', function ( font ) {
	    const textGeometry = new THREE.TextGeometry( 'Talald meg\naz ermeket', {
	     	font: font,
		    size: 6,
		    height: 5,
		    curveSegments: 12,
		    bevelEnabled: false,
		    bevelThickness: 10,
		    bevelSize: 8,
		    bevelOffset: 0,
		    bevelSegments: 5
        });
        const textMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(-20,15,-60);
        scene.add(textMesh);
        const textBounds = createInvisibleBounds([0,10,-60], [40,20,6]); //hozzáadás az ütközés detektáláshoz
        registerCollidableObject(textBounds, TYPE_NORMAL);
    });
}