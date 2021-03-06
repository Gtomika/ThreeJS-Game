/**
 * @Summary Ütközésdetektálás, gravitáció
 * @file Ebben a modulban vannak az ütközés detektálással, valamint gravitációval kapcsolatos metódusok.
 * Az ütközésdetektálás csak a játékos és az objketumok közt van megvalósítva, ezért ha N objektum van a színtérben,
 * akkor a műveletigénye O(N).
 * <p>
 * A megvalósítás [befoglaló dobozokkal]{@link https://threejs.org/docs/#api/en/math/Box3} történik.
 * Minden az ütközés detektálásban részt vevő objektumot regisztálni kell ({@link module:collision.registerCollidableObject}).
 * Az objektum kap egy típust, ami meghatározza mi fog történni, ha a játékos ütközik vele. Az típus konstansokat lásd lent.
 * <p>
 * Ezeken kívül lehet még megadni sebző/gyógyító típust. Ezt stringként kell megadni, beleírva a sebzés mennyiséget,
 * és azt, hogy az ütközés megállítsa-e a játékost.
 * @example
 * //100-at sebző, megállító típus
 * const dmg = 'DAMAGE-100-STOP'
 * //50-et gyógyító. nem megállító típus
 * const heal = 'HEAL-50-NOSTOP'
 * @since I. mérföldkő
 * @author Gáspár Tamás
 * @module collision
 */

import { camera, CAMERA_BASE_HEIGHT, arenaSize, scene } from './game.js';
import * as MOVE from './move.js';
import { die, damage, heal, coinFound } from './gameplay.js';
import { standOnPlatform } from './animation.js';

/**
 * Ekkora távolságra löki ki a játékost az objektumból, amivel ütközött. 
 * [Gyorsan mozgó objektumok]{@link module:animation.createMovingObstacle} ennél nagyobb értéket használnak, hogy 
 * ne 'menjenek át' a játékoson.
 * @constant
 * @private
 */
const PUSH_DISTANCE = 0.2;
/**
 * @summary Játékterület detektálás
 * @description Ellenőrzi, hogy a játékos a játékterületen belül van-e.
 * @function
 * @since I. mérföldkő
 * @returns {boolean} Igaz, ha a játékos kilépett a játékterületről.
 */
export function detectOutOfBounds() { 
    const x = camera.position.x, z = camera.position.z;
    let outOfBounds = false;
    if(x > arenaSize/2) { //pozitív x irányban
        outOfBounds = true;
    } else if(x < -arenaSize/2) { //negatív x irányban
        outOfBounds = true;
    } else if(z > arenaSize/2) { //pozitív z irányban
        outOfBounds = true;
    } else if(z < -arenaSize/2) { //negatív z irányban
        outOfBounds = true;
    }
    return outOfBounds;
}
/**
 * Alapértelmezett ütközésdetektálási típus. Ha ezzel ütközik a játékos, akkor semmi nem fog történni.
 * @constant
 */
export const TYPE_NORMAL = 0;
/**
 * Ütközésdetektálási típus. Ha ezzel ütközik a játékos, akkor meghal.
 * @constant
 */
export const TYPE_LETHAL = 1;
/**
 * Ütközésdetektálási típus. Ha ezzel ütközik a játékos, az azt jelzi, hogy felszedett egy érmét.
 * @constant
 */
export const TYPE_POINT = 2;
/**
 * Ütközésdetektálási típus. A mozgó akadályok típusa.
 * @constant
 */
export const TYPE_MOVING_OBSTACLE = 3;
/**
 * Ütközésdetektálási típus. A mozgó akadályok típusa.
 * @constant
 */
export const TYPE_MOVING_PLATFORM = 4; // mozgó platform, ami viszi a játékost, ha ráugrik

/**
 * Osztály ami tartalmazza egy ütközésdetektálásban rész vevő objektum adatait.
 * @since I. mérföldkő
 */
class CollidableInfo { 

    /**
     * @summary Létrehozás
     * @constructor
     * @param {THREE.Box3} boundingBox Az objektum befoglaló doboza. 
     * @param {int|string} type Az ütközésre adott választ meghatározó típus. 
     * @param {int} id Az objektum ThreeJs által kapott azonosítója (Object3D.id). 
     * @param {boolean} removeOnCollision Megmondja, hogy az objektum törlődjön-e a színtértből, ha a játékos ütközik vele.
     * Bizonyos típusok felülírják ezt. 
     */
    constructor(boundingBox, type, id, removeOnCollision) {
        this.boundingBox = boundingBox;
        this.type = type;
        this.removeOnCollision = removeOnCollision;
        if(type === TYPE_POINT) {
            this.removeOnCollision = true; //pontok mindig eltűnnek ha felszedik őket
        }
        this.collidableId = id;
    }

    /**
     * @summary Ütközéskezelés
     * @description Végrehajtja az ütközésre adott választ az objektum típusa alapján.
     * @function
     * @since I. mérföldkő.
     * @returns {boolean} Igazat ad vissza, ha az ütközés megállítja a játékost.
     */
    handleCollisionType() {
        if(this.type === TYPE_NORMAL) return true; //nem kell semmit tenni
        if(this.type === TYPE_LETHAL) {
            die();
            return false;
        } else if(this.type === TYPE_MOVING_OBSTACLE) { 
            const cameraBounds = createCameraBounds();
            //nagyobb pushout távolság kell, különben a gyorsan mozgó objektumok 'átmennek' a játékoson
            pushOut(cameraBounds, this.boundingBox, 15*PUSH_DISTANCE, PRIORITY_XZ); 
            return false; //hogy a megívó függvény ne mozgassa újra a játékost
        } else if(this.type === TYPE_MOVING_PLATFORM) {
            return true;
        } else if(this.type === TYPE_POINT) { //pontszerzés történt
            coinFound();
            return false;
        } else if(this.type.startsWith('DAMAGE')) { //ütközés sebző objektummal
            const data = this.type.split('-');
            damage(data[1]);
            return data[2]==='STOP' ? true : false;
        } else if(this.type.startsWith('HEAL')) { //ütközés gyógyító objektummal
            const data = this.type.split('-');
            heal(data[1]);
            return data[2]==='STOP' ? true : false;
        } else {
            throw 'Ütközés ismeretlen típussal: ' + this.type;
        }
    }

     /**
     * @summary Ütközéskezelés
     * @description Eltávolítja az objektumot a színtértből ütközésről, amennyiben szükséges.
     * @function
     * @since I. mérföldkő.
     * @returns {boolean} Igazat ad vissza, ha eltávolítás történt.
     */
    handleRemoval() {
        if(this.removeOnCollision == false) return false; //nem szükséges
        unregisterCollidableObject(this.collidableId); //eltávolítás az ütközés detektálásból
        const object = scene.getObjectById(this.collidableId);
        scene.remove(object); //eltávolítás a színtérből
        return true;
    }
}

/**
 * Az a map, ami az összes ütközésdetektálásban rész vevő objektum tulajdonságait tartalmazza. A kulcs az objektum 
 * azonosítója, így ez alapján gyorsan lehet keresni.
 * @constant
 * @private
 */
const collidables = new Map(); 

/**
 * @summary Regisztráció
 * @description Hozzáadja az objektumot az ütközésdetektáláshoz.
 * @function
 * @since I. mérföldkő.
 * @param {THREE.Mesh} mesh Az objektum.
 * @param {int|string} type Az objektum típusa. 
 * @param {boolean} [removeOnCollision = false] Megmondja, hogy el legyen-e távolítva az objektum ütközéskor. 
 */
export function registerCollidableObject(mesh, type, removeOnCollision = false) {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const collidableInfo = new CollidableInfo(boundingBox, type, mesh.id, removeOnCollision);
    collidables.set(mesh.id, collidableInfo);
}

/**
 * @summary Frissítés
 * @description Újraszámolja az objektum befoglaló  dobozát. Ezt mindig meg kell hívni ha az objektum pozícióját,
 * méretét változtatjuk, például animáláskor.
 * @function
 * @since I. mérföldkő.
 * @param {THREE.Mesh} mesh Az objektum.
 */
export function updateCollidableBounds(mesh) { 
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    collidables.get(mesh.id).boundingBox = boundingBox;
}

/**
 * @summary Eltávolítás
 * @description Eltávolítja az objektumot az ütközés detektálásból.
 * @function
 * @since I. mérföldkő.
 * @param {int} collidableId Az objektum azonosítója.
 */
function unregisterCollidableObject(collidableId) { 
    collidables.delete(collidableId);
}

/**
 * A kamera befoglaló dobozának szélessége.
 * @constant
 * @private
 */
const CAMERA_BOX_WIDTH = 5;
/**
 * Az éppen vizsgált objektum középpontja. Mivel az ütközésdetektálás gyakran hívódik meg, ezért új 
 * objektum példányosítása helyett ez lesz módosítva.
 * @var
 */
let center = new THREE.Vector3();

/**
 * @summary Játékos befoglaló doboza
 * @description Elkészíti a kamera befoglaló dobozát.
 * @function
 * @since I. mérföldkő.
 * @returns {THREE.Box3} A befoglaló doboz.
 */
export function createCameraBounds() { 
    const min = new THREE.Vector3(camera.position.x - CAMERA_BOX_WIDTH,
        camera.position.y - CAMERA_BASE_HEIGHT, camera.position.z - CAMERA_BOX_WIDTH); //minimális x,y,z 
   const max = new THREE.Vector3(camera.position.x+CAMERA_BOX_WIDTH,
        camera.position.y + CAMERA_BASE_HEIGHT, camera.position.z + CAMERA_BOX_WIDTH); //maximális x,y,z
   return new THREE.Box3(min, max); 
}

/**
 * @summary Ütközés detektálás és válasz
 * @description Megnézi hogy van-e ütközés. Ha igen, akkor kimozdítja a kamera befoglaló dobozát az objektumból.
 * @function
 * @since I. mérföldkő.
 * @param {THREE.Box3} cameraBounds A játékos befoglaló doboza.
 * @returns {boolean} Igazat ad vissza, ha volt ütközés. 
 */
export function detectCollisions(cameraBounds) {
    let collision = false;
    for(const c of collidables.values()) {
        if(cameraBounds.intersectsBox(c.boundingBox)) { //ütközés történt
            collision = true;
            //objektum típusától függő esemény végrehajtása. Bizonyos típusok nem állítják meg a játékost.
            if(!c.handleCollisionType()) collision = false;
             //ha szükséges, eltávolítja az objektumot. Ha el lett távolítva, akkor nem állítja meg a játékost.
            if(c.handleRemoval()) collision = false;
            if(collision) pushOut(cameraBounds, c.boundingBox, PUSH_DISTANCE, PRIORITY_NORMAL); //kilökés az objektumból
        }
    }
    return collision;
}

/**
 * Kilökési típus. Mindhárom tengely mentén végez kilökést.
 * @constant
 */
export const PRIORITY_NORMAL = 0;
/**
 * Kilökési típus. Először az X és Z tengely mentén végez kilökést, majd az Y tengely mentén csak akkor, ha az 
 * első kettő mentén nem kellett. A gyorsan [mozgó akadályoknál]{@link module:animation.createMovingObstacle} használom,
 * hogy ne 'nyomják le' a játékost a földbe.
 * @constant
 */
export const PRIORITY_XZ = 1;

/**
 * @summary Kilökés
 * @description Akkor hívódik meg, ha ütközés történt, kilöki a játékost az objektumból, amivel ütközött.
 * @function
 * @since I. mérföldkő.
 * @param {THREE.Box3} cameraBounds A játékos befoglaló doboza. 
 * @param {THREE.Box3} boundingBox Az objektum befoglaló doboza.
 * @param {float} distance Kilökési távolság.
 * @param {int} priority Megmondja, hogy mely tengelyek mentén legyen kilökés. 
 */
export function pushOut(cameraBounds, boundingBox, distance, priority) { 
    boundingBox.getCenter(center); //középpont meghatározása
    if(priority === undefined) priority = PRIORITY_NORMAL;
    if(priority === PRIORITY_NORMAL) { //minden irányban elvégzi a kilökést
        if(cameraBounds.min.x <= boundingBox.max.x || cameraBounds.max.x >= boundingBox.min.x) { //van-e ütközés x irányban
            center.x > camera.position.x ? camera.position.x -= distance : camera.position.x += distance;
        }
        if(cameraBounds.min.z <= boundingBox.max.z || cameraBounds.max.z >= boundingBox.min.z) { //van-e ütközés z irányban
             center.z > camera.position.z ? camera.position.z -= distance : camera.position.z += distance;
        }
        if(cameraBounds.min.y <= boundingBox.max.y || cameraBounds.max.y > boundingBox.min.y) { //van-e ütközés y irányban
            center.y > camera.position.y ? camera.position.y -= distance : camera.position.y += distance;
        }
    } else if(priority === PRIORITY_XZ) { //vízszintes irányú kilökés előnyt élvez.
        if(cameraBounds.min.x <= boundingBox.max.x || cameraBounds.max.x >= boundingBox.min.x) { //van-e ütközés x irányban
            center.x > camera.position.x ? camera.position.x -= distance : camera.position.x += distance;
         } else if(cameraBounds.min.z <= boundingBox.max.z || cameraBounds.max.z >= boundingBox.min.z) { //van-e ütközés z irányban
             center.z > camera.position.z ? camera.position.z -= distance : camera.position.z += distance;
         } else { //x,z irány prioritást kap
             if(cameraBounds.min.y <= boundingBox.max.y || cameraBounds.max.y > boundingBox.min.y) { //van-e ütközés y irányban
                 center.y > camera.position.y ? camera.position.y -= distance : camera.position.y += distance;
             }
         }
    } else {
        console.log("Priority unknown");
    }
}

/**
 * @summary Gravitáció
 * @description Lefele mozgatja a játékost, ha nem ugrik, nincs alatta semmi, és elég magasan van. A zuhanó játékos gyorsul.
 * @function
 * @since I. mérföldkő.
 */
export function gravity() { 
    let collidableUnder = false;
    //egy vékony, magas doboz, amivel a játékos alatti objektumokat lehet detektálni
    const min = new THREE.Vector3(camera.position.x - 1, 
        camera.position.y - CAMERA_BASE_HEIGHT - 1, camera.position.z - 1); 
    const max = new THREE.Vector3(camera.position.x + 1,
        camera.position.y + CAMERA_BASE_HEIGHT + 1, camera.position.z + 1); 
    const gravityCameraBounds = new THREE.Box3(min, max);
    for(const c of collidables.values()) {
        if(gravityCameraBounds.intersectsBox(c.boundingBox)) { //van valami alatta
            c.handleCollisionType(); //alatta lévő objektum típusától függő esemény
            c.handleRemoval(); //ha el kell távolítani
            collidableUnder = true;
            handleFallEnding(c.type, c.collidableId);
        }
    }
    if(!MOVE.jumping && camera.position.y > CAMERA_BASE_HEIGHT && !collidableUnder) {
        MOVE.setFalling(true);
        standOnPlatform(-1); //ha esetleg platformon is ált, akkor már nem fog
        const fallAmount = MOVE.FALL_SPEED + (fallHelperCounter * FALL_ACCELERATION); //zuhanás közben gyorsulni fog
        fallHelperCounter++;
        camera.position.y -= fallAmount;
        fallDistance += fallAmount;
    } else if(camera.position.y <= CAMERA_BASE_HEIGHT) {
       handleFallEnding(undefined, undefined); // itt nem eshetett platformra.
    }
}

let fallHelperCounter = 0;
/**
 * Ennyivel gyorsul a zuhanó játékos minden alkalommal amikor a {@link module:collision.gravity} meghívódik.
 * @constant
 * @private
 */
const FALL_ACCELERATION = 0.05;
/**
 * Méri, hogy milyen távolságot zuhant a játékos. Ez alapján lesz a zuhanási sebződés kiosztva.
 * @var
 * @private
 */
let fallDistance = 0; 
/**
 * Ekkor zuhanás alatt nincs sebződés.
 * @constant
 * @private
 */
const MIN_DAMAGE_DISTANCE = 100; 

/**
 * @summary Zuhanás befejezése
 * @description Meghívódik ha befejeződik a játékos zuhanása.
 * @function
 * @since I. mérföldkő
 * @param {int|string} type Annak az objektumnak a típusa, amire a játékos zuhant. 
 * @param {int} id Annak az objektumnak az azonosítója, amire a játékos zuhant. 
 */
function handleFallEnding(type, id) { 
    if(type === TYPE_MOVING_PLATFORM) { //egy mozgó platformra esett
        standOnPlatform(id);
    }
    MOVE.setFalling(false);
    if(fallDistance >= MIN_DAMAGE_DISTANCE) { //esési sebzés
        damage(5*fallDistance, 'Túl magasról estél le!')
    }
    fallDistance = 0;
    fallHelperCounter = 0;
}

/**
 * @summary Láthatatlan objektum
 * @description Láthatatlan objektumot hoz létre ütközés detektáláshoz. Nem konvex objektumok (szöveg, betöltött modellek)
 * is használják, hogy beléphessenek az ütközés detektálásba.
 * @function
 * @since I. mérföldkő.
 * @param {number[]} position Az objektum pozíciója. 
 * @param {number[]} boundsSize Az objektum mérete (x, y és z irányban).
 * @returns {THREE.Mesh} A láthatatlan objektum. 
 */
export function createInvisibleBounds(position, boundsSize) { 
    const material = new THREE.MeshBasicMaterial(); //nem támogatja az árnyékolást, de kevésbé számítás igényes
    material.transparent = true;
    const boundMesh = new THREE.Mesh(new THREE.BoxGeometry(boundsSize[0], boundsSize[1], boundsSize[2]), material);
    boundMesh.position.set(position[0], position[1], position[2]);
    return boundMesh;
}