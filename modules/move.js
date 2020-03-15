//Ebben a modulban vannak a mogással kapcsolatos komponensek.

import * as SOUNDS from './sound.js';
import { controls } from './game.js'

export const SPEED = 0.2;
export const SPRINT_SPEED = 0.5
export const JUMP_SPEED = 1;
export const FALL_SPEED = 1;
export const JUMP_TIME = 500; //milli sec
export let jumping = false; // van-e folyamatban ugrás
export let sprinting = false; //aktív-e a sprintelés
export let movingForward = false; //aktívak-e a mozgások
export let movingRight = false;
export let movingBack = false;
export let movingLeft = false;

let falling = false; // zuhan-e a játékos (ezt a gravity metódus állítja)
export function setFalling(isFalling) {
    falling = isFalling;
}

export function stopMovement() {
    sprinting = false;
    jumping = false;
    movingForward = false;
    movingBack = false;
    movingLeft = false;
    movingRight = false;
}

const pressedKeys = []; //ebben tárolódik hogy melyik billentyű van lenyomva 

//kezeli a WASD, vagy nyilakkal történő mozgást. Amikor lenyomva tartják a billentyűt, akkor is csak egyszer lesznek a 
//mozgás változók frissítve.
export function keyDownHandler(keyEvent) { 
    if(!controls.isLocked) return; //csak ha aktív az irányítás
    //if(pressedKeys.includes(keyEvent.which)) return; //<-- Lenyomva tartott esetben is csak egyszer állítsa át a változókat 
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
    pressedKeys.push(keyEvent.which); //ez lenyomott billentyű lesz
}

export function keyUpHandler(keyEvent) { //billentyű felengedés
    if(!controls.isLocked) return;
    pressedKeys.splice(pressedKeys.indexOf(keyEvent.which), 1); //felengedett billentyű eltávolítása
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