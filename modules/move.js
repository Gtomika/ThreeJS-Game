//Ebben a modulban vannak a mogással kapcsolatos komponensek.

import { controls } from './game.js'

export const SPEED = 0.2;
export const SPRINT_SPEED = 0.5
export const JUMP_SPEED = 1;
export const JUMP_TIME = 500; //milli sec
export let jumping = false; // van-e folyamatban ugrás
export let sprinting = false; //aktív-e a sprintelés
export let movingForward = false; //aktívak-e a mozgások
export let movingRight = false;
export let movingBack = false;
export let movingLeft = false;

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
        break;
        case 68: //d
        case 39: //jobbra arrow
            movingRight = true;
        break;
        case 83: //s
        case 40: //le arrow
            movingBack = true;
        break;
        case 65: //a
        case 37: //balra arrow
            movingLeft = true;
        break;
        case 32: //space
            if(!jumping) { //új ugrás megkezdése, ha nincs folyamatban egy
                jumping = true;
                window.setTimeout(function(){ jumping = false; }, JUMP_TIME); //fix idő után vége az ugrásnak
            }
        break;
        case 16: //shift
            sprinting = true;
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
        break;
        case 68: //d
        case 39: //jobbra arrow
            movingRight = false;
        break;
        case 83: //s
        case 40: //le arrow
            movingBack = false;
        break;
        case 65: //a
        case 37: //balra arrow
            movingLeft = false;
        break;
        case 16: //shift
            sprinting = false;
        break;
    }
}