// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    console.error('WebGL not supported');
    alert('WebGL is not supported in your browser.');
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const vertexShaderSource = document.getElementById('vertexShader').text;
const fragmentShaderSource = document.getElementById('fragmentShader').text;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = createProgram(gl, vertexShader, fragmentShader);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
]), gl.STATIC_DRAW);

const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0,
    1, 0,
    0, 1,
    1, 1,
]), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'a_position');
const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

gl.enableVertexAttribArray(positionLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.enableVertexAttribArray(texCoordLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
const distortionStrengthLocation = gl.getUniformLocation(program, 'u_distortionStrength');
const distortionRadiusLocation = gl.getUniformLocation(program, 'u_distortionRadius');
const rgbSeparationLocation = gl.getUniformLocation(program, 'u_rgbSeparation');
const iterationsLocation = gl.getUniformLocation(program, 'u_iterations');

let mouseX = 0, mouseY = 0;

function handlePointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = canvas.height - (e.clientY - rect.top);
    render();
}

canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handlePointerMove(e.touches[0]);
}, { passive: false });

function createTextTexture(text, fontSize, textColor, backgroundColor) {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\\n');
    const lineHeight = fontSize * 1.2;

    ctx.save();
    ctx.translate(offscreenCanvas.width / 2, offscreenCanvas.height / 2);
    ctx.scale(1, -1);
    
    lines.forEach((line, index) => {
        const yPos = - (lines.length - 1) * lineHeight / 2 + index * lineHeight;
        ctx.fillText(line, 0, yPos);
    });

    ctx.restore();

    return offscreenCanvas;
}

function updateTexture() {
    const text = document.getElementById('text-input').value;
    const fontSize = document.getElementById('font-size').value;
    const backgroundColor = document.getElementById('background-color').value;
    const textColor = document.getElementById('text-color').value;
    const textTexture = createTextTexture(text, fontSize, textColor, backgroundColor);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textTexture);
    render();
}

function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(mouseLocation, mouseX, mouseY);
    gl.uniform1f(distortionStrengthLocation, parseFloat(document.getElementById('distortion-strength').value));
    gl.uniform1f(distortionRadiusLocation, parseFloat(document.getElementById('distortion-radius').value));
    gl.uniform1f(rgbSeparationLocation, parseFloat(document.getElementById('rgb-separation').value));
    gl.uniform1i(iterationsLocation, parseInt(document.getElementById('iterations').value));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function randomizeSettings() {
    document.getElementById('text-input').value = "Random!";
    document.getElementById('font-size').value = Math.floor(Math.random() * 88) + 12;
    document.getElementById('distortion-strength').value = (Math.random() * 5).toFixed(1);
    document.getElementById('distortion-radius').value = Math.floor(Math.random() * 450) + 50;
    document.getElementById('rgb-separation').value = (Math.random() * 0.1).toFixed(3);
    document.getElementById('iterations').value = Math.floor(Math.random() * 19) + 1;
    document.getElementById('background-color').value = '#' + Math.floor(Math.random()*16777215).toString(16);
    document.getElementById('text-color').value = '#' + Math.floor(Math.random()*16777215).toString(16);
    
    updateAllValues();
}

function resetSettings() {
    document.getElementById('text-input').value = "Distorto";
    document.getElementById('font-size').value = 48;
    document.getElementById('distortion-strength').value = 1.5;
    document.getElementById('distortion-radius').value = 190;
    document.getElementById('rgb-separation').value = 0.025;
    document.getElementById('iterations').value = 10;
    document.getElementById('background-color').value = "#000000";
    document.getElementById('text-color').value = "#ffffff";
    
    updateAllValues();
}

function updateAllValues() {
    document.getElementById('font-size-value').textContent = `${document.getElementById('font-size').value}px`;
    document.getElementById('distortion-strength-value').textContent = document.getElementById('distortion-strength').value;
    document.getElementById('distortion-radius-value').textContent = `${document.getElementById('distortion-radius').value}px`;
    document.getElementById('rgb-separation-value').textContent = document.getElementById('rgb-separation').value;
    document.getElementById('iterations-value').textContent = document.getElementById('iterations').value;
    updateTexture();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientWidth * 0.5625; // 16:9 aspect ratio
    gl.viewport(0, 0, canvas.width, canvas.height);
    updateTexture();
}

window.addEventListener('resize', resizeCanvas);

document.getElementById('text-input').addEventListener('input', updateTexture);
document.getElementById('font-size').addEventListener('input', updateAllValues);
document.getElementById('distortion-strength').addEventListener('input', updateAllValues);
document.getElementById('distortion-radius').addEventListener('input', updateAllValues);
document.getElementById('rgb-separation').addEventListener('input', updateAllValues);
document.getElementById('iterations').addEventListener('input', updateAllValues);
document.getElementById('background-color').addEventListener('input', updateTexture);
document.getElementById('text-color').addEventListener('input', updateTexture);
document.getElementById('randomize').addEventListener('click', randomizeSettings);
document.getElementById('reset').addEventListener('click', resetSettings);

resizeCanvas();
resetSettings();