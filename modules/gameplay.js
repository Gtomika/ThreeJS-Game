//Játékmenettel kapcsolatos komponensek

import { camera, CAMERA_BASE_HEIGHT } from './game.js';
import { maximumCoins } from './world_building.js';

const MAX_HP = 1000; 

let healthPoints = MAX_HP; //a játékos jelenlegi életpontjai

export function initiateUserInterface() { 
    setHealthBar(MAX_HP); 
    initPassiveRegeneration();
}

const INVUL_TIME = 1000; //sebzés/gyógyulás után ennyi ideig fix az életpontok száma
let invulnerable = false;

export function damage(amount, deathMessage='Meghaltál') { //adott méretű sebzést okoz
    if(!invulnerable) {
        healthPoints = Math.max(0, healthPoints - amount);
        setHealthBar(healthPoints);
        invulnerable = true;
        window.setTimeout(() => invulnerable=false, INVUL_TIME)
        if(healthPoints === 0) die(deathMessage);
    } else return;
}

export function heal(amount) { //adott méretű gyógyítást okoz
    if(!invulnerable) {
        healthPoints = Math.min(MAX_HP, healthPoints + amount);
        setHealthBar(healthPoints);
        invulnerable = true;
        window.setTimeout(() => invulnerable=false, INVUL_TIME)
    } else return;
}

const PASSIVE_REGEN_TIME = 3000; //ennyi időnként történik passzív HP regeneráció
const PASSIVE_REGEN_AMOUNT = MAX_HP / 100.0; //ennyi regenerálódik passzívan

export function initPassiveRegeneration() { 
    window.setInterval(() => {
        heal(PASSIVE_REGEN_AMOUNT);
    }, PASSIVE_REGEN_TIME);
}

export function die(deathMessage = 'Meghaltál') { //visszahelyezi a játékost a kezdőpontba, helyreállítja az életpontját
    alert(deathMessage);
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
    100, //idő
    'elastic'
    );
}

let foundCoins = 0; //számolja hogy mennyi érmét talált már meg a játékos

export function coinFound() { //meghívódik ha a játékos felvesz egy érmét
    foundCoins++;
    document.getElementById('coinCounter').textContent = 'Érmék: ' + foundCoins + '/' + maximumCoins;
    if(foundCoins == maximumCoins) { //győzelem
        window.setTimeout(() => alert('Megtaláltad az összes érmét!'), 500);
    }
}

