/**
 * @summary Játékmenet modul
 * @file Itt találhatóak a játékmenetet vezérlő metódusok, pl a játékos életpontjait módosítóak. Itt van kezelve a 
 * 'deadzone', amibe a játékos akkor kerül, ha elhagyja a bejárható teret (arenaSize*arenaSize az origó körül). Ilyenkor 
 * egy figyelmeztető felirat jelenik meg és a játékos másodpercenkénti sebzést szenved.
 * @module gameplay
 * @since I. mérföldkő
 * @author Gáspár Tamás
 */

import { camera, CAMERA_BASE_HEIGHT, controls, pointerLockUnlocked} from './game.js';
import { maximumCoins } from './world_building.js';
import { playCoinFoundSound } from './sound.js';
import * as SOUNDS from './sound.js';

/**
 * A játékos maximális életpontjai.
 * @constant
 * @private
 */
const MAX_HP = 1000; 
/**
 * A játékos aktuális életpontjai.
 * @var
 */
let healthPoints = MAX_HP;

/**
 * @summary Felhasználói felület
 * @description Betölti a felhasználói felület HTML elemibe az aktuális értékeket.
 * @function
 * @since I. mérföldkő
 */
export function initiateUserInterface() { 
    document.getElementById('deathDisplayer').hidden = true;
    setHealthBar(MAX_HP); 
    initPassiveRegeneration();
}
/**
 * Sebzés/gyógyulás után ennyi ideig fix az életpontok száma. Erre azért van szükség, mert a az ilyen objektumokkal való 
 * ütközés a render loopban kerül ellenőrzésre, vagyis enélkül a játékos másodpercenként kb. 60-szor sebződne.
 * @constant
 * @private
 */
const INVUL_TIME = 1000;
/**
 * Megmondja hogy a játékos éppen sebezhetetlen-e. Ez a sebzés/gyógyulás után [egy ideig]{@link module:gameplay.INVUL_TIME} igaz.
 * @var
 */
let invulnerable = false;

/**
 * @summary Sebzés
 * @description Sebzi a játékost.
 * @function
 * @since I. mérföldkő
 * @param {int} amount A sebzés mennyisége. 
 * @param {string} deathMessage Ez az üzenet jeleni meg, ha a sebzés esetleg megöli a játékost.
 */
export function damage(amount, deathMessage='Meghaltál') { 
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

/**
 * @summary Gyógyítás
 * @description Gyógyítja a játékost. Ez független a sebezhetetlenségtől.
 * @function
 * @since I. mérföldkő
 * @param {int} amount Gyógyítás mértéke. 
 * @param {boolean} playSound Megmondja, hogy legyen-e [gyógyító hang]{@link module:sound.playHealSound} lejátszva. 
 */
export function heal(amount, playSound = true) { //adott méretű gyógyítást okoz
    healthPoints = Math.min(MAX_HP, healthPoints + amount);
    setHealthBar(healthPoints);
    window.setTimeout(() => invulnerable=false, INVUL_TIME)
    if(playSound) SOUNDS.playHealSound();    
}
/**
 * Ennyi időnként történik passzív HP regeneráció ('tick').
 * @constant
 * @private
 */
const PASSIVE_REGEN_TIME = 3000;
/**
 * Ennyi HP regenerálódik passzívan egy 'tick' alatt.
 * @constant
 * @private
 */
const PASSIVE_REGEN_AMOUNT = MAX_HP / 100.0;

/**
 * @summary Passzív regeneráció
 * @description Elindítja a passzív regenerációt a játék elején. Ez növeli a játékos életét [valamennyivel]{@link module:gameplay.PASSIVE_REGEN_AMOUNT} 
 * [bizonyos időközönként]{@link module:gameplay.PASSIVE_REGEN_TIME}, ha nincs tele.
 * @function
 * @since I. mérföldkő.
 */
export function initPassiveRegeneration() { 
    window.setInterval(() => {
        if(healthPoints == MAX_HP) return; //nem szükséges
        if(!respawned) return; //ha meghalt a játékos, akkor nem regenerálódik
        heal(PASSIVE_REGEN_AMOUNT, false); //ennél nincs heal sound
    }, PASSIVE_REGEN_TIME);
}
/**
 * Ez jeleníti meg a játékos halálának okát.
 * @constant
 * @type {HTMLElement}
 */
const displayer = document.getElementById('deathDisplayer');
/**
 * Jelzi, hogy a játékos újraéledt-e már miután meghalt. Kell, mert az ütközés detektálás folyamatosan 
 * meghívja a [die]{@link module:gameplay.die} metódust, mivel a halál után még benne van az objektumban.
 */
let respawned = true;
/**
 * @summary Pointer lock irányítás
 * @description Felülírja az [eredeti]{@link module:game.pointerLockUnlocked} callbacket. Azért kell, hogy 
 * a halál okát megjelenítő HTML objektum látszódjon.
 * @callback
 * @function
 * @since I. mérföldkő 
 */
function deathPointerLockUnlocked() {
    displayer.hidden = false;
}
/**
 * @summary Játékos halála
 * @description Megöli a játékost. Ezután megjelenik az ok, amire kattintva újra lehet éledni.
 * @function
 * @since I. mérföldkő
 * @param {string} deathMessage Az üzenet, ami a megjelenik a játékosnak. 
 */
export function die(deathMessage = 'Meghaltál') { 
    if(!respawned) return;
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
/**
 * @summary Újraéledés
 * @description Visszahelyezi a játékost a kezdőpontba, helyreállítja az életpontját is.
 * @function
 * @since I. mérföldkő
 */
function respawn() {
    respawned = true;
    displayer.hidden = true;
    camera.position.set(0, CAMERA_BASE_HEIGHT, 0);
    healthPoints = MAX_HP;
    setHealthBar(healthPoints);
    controls.removeEventListener('unlock', deathPointerLockUnlocked);
    controls.addEventListener('unlock', pointerLockUnlocked); //pointer lock normál működésének visszakapcsolása
    SOUNDS.playHealSound();
}
/**
 * @summary HP UI frissítés
 * @description Új értéket állít be a HP sávnak.
 * @param {int} healthPoints
 * @function
 * @since I. mérföldkő 
 */
function setHealthBar(healthPoints) { 
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
/**
 * Számolja hogy mennyi érmét talált már meg a játékos. Ha ez eléri a [maximális számot]{@link module:world_building.maximumCoins}, 
 * akkor a játékos nyert.
 * @var
 * @private
 */
let foundCoins = 0; 
/**
 * @summary Érmeszerzés
 * @description Meghívódik ha a játékos felvesz egy érmét.
 * @callback
 * @function
 * @since I. mérföldkő
 */
export function coinFound() {
    foundCoins++;
    document.getElementById('coinCounter').textContent = 'Érmék: ' + foundCoins + '/' + maximumCoins;
    if(foundCoins == maximumCoins) { //győzelem
        window.setTimeout(() => alert('Megtaláltad az összes érmét!'), 500);
    }
    playCoinFoundSound();
}
/**
 * A deadzone részre figyelmeztető felirat.
 * @constant
 * @type {HTMLElement}
 */
const deadzoneMessage = document.getElementById('deadzoneMessage');
/**
 * Ennyit sebződik másodpercenként a játékos a deadzone-ban.
 * @constant
 */
const DEADZONE_DAMAGE = 200;
/**
 * @summary Deadzone
 * @description Meghívódik, ha a játékos a deadzone-ban tartózkodik.
 * @function
 * @callback
 * @since II. mérföldkő
 */
export function inDeadzone() {
    deadzoneMessage.style.visibility = 'visible';
    damage(DEADZONE_DAMAGE, "Megölt a halálzóna!");
    SOUNDS.playDeadzoneSound();
}
/**
 * @summary Deadzone
 * @description Meghívódik, ha a játékos nincs a deadzone-ban.
 * @function
 * @callback
 * @since II. mérföldkő
 */
export function notInDeadzone() {
    deadzoneMessage.style.visibility = 'hidden';
    SOUNDS.stopDeadzoneSound();
}
