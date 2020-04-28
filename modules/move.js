/**
 * @summary Mozgás modul
 * @file Ebben a modulban vannak a mogással kapcsolatos komponensek. Több 'sebesség' változó is van itt. Ezeket 
 * úgy kell érteni, hogy ennyit változik a játékos hellyzete mindig amikor a [render loopban]{@link module:game.render} 
 * módosul.
 * <p>
 * Mivel az első mérföldkő verziójához képest jelentősen csökkent az FPS (60-144 -> kb. 30), ezért minden sebességet a 
 * duplájára növeltem, hogy a játékos ne 'lassuljon le' a render loop kevesebbszeri meghívása miatt.
 * <p>
 * A játékos tud sétálni (nyilak vagy WASD), futni (bal SHIFT) és ugrani (SPACE). Egy-egy boolean változó nézi, 
 * hogy éppen melyiket csinálja (akár többet is). Ezek külön nincsenek dokumentálva.
 * @since I. mérföldkő
 * @author Gáspár Tamás
 * @module move
 */

import * as SOUNDS from './sound.js';
import { controls, camera } from './game.js'

/**
 * A játékos sebessége.
 * @constant
 */
export const SPEED = 0.8;
/**
 * A játékos sebessége futás közben.
 * @constant
 */
export const SPRINT_SPEED = 1.5;
/**
 * A játékos sebessége ugrás közben.
 * @constant
 */
export const JUMP_SPEED = 2.5;
/**
 * A játékos kezeti zuhanási sebessége. Ezt zuhanás közben növeli a [gravitáció]{@link module:collision.gravity}.
 * @constant
 */
export const FALL_SPEED = 2;
/**
 * Az ugrás ideje milliszekundumban.
 * @constant
 */
const JUMP_TIME = 500; 
export let jumping = false; // van-e folyamatban ugrás
export let sprinting = false; //aktív-e a sprintelés
export let movingForward = false; //aktívak-e a mozgások
export let movingRight = false;
export let movingBack = false;
export let movingLeft = false;

let falling = false;
export function setFalling(isFalling) {
    falling = isFalling;
}

/**
 * @summary Mozgás megállítása
 * @description Megállítja a játékos összes mozgását. Akkor kerül meghívásra, amikor ütközés történt egy megállító objektummal.
 * @function
 * @since I. mérföldkő
 */
export function stopMovement() {
    sprinting = false;
    jumping = false;
    movingForward = false;
    movingBack = false;
    movingLeft = false;
    movingRight = false;
}

/**
 * @summary Billentyűkezelés
 * @description Kezeli, hogy mi történjen ha a játékos billentyűket nyom le (vagy tart lenyomva).
 * @callback
 * @function
 * @since I. mérföldkő
 * @param {keyEvent} keyEvent 
 */
export function keyDownHandler(keyEvent) { 
    if(!controls.isLocked) return; //csak ha aktív az irányítás
    switch(keyEvent.which) {
        case 87: //w
        case 38: //fel arrow
            movingForward = true;
            if(!jumping) SOUNDS.playWalkSound();
        break;
        case 68: //d
        case 39: //jobbra arrow
            movingRight = true;
            if(!jumping) SOUNDS.playWalkSound();
        break;
        case 83: //s
        case 40: //le arrow
            movingBack = true;
            if(!jumping) SOUNDS.playWalkSound();
        break;
        case 65: //a
        case 37: //balra arrow
            movingLeft = true;
            if(!jumping) SOUNDS.playWalkSound();
        break;
        case 32: //space
            if(!jumping && !falling) { //új ugrás megkezdése, ha nincs folyamatban egy, és nincs zuhanás
                jumping = true;
                window.setTimeout(function(){ jumping = false; }, JUMP_TIME); //fix idő után vége az ugrásnak
                SOUNDS.pauseWalkSound();
                SOUNDS.pauseRunSound(false);
                SOUNDS.playJumpSound();
            }
        break;
        case 16: //shift
            if(movingBack || movingForward || movingLeft || movingRight) {
                sprinting = true;
                if(!jumping) SOUNDS.playRunSound();
            }
        break;
    }
}
/**
 * @summary Billentyűkezelés
 * @description Kezeli, hogy mi történjen ha a játékos billentyűket enged fel.
 * @callback
 * @function
 * @since I. mérföldkő
 * @param {keyEvent} keyEvent 
 */
export function keyUpHandler(keyEvent) {
    if(!controls.isLocked) return;
    switch(keyEvent.which) {
        case 87: //w
        case 38: //fel arrow
            movingForward = false;
            SOUNDS.pauseWalkSound();
        break;
        case 68: //d
        case 39: //jobbra arrow
            movingRight = false;
            SOUNDS.pauseWalkSound();
        break;
        case 83: //s
        case 40: //le arrow
            movingBack = false;
            SOUNDS.pauseWalkSound();
        break;
        case 65: //a
        case 37: //balra arrow
            movingLeft = false;
            SOUNDS.pauseWalkSound();
        break;
        case 16: //shift
           if(movingBack || movingForward || movingLeft || movingRight) {
              sprinting = false;
              SOUNDS.pauseRunSound();
            }
        break;
    }
}

