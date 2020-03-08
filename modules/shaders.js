
export function coinRotationShader() { //vertex shader: forgatja az objektumot
    return `                                
		uniform float angle;                    
		void main()	{                           
				float sina = sin(angle); 
				float cosa = cos(angle); 
				mat4 rotMat = mat4(          
						cosa, 0.0, -sina, 0.0,   
						0.0,    1.0,    0.0,   0.0,   
						sina, 0.0, cosa,  0.0,   
						0.0,    0.0,   0.0,   1.0    
				);                       
				vec4 rotatedPosition = rotMat * vec4(position, 1.0); 
				gl_Position = projectionMatrix * modelViewMatrix * rotatedPosition; 
		} 
    `;
}

export function coinFragmentShader() { //sárga szín
    return `
    void main() {
        gl_FragColor = vec4(0.8, 0.8, 0, 1.0);
    }
    `;
}
const ROTATION_ANGLE_DELTA = Math.PI / 80.0; //radiánban

export const COIN_ANGLE_UNIFORMS = [];

export function updateCoinRotationAngles() { //növeli a forgatási szöget. Ez a render loopban van meghívva.
    for(const angleUniform of COIN_ANGLE_UNIFORMS) {
        angleUniform.value += ROTATION_ANGLE_DELTA;
        if(angleUniform.value > 2 * Math.PI) angleUniform.value = 0.0;
    }
}

