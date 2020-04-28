/**
 * @summary Világ építő modul
 * @file Ebben a modulban vannak definiálva az objektumok, modellek és az, hogy a színtér melyik 
 * pozíciójába kerülnek.
 * @since I. mérföldkő
 * @author Gáspár Tamás
 * @module world_building
 */

import { registerCollidableObject, TYPE_NORMAL, TYPE_LETHAL, TYPE_POINT, createInvisibleBounds } from './collision.js';
import { scene, renderer, AMBIENT_LIGHT_INTENSITY } from './game.js';
import { sunPosition, sunLightIntensity } from './day_night.js';
import { RoughnessMipmapper } from './RoughnessMipmapper.js';
import { createMovingPlatform, createMovingObstacle, createHealingObject } from './animation.js';
import * as SHADERS from './shaders.js';
import { attachRadioactivitySound } from './sound.js';

/**
 * @summary Objektum hozzáadás
 * @description Itt kell meghatározni, hogy az egyszerű ThreeJs objektumok a színtér melyik részére kerüljenek.
 * A gltf modellek nem itt, hanem a {@link module:world_building.addModels} metódusban vannak hozzáadva. Kivételt 
 * képeznek az érmék, amiknek [saját hozzáadó metódusuk]{@link module:world_building.addCoins} van.
 * @function
 * @since I. mérföldkő
 */
export function addObjects() {
    //createMovingPlatform([-60,10,-20],[40,5,40],'Z',[-20,60],5000); //teszt
    createHealingObject(-30,10,-60); //bemutató a felirat mellett

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

/**
 * @summary Téglatestek létrehozása
 * @description Létrehoz egy téglatestet, ami hozzáadódik a színtérhez és az ütközés detektáláshoz is.
 * @param {number[]} position A téglatest pozíciója (x, y, z). 
 * @param {number[]} bounds A téglatest kiterjedése (x, y, és z irányban). 
 * @param {int|string} collisionType A téglatest ütközésdetektálási típusa. 
 * @param {hexadecimal} [color = undefined] A szín. Opcionális, ha nincs megadva, akkor véletlen lesz. 
 * @returns {THREE.Mesh} Az elkészült téglatest. Alapesetben erre nincs szükség, de vissza van adva ha még esetleg 
 * külön módosításokat kell elvégezni rajta.
 */
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
    mesh.castShadow = true;
    mesh.receiveShadow = false; //a jobb FPS érdekében ez nem kap árnyékot, csak vet
    registerCollidableObject(mesh, colType);
    scene.add(mesh);
    return mesh;
}

const SPIKE_RADIUS = 2;
const SPIKE_HEIGHT = 10;
const SPIKE_GAP = 1;

/**
 * @summary Tüskék
 * @description Létrehoz, majd a színtérhez és az ütközésdetektáláshot ad egy 
 * [tüske]{@link https://threejs.org/docs/#api/en/geometries/ConeGeometry} mezőt, 
 * ami megöli a játékost, ha érintkezik vele. A megadott a center körüli width/2, length/2 téglalapra rakja a tüskéket.
 * A tüskék egy [objektumcsoportba]{@link https://threejs.org/docs/#api/en/objects/Group} kerülnek. 
 * @param {number[]} center A mező közepe (x, y, z). 
 * @param {number} width A mező kiterjedése az x tengely mentén. 
 * @param {number} length A mező kiterjedésa a z tengely mentén. 
 * @returns {THREE.Group} Az elkészült tüske csoport. Alapestben nincs rá szükség, de ezzel lehet módosítani a mezőt.
 */
function createSpikeField(center, width, length) {
    const spikesGroup = new THREE.Group();
    let spikePosition = [center[0]-width/2+SPIKE_RADIUS, center[1]+SPIKE_HEIGHT/2, center[2]-length/2+SPIKE_RADIUS];
    while(spikePosition[0] < center[0]+width/2-SPIKE_RADIUS) { //tüskék helyezése x irányban
        while(spikePosition[2] < center[2]+length/2-SPIKE_RADIUS) { //tüskék helyezése z irányban
            const spike = new THREE.Mesh(
                new THREE.ConeGeometry(SPIKE_RADIUS, SPIKE_HEIGHT),
                new THREE.MeshLambertMaterial({ color: 0x7E7E7E })); //szürke
            spike.position.x = spikePosition[0];
            spike.position.y = spikePosition[1];
            spike.position.z = spikePosition[2];
            spike.castShadow = true;
            spike.receiveShadow = false;
            spikesGroup.add(spike);
            spikePosition[2] += 2*SPIKE_RADIUS + SPIKE_GAP;
        }
        spikePosition[0] += 2*SPIKE_RADIUS + SPIKE_GAP;
        spikePosition[2] = center[2]-length/2+SPIKE_RADIUS; //z alaphelyzetbe
    }
    scene.add(spikesGroup);
    //az ütközésdetektálást 1 befoglaló téglatest hajtja végre. A spike field halálos
    const spikeFieldBounds = createInvisibleBounds(center, [width, SPIKE_HEIGHT, length]);
    registerCollidableObject(spikeFieldBounds, TYPE_LETHAL);
}

/**
 * Betölti a GLTF modelleket. [Forrás]{@link https://github.com/mrdoob/three.js/blob/master/examples/js/loaders/GLTFLoader.js}
 * @type {THREE.GLTFLoader}
 * @var
 */
let gltfLoader;
/**
 * Segéd objektum, ami 'elvileg' segíti a fémes felületek megjelenítését.
 * @var
 * @type {RoughnessMipmapper}
 */
let roughnessMipmapper;
/**
 * @summary Modellek hozzáadása
 * @description Hozzáadja a gltf modelleket a színtérhez. Az egyszerű ThreeJs objektumok hozzáadása nem itt, hanem a 
 * {@link module:world_building.addObjects} metódusban történik.
 * @function
 * @since I. mérföldkő
 */
export function addModels() {
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

    loadModel('palace_of_culture', 2.5, [-300,75,-720]); //háttér épületek

    loadModel('grass_1', 0.5, [-120,0,-30]); //extra növényzet
    loadModel('grass_1', 0.5, [-60,0,150]);
    loadModel('grass_1', 0.5, [210,0,10]);
    loadModel('grass_1', 0.5, [110,0,300]);
    loadModel('grass_1', 0.5, [140,0,-300]);
    roughnessMipmapper.dispose();
}

/**
 * @summary Modell betöltése
 * @description Betölt egy gltf modellt.
 * @function
 * @since I. mérföldkő
 * @param {string} path A modell elérési útvonala. A models mappát és a scene.gltf fájlt nem kell megadni, mert az 
 * minden modellnél ugyanaz. 
 * @param {number} scale Megadja, hogy mennyire legyen felskálázva a modell. 
 * @param {number[]} positionArray A modell pozíciója (x, y, z).
 * @param {dictionary} [collisionData = undefined] Egy opcionális dictionary, ami a modell ütközésdetektálási 
 * tulajdonságait adja meg. Ha nincs megadva, akkor a modell nem kerül az ütközésdetektálásba.
 * @param {boolean} [rotate = false] Opcionális, ha igaz, akkor 90 fokkal forgatja az objektumot az z tengely mentén. 
 */
export function loadModel(path, scale = 1, positionArray = [0, 0, 0], collisionData = undefined, rotate = false) { 
    gltfLoader.load('models/'+path+'/scene.gltf', function ( gltf ) {  
        gltf.scene.position.set(positionArray[0], positionArray[1], positionArray[2]);
        gltf.scene.traverse( function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false; //a jobb FPS érdekében ez nem kap árnyékot, csak vet
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
/**
 * A megtalálható maximális mennyíségű érme. Az [érme létrehozó metódus]{@link module:world_building.createCoin}
 * dinamikusan növeli.
 * @var
 */
export let maximumCoins = 0;

/**
 * @summary Érmék hozzáadása
 * @description Hozzáadja a színtérhez a gyűjtendő érméket. A hozzáadás után inicializálja az UI 
 * érméket számoló részét.
 * @function
 * @since I. mérföldkő
 */
export function addCoins() { 
    createCoinHelperText();
    createCoin(30,10,-60); //bemutató érme a felirat mellett

    createCoin(30,30,0); //kezőpozíció melletti 'pálya' érméi
    createCoin(70,50,20);
    createCoin(130,55,15);
    createCoin(150,80,-12);
    createCoin(135,95,-60);
    createCoin(135,95,-125);
    createCoin(10,110,-140);

    createCoin(-295,10,270); //old truck modell mögött
    createCoin(-240,25,160); //rusty car modell tetején
    createCoin(-328,10,180);

    createCoin(143,10,380); //helikopter mögött
    createCoin(200,10,380); //helikopter mögött
    createCoin(332,10,336); //t34 melett
    createCoin(332,10,370); //t34 mellett
    createCoin(383,10,269); //radioaktív területen
    createCoin(410,10,243); //radioaktív területen
    createCoin(350,20,236); //radioaktív területen

    createCoin(-180,10,-460); //palace of culture
    createCoin(-220,10,-460);

    document.getElementById('coinCounter').textContent = 'Érmék: 0/' + maximumCoins; //számoló szöveg inicializálása 
}

const COIN_SHININESS = 3;

/**
 * @summary Érme létrehozása
 * @description Létrehoz egy begyűjthető [érmét]{@link https://threejs.org/docs/#api/en/geometries/TorusGeometry}.
 * Ennek egyedi shaderei vannak, amik a [shader modulban]{@link module:shaders} találhatóak. 
 * @function
 * @since I. mérföldkő
 * @param {number} x X koordináta.
 * @param {number} y Y koordináta. 
 * @param {number} z Z koordináta. 
 */
function createCoin(x, y, z) { 
    const coinUniforms = { 
        angle: { type: 'float', value: 0.0 }, //ez majd változtatva lesz
        ambientLightIntensity: { type: 'float', value: AMBIENT_LIGHT_INTENSITY},
        sunPosition: { type: 'vec3', value: sunPosition },
        sunLightIntensity: { type: 'float', value: sunLightIntensity },
        coinShininess: { type: 'float', value: COIN_SHININESS}
    }
    const coinMaterial = new THREE.ShaderMaterial({
        uniforms: coinUniforms,
        wireframe: false,
        side: THREE.DoubleSide,
        vertexShader: SHADERS.coinRotationShader(), //ez végzi a forgatást
        fragmentShader: SHADERS.coinFragmentShader()
    });
    const coinGeometry = new THREE.TorusGeometry(5, 2, 8, 30);
    SHADERS.saveCoinData(coinUniforms.angle, coinUniforms.sunPosition, coinUniforms.sunLightIntensity); //ezeket később frissíteni kell
    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    coinMesh.castShadow = true; //sajnos ezek árnyéka nem forog az érmével együtt
    coinMesh.receiveShadow = false; //a jobb FPS érdekében ez nem kap árnyékot, csak vet
    coinMesh.position.set(x, y, z);
    registerCollidableObject(coinMesh, TYPE_POINT, true); //ütközéskor el lesz távolítva
    scene.add(coinMesh);
    maximumCoins++;
}

/**
 * @summary Utasítás a játékosnak
 * @description Tájékoztató [szöveget]{@link https://threejs.org/docs/#api/en/geometries/TextGeometry} ad a színtérhez.
 * Ez a szöveg eltűnik amint a játékos ütközik vele.
 * @function
 * @since I. mérföldkő
 */
function createCoinHelperText() { 
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