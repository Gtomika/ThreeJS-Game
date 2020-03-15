
export function coinRotationShader() { //vertex shader: forgatja az érmét
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

export function coinFragmentShader() { 
	return `
	const vec3 lightColor = vec3(1.0, 1.0, 1.0); //fehér
	const vec3 coinColor = vec3(1.0, 1.0, 0.0); //sárga

	uniform float ambientLightIntensity; //fények tulajdonságai
	uniform vec3 sunPosition;
	uniform float sunLightIntensity;

	varying vec3 pos;
	varying vec3 norm;

    void main() {
		vec3 ambient = lightColor * ambientLightIntensity * coinColor; //ambiens komponens

		vec3 nNormal = normalize(norm); //diffúz komponens
		vec3 L = normalize(sunPosition - pos); 
		float diffuseLight = max(dot(L, nNormal), 0.0);
		vec3 diffuse = lightColor * diffuseLight * sunLightIntensity * coinColor;

		gl_FragColor.xyz = ambient + diffuse; //végső szín
		gl_FragColor.w = 1.0;
    }
    `;
}

const ROTATION_ANGLE_DELTA = Math.PI / 80.0; //radiánban

const COIN_DATA = [];

export function saveCoinData(angleUniform, coinGeometry) { //meg kell hívni ha egy érmét hozunk létre
	COIN_DATA.push([angleUniform, coinGeometry]);
}

export function updateCoinRotationAngles() { //növeli a forgatási szöget. Ez a render loopban van meghívva.
    for(const coinData of COIN_DATA) {
		const coinGeometry = coinData[1]; //egyenlőre ez nincs használva

		const angleUniform = coinData[0];
        angleUniform.value += ROTATION_ANGLE_DELTA;
		if(angleUniform.value > 2 * Math.PI) angleUniform.value = 0.0;
    }
}

