//Játékmenettel kapcsolatos komponensek

import { camera, CAMERA_BASE_HEIGHT, controls, pointerLockUnlocked} from './game.js';
import { maximumCoins } from './world_building.js';
import { playCoinFoundSound } from './sound.js';
import * as SOUNDS from './sound.js';
import * as MOVE from './move.js';

const MAX_HP = 1000; 

let healthPoints = MAX_HP; //a játékos jelenlegi életpontjai

export function initiateUserInterface() { 
    document.getElementById('deathDisplayer').hidden = true;
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
        if(healthPoints === 0) {
            die(deathMessage);
        } else {
            SOUNDS.playDamageSound();
        }
    } else return;
}

export function heal(amount, playSound = true) { //adott méretű gyógyítást okoz
    if(!invulnerable) {
        healthPoints = Math.min(MAX_HP, healthPoints + amount);
        setHealthBar(healthPoints);
        invulnerable = true;
        window.setTimeout(() => invulnerable=false, INVUL_TIME)
        if(playSound) SOUNDS.playHealSound();
    } else return;
}

const PASSIVE_REGEN_TIME = 3000; //ennyi időnként történik passzív HP regeneráció
const PASSIVE_REGEN_AMOUNT = MAX_HP / 100.0; //ennyi regenerálódik passzívan

export function initPassiveRegeneration() { 
    window.setInterval(() => {
        if(healthPoints == MAX_HP) return; //nem szükséges
        if(!respawned) return; //ha meghalt a játékos, akkor nem regenerálódik
        heal(PASSIVE_REGEN_AMOUNT, false); //ennél nincs heal sound
    }, PASSIVE_REGEN_TIME);
}

const displayer = document.getElementById('deathDisplayer');
let respawned = true;

function deathPointerLockUnlocked() {
    displayer.hidden = false;
}

export function die(deathMessage = 'Meghaltál') { //visszahelyezi a játékost a kezdőpontba, helyreállítja az életpontját
    if(!respawned) return; //ez kell, mert az ütközés detektálás folyamatosan meghívja ezt a metódust ha a játékos meghal...
    respawned = false;
    setHealthBar(0);
    SOUNDS.playDeathSound();
    displayer.innerHTML = '<br><br>' + deathMessage + '<br><br>Kattints ide az újraéledéshez!';
    controls.removeEventListener('unlock', pointerLockUnlocked); //pointer lock normál működésének ideiglenes felülírása
    controls.addEventListener('unlock', deathPointerLockUnlocked);
    controls.unlock(); //pointer lock kikapcsolása, death message megjelenítése
    displayer.addEventListener('click', () => {
        respawn();
        controls.lock(); //pointer lock be
    });
}

function respawn() {
    respawned = true;
    displayer.hidden = true;
    camera.position.set(0, CAMERA_BASE_HEIGHT, 0);
    healthPoints = MAX_HP;
    setHealthBar(healthPoints);
    controls.removeEventListener('unlock', deathPointerLockUnlocked);
    controls.addEventListener('unlock', pointerLockUnlocked); //pointer lock normál működésének visszakapcsolása
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
    playCoinFoundSound();
}

