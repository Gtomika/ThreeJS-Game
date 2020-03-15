import { createBox } from './world_building.js';
import { updateCollidableBounds, TYPE_MOVING } from './collision.js';

//létrehoz egy téglatesten, ami a megadott irányban mozog (ismétlődő animáció).
//axis: 'x', 'Y', 'Z' lehet
//fromTo: egy 2 komponenső array, a megadott tengelyen e két pozíció közt fog mozogni
//time: ennyi idő alatt hajt végre egy animációt (millisec)
export function createAnimatedBox(position, bounds, axis, fromTo, time) {
    const box = createBox(position, bounds, TYPE_MOVING);
    let from, to;
    if(axis === 'X') { //változtatandó paraméterek
        from = { x: fromTo[0] };
        to = { x: fromTo[1] };
    } else if(axis === 'Y') {
        from = { y: fromTo[0] };
        to = { y: fromTo[1] };
    } else { //Z
        from = { z: fromTo[0] };
        to = { z: fromTo[1] };
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