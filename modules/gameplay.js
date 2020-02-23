//Játékmenettel kapcsolatos komponensek

import { camera, CAMERA_BASE_HEIGHT } from './game.js';

const MAX_HP = 1000; 

let healthPoints = MAX_HP; //a játékos jelenlegi életpontjai

export function initiateUserInterface() { 
    setHealthBar(MAX_HP); 
}

export function damage(amount) { //adott méretű sebzést okoz
    healthPoints = Math.max(0, healthPoints - amount);
    setHealthBar(healthPoints);
    if(healthPoints === 0) die();
}

export function heal(amount) { //adott méretű gyógyítást okoz
    healthPoints = Math.min(MAX_HP, healthPoints + amount);
    setHealthBar(healthPoints);
}

export function die() { //visszahelyezi a játékost a kezdőpontba, helyreállítja az életpontját
    alert('Meghaltál!');
    camera.position.set(0, CAMERA_BASE_HEIGHT, 0);
    healthPoints = MAX_HP;
    setHealthBar(healthPoints);
}

function setHealthBar(healthPoints) { //új értéket állít be a HP sávnak
    const hpBar = document.getElementById('hpDisplayer');
    hpBar.innerHTML = "";
    win.stripFun(hpBar,
    healthPoints/10, //%
    '#FFFFFF', //háttér 
    '#FF0000', //teli háttér
    'black', //betűszín
    '14px', //szöveg méret
    400, //szélesség
    50, //magasság
    1000,
    'linear'
    );
}


