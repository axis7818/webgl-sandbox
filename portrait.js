
async function main() {
	console.log("creating webgl context");
	const canvas = document.querySelector("#glCanvas");
	const gl = canvas.getContext("webgl");
	if (gl === null) {
		alert("Unable to initialize WebGL. Your browser or machine may not support it.");
		return;
	}

	console.log("loading shaders");
	const loadVsSource = fetch('./shaders/vertex.vert').then(r => r.text());
	const loadFsSource = fetch('./shaders/fragment.frag').then(r => r.text());
	const [vsSource, fsSource] = await Promise.all([loadVsSource, loadFsSource]);

	const shader = initShaderProgram(gl, vsSource, fsSource);
	const buffers = initBuffers(gl);

	drawImage(gl, shader, buffers);
}

function drawImage(gl, shader, buffers) {
	console.log("Clearing the color buffer");
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	{
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(shader.attribLocations.aVertexPosition, numComponents, type,
			normalize, stride, offset);
		gl.enableVertexAttribArray(shader.attribLocations.aVertexPosition);
	}

	gl.useProgram(shader.program);

	{
		const offset = 0;
		const vertexCount = 4;
		gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
	}
}

function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
		return null;
	}

	return {
		program,
		attribLocations: {
			aVertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
		},
	};
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

function initBuffers(gl) {
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		  1,  1,
		  1, -1,
		 -1,  1,
		 -1, -1,
	]), gl.STATIC_DRAW);

	return {
		position: positionBuffer,
	};
}

main();
