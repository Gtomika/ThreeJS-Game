/**
 * @summary Shader modul
 * @file Tartalmazza a shaderek kódját, és a shadereket frissítő metódusokat.
 * @module shaders
 * @since I. mérföldkő
 * @author Gáspár Tamás
 */

 /**
  * @summary Érme shader
  * @description Vertex shader, ami forgatja az érmét (és a normálvektorokat is).
  * @function
  * @since I. mérföldkő
  * @returns {string} Az egész shaderkód egy stringként.
  */
export function coinRotationShader() {
    return `                                
		uniform float angle;
		
		varying vec3 pos; //kell a fragment shaderben
		varying vec3 norm;

		void main()	{
				pos = position.xyz; //továbbadás
			
				float sina = sin(angle); //forgatásmátrix elkészítése
				float cosa = cos(angle); 
				mat4 rotMat = mat4(          
						cosa, 0.0, -sina, 0.0,   
						0.0,    1.0,    0.0,   0.0,   
						sina, 0.0, cosa,  0.0,   
						0.0,    0.0,   0.0,   1.0    
				);

				vec4 norm4 = rotMat * vec4(normal, 1.0); //mivel az objektum fordul, a normálvektor is
				norm = norm4.xyz;

				vec4 rotatedPosition = rotMat * vec4(position, 1.0); 
				gl_Position = projectionMatrix * modelViewMatrix * rotatedPosition;
		} 
    `;
}
/**
  * @summary Érme shader
  * @description Fragmens shader, ami a Phong modellnek megfelelően számolja ki az árnyalást az érmére.
  * @function
  * @since I. mérföldkő
  * @returns {string} Az egész shaderkód egy stringként.
  */
export function coinFragmentShader() { 
	return `
	const vec3 lightColor = vec3(1.0, 1.0, 1.0); //fehér
	const vec3 coinColor = vec3(1.0, 1.0, 0.0); //sárga

	uniform float ambientLightIntensity; //fények tulajdonságai
	uniform vec3 sunPosition;
	uniform float sunLightIntensity;
	uniform float coinShininess; //érme visszaverő képessége
	
	varying vec3 pos;
	varying vec3 norm;

    void main() {
		vec3 ambient = lightColor * ambientLightIntensity * coinColor; //ambiens komponens

		vec3 nNormal = normalize(norm); //diffúz komponens
		vec3 L = normalize(sunPosition - pos); 
		float diffuseLight = max(dot(L, nNormal), 0.0);
		vec3 diffuse = lightColor * diffuseLight * sunLightIntensity * coinColor;

		//spekuláris komponens
		vec3 pointsToCamera = normalize(cameraPosition - pos); //THREEjs már beadja a cameraPosition-t
		vec3 H = normalize(L + pointsToCamera); //segédvektor
		float specularAngle = dot(H, nNormal);  //a tükröződés mértékének meghatározása
		if(specularAngle < 0.0) specularAngle = 0.0;
		//valamiért firefoxon a max fv-t itt nem ismeri fel, és hibát dob... A fenti max fv. működik
		//float specularAngle = max(dot(H, nNormal), 0.0);
		float specularLight = pow(specularAngle, coinShininess); //visszaverődési képesség figyelembe vétele
		if(diffuseLight <= 0.0) specularLight = 0.0;
		vec3 specular = coinColor * lightColor * specularLight;

		gl_FragColor.xyz = ambient + diffuse + specular; //végső szín
		gl_FragColor.w = 1.0;
    }
    `;
}
/**
 * Ennyivel forognak el az érmék a [frissítő metódus]{@link module:shaders.updateCoinShader} egyszeri meghívásakor.
 * Radiánban van.
 * @constant
 * @private
 */
const ROTATION_ANGLE_DELTA = Math.PI / 80.0;
/**
 * Ez a lista tartalmazza azokat az érme uniformokat, amiket a [frissítő metódus]{@link module:shaders.updateCoinShader} 
 * módosít.
 * @constant
 * @private
 */
const COIN_DATA = [];
/**
 * @summary Érme létrehozás
 * @description Meg kell hívni ha egy érmét hozunk létre, [elmenti]{@link module:shaders.COIN_DATA} a megfelelő uniformokat.
 * @function
 * @since I. mérföldkő
 * @param {float} angleUniform A forgásszöget meghatározó uniform .
 * @param {THREE.Vector3} sunPositionUniform A nap pozícióját meghatározó uniform.
 * @param {float} sunLightIntensityUniform A napfény erősségét meghatározó uniform.
 */
export function saveCoinData(angleUniform, sunPositionUniform, sunLightIntensityUniform) {
	COIN_DATA.push([angleUniform, sunPositionUniform, sunLightIntensityUniform]);
}
/**
 * @summary Shader frissítés
 * @description A [render loopban]{@link module:game.render} van meghívva és módosítja azokat az 
 * uniform változókat amikre az érme shadernek szüksége van.
 * @function
 * @since I. mérföldkő
 * @param {THREE.Vector3} sunPosition A nap új pozíciója.
 * @param {float} sunLightIntensity A nap új fényereje.
 */
export function updateCoinShader(sunPosition, sunLightIntensity) {
    for(const coinData of COIN_DATA) {
		const angleUniform = coinData[0]; //forgásszög frissítése
        angleUniform.value += ROTATION_ANGLE_DELTA;
		if(angleUniform.value > 2 * Math.PI) angleUniform.value = 0.0;
		const sunPositionUniform = coinData[1]; //napfény tulajdonságainak frissítése
		sunPositionUniform.value = sunPosition;
		const sunLightIntensityUniform = coinData[2];
		sunLightIntensityUniform.value = sunLightIntensity;
    }
}

