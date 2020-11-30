
async function main() {
	const canvas = document.querySelector("#glCanvas");
	const gl = canvas.getContext("webgl");
	if (gl === null) {
		alert("Unable to initialize WebGL. Your browser or machine may not support it.");
		return;
	}

	const loadVsSource = fetch('./shaders/vs.vert').then(r => r.text());
	const loadFsSource = fetch('./shaders/fs.frag').then(r => r.text());
	const [vsSource, fsSource] = await Promise.all([loadVsSource, loadFsSource]);
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
		},
	};

	const buffers = initBuffers(gl);
	let then = 0;
	const render = (now) => {
		now *= 0.001;
		const deltaTime = now - then;
		drawScene(gl, programInfo, buffers, deltaTime);
		requestAnimationFrame(render);
	};
	requestAnimationFrame(render);
}

/* Render the scene */

function drawScene(gl, programInfo, buffers, deltaTime) {
	gl.clearColor(0, 0, 0, 1);
	gl.clearDepth(1);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const fieldOfView = 45 * Math.PI / 180;
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();
	mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

	const modelViewMatrix = mat4.create();
	mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
	const cubeRotation = deltaTime;
	mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
	mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * .7, [0, 1, 0]);

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

	{
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
		gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, numComponents, type,
			normalize, stride, offset);
		gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

	gl.useProgram(programInfo.program);
	gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
	gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

	{
		const vertexCount = 36;
		const type = gl.UNSIGNED_SHORT;
		const offset = 0;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}

	// {
	// 	const offset = 0;
	// 	const vertexCount = 4;
	// 	gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
	// }

}

/* Create the initial Data */

function initBuffers(gl) {
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

	const faceColors = [
		[1.0,  1.0,  1.0,  1.0], // Front face: white
		[1.0,  0.0,  0.0,  1.0], // Back face: red
		[0.0,  1.0,  0.0,  1.0], // Top face: green
		[0.0,  0.0,  1.0,  1.0], // Bottom face: blue
		[1.0,  1.0,  0.0,  1.0], // Right face: yellow
		[1.0,  0.0,  1.0,  1.0], // Left face: purple
	];
	let colors = [];
	for (let j = 0; j < faceColors.length; j += 1) {
		const c = faceColors[j];
		colors = colors.concat(c, c, c, c);
	}
	const colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

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


	return {
		position: positionBuffer,
		color: colorBuffer,
		indices: indexBuffer,
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
