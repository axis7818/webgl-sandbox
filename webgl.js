
async function main() {
	console.log("creating webgl context");
	const canvas = document.querySelector("#glCanvas");
	const gl = canvas.getContext("webgl");
	if (gl === null) {
		alert("Unable to initialize WebGL. Your browser or machine may not support it.");
		return;
	}

	console.log("loading shaders");
	const loadVsSource = fetch('./shaders/vs.vert').then(r => r.text());
	const loadFsSource = fetch('./shaders/fs.frag').then(r => r.text());
	const [vsSource, fsSource] = await Promise.all([loadVsSource, loadFsSource]);

	console.log("building shader program");
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
		},
	};

	console.log("initializing buffers");
	const buffers = await initBuffers(gl);
	let then = 0;
	const render = (now) => {
		// console.log("rendering");
		now *= 0.001;
		const deltaTime = now - then;
		drawScene(gl, programInfo, buffers, deltaTime);
		requestAnimationFrame(render);
	};
	requestAnimationFrame(render);
}

/* Render the scene */

function drawScene(gl, programInfo, buffers, deltaTime) {
	// console.log("--- drawing scene");
	gl.clearColor(0, 0, 0, 1);
	gl.clearDepth(1);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// console.log("building perspecitve matrix");
	const fieldOfView = 45 * Math.PI / 180;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();
	mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

	// console.log("building model view matrix");
	const modelViewMatrix = mat4.create();
	mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
	const cubeRotation = deltaTime;
	mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
	mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * .7, [0, 1, 0]);

	// console.log("binding position buffer");
	{
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type,
			normalize, stride, offset);
		gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
	}

	// console.log("binding texture coordinate buffer");
	{
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
		gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, numComponents, type,
			normalize, stride, offset);
		gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
	}

	// console.log("binding indices buffer");
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	// console.log("setting uniforms");
	gl.useProgram(programInfo.program);
	gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, buffers.texture);
	gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

	// console.log("drawing elements");
	{
		const vertexCount = 36;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}
}

/* Load Texture */

function loadTexture(gl, url) {
	const level = 0;
	const internalFormat = gl.RGBA;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;

	const image = new Image();
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(`Timed out loading the texture: ${url}`), 2000);

		image.onload = () => {
			const texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

			if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
				gl.generateMipmap(gl.TEXTURE_2D);
			} else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}

			clearTimeout(timeout);
			resolve(texture);
		};

		image.onerror = (err) => reject(err);

		image.src = url;
	});
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

/* Create the initial Data */

async function initBuffers(gl) {
	console.log("loading texture");
	const texture = await loadTexture(gl, 'textures/cubetexture.png');

	console.log("creating positions");
	const positions = new Float32Array([
		// Front face
		-1.0, -1.0,  1.0,
		1.0, -1.0,  1.0,
		1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,

		// Back face
		-1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		1.0,  1.0, -1.0,
		1.0, -1.0, -1.0,

		// Top face
		-1.0,  1.0, -1.0,
		-1.0,  1.0,  1.0,
		1.0,  1.0,  1.0,
		1.0,  1.0, -1.0,

		// Bottom face
		-1.0, -1.0, -1.0,
		1.0, -1.0, -1.0,
		1.0, -1.0,  1.0,
		-1.0, -1.0,  1.0,

		// Right face
		1.0, -1.0, -1.0,
		1.0,  1.0, -1.0,
		1.0,  1.0,  1.0,
		1.0, -1.0,  1.0,

		// Left face
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0,
	]);
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

	console.log("creating indices");
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	const indices = [
		0,  1,  2,      0,  2,  3,    // front
		4,  5,  6,      4,  6,  7,    // back
		8,  9,  10,     8,  10, 11,   // top
		12, 13, 14,     12, 14, 15,   // bottom
		16, 17, 18,     16, 18, 19,   // right
		20, 21, 22,     20, 22, 23,   // left
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	console.log("creating texture coordinates");
	const textureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
	const textureCoordinates = [
		// Front
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Back
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Top
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Bottom
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Right
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
		// Left
		0.0,  0.0,
		1.0,  0.0,
		1.0,  1.0,
		0.0,  1.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

	return {
		texture: texture,
		position: positionBuffer,
		indices: indexBuffer,
		textureCoord: textureCoordBuffer,
	};
}

/* Loading Shaders into a Program */

function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
		return null;
	}
	return shaderProgram;
}

function loadShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

/* Kick it off! */

window.onload = main;
