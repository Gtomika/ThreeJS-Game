/**
 * @summary Animáció modul
 * @file Tartalmaz minden olyan metódust, ami a objektumokat animál. Az animációk 
 * [TWEEN.js]{@link https://github.com/tweenjs/tween.js/}-t használnak.
 * @since I. mérföldkő
 * @author Gáspár Tamás
 * @module animation 
 */

import { camera, scene } from './game.js';
import { createBox } from './world_building.js';
import { updateCollidableBounds, TYPE_MOVING_PLATFORM, TYPE_MOVING_OBSTACLE, registerCollidableObject} from './collision.js';
import { MeshPhongMaterial } from './three.module.js';

/**
 * @summary Mozgó akadály
 * @description Létrehoz egy olyan mozgó akadályt (téglatestet), ami a játékost is tudja 'lökni'. Az akadály végtelen sokáig fogja 
 * ismételni az animációt. A [mozgó platformmal]{@link module:animation.createMovingObstacle} ellentéteben 
 * ez nem mozgatja a tetején álló játékost. Limitációja, hogy csak a tengelyek mentén tud mozgatni.
 * Az elkészült objektum hozzáadódik a színtérhez.
 * @function
 * @see createMovingPlatform
 * @since I. mérföldkő
 * @param {number[]} position Az objektum eredeti pozíciója (x, y, z).
 * @param {number[]} bounds Az objektum méretei (x, y, és z irányban).
 * @param {character} axis Megadja melyik tengely mentén mozgassa az objektumot. Ez csak X, Y vagy Z lehet. 
 * @param {number[]} fromTo Megmondja, hogy az adott tengely mentén mettől meddig mozgassa az objetumot. 
 * @param {int} time Milliszekundumokban megadja, hogy mennyi idő alatt történjen meg egy animáció.
 * @throws Ha a tengely nem X, Y vagy Z. 
 */
export function createMovingObstacle(position, bounds, axis, fromTo, time) {
    const box = createBox(position, bounds, TYPE_MOVING_OBSTACLE);
    let from, to;
    if(axis === 'X') { //változtatandó paraméterek
        from = { x: fromTo[0] };
        to = { x: fromTo[1] };
    } else if(axis === 'Y') {
        from = { y: fromTo[0] };
        to = { y: fromTo[1] };
    } else if(axis === 'Z') {
        from = { z: fromTo[0] };
        to = { z: fromTo[1] };
    } else {
        throw 'Invalid axis for moving obstacle!';
    }
    const animation = new TWEEN.Tween(box.position).to(to, time) //oda-vissza animációk
    .onUpdate(function() {
        updateCollidableBounds(box); //az ütközés detektálás frissítése
    });
    animation.easing(TWEEN.Easing.Elastic.InOut);
    const reversedAnimation = new TWEEN.Tween(box.position).to(from, time)
    .onUpdate(function() {
        updateCollidableBounds(box); //az ütközés detektálás frissítése
    });
    reversedAnimation.easing(TWEEN.Easing.Elastic.InOut);

    animation.chain(reversedAnimation); //összekötés
    reversedAnimation.chain(animation);
    animation.start(); //indítás
}

/**
 * Annak a platformnak az azonosítója, amin a játékos áll. He nem áll platformon, akkor ennek az értéke -1.
 * @var
 * @default
 * @private
 * @since I. mérföldkő
 */
let platformId = -1; 

/**
 * Beállítja a {@link module:animation.platformId} értékét.
 * @function
 * @param {int} pid Az új érték.
 * @since I. mérföldkő 
 */
export function standOnPlatform(pid) {
    platformId = pid;
}

/**
 * @summary Mozgó platform
 * @description Létrehoz egy olyan mozgó platformot (téglatestet), ami magával viszi a játékost, ha rááll. Az akadály végtelen sokáig fogja 
 * ismételni az animációt. Limitációja, hogy csak az X és Z tengelyek mentén tud mozgatni.
 * Az elkészült objektum hozzáadódik a színtérhez.
 * @function
 * @see createMovingObstacle
 * @since I. mérföldkő
 * 
 * @param {number[]} position Az objektum eredeti pozíciója (x, y, z).
 * @param {number[]} bounds Az objektum méretei (x, y, és z irányban).
 * @param {character} axis Megadja melyik tengely mentén mozgassa az objektumot. Ez csak X vagy Z lehet. 
 * @param {number[]} fromTo Megmondja, hogy az adott tengely mentén mettől meddig mozgassa az objetumot. 
 * @param {int} time Milliszekundumokban megadja, hogy mennyi idő alatt történjen meg egy animáció.
 * @throws Ha a tengely nem X vagy Z. 
 */
export function createMovingPlatform(position, bounds, axis, fromTo, time) {
    const box = createBox(position, bounds, TYPE_MOVING_PLATFORM);
    let from, to;
    if(axis === 'X') { //változtatandó paraméterek
        from = { x: fromTo[0] };
        to = { x: fromTo[1] };
    } else if(axis === 'Z') { //Y
        from = { z: fromTo[0] };
        to = { z: fromTo[1] };
    } else {
        throw 'Invalid axis for moving platform!';
    }
    let previousPosition; //ebből számolja majd a megtett távolságot
    const handlePlayerOnPlatform = function() {
        if(box.id == platformId) { //a játékos ezen a platformon áll.
            if(axis === 'X') {
                if(previousPosition != undefined) {
                    const distance = previousPosition - box.position.x; //nem igazán távolság, mert negatív is lehet
                    camera.position.x -= distance; //játékos mozgatása
                }
                previousPosition = box.position.x; //'előző' pozíció frissítése
            } else {
                if(previousPosition != undefined) {
                    const distance = previousPosition - box.position.z;
                    camera.position.z -= distance;
                }
                previousPosition = box.position.z; //'előző' pozíció frissítése
            }
        }
    }
    const animation = new TWEEN.Tween(box.position).to(to, time) //oda-vissza animációk
    .onUpdate(function() {
        handlePlayerOnPlatform();
        updateCollidableBounds(box); //az ütközés detektálás frissítése
    });
    const reversedAnimation = new TWEEN.Tween(box.position).to(from, time)
    .onUpdate(function() {
        handlePlayerOnPlatform();
        updateCollidableBounds(box); //az ütközés detektálás frissítése
    });
    animation.chain(reversedAnimation); //összekötés
    reversedAnimation.chain(animation);
    animation.start(); //indítás
}

/**
 * @summary Gyógyító objektum
 * @description Egy játékost gyógyító objektumot hoz létre, ami tweeneléssel forog 2 tengely mentén. Az animáció a 
 * végtelenségig ismétlődik. Az objetum hozzá lesz adva a színtérhez.
 * @function
 * @since I. mérföldkő
 * @param {*} x Az objektum x koordinátája.
 * @param {*} y Az objektum y koordinátája.
 * @param {*} z Az objektum z koordinátája.
 */
export function createHealingObject(x, y, z) {
    const definingPoints = [];
    for(let i=0; i<32; i++) {
        definingPoints.push(new THREE.Vector2(Math.sin( i *  0.1) * 10, i));
    }
    const healGeometry = new THREE.LatheGeometry(definingPoints);
    const healMaterial = new MeshPhongMaterial({color: 0xB80F0A});
    const healMesh = new THREE.Mesh(healGeometry, healMaterial);
    healMesh.position.set(x, y, z);
    healMesh.scale.set(0.2, 0.2, 0.2);
    healMesh.castShadow = true;
    healMesh.receiveShadow = false;
    scene.add(healMesh);
    registerCollidableObject(healMesh, 'HEAL-500', true);

    const animation = new TWEEN.Tween(healMesh.rotation)
    .to({x: 2*Math.PI, z: 2*Math.PI}, 3000);
    animation.repeat(Infinity); //folytonosan
    animation.start();
}