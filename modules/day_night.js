/**
 * @summary Éj-nappal ciklus
 * @file Ebben a modulban vannak megvalósítva az éj-nappal ciklust megatározó metódusok. Két égitest(nap és hold) mozog 
 * egy, a Z tengellyel párhuzamos körpáján.
 * <p>
 * A játékbeli idő a képernyő bal felső sarkában látható. A nap pontosan 18 órakor nyugszik és 6 órakor kel. A hold pedig 
 * az egyszerűség kedvéért éppen akkor látszik, amikor a nap nem. A játékbeli idő gyorsabban halad a valódinál, 
 * ezt egy [változóval]{@link module:day_night.timeSpeedup} lehet szabályozni.
 * <p>
 * A bal fölső sarokban lévő óra gombbal jelentősen felgyorsítható a játékbeli idő, így könnyen meg lehet nézni az 
 * egész éj nappal ciklust.
 * <p>
 * A játékbeli idő NEM a render loopban frissül, mivel itt fontos hogy minden másodperceben frissüljön pontosan egyszer.
 * @since II. mérföldkő
 * @author Gáspár Tamás
 * @module day_night
 */

import { scene, arenaSize, camera, vecToString } from './game.js';
import { GodRaysEffect } from './postprocessing.esm.js';

/**
 * A kezdeti játékbeli idő. Tetszőlegesen állítható (csak valódi óra-perc-másodperc hármasra).
 */
const startingTime = {hour: 16, minute: 0, second: 0};
let fastTime = false; //segéd
/**
 * Megmondja, hogy hány másodperc teljen el a játékban, amíg a valóságban 1 másodperc telik el.
 * @var
 * @private
 */
let timeSpeedup = 60;
 /**
 * A nap pozíciója a színtérben.
 * @type {THREE.Vector3}
 */
export const sunPosition = new THREE.Vector3();
/**
 * A hold pozíciója s színtérben.
 * @type {THREE.Vector3}
 */
const moonPosition = new THREE.Vector3();
/**
 * Napfény intenzitás.
 * @var
 */
export let sunLightIntensity;
/**
 * A maximális fényintenzitás, amit akkor kap a fény, ha éppen dél a [játékbeli idő]{@link module:day_night.inGameTime}.
 */
const MAX_INTENSITY = 0.8;
/**
 * [Napfényt]{@link https://threejs.org/docs/#api/en/lights/DirectionalLight} szimuláló fény.
 * @constant
 * @type {THREE.DirectionalLight}
 */
const sunLight = new THREE.DirectionalLight(0xffccaa, sunLightIntensity);

/**
 * Az égitestek pályályát meghatározó görbe. Ez egy, a bejárható terület nagyjából középpontja körül húzódó kör.
 * @var
 * @type {THREE.EllipseCurve}
 */
let celestialBodyPath;
/**
 * A napot reprezentáló objektum.
 * @constant
 * @type {THREE.Mesh}
 * @private
 */
const SUN = new THREE.Mesh(new THREE.SphereGeometry(100,10,10), new THREE.MeshBasicMaterial({color: 0xFFFF00}));
/**
 * A holdat reprezentáló objektum, ami egy GLTF modell.
 * @var
 * @private
 */
let MOON; 
/**
 * @summary Éj-nappal ciklus
 * @description Beállítja a napfény és árnyékának tulajdonságait. Elindítja az éj-nappal ciklust.
 * @function
 * @since II. mérföldkő
 */
/**
 * Megmondja, hogy éppen melyik skybox van betöltve.
 * @var
 * @private
 */
let showingNightSky = false;
/**
 * @summary Éj-nappal ciklus indítása
 * @description Elindítja az éj-nappal ciklust az égitestek és pályájuk betöltésével.
 * @function
 * @since II. mérföldkő
 */
export function initiateDayNightCycle() {
    inGameTime = Date.today().set(startingTime);
    loadAndSetSkyboxes(inGameTime.getHours());

    celestialBodyPath = new THREE.EllipseCurve(0, 0, 2*arenaSize, 2*arenaSize, 0, 2*Math.PI, true, Math.PI);
    updateTimeDisplayer(inGameTime); //idő megjelenítése

    scene.add(SUN);
    SUN.material.fog = false; //különben elveszti a színét
    SUN.position.set(sunPosition.x, sunPosition.y, sunPosition.z); //nap és napfény pozícionálása
    sunLight.position.set(sunPosition.x, sunPosition.y, sunPosition.z); 
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 0.5; //a shadow camera méreteit ki kell nagyítani, hogy az egész színteret lefedjék
    sunLight.shadow.camera.far = arenaSize*5;
    sunLight.shadow.mapSize.width = arenaSize; 
    sunLight.shadow.mapSize.height = arenaSize; 
    sunLight.shadow.camera.right = -arenaSize;
    sunLight.shadow.camera.left = arenaSize;
    sunLight.shadow.camera.top = arenaSize;
    sunLight.shadow.camera.bottom = -arenaSize;
    //scene.add(new THREE.CameraHelper(sunLight.shadow.camera)); // --> mutatja a shadow kamerát 
    scene.add(sunLight);
    loadMoon(2); //hold betöltése
    createLightPostprocessing();

    window.setInterval(function() {
        updateDayNightCycle();
    }, 1000);

    const speedButton = document.getElementById('timeSpeedupImage'); //idő gyorsító gomb
    speedButton.addEventListener('click', function() {
        if(fastTime) { //lassítás
            timeSpeedup = 60;
            speedButton.src = 'img/time_normal.png';
        } else { //gyorsítás
            timeSpeedup = timeSpeedup * 10;
            speedButton.src = 'img/time_fast.png';
        }
        fastTime = !fastTime;
    })
}
/**
 * @summary Éj-nappal ciklus frissítése
 * @description Előremozdítja a játékbeli időt majd ettől függően átállítja az égeitestek pozícióját.
 * Minden másodpercben egyszer hívódik meg.
 * @function
 * @since II. mérföldkő
 */
function updateDayNightCycle() {
    inGameTime.addSeconds(timeSpeedup); //idő előremozdítása
    updateTimeDisplayer(inGameTime);
    get3DPointFromPath(inGameTime, sunPosition, moonPosition); //új hely kérése az égitesteknek
    sunLight.position.set(sunPosition.x, sunPosition.y, sunPosition.z); //nap mozgatása
    SUN.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
    if(MOON != undefined) { //lehet hogy még nem töltött be
        MOON.position.set(moonPosition.x, moonPosition.y, moonPosition.z);
    }
    sunLightIntensity = sunLightIntensityFunction(sunPosition.y); //új fényerő
    if(SUN.position.y < 0 && !showingNightSky) { //skybox frissítések
        scene.background = nightSkybox;
    } else if(SUN.position.y > 0 && showingNightSky) {
        scene.background = skybox;
    }
}
/**
 * A nappali skybox.
 * @var
 * @type {THREE.CubeTexture}
 */
let skybox;
/**
 * Az éjjeli skybox.
 * @var
 * @type {THREE.CubeTexture}
 */
let nightSkybox;
/**
 * @summary Skybox
 * @description Betölti a skybox textúrákat és beállítja a megfelelőt, attól függően hogy mennyi a kezdeti játékbeli idő.
 * @param {int} hours A kezdeti játékidő.
 * @function
 * @since II. mérföldkő
 */
function loadAndSetSkyboxes(hours) {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('img/');
    skybox = loader.load([ 
        'miramar_lf.png','miramar_rt.png', //x irány
        'miramar_up.png','miramar_dn.png', //y irány
        'miramar_ft.png','miramar_bk.png'] //z irány
    );
    nightSkybox = loader.load([
        'skybox_left.png','skybox_right.png',
        'skybox_up.png','skybox_down.png',
        'skybox_front.png','skybox_back.png']
    );
    if(hours > 6 && hours < 18) {
        scene.background = skybox;
    } else {
        scene.background = nightSkybox;
    }
}
/**
 * @summary Hold betöltés
 * @function
 * @description Betölti a hold modelljét és a színtérbe helyezi.
 * @param {number} scale Skálázási érték.
 * @since II. mérföldkő
 */
function loadMoon(scale) {
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load('models/moon/scene.gltf', function ( gltf ) {  
        gltf.scene.position.set(position[0], position[1], position[2]);
        gltf.scene.traverse( function (child) {
            if(child.isMesh) {
                child.material.fog = false;
            }
            child.scale.set(scale, scale, scale);
        });
        MOON = gltf.scene;
        scene.add(MOON);
    }, undefined, function ( error ) {
        console.error(error);
    });
}

/**
 * A god ray effektust meghatározó objektum.
 * @var
 * @type {GodRaysEffect}
 */
export let godRays;
/**
 * @summary God rays effektus
 * @description Hozzáad a [naphoz]{@link module:day_night.SUN} egy fénysugár effektust.
 * @function
 * @since II. mérföldkő
 */
function createLightPostprocessing() {
    godRays = new GodRaysEffect(camera, SUN, {
        resolutionScale: 1,
        density: 0.8,
        decay: 0.95,
        weight: 0.9,
        samples: 100
    });
}
/**
 * A játékbeli idő komponenseit tartalmazza. Csak az óra, perc és másodperc a lényeges elemei. 
 * @constant
 * @type {Date}
 */
let inGameTime;
/**
 * Egy nap perceinek száma, normalizáláshoz.
 * @constant
 * @private
 */
const TOTAL_MINUTES = 60 * 24;

const vec2 = new THREE.Vector2(0,0); //hogy ne kelljen mindig példányosítani 
/**
 * @summary Égitest pozícionálás
 * @description Megkeresi az adott időhoz tartozó pozíciót a nap és a hold számára.
 * @param {Date} time A játékbeli idő. 
 * @param {THREE.Vector3} sunPosition A vektor, amibe az eredmény belemásolódik (nap).
 * @param {THREE.Vector3} moonPosition A vektor, amibe az eredmény belemásolódik (hold).
 */
function get3DPointFromPath(time, sunPosition, moonPosition) {
    const scaledTime = (time.getHours()*60 + time.getMinutes()) / TOTAL_MINUTES; //az idő átalakítása [0-1] közé
    celestialBodyPath.getPoint(scaledTime, vec2); //nap
    sunPosition.x = 0;
    sunPosition.y = vec2.x;
    sunPosition.z = vec2.y;
    celestialBodyPath.getPoint(findOpposite(scaledTime), vec2); //hold, pont átellenesen
    moonPosition.x = 0;
    moonPosition.y = vec2.x;
    moonPosition.z = vec2.y;
}
function findOpposite(t) { //segéd, megtalálja az átellenes pont paraméterét az elliszisen
    if(t <= 0.5) {
        return t + 0.5;
    } else {
        return t - 0.5;
    }
}
/**
 * Itt jelenik meg a játékbeli idő. Csak az órák és percek jelennek meg.
 * @constant
 * @type {HTMLElement}
 */
const timeDisplayer = document.getElementById('timeDisplayer');
/**
 * @summary Játékbeli idő mutatása
 * @description Frissíti a játékbeli időt mutató szövegdobozt.
 * @function
 * @since II. mérföldkő
 * @param {Date} time Új idő. 
 */
function updateTimeDisplayer(time) {
    let timeString = 'Játékbeli idő: ';
    timeString += time.getHours()<10 ? '0'+time.getHours() : time.getHours();
    timeString += ':'
    timeString += time.getMinutes()<10 ? '0'+time.getMinutes() : time.getMinutes();
    timeDisplayer.textContent = timeString;
}

const M = MAX_INTENSITY / 2000; //segéd, az egyenes meredksége
/**
 * @summary Fény intenzitás
 * @description Ez a függvény fényerőt rendel a naphoz, attól függően hogy milyen 'magasan' van a színtérben. Ez 0 és 
 * a [maximális intenzitás]{@link module:day_night.MAX_INTENSITY} között lesz. A függvény egyszerűen lineáris lesz.
 * @function
 * @since II. mérföldkő
 * @param {number} sunHeight A nap 'magassága'.
 * @returns {number} Az új fényerő.
 */
function sunLightIntensityFunction(sunHeight) {
    if(sunHeight <= 0) return 0; //ekkor a nap fénye nem jelenik meg
    return M * sunHeight;
}