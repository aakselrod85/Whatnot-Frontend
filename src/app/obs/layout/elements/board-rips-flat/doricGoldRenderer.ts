import {DORIC_BOUNDS, DORIC_INSET, DORIC_SOURCE_SIZE, DORIC_SPAN} from './doricMaterials'
import type {GoldCell} from './doricGoldState'

const vertex = `attribute vec2 p; varying vec2 uv;
void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`
const fragment = `precision mediump float;
varying vec2 uv; uniform sampler2D frame; uniform float t;
uniform vec4 bounds;
void main(){
    if(uv.x<.015||uv.x>.985||uv.y<.015||uv.y>.985||uv.x+uv.y<.233||uv.x+uv.y>1.767||uv.x-uv.y>.767||uv.y-uv.x>.767)discard;
    vec2 local=(uv-vec2(${DORIC_INSET}))/${DORIC_SPAN};
    vec4 src=texture2D(frame,bounds.xy+local*bounds.zw);
    if(src.a<.004)discard;
    float lum=dot(src.rgb,vec3(.299,.587,.114));
    float sat=(max(src.r,max(src.g,src.b))-min(src.r,min(src.g,src.b)))/max(.01,max(src.r,max(src.g,src.b)));
    float metal=smoothstep(.25,.52,sat)*smoothstep(.09,.28,src.r-src.b);
    float flow=uv.x*5.8+uv.y*3.1-t*1.35+.35*sin(uv.y*4.0+t*.55);
    float wave=.5+.5*sin(flow);
    float gleam=pow(max(0.,cos(flow)),5.5);
    float second=pow(max(0.,cos(uv.x*3.8-uv.y*4.2+t*.9)),8.)*.65;
    float reflection=clamp(gleam+second,0.,1.);
    float relief=smoothstep(.08,.67,lum);
    vec3 amber=src.rgb*(.86+.30*wave)+vec3(.065,.024,0.)*wave*relief;
    vec3 champagne=vec3(1.20,1.08,.70)*(.3+.7*relief);
    vec3 illuminated=mix(amber,champagne,reflection*.97*relief);
    gl_FragColor=vec4(clamp(mix(src.rgb,illuminated,metal),0.,1.),src.a);
}`

/** One context per board. No per-frame readback, texture upload, canvas copying or DOM measuring. */
export function createDoricGoldRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement) {
    const gl = canvas.getContext('webgl', {alpha: true, premultipliedAlpha: false, antialias: false})
    if (!gl) throw new Error('WebGL unavailable')
    const shaders: WebGLShader[] = []
    const program = gl.createProgram()
    const buffer = gl.createBuffer()
    const texture = gl.createTexture()
    const dispose = () => {
        shaders.forEach((shader) => gl.deleteShader(shader))
        gl.deleteTexture(texture)
        gl.deleteBuffer(buffer)
        gl.deleteProgram(program)
    }
    try {
        if (!program || !buffer || !texture) throw new Error('Gold GPU allocation failed')
        for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
            const shader = gl.createShader(type)
            if (!shader) throw new Error('Gold shader allocation failed')
            shaders.push(shader)
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Gold shader compilation failed')
            gl.attachShader(program, shader)
        }
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Gold program linking failed')
        gl.useProgram(program)
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
        const p = gl.getAttribLocation(program, 'p')
        gl.enableVertexAttribArray(p)
        gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0)
        // One power-of-two upload enables mipmaps for the tiny stream-size cells.
        const upload = document.createElement('canvas')
        upload.width = upload.height = 1024
        const ctx = upload.getContext('2d')
        if (!ctx) throw new Error('Gold texture preparation failed')
        ctx.drawImage(image, 0, 0, 1024, 1024)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, upload)
        gl.generateMipmap(gl.TEXTURE_2D)
        const [l, top, r, b] = DORIC_BOUNDS[1]
        gl.uniform4f(gl.getUniformLocation(program, 'bounds'), l / DORIC_SOURCE_SIZE, 1 - b / DORIC_SOURCE_SIZE, (r - l) / DORIC_SOURCE_SIZE, (b - top) / DORIC_SOURCE_SIZE)
        const time = gl.getUniformLocation(program, 't')
        const clear = () => { gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT) }
        return {
            dispose,
            clear,
            draw(cells: readonly GoldCell[], cellPx: number, cols: number, rows: number, seconds: number) {
                const dpr = Math.min(window.devicePixelRatio || 1, 2)
                const width = Math.round(cols * cellPx * dpr), height = Math.round(rows * cellPx * dpr)
                if (canvas.width !== width || canvas.height !== height) {canvas.width = width; canvas.height = height}
                clear()
                gl.uniform1f(time, seconds)
                gl.enable(gl.SCISSOR_TEST)
                for (const cell of cells) {
                    const left = Math.round(cell.col * cellPx * dpr), right = Math.round((cell.col + 1) * cellPx * dpr)
                    const bottom = Math.round((rows - cell.row - 1) * cellPx * dpr), top = Math.round((rows - cell.row) * cellPx * dpr)
                    gl.viewport(left, bottom, right - left, top - bottom)
                    gl.scissor(left, bottom, right - left, top - bottom)
                    gl.drawArrays(gl.TRIANGLES, 0, 6)
                }
                gl.disable(gl.SCISSOR_TEST)
            },
        }
    } catch (error) {
        dispose()
        throw error
    }
}
