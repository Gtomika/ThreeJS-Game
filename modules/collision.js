//Ebben a modulban vannak az ütközés detektálással kapcsolatos komponensek.

import { camera, CAMERA_BASE_HEIGHT, arenaSize, scene } from './game.js';
import * as MOVE from './move.js';
import { die, damage, heal, coinFound } from './gameplay.js';

const PUSH_DISTANCE = 0.2;
const OUT_OF_BOUNDS_WARNING_TIME = 20000;
let showOutOfBoundsWarning = true;

//megmondja hogy a játékterületen kívül van-e a kamera. ha igen, akkor visszamozdítja.
//Igazat ad vissza, ha játékterületen kívül volt.
export function detectOutOfBounds() { 
    const x = camera.position.x, z = camera.position.z;
    let outOfBounds = false;
    if(x > arenaSize/2) { //pozitív x irányban
        camera.position.x -= PUSH_DISTANCE;
        outOfBounds = true;
    } else if(x < -arenaSize/2) { //negatív x irányban
        camera.position.x += PUSH_DISTANCE;
        outOfBounds = true;
    } else if(z > arenaSize/2) { //pozitív z irányban
        camera.position.z -= PUSH_DISTANCE;
        outOfBounds = true;
    } else if(z < -arenaSize/2) { //negatív z irányban
        camera.position.z += PUSH_DISTANCE;
        outOfBounds = true;
    }
    if(outOfBounds && showOutOfBoundsWarning) { //figyelmeztetés
        showOutOfBoundsWarning = false;
        window.setTimeout(function(){ showOutOfBoundsWarning=true; }, OUT_OF_BOUNDS_WARNING_TIME);
        alert('Nem hagyhatod el a játékterületet!');
    } 
}

export const TYPE_NORMAL = 0;
export const TYPE_LETHAL = 1;
export const TYPE_POINT = 2;
export const TYPE_MOVING = 3;
//sebző/gyógyító objektumok típusa: damage/heal-x-stop/nostop, ahol x a mennyiség, stop/nostop pedig megmondja
//hogy megállítsa-e az ütközés a játékost.

//osztály az ütközés detektálásban lévő objektumoknak
//tartalmazza a befoglaló dobozt és a típust, stb
class CollidableInfo { 

    constructor(boundingBox, type, id, removeOnCollision) {
        this.boundingBox = boundingBox;
        this.type = type;
        this.removeOnCollision = removeOnCollision; //ha true, akkor az ütközés törli ezt az objektumot
        if(type === TYPE_POINT) {
            this.removeOnCollision = true; //pontok mindig eltűnnek ha felszedik őket
        }
        this.collidableId = id;
    }

    //kezeli hogy mi történik ha ezzel az objektummal ütközik a kamerával, a típustól függően.
    //igazat ad vissza, ha a típussal való ütközés megállítja a játékost a mozgásban.
    handleCollisionType() {
        if(this.type === TYPE_NORMAL) return true; //nem kell semmit tenni
        if(this.type === TYPE_LETHAL) {
            die();
            return false;
        } else if(this.type === TYPE_MOVING) { //mozgó (animált) objektummal ütközés
            const cameraBounds = createCameraBounds();
            //nagyobb pushout távolság kell, különben a gyorsan mozgó objektumok 'átmennek' a játékoson
            pushOut(cameraBounds, this.boundingBox, 15*PUSH_DISTANCE, PRIORITY_XZ); 
            return false; //hogy a megívó függvény ne mozgassa újra a játékost
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

    handleRemoval() { //ha szükséges, eltávolítja az objektumot a játéktérből, true-t ad vissza, ha eltávolítás történt
        if(this.removeOnCollision == false) return false; //nem szükséges
        unregisterCollidableObject(this.collidableId); //eltávolítás az ütközés detektálásból
        const object = scene.getObjectById(this.collidableId);
        scene.remove(object); //eltávolítás a színtérből
        return true;
    }
}

// azon objektumok (CollidableInfo), amikkel lehet ütközni
//key: mesh id
//value: CollidableInfo
const collidables = new Map(); 

//hozzáadja az objektumot az ütközés detektáláshoz
export function registerCollidableObject(mesh, type, removeOnCollision = false) {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const collidableInfo = new CollidableInfo(boundingBox, type, mesh.id, removeOnCollision);
    collidables.set(mesh.id, collidableInfo);
}

//újraszámolja az objektum befoglaló  dobozát. Ezt mindig meg kell hívni ha az objektum pozícióját, méretét változtatjuk
export function updateCollidableBounds(mesh) { 
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    collidables.get(mesh.id).boundingBox = boundingBox;
}

function unregisterCollidableObject(collidableId) { //eltávolítja az objektumot az ütközés detektálásból
    collidables.delete(collidableId);
}

const CAMERA_BOX_WIDTH = 5; //a kamera befoglaló doboza WIDTH x HEIGHT x WIDTH méretű
const CAMERA_BOX_HEIGHT = 15;
let center = new THREE.Vector3(); //az éppen vizsgált objektum középpontja

//Elkészíti a kamera befoglaló dobozát.
export function createCameraBounds() { 
    const min = new THREE.Vector3(camera.position.x - CAMERA_BOX_WIDTH,
        camera.position.y - CAMERA_BOX_HEIGHT, camera.position.z - CAMERA_BOX_WIDTH); //minimális x,y,z 
   const max = new THREE.Vector3(camera.position.x+CAMERA_BOX_WIDTH,
        camera.position.y + CAMERA_BOX_HEIGHT, camera.position.z + CAMERA_BOX_WIDTH); //maximális x,y,z
   return new THREE.Box3(min, max); 
}

//megnézi hogy van-e ütközés. ha igen, akkor kimozdítja a kamera befoglaló dobozát az objektumból.
// Igazat ad vissza, ha volt ütközés.
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

export const PRIORITY_NORMAL = 0;
export const PRIORITY_XZ = 1;

//akkor hívódik meg, ha ütközés történt, kilöki a játékost az objektumból, amivel ütközött
//cameraBounds: a játékos elhelyezkedése
//boundingBox: az objektum elhelyezkedése
//distance: a távolság, amennyivel kilöki
//priority: milyen irányú ütközések legyenek figyelembe véve
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
    }
}

//lefele mozgatja a kamerát, ha nem ugrik, nincs alatta semmi, és CAMERA_BOX_HEIGHT-nál magasabban van
export function gravity(cameraBounds) { 
    let collidableUnder = false;
    const extendedCameraBounds = new THREE.Box3();
    extendedCameraBounds.copy(cameraBounds);
    extendedCameraBounds.expandByPoint(new THREE.Vector3(camera.position.x, camera.position.y-CAMERA_BOX_HEIGHT-1, camera.position.z));
    for(const c of collidables.values()) {
        if(extendedCameraBounds.intersectsBox(c.boundingBox)) { //van valami alatta
            c.handleCollisionType(); //alatta lévő objektum típusától függő esemény
            c.handleRemoval(); //ha el kell távolítani
            collidableUnder = true;
            handleFallEnding();
        }
    }
    if(!MOVE.jumping && camera.position.y > CAMERA_BASE_HEIGHT && !collidableUnder) {
        MOVE.setFalling(true);
        const fallAmount = MOVE.FALL_SPEED + (fallHelperCounter * FALL_ACCELERATION); //zuhanás közben gyorsulni fog
        fallHelperCounter++;
        camera.position.y -= fallAmount;
        fallDistance += fallAmount;
    } else if(camera.position.y <= CAMERA_BASE_HEIGHT) {
       handleFallEnding();
    }
}

let fallHelperCounter = 0;
const FALL_ACCELERATION = 0.05; 
let fallDistance = 0; //méri hogy milyen távolságot 'zuhant' a játékos
const MIN_DAMAGE_DISTANCE = 100; //ekkor zuhanás alatt nincs sebződés

function handleFallEnding() { //meghívódik ha befejeződik a játékos zuhanása
    MOVE.setFalling(false);
    if(fallDistance >= MIN_DAMAGE_DISTANCE) { //esési sebzés
        damage(5*fallDistance, 'Túl magasról estél le!')
    }
    fallDistance = 0;
    fallHelperCounter = 0;
}

//láthatatlan objektum ütközés detektáláshoz
export function createInvisibleBounds(position, boundsSize) { 
    const material = new THREE.MeshBasicMaterial();
    material.transparent = true;
    const boundMesh = new THREE.Mesh(new THREE.BoxGeometry(boundsSize[0], boundsSize[1], boundsSize[2]), material);
    boundMesh.position.set(position[0], position[1], position[2]);
    return boundMesh;
}