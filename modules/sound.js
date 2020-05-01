/**
 * @summary Hang modul
 * @file Tartalmazza a hangokkal kapcsolatos metódusokat. A színtérben vannak [gblobális]{@link https://threejs.org/docs/#api/en/audio/Audio} és 
 * [lokális]{@link https://threejs.org/docs/#api/en/audio/PositionalAudio} hangok.
 * @since I. mérföldkő
 * @author Gáspár Tamás
 * @module sound
 */

import { listener } from './game.js';
import * as THREE from './three.module.js';

//globális hangok
let coinSound, walkSound, runSound, jumpSound, deathSound, healSound, damageSound, music, deadzone;

//pozicionált hangok, ezeket hozzá kell adni objektumokhoz
let radioactivitySound;

/**
 * @summary Hangok
 * @description Betölti a hnagokat.
 * @function
 * @since I. mérföldkő
 */
export function loadSounds() {
    initMusicMuter();

    coinSound = new THREE.Audio(listener);
    walkSound = new THREE.Audio(listener);
    runSound = new THREE.Audio(listener);
    jumpSound = new THREE.Audio(listener);
    deathSound = new THREE.Audio(listener);
    damageSound = new THREE.Audio(listener);
    healSound = new THREE.Audio(listener);
    music = new THREE.Audio(listener);
    deadzone = new THREE.Audio(listener);
    radioactivitySound = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('sounds/coin.wav', function( buffer ) {
        coinSound.setBuffer( buffer );
        coinSound.setVolume(0.2)
    });
    audioLoader.load('sounds/walk.wav', function( buffer ) {
        walkSound.setBuffer( buffer );
        walkSound.setLoop(true);
        walkSound.setVolume(0.2);
    });
    audioLoader.load('sounds/run.wav', function( buffer ) {
        runSound.setBuffer( buffer );
        //runSound.setLoop(true);
        runSound.setVolume(0.3);
    });
    audioLoader.load('sounds/jump.wav', function( buffer ) {
        jumpSound.setBuffer( buffer );
    });
    audioLoader.load('sounds/death.ogg', function( buffer ) {
        deathSound.setBuffer( buffer );
    });
    audioLoader.load('sounds/damage.wav', function( buffer ) {
        damageSound.setBuffer( buffer );
    });
    audioLoader.load('sounds/heal.wav', function( buffer ) {
        healSound.setBuffer( buffer );
    });
    audioLoader.load('sounds/music.wav', function( buffer ) {
        music.setBuffer( buffer );
        music.setVolume(0.02);
        music.setLoop(true);
        if(!musicMuted) music.play();
    });
    audioLoader.load('sounds/geiger.wav', function( buffer ) {
        radioactivitySound.setBuffer(buffer);
        radioactivitySound.setLoop(true);
        radioactivitySound.setVolume(0.7)
        radioactivitySound.setRefDistance(6);
        radioactivitySound.play();
    });
    audioLoader.load('sounds/deadzone.wav', function(buffer) {
        deadzone.setBuffer(buffer);
        deadzone.setVolume(1.0);
    });
}
/**
 * Tárolja, hogy le van-e némítva a zene.
 * @default
 * @var
 */
let musicMuted = true;
/**
 * @summary Zene
 * @description Beállítja a zene némító gombot, ami a képernyő bla felső sarkában található.
 * @function
 * @since I. mérföldkő
 */
function initMusicMuter() { 
    const musicMuter = document.getElementById('musicSoundImage');
    musicMuter.src = musicMuted ? 'img/muted.png' : 'img/sound.png';
    musicMuter.addEventListener('click', () => { 
        if(musicMuted) {
            musicMuter.src = 'img/sound.png';
            if(!music.isPlaying) music.play();
        } else {
            musicMuter.src = 'img/muted.png';
            if(music.isPlaying) music.pause();
        }
        musicMuted = !musicMuted;
    });
}
/**
 * @summary Hangok
 * @description Lejátssza az ugrás hangot.
 * @function
 * @since I. mérföldkő
 */
export function playJumpSound() {
    if(!jumpSound.isPlaying) jumpSound.play();
}
/**
 * @summary Hangok
 * @description Lejátssza az érme felszedés hangot.
 * @function
 * @since I. mérföldkő
 */
export function playCoinFoundSound() {
    if(coinSound.isPlaying) coinSound.stop(); //mindig újraindul
    coinSound.play();
}
/**
 * @summary Hangok
 * @description Lejátssza a séta hangot.
 * @function
 * @since I. mérföldkő
 */
export function playWalkSound() {
    if(!walkSound.isPlaying) walkSound.play();
}
/**
 * @summary Hangok
 * @description Megállítja a séta hangot.
 * @function
 * @since I. mérföldkő
 */
export function pauseWalkSound() {
    if(walkSound.isPlaying) walkSound.pause();
}
/**
 * @summary Hangok
 * @description Lejátssza a futás hangot. Ez kikapcsolja a a séta hangot.
 * @function
 * @since I. mérföldkő
 */
export function playRunSound() {
    pauseWalkSound();
    if(!runSound.isPlaying) runSound.play();
}
/**
 * @summary Hangok
 * @description Megállítja a futás hangot. Ez bizonyos esetekben visszakapcsolja a séta hangot.
 * @function
 * @since I. mérföldkő
 * @param {boolean} resumeWalkSound Folytassa-e a séta hangot.
 */
export function pauseRunSound(resumeWalkSound = true) { //visszakapcsolja a walk soundot, ha true a paraméter
    if(runSound.isPlaying) runSound.pause();
    if(resumeWalkSound) playWalkSound();
}
/**
 * @summary Hangok
 * @description Lejátssza a sebzés hangot.
 * @function
 * @since I. mérföldkő
 */
export function playDamageSound() {
    if(!damageSound.isPlaying) damageSound.play();
}
/**
 * @summary Hangok
 * @description Lejátssza a gyógyítás hangot.
 * @function
 * @since I. mérföldkő
 */
export function playHealSound() {
    healSound.play();
}
/**
 * @summary Hangok
 * @description Lejátssza a halál hangot.
 * @function
 * @since I. mérföldkő
 */
export function playDeathSound() {
    if(!deathSound.isPlaying) deathSound.play();
}
/**
 * @summary Hangok
 * @description Hozzáadja a radioaktivitás hangot a színtér egyik objektumához.
 * @function
 * @since I. mérföldkő
 */
export function attachRadioactivitySound(mesh) {
    mesh.add(radioactivitySound);
}
/**
 * @summary Hangok
 * @description Lejátssza a deadzone hangot ha még nem aktív.
 * @function
 * @since II. mérföldkő
 */
export function playDeadzoneSound() {
    if(!deadzone.isPlaying) deadzone.play();
}
/**
 * @summary Hangok
 * @description Megállítja a deadzone hangot ha még nem aktív.
 * @function
 * @since II. mérföldkő
 */
export function stopDeadzoneSound() {
    if(deadzone.isPlaying) deadzone.pause();
}