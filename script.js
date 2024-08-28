function initWebGL(canvas) {
    let gl = null;
    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    } catch(e) {}
    
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
        return null;
    }
    return gl;
}

function getShaderError(gl, shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return gl.getShaderInfoLog(shader);
    }
    return null;
}

function getProgramError(gl, program) {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return gl.getProgramInfoLog(program);
    }
    return null;
}

function init() {
    const canvas = document.getElementById('canvas');
    const gl = initWebGL(canvas);
    if (!gl) return;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const error = getShaderError(gl, shader);
        if (error) {
            console.error('Shader compilation error:', error);
            return null;
        }
        return shader;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const error = getProgramError(gl, program);
        if (error) {
            console.error('Program linking error:', error);
            return null;
        }
        return program;
    }

    const vertexShaderSource = document.getElementById('vertexShader').text;
    const fragmentShaderSource = document.getElementById('fragmentShader').text;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
        console.error('Failed to create shaders');
        return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
        console.error('Failed to create program');
        return;
    }

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
    const rippleStrengthLocation = gl.getUniformLocation(program, 'u_rippleStrength');

    let mouseX = 0, mouseY = 0;
    let rippleStrength = 0;

    let animationFrameId = null;
    let needsTextureUpdate = false;
    let needsRender = false;

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function updateTexture() {
        const text = document.getElementById('text-input').value;
        const fontSize = document.getElementById('font-size').value;
        const backgroundColor = document.getElementById('background-color').value;
        const textColor = document.getElementById('text-color').value;
        const tiling = parseInt(document.getElementById('tiling').value);
        const textTexture = createTextTexture(text, fontSize, textColor, backgroundColor, tiling);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textTexture);
        needsRender = true;
    }

    const debouncedUpdateTexture = debounce(updateTexture, 100);

    function render() {
        if (needsTextureUpdate) {
            updateTexture();
            needsTextureUpdate = false;
        }

        if (needsRender) {
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(program);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            gl.uniform2f(mouseLocation, mouseX, mouseY);
            gl.uniform1f(distortionStrengthLocation, parseFloat(document.getElementById('distortion-strength').value));
            gl.uniform1f(distortionRadiusLocation, parseFloat(document.getElementById('distortion-radius').value));
            gl.uniform1f(rgbSeparationLocation, parseFloat(document.getElementById('rgb-separation').value));
            
            rippleStrength *= 0.95;
            gl.uniform1f(rippleStrengthLocation, rippleStrength);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            needsRender = false;
        }

        animationFrameId = requestAnimationFrame(render);
    }

    function updateMousePosition(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouseY = (rect.bottom - e.clientY) * (canvas.height / rect.height);
        needsRender = true;
    }

    function updateTouchPosition(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        mouseY = (rect.bottom - e.touches[0].clientY) * (canvas.height / rect.height);
        needsRender = true;
    }

    function handleInteraction(e) {
        if (e.type === 'click') {
            updateMousePosition(e);
        } else if (e.type === 'touchstart') {
            updateTouchPosition(e);
        }
        rippleStrength = 0.02;
        needsRender = true;
    }

    canvas.addEventListener('mousemove', updateMousePosition);
    canvas.addEventListener('touchmove', updateTouchPosition);
    canvas.addEventListener('click', handleInteraction);
    canvas.addEventListener('touchstart', handleInteraction);

    function createTextTexture(text, fontSize, textColor, backgroundColor, tiling) {
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

        const tileWidth = offscreenCanvas.width / tiling;
        const tileHeight = offscreenCanvas.height / tiling;

        for (let x = 0; x < tiling; x++) {
            for (let y = 0; y < tiling; y++) {
                ctx.save();
                ctx.translate(x * tileWidth + tileWidth / 2, y * tileHeight + tileHeight / 2);
                ctx.scale(1, -1);
                
                lines.forEach((line, index) => {
                    const yPos = - (lines.length - 1) * lineHeight / 2 + index * lineHeight;
                    ctx.fillText(line, 0, yPos);
                });

                ctx.restore();
            }
        }

        return offscreenCanvas;
    }

    function randomizeSettings() {
        document.getElementById('text-input').value = "Random!";
        document.getElementById('font-size').value = Math.floor(Math.random() * 88) + 12;
        document.getElementById('distortion-strength').value = (Math.random() * 5).toFixed(1);
        document.getElementById('distortion-radius').value = Math.floor(Math.random() * 450) + 50;
        document.getElementById('rgb-separation').value = (Math.random() * 0.1).toFixed(3);
        document.getElementById('background-color').value = '#' + Math.floor(Math.random()*16777215).toString(16);
        document.getElementById('text-color').value = '#' + Math.floor(Math.random()*16777215).toString(16);
        document.getElementById('tiling').value = Math.floor(Math.random() * 10) + 1;
        
        updateAllValues();
    }

    function resetSettings() {
        document.getElementById('text-input').value = "Hello, world!";
        document.getElementById('font-size').value = 48;
        document.getElementById('distortion-strength').value = 1.5;
        document.getElementById('distortion-radius').value = 190;
        document.getElementById('rgb-separation').value = 0.025;
        document.getElementById('background-color').value = "#000000";
        document.getElementById('text-color').value = "#ffffff";
        document.getElementById('tiling').value = 1;
        
        updateAllValues();
    }

    function updateAllValues() {
        document.getElementById('font-size-value').textContent = `${document.getElementById('font-size').value}px`;
        document.getElementById('distortion-strength-value').textContent = document.getElementById('distortion-strength').value;
        document.getElementById('distortion-radius-value').textContent = `${document.getElementById('distortion-radius').value}px`;
        document.getElementById('rgb-separation-value').textContent = document.getElementById('rgb-separation').value;
        document.getElementById('tiling-value').textContent = `${document.getElementById('tiling').value}x${document.getElementById('tiling').value}`;
        needsTextureUpdate = true;
    }

    document.getElementById('text-input').addEventListener('input', () => { needsTextureUpdate = true; });
    document.getElementById('font-size').addEventListener('input', debouncedUpdateTexture);
    document.getElementById('distortion-strength').addEventListener('input', () => { needsRender = true; });
    document.getElementById('distortion-radius').addEventListener('input', () => { needsRender = true; });
    document.getElementById('rgb-separation').addEventListener('input', () => { needsRender = true; });
    document.getElementById('background-color').addEventListener('input', debouncedUpdateTexture);
    document.getElementById('text-color').addEventListener('input', debouncedUpdateTexture);
    document.getElementById('randomize').addEventListener('click', randomizeSettings);
    document.getElementById('reset').addEventListener('click', resetSettings);

    document.getElementById('tiling').addEventListener('input', debouncedUpdateTexture);

    function resizeCanvas() {
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * pixelRatio;
        canvas.height = window.innerHeight * pixelRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
        needsTextureUpdate = true;
        needsRender = true;
    }

    window.addEventListener('resize', debounce(resizeCanvas, 100));
    resizeCanvas();

    render();
}

window.onload = init;