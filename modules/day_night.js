/**
 * @summary Éj-nappal ciklus
 * @file Ebben a modulban vannak megvalósítva az éj-nappal ciklust megatározó metódusok. Két égitest(nap és hold) mozog 
 * egy, a Z tengellyel párhuzamos körpáján.
 * <p>
 * A játékbeli idő a képernyő bal felső sarkában látható. A nap pontosan 18 órakor nyugszik és 6 órakor kel. A játékbeli idő 
 * gyorsabban halad a valódinál, ezt egy [változóval]{@link module:day_night.timeSpeedup} lehet szabályozni.
 * <p>
 * A játékbeli idő NEM a render loopban frissül, mivel itt fontos hogy minden másodperceben frissüljön pontosan egyszer.
 * @since II. mérföldkő
 * @author Gáspár Tamás
 * @module day_night
 */

import { scene, arenaSize, camera, vecToString } from './game.js';
import { GodRaysEffect } from './postprocessing.esm.js';

/**
 * Megmondja, hogy hány másodperc teljen el a játékban, amíg a valóságban 1 másodperc telik el.
 * @var
 * @private
 */
let timeSpeedup = 60;
 /**
 * A nap pozíciója a színtérben.
 * @const 
 * @type {THREE.Vector3}
 */
export const sunPosition = new THREE.Vector3();
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
 * [Napot]{@link https://threejs.org/docs/#api/en/lights/DirectionalLight} reprezentáló fény.
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
 * @summary Éj-nappal ciklus
 * @description Beállítja a napfény és árnyékának tulajdonságait. Elindítja az éj-nappal ciklust.
 * @function
 * @since II. mérföldkő
 */
export function initiateDayNightCycle() {
    const startingTime = {hour: 16, minute: 0, second: 0}
    inGameTime = Date.today().set(startingTime);

    celestialBodyPath = new THREE.EllipseCurve(0, 0, 2*arenaSize, 2*arenaSize, 0, 2*Math.PI, true, Math.PI);
    get3DPointFromPath(inGameTime, sunPosition); //indulási pozíció
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
    createLightPostprocessing();

    window.setInterval(function() { //minden másodpercben egyszer hívódik meg
        inGameTime.addSeconds(timeSpeedup); //idő előremozdítása
        updateTimeDisplayer(inGameTime);
        get3DPointFromPath(inGameTime, sunPosition); //új hely kérése
        sunLight.position.set(sunPosition.x, sunPosition.y, sunPosition.z); //nap mozgatása
        SUN.position.set(sunPosition.x, sunPosition.y, sunPosition.z);
        sunLightIntensity = sunLightIntensityFunction(sunPosition.y); //új fényerő
    }, 1000);
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
 * @description Megkeresi az adott időhoz tartozó pozíciót.
 * @param {Date} time A játékbeli idő. 
 * @param {THREE.Vector3} positionVector A vektor, amibe az eredmény belemásolódik.
 */
function get3DPointFromPath(time, positionVector) {
    const scaledTime = (time.getHours()*60 + time.getMinutes()) / TOTAL_MINUTES; //az idő átalakítása [0-1] közé
    celestialBodyPath.getPoint(scaledTime, vec2);
    positionVector.x = 0;
    positionVector.y = vec2.x;
    positionVector.z = vec2.y;
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