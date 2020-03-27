import { listener } from './game.js';
import * as THREE from './three.module.js';

//globális hangok
let coinSound, walkSound, runSound, jumpSound, deathSound, healSound, damageSound, music;

//pozicionált hangok, ezeket hozzá kell adni objektumokhoz
let radioactivitySound;

export function loadSounds() { //inicializáláskor kell meghívni, betölti a hangokat
    initMusicMuter();

    coinSound = new THREE.Audio(listener);
    walkSound = new THREE.Audio(listener);
    runSound = new THREE.Audio(listener);
    jumpSound = new THREE.Audio(listener);
    deathSound = new THREE.Audio(listener);
    damageSound = new THREE.Audio(listener);
    healSound = new THREE.Audio(listener);
    music = new THREE.Audio(listener);
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
}

let musicMuted = true; //alapból némítva van a zene
function initMusicMuter() { // zene némító gomb beállítása
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

export function playJumpSound() {
    if(!jumpSound.isPlaying) jumpSound.play();
}

export function playCoinFoundSound() {
    if(coinSound.isPlaying) coinSound.stop(); //mindig újraindul
    coinSound.play();
}

export function playWalkSound() {
    if(!walkSound.isPlaying) walkSound.play();
}

export function pauseWalkSound() {
    if(walkSound.isPlaying) walkSound.pause();
}

export function playRunSound() { //kikapcsolja a walk soundot!
    pauseWalkSound();
    if(!runSound.isPlaying) runSound.play();
}

export function pauseRunSound(resumeWalkSound = true) { //visszakapcsolja a walk soundot, ha true a paraméter
    if(runSound.isPlaying) runSound.pause();
    if(resumeWalkSound) playWalkSound();
}

export function playDamageSound() {
    if(!damageSound.isPlaying) damageSound.play();
}

export function playHealSound() {
    healSound.play();
}

export function playDeathSound() {
    if(!deathSound.isPlaying) deathSound.play();
}

export function attachRadioactivitySound(mesh) {
    mesh.add(radioactivitySound);
}