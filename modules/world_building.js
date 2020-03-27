//ebben a modulban vannak definiálva a térben lévő objektumok

//import * as THREE from './three.module.js';
import { registerCollidableObject, TYPE_NORMAL, TYPE_LETHAL, TYPE_POINT, createInvisibleBounds } from './collision.js';
import { scene, renderer, SUN_POSITION, SUN_LIGHT_INTENSITY, AMBIENT_LIGHT_INTENSITY} from './game.js';
import { RoughnessMipmapper } from './RoughnessMipmapper.js';
import { createMovingPlatform, createMovingObstacle } from './animation.js';
import * as SHADERS from './shaders.js';
import { attachRadioactivitySound } from './sound.js';

export function addObjects() {
    //createMovingPlatform([-60,10,-20],[40,5,40],'Z',[-20,60],5000); //teszt
    createBox([30,10,0],[20,20,20]); //kezdő pozíció melletti 'pálya'
    createBox([70,35,20],[40,10,20]);
    createSpikeField([100,0,20], 40, 20);
    createBox([130,40,15],[20,10,20]);
    createBox([150,65,-12],[20,10,20]);
    createBox([140,80,-90],[30,10,100]); //efelett megy az animált akadály, alatta spike field
    createMovingObstacle([180,100,-90],[10,30,30], 'X', [180,100], 3000);
    createSpikeField([140,0,-90],150,60);
    createMovingPlatform([130,90,-170], [30,5,30], 'X', [130,50], 5000);
    createBox([10,100,-140],[40,10,40]);
}

//létrehoz egy téglatestet a megadott pozíción, a megadott mérettel és színnek.
//A szín opcionális, ha nincs megadva, akkor véletlen lesz.
//Az eredmény hozzáadódik az ütközés detektáláshoz és a színtérhez is.
export function createBox(position, bounds, collisionType, color) {
    let appliedColor = Math.round(0xffffff * Math.random());
    let colType = TYPE_NORMAL;
    if(color !== undefined) {
        appliedColor = color;
    } 
    if(collisionType !== undefined) {
        colType = collisionType;
    }
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(bounds[0], bounds[1], bounds[2]),
        new THREE.MeshLambertMaterial({color: appliedColor})
    );
    mesh.position.set(position[0], position[1], position[2]);
    registerCollidableObject(mesh, colType);
    scene.add(mesh);
    return mesh; //alapesetben erre nincs szükség
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

    //roncstelep
    loadModel('car_rusty', 0.7, [-240, 0, 168], {boundsSize: [20,20,50], type: TYPE_NORMAL}); 
    loadModel('old_truck', 1.75, [-270, 15, 270], {boundsSize: [20, 30,50], type: TYPE_NORMAL});
    loadModel('car_crashed', 0.9, [-310,0,180], {boundsSize:[20,30,40], type: TYPE_NORMAL});
    loadModel('tree_1', 0.85, [-220,0,242], {boundsSize:[5,40,5], type: TYPE_NORMAL});
    loadModel('tree_1', 0.85, [-288,0,117], {boundsSize:[5,60,5], type: TYPE_NORMAL});
    loadModel('tree_2', 0.6, [-191,0,107], {boundsSize:[5,60,5], type: TYPE_NORMAL});
    loadModel('tree_2', 0.6, [-332,0,230], {boundsSize:[5,60,5], type: TYPE_NORMAL});

    //bázis
    loadModel('mi_24_heli', 0.8, [200, 20, 360], {boundsSize: [90,30,30], type: TYPE_NORMAL});
    loadModel('tank_t34', 0.68, [300,-20,362], {boundsSize: [40,75,70], type: TYPE_NORMAL});
    loadModel('atom_bomb',0.7, [360,5,260], {boundsSize: [10,10,10],type: TYPE_NORMAL});
    loadModel('radioactive_box',0.8, [375,-2,240], {boundsSize: [5,10,5],type: TYPE_NORMAL});
    loadModel('radioactive_barrel',0.7, [350,0,236], {boundsSize: [5,10,5],type: 'DAMAGE-100-STOP'});
    loadModel('radioactive_barrel',0.7, [400,0,275], {boundsSize: [5,10,5],type: 'DAMAGE-100-STOP'});
    loadModel('radioactive_barrel',0.7, [393,0,250], {boundsSize: [5,10,5],type: 'DAMAGE-100-STOP'});
    const radSoundMesh = createInvisibleBounds([360,5,260],[1,1,1]); //ebből jön a pozícionális hang
    scene.add(radSoundMesh);
    attachRadioactivitySound(radSoundMesh);
    loadModel('fence', 1.55, [460,0,215], {boundsSize: [70,100,10], type: TYPE_NORMAL}); //bázis körüli kerítés
    loadModel('fence', 1.55, [385,0,215], {boundsSize: [70,100,10], type: TYPE_NORMAL});
    loadModel('fence', 1.55, [310,0,215], {boundsSize: [70,100,10], type: TYPE_NORMAL});
    loadModel('fence', 1.55, [235,0,215], {boundsSize: [70,100,10], type: TYPE_NORMAL});
    //bejárat itt
    loadModel('fence', 1.55, [140,0,215], {boundsSize: [70,100,10], type: TYPE_NORMAL});
    loadModel('fence', 1.55, [65,0,215], {boundsSize: [70,100,10], type: TYPE_NORMAL});
    loadModel('fence', 1.55, [25,0,255], {boundsSize: [10,100,70], type: TYPE_NORMAL}, true);
    loadModel('fence', 1.55, [25,0,330], {boundsSize: [10,100,70], type: TYPE_NORMAL}, true);
    loadModel('fence', 1.55, [25,0,405], {boundsSize: [10,100,70], type: TYPE_NORMAL}, true);
    loadModel('fence', 1.55, [25,0,480], {boundsSize: [10,100,70], type: TYPE_NORMAL}, true);

    roughnessMipmapper.dispose();
}

//betölti a megadott modelt
//collisionData: opcionális, ha van, akkor a befoglaló doboz méretét tartalmazza, ütközés típusát.
function loadModel(path, scale = 1, positionArray = [0, 0, 0], collisionData = undefined, rotate = false) { 
    gltfLoader.load('models/'+path+'/scene.gltf', function ( gltf ) {  
        gltf.scene.position.set(positionArray[0], positionArray[1], positionArray[2]);
        gltf.scene.traverse( function (child) {
            if (child.isMesh) {
                roughnessMipmapper.generateMipmaps(child.material);
                if(rotate) {
                    child.rotation.z += Math.PI/2;
                }
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

    createCoin([30,30,0]); //kezőpozíció melletti 'pálya' érméi
    createCoin([70,50,20]);
    createCoin([130,55,15]);
    createCoin([150,80,-12]);
    createCoin([135,95,-60]);
    createCoin([135,95,-125]);
    createCoin([10,110,-140]);

    createCoin([-295,10,270]); //old truck modell mögött
    createCoin([-240,25,160]); //rusty car modell tetején
    createCoin([-328,10,180]);


    createCoin([143,10,380]); //helikopter mögött
    createCoin([200,10,380]); //helikopter mögött
    createCoin([332,10,336]); //t34 melett
    createCoin([332,10,370]); //t34 mellett
    createCoin([383,10,269]); //radioaktív területen
    createCoin([410,10,243]); //radioaktív területen
    createCoin([350,20,236]); //radioaktív területen

    document.getElementById('coinCounter').textContent = 'Érmék: 0/' + maximumCoins; //számoló szöveg inicializálása 
}

function createCoin(position) { //létrehoz egy forgó, felszedhető érmét
    const coinUniforms = { 
        angle: { type: 'float', value: 0.0 }, //ez majd változtatva lesz
        ambientLightIntensity: { type: 'float', value: AMBIENT_LIGHT_INTENSITY},
        sunPosition: { type: 'vec3', value: SUN_POSITION },
        sunLightIntensity: { type: 'float', value: SUN_LIGHT_INTENSITY }
    }
    const coinMaterial = new THREE.ShaderMaterial({
        uniforms: coinUniforms,
        wireframe: false,
        side: THREE.DoubleSide,
        vertexShader: SHADERS.coinRotationShader(), //ez végzi a forgatást
        fragmentShader: SHADERS.coinFragmentShader()
    });
    const coinGeometry = new THREE.TorusGeometry(5, 2, 8, 30);
    SHADERS.saveCoinData(coinUniforms.angle, coinGeometry); //ezeket később frissíteni kell
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
        registerCollidableObject(textMesh, TYPE_NORMAL, true);
    });
}