import { camera, scene } from './game.js';
import { createBox } from './world_building.js';
import { updateCollidableBounds, TYPE_MOVING_PLATFORM, TYPE_MOVING_OBSTACLE, registerCollidableObject} from './collision.js';
import { TetrahedronGeometry, MeshPhongMaterial } from './three.module.js';

//létrehoz egy téglatestet, ami a megadott irányban mozog (ismétlődő animáció), és ütközéskor mozgatja a játékost.
//axis: 'x', 'Y', 'Z' lehet
//fromTo: egy 2 komponenső array, a megadott tengelyen e két pozíció közt fog mozogni
//time: ennyi idő alatt hajt végre egy animációt (millisec)
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

//annak a platformnak az azonosítója, amin a játékos áll. -1 ha egyiken sem áll.
let platformId = -1; 

export function standOnPlatform(pid) {
    platformId = pid;
}

//Ugyanaz, mint a 'createMovingObstacle', de más típusú mozgó objektumokt hoz létre. Ez nem támogat Y irányú mozgást.
//Ha a játékos ráugrik, akkor mozgatni fogja.
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
    let previousPosition = (axis === 'X') ? box.position.x : box.position.z; //ebből számolja majd a megtett távolságot
    const handlePlayerOnPlatform = function() {
        if(box.id == platformId) { //a játékos ezen a platformon áll.
            if(axis === 'X') {
                const distance = previousPosition - box.position.x; //nem igazán távolság, mert negatív is lehet
                camera.position.x -= distance; //játékos mozgatása
                previousPosition = box.position.x; //'előző' pozíció frissítése
            } else {
                const distance = previousPosition - box.position.z;
                camera.position.z -= distance;
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

//Játékost gyógyító objektumot készít. Tweeneléssel van forgatva.
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
    scene.add(healMesh);
    registerCollidableObject(healMesh, 'HEAL-500', true);

    const animation = new TWEEN.Tween(healMesh.rotation)
    .to({x: 2*Math.PI, z: 2*Math.PI}, 3000);
    animation.repeat(Infinity); //folytonosan
    animation.start();
}