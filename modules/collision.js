//Ebben a modulban vannak az ütközés detektálással kapcsolatos komponensek.

import { camera, CAMERA_BASE_HEIGHT, arenaSize, scene } from './game.js';
import * as MOVE from './move.js';
import { die, damage, heal } from './gameplay.js';

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

export const TYPE_NORMAL = 'normal';
export const TYPE_LETHAL = 'lethal';
export const TYPE_POINT = 'point';
//sebző/gyógyító objektumok típusa: damage/heal-x, ahol x a mennyiség

//osztály az ütközés detektálásban lévő objektumoknak
//tartalmazza a befoglaló dobozt és a típust, stb
class CollidableInfo { 

    constructor(boundingBox, type, id, removeOnCollision) {
        this.boundingBox = boundingBox;
        this.type = type;
        this.removeOnCollision = removeOnCollision; //ha true, akkor az ütközés törli ezt az objektumot
        this.collidableId = id;
    }

    //kezeli hogy mi történik ha ezzel az objektummal ütközik a kamerával, a típustól függően.
    //igazat ad vissza, ha a típussal való ütközés megállítja a játékost a mozgásban.
    handleCollisionType() {
        if(this.type === TYPE_NORMAL) return true; //nem kell semmit tenni
        if(this.type === TYPE_LETHAL) {
            die();
            return true;
        }
        if(this.type === TYPE_POINT) { //pontszerzés történt

            return false;
        }
        if(this.type.startsWith('damage')) { //ütközés sebző objektummal
            const amount = this.type.split('-');
            damage(amount);
            return false;
        }
        if(this.type.startsWith('heal')) { //ütközés gyógyító objektummal
            const amount = this.type.split('-');
            heal(amount);
            return false;
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

const collidables = []; // azon objektumok (CollidableInfo) listája, amikkel lehet ütközni

//hozzáadja az objektumot az ütközés detektáláshoz
export function registerCollidableObject(mesh, type, removeOnCollision = false) {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const collidableInfo = new CollidableInfo(boundingBox, type, mesh.id, removeOnCollision);
    collidables.push(collidableInfo);
}

//újraszámolja az objektum befoglaló  dobozát. Ezt mindig meg kell hívni ha az objektum pozícióját, méretét változtatjuk
export function updateCollidableBounds(mesh) { 
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    for(const c of collidables) {
        if(c.collidableId == mesh.id) c.boundingBox = boundingBox;
    } 
}

function unregisterCollidableObject(collidableId) { //eltávolítja az objektumot az ütközés detektálásból
    let index = 0;
    for(const c of collidables) {
        if(c.collidableId == collidableId) { //ez az az objektum
            collidables.splice(index, 1);
        }
        index++;
    }
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
    for(const c of collidables) {
        if(cameraBounds.intersectsBox(c.boundingBox)) { //ütközés történt
            collision = true;
            //objektum típusától függő esemény végrehajtása. Bizonyos típusok nem állítják meg a játékost.
            if(!c.handleCollisionType()) collision = false;
             //ha szükséges, eltávolítja az objektumot. Ha el lett távolítva, akkor nem állítja meg a játékost.
            if(c.handleRemoval()) collision = false;

            c.boundingBox.getCenter(center); //középpont meghatározása
            if(cameraBounds.min.x <= c.boundingBox.max.x || cameraBounds.max.x >= c.boundingBox.min.x) { //van-e ütközés x irányban
               center.x > camera.position.x ? camera.position.x -= PUSH_DISTANCE : camera.position.x += PUSH_DISTANCE;
            }
            if(cameraBounds.min.y <= c.boundingBox.max.y || cameraBounds.max.y > c.boundingBox.min.y) { //van-e ütközés y irányban
                center.y > camera.position.y ? camera.position.y -= PUSH_DISTANCE : camera.position.y += PUSH_DISTANCE;
            }
            if(cameraBounds.min.z <= c.boundingBox.max.z || cameraBounds.max.z >= c.boundingBox.min.z) { //van-e ütközés z irányban
                center.z > camera.position.z ? camera.position.z -= PUSH_DISTANCE : camera.position.z += PUSH_DISTANCE;
            }
        }
    }
    return collision;
}

//lefele mozgatja a kamerát, ha nem ugrik, nincs alatta semmi, és CAMERA_BOX_HEIGHT-nál magasabban van
export function gravity(cameraBounds) { 
    let collidableUnder = false;
    const extendedCameraBounds = new THREE.Box3();
    extendedCameraBounds.copy(cameraBounds);
    extendedCameraBounds.expandByPoint(new THREE.Vector3(camera.position.x, camera.position.y-CAMERA_BOX_HEIGHT-1, camera.position.z));
    for(const c of collidables) {
        if(extendedCameraBounds.intersectsBox(c.boundingBox)) { //van valami alatta
            c.handleCollisionType(); //alatta lévő objektum típusától függő esemény
            c.handleRemoval(); //ha el kell távolítani
            collidableUnder = true;
            handleFallEnding();
        }
    }
    if(!MOVE.jumping && camera.position.y > CAMERA_BASE_HEIGHT && !collidableUnder) {
        camera.position.y -= MOVE.JUMP_SPEED;
        fallDistance += MOVE.JUMP_SPEED;
    } else if(camera.position.y <= CAMERA_BASE_HEIGHT) {
       handleFallEnding();
    }
}

let fallDistance = 0; //méri hogy milyen távolságot 'zuhant' a játékos
const MIN_DAMAGE_DISTANCE = 100; //ekkor zuhanás alatt nincs sebződés

function handleFallEnding() { //meghívódik ha befejeződik a játékos zuhanása
    if(fallDistance >= MIN_DAMAGE_DISTANCE) { //esési sebzés
        damage(5*fallDistance, 'Túl magasról estél le!')
    }
    fallDistance = 0;
}