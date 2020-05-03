# ThreeJS-Game
Fejlett grafikai algoritmusok projektmunka.

ThreeJS Játék first person nézetben.

# Dokumentáció

A kód JSDoc segítségével van dokumentálva, amiből HTML dokumentáció készült (lásd a docs mappában).
Ezt a GitHub Pages segítségével hosztolom:

https://gtomika.github.io/ThreeJS-Game/

# Letöltés:

git clone https://github.com/Gtomika/ThreeJS-Game.git

(NEM elég csak a zip-et letölteni, mert a git Large File Storage-ben lévő fájlokat az nem tartalmazza.)

# I. Mérföldkő (április 5)

Ha erre a verzióra van szükség akkor:

* git clone https://github.com/Gtomika/ThreeJS-Game.git (ha még nincs letöltve)
* git checkout a7f8968f269df0154ebee2608933b4683c60044e (ez az utolsó április 5 előtti commit) 

# Használat

Web szerverrel kell használni, vagy a böngésző nem fogja betölteni a textúrákat.

Mielőtt elkezdjük a pointer lockot és a fullsceent használni, érdemes 
megvárni, hogy az oldal teljesen betöltsön. Ezután célszerű egyszer teljesen körbefordulni, 
hogy minden színtéren lévő modell is betöltsön. Amíg ezek nem történnek meg, addig 
nagyon fog akadni, utána kb 25 FPS várható.

Fullscreen mód van, de még tovább csökkenti az FPS-t, nem nagyon érdemes használni.

# English

Project work for advanced graphical algorithms course.
The code itself is english, but the comments are in hungarian.

To download:
git clone https://github.com/Gtomika/ThreeJS-Game.git

(Don't just download ZIP, won't work, because of git LFS.)

Use with a local web server, or the browser won't be able to load the textures. Wait until the page 
fully loads before starting to use, then completely turn around to force all models in the scene to load.