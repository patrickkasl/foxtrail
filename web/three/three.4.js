// three.js r160 (https://threejs.org), part "three.4".
// Copyright 2010-2023 three.js authors, MIT License: see the LICENSE file in this folder.
// This is three's own source, bundled without minifying and cut into parts by the Fox Trail workshop
// (tools/make-three.mjs), because the page is opened from disk and each file must stay small enough to read.
// One thing is left out: the glTF reader's WebP and AVIF texture extensions, which the trail does not use.
foxtrailPart('three.4', ['exports', './three.1', './three.2', './three.3'], (function (exports, three_1, three_2, three_3) { 'use strict';

	function WebGLState( gl, extensions, capabilities ) {

		const isWebGL2 = capabilities.isWebGL2;

		function ColorBuffer() {

			let locked = false;

			const color = new three_1.Vector4();
			let currentColorMask = null;
			const currentColorClear = new three_1.Vector4( 0, 0, 0, 0 );

			return {

				setMask: function ( colorMask ) {

					if ( currentColorMask !== colorMask && ! locked ) {

						gl.colorMask( colorMask, colorMask, colorMask, colorMask );
						currentColorMask = colorMask;

					}

				},

				setLocked: function ( lock ) {

					locked = lock;

				},

				setClear: function ( r, g, b, a, premultipliedAlpha ) {

					if ( premultipliedAlpha === true ) {

						r *= a; g *= a; b *= a;

					}

					color.set( r, g, b, a );

					if ( currentColorClear.equals( color ) === false ) {

						gl.clearColor( r, g, b, a );
						currentColorClear.copy( color );

					}

				},

				reset: function () {

					locked = false;

					currentColorMask = null;
					currentColorClear.set( -1, 0, 0, 0 ); // set to invalid state

				}

			};

		}

		function DepthBuffer() {

			let locked = false;

			let currentDepthMask = null;
			let currentDepthFunc = null;
			let currentDepthClear = null;

			return {

				setTest: function ( depthTest ) {

					if ( depthTest ) {

						enable( gl.DEPTH_TEST );

					} else {

						disable( gl.DEPTH_TEST );

					}

				},

				setMask: function ( depthMask ) {

					if ( currentDepthMask !== depthMask && ! locked ) {

						gl.depthMask( depthMask );
						currentDepthMask = depthMask;

					}

				},

				setFunc: function ( depthFunc ) {

					if ( currentDepthFunc !== depthFunc ) {

						switch ( depthFunc ) {

							case three_1.NeverDepth:

								gl.depthFunc( gl.NEVER );
								break;

							case three_1.AlwaysDepth:

								gl.depthFunc( gl.ALWAYS );
								break;

							case three_1.LessDepth:

								gl.depthFunc( gl.LESS );
								break;

							case three_1.LessEqualDepth:

								gl.depthFunc( gl.LEQUAL );
								break;

							case three_1.EqualDepth:

								gl.depthFunc( gl.EQUAL );
								break;

							case three_1.GreaterEqualDepth:

								gl.depthFunc( gl.GEQUAL );
								break;

							case three_1.GreaterDepth:

								gl.depthFunc( gl.GREATER );
								break;

							case three_1.NotEqualDepth:

								gl.depthFunc( gl.NOTEQUAL );
								break;

							default:

								gl.depthFunc( gl.LEQUAL );

						}

						currentDepthFunc = depthFunc;

					}

				},

				setLocked: function ( lock ) {

					locked = lock;

				},

				setClear: function ( depth ) {

					if ( currentDepthClear !== depth ) {

						gl.clearDepth( depth );
						currentDepthClear = depth;

					}

				},

				reset: function () {

					locked = false;

					currentDepthMask = null;
					currentDepthFunc = null;
					currentDepthClear = null;

				}

			};

		}

		function StencilBuffer() {

			let locked = false;

			let currentStencilMask = null;
			let currentStencilFunc = null;
			let currentStencilRef = null;
			let currentStencilFuncMask = null;
			let currentStencilFail = null;
			let currentStencilZFail = null;
			let currentStencilZPass = null;
			let currentStencilClear = null;

			return {

				setTest: function ( stencilTest ) {

					if ( ! locked ) {

						if ( stencilTest ) {

							enable( gl.STENCIL_TEST );

						} else {

							disable( gl.STENCIL_TEST );

						}

					}

				},

				setMask: function ( stencilMask ) {

					if ( currentStencilMask !== stencilMask && ! locked ) {

						gl.stencilMask( stencilMask );
						currentStencilMask = stencilMask;

					}

				},

				setFunc: function ( stencilFunc, stencilRef, stencilMask ) {

					if ( currentStencilFunc !== stencilFunc ||
					     currentStencilRef !== stencilRef ||
					     currentStencilFuncMask !== stencilMask ) {

						gl.stencilFunc( stencilFunc, stencilRef, stencilMask );

						currentStencilFunc = stencilFunc;
						currentStencilRef = stencilRef;
						currentStencilFuncMask = stencilMask;

					}

				},

				setOp: function ( stencilFail, stencilZFail, stencilZPass ) {

					if ( currentStencilFail !== stencilFail ||
					     currentStencilZFail !== stencilZFail ||
					     currentStencilZPass !== stencilZPass ) {

						gl.stencilOp( stencilFail, stencilZFail, stencilZPass );

						currentStencilFail = stencilFail;
						currentStencilZFail = stencilZFail;
						currentStencilZPass = stencilZPass;

					}

				},

				setLocked: function ( lock ) {

					locked = lock;

				},

				setClear: function ( stencil ) {

					if ( currentStencilClear !== stencil ) {

						gl.clearStencil( stencil );
						currentStencilClear = stencil;

					}

				},

				reset: function () {

					locked = false;

					currentStencilMask = null;
					currentStencilFunc = null;
					currentStencilRef = null;
					currentStencilFuncMask = null;
					currentStencilFail = null;
					currentStencilZFail = null;
					currentStencilZPass = null;
					currentStencilClear = null;

				}

			};

		}

		//

		const colorBuffer = new ColorBuffer();
		const depthBuffer = new DepthBuffer();
		const stencilBuffer = new StencilBuffer();

		const uboBindings = new WeakMap();
		const uboProgramMap = new WeakMap();

		let enabledCapabilities = {};

		let currentBoundFramebuffers = {};
		let currentDrawbuffers = new WeakMap();
		let defaultDrawbuffers = [];

		let currentProgram = null;

		let currentBlendingEnabled = false;
		let currentBlending = null;
		let currentBlendEquation = null;
		let currentBlendSrc = null;
		let currentBlendDst = null;
		let currentBlendEquationAlpha = null;
		let currentBlendSrcAlpha = null;
		let currentBlendDstAlpha = null;
		let currentBlendColor = new three_1.Color( 0, 0, 0 );
		let currentBlendAlpha = 0;
		let currentPremultipledAlpha = false;

		let currentFlipSided = null;
		let currentCullFace = null;

		let currentLineWidth = null;

		let currentPolygonOffsetFactor = null;
		let currentPolygonOffsetUnits = null;

		const maxTextures = gl.getParameter( gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS );

		let lineWidthAvailable = false;
		let version = 0;
		const glVersion = gl.getParameter( gl.VERSION );

		if ( glVersion.indexOf( 'WebGL' ) !== -1 ) {

			version = parseFloat( /^WebGL (\d)/.exec( glVersion )[ 1 ] );
			lineWidthAvailable = ( version >= 1.0 );

		} else if ( glVersion.indexOf( 'OpenGL ES' ) !== -1 ) {

			version = parseFloat( /^OpenGL ES (\d)/.exec( glVersion )[ 1 ] );
			lineWidthAvailable = ( version >= 2.0 );

		}

		let currentTextureSlot = null;
		let currentBoundTextures = {};

		const scissorParam = gl.getParameter( gl.SCISSOR_BOX );
		const viewportParam = gl.getParameter( gl.VIEWPORT );

		const currentScissor = new three_1.Vector4().fromArray( scissorParam );
		const currentViewport = new three_1.Vector4().fromArray( viewportParam );

		function createTexture( type, target, count, dimensions ) {

			const data = new Uint8Array( 4 ); // 4 is required to match default unpack alignment of 4.
			const texture = gl.createTexture();

			gl.bindTexture( type, texture );
			gl.texParameteri( type, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
			gl.texParameteri( type, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

			for ( let i = 0; i < count; i ++ ) {

				if ( isWebGL2 && ( type === gl.TEXTURE_3D || type === gl.TEXTURE_2D_ARRAY ) ) {

					gl.texImage3D( target, 0, gl.RGBA, 1, 1, dimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );

				} else {

					gl.texImage2D( target + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );

				}

			}

			return texture;

		}

		const emptyTextures = {};
		emptyTextures[ gl.TEXTURE_2D ] = createTexture( gl.TEXTURE_2D, gl.TEXTURE_2D, 1 );
		emptyTextures[ gl.TEXTURE_CUBE_MAP ] = createTexture( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 6 );

		if ( isWebGL2 ) {

			emptyTextures[ gl.TEXTURE_2D_ARRAY ] = createTexture( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_2D_ARRAY, 1, 1 );
			emptyTextures[ gl.TEXTURE_3D ] = createTexture( gl.TEXTURE_3D, gl.TEXTURE_3D, 1, 1 );

		}

		// init

		colorBuffer.setClear( 0, 0, 0, 1 );
		depthBuffer.setClear( 1 );
		stencilBuffer.setClear( 0 );

		enable( gl.DEPTH_TEST );
		depthBuffer.setFunc( three_1.LessEqualDepth );

		setFlipSided( false );
		setCullFace( three_1.CullFaceBack );
		enable( gl.CULL_FACE );

		setBlending( three_1.NoBlending );

		//

		function enable( id ) {

			if ( enabledCapabilities[ id ] !== true ) {

				gl.enable( id );
				enabledCapabilities[ id ] = true;

			}

		}

		function disable( id ) {

			if ( enabledCapabilities[ id ] !== false ) {

				gl.disable( id );
				enabledCapabilities[ id ] = false;

			}

		}

		function bindFramebuffer( target, framebuffer ) {

			if ( currentBoundFramebuffers[ target ] !== framebuffer ) {

				gl.bindFramebuffer( target, framebuffer );

				currentBoundFramebuffers[ target ] = framebuffer;

				if ( isWebGL2 ) {

					// gl.DRAW_FRAMEBUFFER is equivalent to gl.FRAMEBUFFER

					if ( target === gl.DRAW_FRAMEBUFFER ) {

						currentBoundFramebuffers[ gl.FRAMEBUFFER ] = framebuffer;

					}

					if ( target === gl.FRAMEBUFFER ) {

						currentBoundFramebuffers[ gl.DRAW_FRAMEBUFFER ] = framebuffer;

					}

				}

				return true;

			}

			return false;

		}

		function drawBuffers( renderTarget, framebuffer ) {

			let drawBuffers = defaultDrawbuffers;

			let needsUpdate = false;

			if ( renderTarget ) {

				drawBuffers = currentDrawbuffers.get( framebuffer );

				if ( drawBuffers === undefined ) {

					drawBuffers = [];
					currentDrawbuffers.set( framebuffer, drawBuffers );

				}

				if ( renderTarget.isWebGLMultipleRenderTargets ) {

					const textures = renderTarget.texture;

					if ( drawBuffers.length !== textures.length || drawBuffers[ 0 ] !== gl.COLOR_ATTACHMENT0 ) {

						for ( let i = 0, il = textures.length; i < il; i ++ ) {

							drawBuffers[ i ] = gl.COLOR_ATTACHMENT0 + i;

						}

						drawBuffers.length = textures.length;

						needsUpdate = true;

					}

				} else {

					if ( drawBuffers[ 0 ] !== gl.COLOR_ATTACHMENT0 ) {

						drawBuffers[ 0 ] = gl.COLOR_ATTACHMENT0;

						needsUpdate = true;

					}

				}

			} else {

				if ( drawBuffers[ 0 ] !== gl.BACK ) {

					drawBuffers[ 0 ] = gl.BACK;

					needsUpdate = true;

				}

			}

			if ( needsUpdate ) {

				if ( capabilities.isWebGL2 ) {

					gl.drawBuffers( drawBuffers );

				} else {

					extensions.get( 'WEBGL_draw_buffers' ).drawBuffersWEBGL( drawBuffers );

				}

			}


		}

		function useProgram( program ) {

			if ( currentProgram !== program ) {

				gl.useProgram( program );

				currentProgram = program;

				return true;

			}

			return false;

		}

		const equationToGL = {
			[ three_1.AddEquation ]: gl.FUNC_ADD,
			[ three_1.SubtractEquation ]: gl.FUNC_SUBTRACT,
			[ three_1.ReverseSubtractEquation ]: gl.FUNC_REVERSE_SUBTRACT
		};

		if ( isWebGL2 ) {

			equationToGL[ three_1.MinEquation ] = gl.MIN;
			equationToGL[ three_1.MaxEquation ] = gl.MAX;

		} else {

			const extension = extensions.get( 'EXT_blend_minmax' );

			if ( extension !== null ) {

				equationToGL[ three_1.MinEquation ] = extension.MIN_EXT;
				equationToGL[ three_1.MaxEquation ] = extension.MAX_EXT;

			}

		}

		const factorToGL = {
			[ three_1.ZeroFactor ]: gl.ZERO,
			[ three_1.OneFactor ]: gl.ONE,
			[ three_1.SrcColorFactor ]: gl.SRC_COLOR,
			[ three_1.SrcAlphaFactor ]: gl.SRC_ALPHA,
			[ three_1.SrcAlphaSaturateFactor ]: gl.SRC_ALPHA_SATURATE,
			[ three_1.DstColorFactor ]: gl.DST_COLOR,
			[ three_1.DstAlphaFactor ]: gl.DST_ALPHA,
			[ three_1.OneMinusSrcColorFactor ]: gl.ONE_MINUS_SRC_COLOR,
			[ three_1.OneMinusSrcAlphaFactor ]: gl.ONE_MINUS_SRC_ALPHA,
			[ three_1.OneMinusDstColorFactor ]: gl.ONE_MINUS_DST_COLOR,
			[ three_1.OneMinusDstAlphaFactor ]: gl.ONE_MINUS_DST_ALPHA,
			[ three_1.ConstantColorFactor ]: gl.CONSTANT_COLOR,
			[ three_1.OneMinusConstantColorFactor ]: gl.ONE_MINUS_CONSTANT_COLOR,
			[ three_1.ConstantAlphaFactor ]: gl.CONSTANT_ALPHA,
			[ three_1.OneMinusConstantAlphaFactor ]: gl.ONE_MINUS_CONSTANT_ALPHA
		};

		function setBlending( blending, blendEquation, blendSrc, blendDst, blendEquationAlpha, blendSrcAlpha, blendDstAlpha, blendColor, blendAlpha, premultipliedAlpha ) {

			if ( blending === three_1.NoBlending ) {

				if ( currentBlendingEnabled === true ) {

					disable( gl.BLEND );
					currentBlendingEnabled = false;

				}

				return;

			}

			if ( currentBlendingEnabled === false ) {

				enable( gl.BLEND );
				currentBlendingEnabled = true;

			}

			if ( blending !== three_1.CustomBlending ) {

				if ( blending !== currentBlending || premultipliedAlpha !== currentPremultipledAlpha ) {

					if ( currentBlendEquation !== three_1.AddEquation || currentBlendEquationAlpha !== three_1.AddEquation ) {

						gl.blendEquation( gl.FUNC_ADD );

						currentBlendEquation = three_1.AddEquation;
						currentBlendEquationAlpha = three_1.AddEquation;

					}

					if ( premultipliedAlpha ) {

						switch ( blending ) {

							case three_1.NormalBlending:
								gl.blendFuncSeparate( gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
								break;

							case three_1.AdditiveBlending:
								gl.blendFunc( gl.ONE, gl.ONE );
								break;

							case three_1.SubtractiveBlending:
								gl.blendFuncSeparate( gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE );
								break;

							case three_1.MultiplyBlending:
								gl.blendFuncSeparate( gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.SRC_ALPHA );
								break;

							default:
								console.error( 'THREE.WebGLState: Invalid blending: ', blending );
								break;

						}

					} else {

						switch ( blending ) {

							case three_1.NormalBlending:
								gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
								break;

							case three_1.AdditiveBlending:
								gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
								break;

							case three_1.SubtractiveBlending:
								gl.blendFuncSeparate( gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE );
								break;

							case three_1.MultiplyBlending:
								gl.blendFunc( gl.ZERO, gl.SRC_COLOR );
								break;

							default:
								console.error( 'THREE.WebGLState: Invalid blending: ', blending );
								break;

						}

					}

					currentBlendSrc = null;
					currentBlendDst = null;
					currentBlendSrcAlpha = null;
					currentBlendDstAlpha = null;
					currentBlendColor.set( 0, 0, 0 );
					currentBlendAlpha = 0;

					currentBlending = blending;
					currentPremultipledAlpha = premultipliedAlpha;

				}

				return;

			}

			// custom blending

			blendEquationAlpha = blendEquationAlpha || blendEquation;
			blendSrcAlpha = blendSrcAlpha || blendSrc;
			blendDstAlpha = blendDstAlpha || blendDst;

			if ( blendEquation !== currentBlendEquation || blendEquationAlpha !== currentBlendEquationAlpha ) {

				gl.blendEquationSeparate( equationToGL[ blendEquation ], equationToGL[ blendEquationAlpha ] );

				currentBlendEquation = blendEquation;
				currentBlendEquationAlpha = blendEquationAlpha;

			}

			if ( blendSrc !== currentBlendSrc || blendDst !== currentBlendDst || blendSrcAlpha !== currentBlendSrcAlpha || blendDstAlpha !== currentBlendDstAlpha ) {

				gl.blendFuncSeparate( factorToGL[ blendSrc ], factorToGL[ blendDst ], factorToGL[ blendSrcAlpha ], factorToGL[ blendDstAlpha ] );

				currentBlendSrc = blendSrc;
				currentBlendDst = blendDst;
				currentBlendSrcAlpha = blendSrcAlpha;
				currentBlendDstAlpha = blendDstAlpha;

			}

			if ( blendColor.equals( currentBlendColor ) === false || blendAlpha !== currentBlendAlpha ) {

				gl.blendColor( blendColor.r, blendColor.g, blendColor.b, blendAlpha );

				currentBlendColor.copy( blendColor );
				currentBlendAlpha = blendAlpha;

			}

			currentBlending = blending;
			currentPremultipledAlpha = false;

		}

		function setMaterial( material, frontFaceCW ) {

			material.side === three_1.DoubleSide
				? disable( gl.CULL_FACE )
				: enable( gl.CULL_FACE );

			let flipSided = ( material.side === three_1.BackSide );
			if ( frontFaceCW ) flipSided = ! flipSided;

			setFlipSided( flipSided );

			( material.blending === three_1.NormalBlending && material.transparent === false )
				? setBlending( three_1.NoBlending )
				: setBlending( material.blending, material.blendEquation, material.blendSrc, material.blendDst, material.blendEquationAlpha, material.blendSrcAlpha, material.blendDstAlpha, material.blendColor, material.blendAlpha, material.premultipliedAlpha );

			depthBuffer.setFunc( material.depthFunc );
			depthBuffer.setTest( material.depthTest );
			depthBuffer.setMask( material.depthWrite );
			colorBuffer.setMask( material.colorWrite );

			const stencilWrite = material.stencilWrite;
			stencilBuffer.setTest( stencilWrite );
			if ( stencilWrite ) {

				stencilBuffer.setMask( material.stencilWriteMask );
				stencilBuffer.setFunc( material.stencilFunc, material.stencilRef, material.stencilFuncMask );
				stencilBuffer.setOp( material.stencilFail, material.stencilZFail, material.stencilZPass );

			}

			setPolygonOffset( material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits );

			material.alphaToCoverage === true
				? enable( gl.SAMPLE_ALPHA_TO_COVERAGE )
				: disable( gl.SAMPLE_ALPHA_TO_COVERAGE );

		}

		//

		function setFlipSided( flipSided ) {

			if ( currentFlipSided !== flipSided ) {

				if ( flipSided ) {

					gl.frontFace( gl.CW );

				} else {

					gl.frontFace( gl.CCW );

				}

				currentFlipSided = flipSided;

			}

		}

		function setCullFace( cullFace ) {

			if ( cullFace !== three_1.CullFaceNone ) {

				enable( gl.CULL_FACE );

				if ( cullFace !== currentCullFace ) {

					if ( cullFace === three_1.CullFaceBack ) {

						gl.cullFace( gl.BACK );

					} else if ( cullFace === three_1.CullFaceFront ) {

						gl.cullFace( gl.FRONT );

					} else {

						gl.cullFace( gl.FRONT_AND_BACK );

					}

				}

			} else {

				disable( gl.CULL_FACE );

			}

			currentCullFace = cullFace;

		}

		function setLineWidth( width ) {

			if ( width !== currentLineWidth ) {

				if ( lineWidthAvailable ) gl.lineWidth( width );

				currentLineWidth = width;

			}

		}

		function setPolygonOffset( polygonOffset, factor, units ) {

			if ( polygonOffset ) {

				enable( gl.POLYGON_OFFSET_FILL );

				if ( currentPolygonOffsetFactor !== factor || currentPolygonOffsetUnits !== units ) {

					gl.polygonOffset( factor, units );

					currentPolygonOffsetFactor = factor;
					currentPolygonOffsetUnits = units;

				}

			} else {

				disable( gl.POLYGON_OFFSET_FILL );

			}

		}

		function setScissorTest( scissorTest ) {

			if ( scissorTest ) {

				enable( gl.SCISSOR_TEST );

			} else {

				disable( gl.SCISSOR_TEST );

			}

		}

		// texture

		function activeTexture( webglSlot ) {

			if ( webglSlot === undefined ) webglSlot = gl.TEXTURE0 + maxTextures - 1;

			if ( currentTextureSlot !== webglSlot ) {

				gl.activeTexture( webglSlot );
				currentTextureSlot = webglSlot;

			}

		}

		function bindTexture( webglType, webglTexture, webglSlot ) {

			if ( webglSlot === undefined ) {

				if ( currentTextureSlot === null ) {

					webglSlot = gl.TEXTURE0 + maxTextures - 1;

				} else {

					webglSlot = currentTextureSlot;

				}

			}

			let boundTexture = currentBoundTextures[ webglSlot ];

			if ( boundTexture === undefined ) {

				boundTexture = { type: undefined, texture: undefined };
				currentBoundTextures[ webglSlot ] = boundTexture;

			}

			if ( boundTexture.type !== webglType || boundTexture.texture !== webglTexture ) {

				if ( currentTextureSlot !== webglSlot ) {

					gl.activeTexture( webglSlot );
					currentTextureSlot = webglSlot;

				}

				gl.bindTexture( webglType, webglTexture || emptyTextures[ webglType ] );

				boundTexture.type = webglType;
				boundTexture.texture = webglTexture;

			}

		}

		function unbindTexture() {

			const boundTexture = currentBoundTextures[ currentTextureSlot ];

			if ( boundTexture !== undefined && boundTexture.type !== undefined ) {

				gl.bindTexture( boundTexture.type, null );

				boundTexture.type = undefined;
				boundTexture.texture = undefined;

			}

		}

		function compressedTexImage2D() {

			try {

				gl.compressedTexImage2D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function compressedTexImage3D() {

			try {

				gl.compressedTexImage3D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function texSubImage2D() {

			try {

				gl.texSubImage2D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function texSubImage3D() {

			try {

				gl.texSubImage3D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function compressedTexSubImage2D() {

			try {

				gl.compressedTexSubImage2D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function compressedTexSubImage3D() {

			try {

				gl.compressedTexSubImage3D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function texStorage2D() {

			try {

				gl.texStorage2D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function texStorage3D() {

			try {

				gl.texStorage3D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function texImage2D() {

			try {

				gl.texImage2D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		function texImage3D() {

			try {

				gl.texImage3D.apply( gl, arguments );

			} catch ( error ) {

				console.error( 'THREE.WebGLState:', error );

			}

		}

		//

		function scissor( scissor ) {

			if ( currentScissor.equals( scissor ) === false ) {

				gl.scissor( scissor.x, scissor.y, scissor.z, scissor.w );
				currentScissor.copy( scissor );

			}

		}

		function viewport( viewport ) {

			if ( currentViewport.equals( viewport ) === false ) {

				gl.viewport( viewport.x, viewport.y, viewport.z, viewport.w );
				currentViewport.copy( viewport );

			}

		}

		function updateUBOMapping( uniformsGroup, program ) {

			let mapping = uboProgramMap.get( program );

			if ( mapping === undefined ) {

				mapping = new WeakMap();

				uboProgramMap.set( program, mapping );

			}

			let blockIndex = mapping.get( uniformsGroup );

			if ( blockIndex === undefined ) {

				blockIndex = gl.getUniformBlockIndex( program, uniformsGroup.name );

				mapping.set( uniformsGroup, blockIndex );

			}

		}

		function uniformBlockBinding( uniformsGroup, program ) {

			const mapping = uboProgramMap.get( program );
			const blockIndex = mapping.get( uniformsGroup );

			if ( uboBindings.get( program ) !== blockIndex ) {

				// bind shader specific block index to global block point
				gl.uniformBlockBinding( program, blockIndex, uniformsGroup.__bindingPointIndex );

				uboBindings.set( program, blockIndex );

			}

		}

		//

		function reset() {

			// reset state

			gl.disable( gl.BLEND );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.POLYGON_OFFSET_FILL );
			gl.disable( gl.SCISSOR_TEST );
			gl.disable( gl.STENCIL_TEST );
			gl.disable( gl.SAMPLE_ALPHA_TO_COVERAGE );

			gl.blendEquation( gl.FUNC_ADD );
			gl.blendFunc( gl.ONE, gl.ZERO );
			gl.blendFuncSeparate( gl.ONE, gl.ZERO, gl.ONE, gl.ZERO );
			gl.blendColor( 0, 0, 0, 0 );

			gl.colorMask( true, true, true, true );
			gl.clearColor( 0, 0, 0, 0 );

			gl.depthMask( true );
			gl.depthFunc( gl.LESS );
			gl.clearDepth( 1 );

			gl.stencilMask( 0xffffffff );
			gl.stencilFunc( gl.ALWAYS, 0, 0xffffffff );
			gl.stencilOp( gl.KEEP, gl.KEEP, gl.KEEP );
			gl.clearStencil( 0 );

			gl.cullFace( gl.BACK );
			gl.frontFace( gl.CCW );

			gl.polygonOffset( 0, 0 );

			gl.activeTexture( gl.TEXTURE0 );

			gl.bindFramebuffer( gl.FRAMEBUFFER, null );

			if ( isWebGL2 === true ) {

				gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, null );
				gl.bindFramebuffer( gl.READ_FRAMEBUFFER, null );

			}

			gl.useProgram( null );

			gl.lineWidth( 1 );

			gl.scissor( 0, 0, gl.canvas.width, gl.canvas.height );
			gl.viewport( 0, 0, gl.canvas.width, gl.canvas.height );

			// reset internals

			enabledCapabilities = {};

			currentTextureSlot = null;
			currentBoundTextures = {};

			currentBoundFramebuffers = {};
			currentDrawbuffers = new WeakMap();
			defaultDrawbuffers = [];

			currentProgram = null;

			currentBlendingEnabled = false;
			currentBlending = null;
			currentBlendEquation = null;
			currentBlendSrc = null;
			currentBlendDst = null;
			currentBlendEquationAlpha = null;
			currentBlendSrcAlpha = null;
			currentBlendDstAlpha = null;
			currentBlendColor = new three_1.Color( 0, 0, 0 );
			currentBlendAlpha = 0;
			currentPremultipledAlpha = false;

			currentFlipSided = null;
			currentCullFace = null;

			currentLineWidth = null;

			currentPolygonOffsetFactor = null;
			currentPolygonOffsetUnits = null;

			currentScissor.set( 0, 0, gl.canvas.width, gl.canvas.height );
			currentViewport.set( 0, 0, gl.canvas.width, gl.canvas.height );

			colorBuffer.reset();
			depthBuffer.reset();
			stencilBuffer.reset();

		}

		return {

			buffers: {
				color: colorBuffer,
				depth: depthBuffer,
				stencil: stencilBuffer
			},

			enable: enable,
			disable: disable,

			bindFramebuffer: bindFramebuffer,
			drawBuffers: drawBuffers,

			useProgram: useProgram,

			setBlending: setBlending,
			setMaterial: setMaterial,

			setFlipSided: setFlipSided,
			setCullFace: setCullFace,

			setLineWidth: setLineWidth,
			setPolygonOffset: setPolygonOffset,

			setScissorTest: setScissorTest,

			activeTexture: activeTexture,
			bindTexture: bindTexture,
			unbindTexture: unbindTexture,
			compressedTexImage2D: compressedTexImage2D,
			compressedTexImage3D: compressedTexImage3D,
			texImage2D: texImage2D,
			texImage3D: texImage3D,

			updateUBOMapping: updateUBOMapping,
			uniformBlockBinding: uniformBlockBinding,

			texStorage2D: texStorage2D,
			texStorage3D: texStorage3D,
			texSubImage2D: texSubImage2D,
			texSubImage3D: texSubImage3D,
			compressedTexSubImage2D: compressedTexSubImage2D,
			compressedTexSubImage3D: compressedTexSubImage3D,

			scissor: scissor,
			viewport: viewport,

			reset: reset

		};

	}

	function WebGLTextures( _gl, extensions, state, properties, capabilities, utils, info ) {

		const isWebGL2 = capabilities.isWebGL2;
		const multisampledRTTExt = extensions.has( 'WEBGL_multisampled_render_to_texture' ) ? extensions.get( 'WEBGL_multisampled_render_to_texture' ) : null;
		const supportsInvalidateFramebuffer = typeof navigator === 'undefined' ? false : /OculusBrowser/g.test( navigator.userAgent );

		const _videoTextures = new WeakMap();
		let _canvas;

		const _sources = new WeakMap(); // maps WebglTexture objects to instances of Source

		// cordova iOS (as of 5.0) still uses UIWebView, which provides OffscreenCanvas,
		// also OffscreenCanvas.getContext("webgl"), but not OffscreenCanvas.getContext("2d")!
		// Some implementations may only implement OffscreenCanvas partially (e.g. lacking 2d).

		let useOffscreenCanvas = false;

		try {

			useOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
				// eslint-disable-next-line compat/compat
				&& ( new OffscreenCanvas( 1, 1 ).getContext( '2d' ) ) !== null;

		} catch ( err ) {

			// Ignore any errors

		}

		function createCanvas( width, height ) {

			// Use OffscreenCanvas when available. Specially needed in web workers

			return useOffscreenCanvas ?
				// eslint-disable-next-line compat/compat
				new OffscreenCanvas( width, height ) : three_1.createElementNS( 'canvas' );

		}

		function resizeImage( image, needsPowerOfTwo, needsNewCanvas, maxSize ) {

			let scale = 1;

			// handle case if texture exceeds max size

			if ( image.width > maxSize || image.height > maxSize ) {

				scale = maxSize / Math.max( image.width, image.height );

			}

			// only perform resize if necessary

			if ( scale < 1 || needsPowerOfTwo === true ) {

				// only perform resize for certain image types

				if ( ( typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement ) ||
					( typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement ) ||
					( typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ) ) {

					const floor = needsPowerOfTwo ? three_1.floorPowerOfTwo : Math.floor;

					const width = floor( scale * image.width );
					const height = floor( scale * image.height );

					if ( _canvas === undefined ) _canvas = createCanvas( width, height );

					// cube textures can't reuse the same canvas

					const canvas = needsNewCanvas ? createCanvas( width, height ) : _canvas;

					canvas.width = width;
					canvas.height = height;

					const context = canvas.getContext( '2d' );
					context.drawImage( image, 0, 0, width, height );

					console.warn( 'THREE.WebGLRenderer: Texture has been resized from (' + image.width + 'x' + image.height + ') to (' + width + 'x' + height + ').' );

					return canvas;

				} else {

					if ( 'data' in image ) {

						console.warn( 'THREE.WebGLRenderer: Image in DataTexture is too big (' + image.width + 'x' + image.height + ').' );

					}

					return image;

				}

			}

			return image;

		}

		function isPowerOfTwo( image ) {

			return three_1.isPowerOfTwo( image.width ) && three_1.isPowerOfTwo( image.height );

		}

		function textureNeedsPowerOfTwo( texture ) {

			if ( isWebGL2 ) return false;

			return ( texture.wrapS !== three_1.ClampToEdgeWrapping || texture.wrapT !== three_1.ClampToEdgeWrapping ) ||
				( texture.minFilter !== three_1.NearestFilter && texture.minFilter !== three_1.LinearFilter );

		}

		function textureNeedsGenerateMipmaps( texture, supportsMips ) {

			return texture.generateMipmaps && supportsMips &&
				texture.minFilter !== three_1.NearestFilter && texture.minFilter !== three_1.LinearFilter;

		}

		function generateMipmap( target ) {

			_gl.generateMipmap( target );

		}

		function getInternalFormat( internalFormatName, glFormat, glType, colorSpace, forceLinearTransfer = false ) {

			if ( isWebGL2 === false ) return glFormat;

			if ( internalFormatName !== null ) {

				if ( _gl[ internalFormatName ] !== undefined ) return _gl[ internalFormatName ];

				console.warn( 'THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format \'' + internalFormatName + '\'' );

			}

			let internalFormat = glFormat;

			if ( glFormat === _gl.RED ) {

				if ( glType === _gl.FLOAT ) internalFormat = _gl.R32F;
				if ( glType === _gl.HALF_FLOAT ) internalFormat = _gl.R16F;
				if ( glType === _gl.UNSIGNED_BYTE ) internalFormat = _gl.R8;

			}

			if ( glFormat === _gl.RED_INTEGER ) {

				if ( glType === _gl.UNSIGNED_BYTE ) internalFormat = _gl.R8UI;
				if ( glType === _gl.UNSIGNED_SHORT ) internalFormat = _gl.R16UI;
				if ( glType === _gl.UNSIGNED_INT ) internalFormat = _gl.R32UI;
				if ( glType === _gl.BYTE ) internalFormat = _gl.R8I;
				if ( glType === _gl.SHORT ) internalFormat = _gl.R16I;
				if ( glType === _gl.INT ) internalFormat = _gl.R32I;

			}

			if ( glFormat === _gl.RG ) {

				if ( glType === _gl.FLOAT ) internalFormat = _gl.RG32F;
				if ( glType === _gl.HALF_FLOAT ) internalFormat = _gl.RG16F;
				if ( glType === _gl.UNSIGNED_BYTE ) internalFormat = _gl.RG8;

			}

			if ( glFormat === _gl.RGBA ) {

				const transfer = forceLinearTransfer ? three_1.LinearTransfer : three_1.ColorManagement.getTransfer( colorSpace );

				if ( glType === _gl.FLOAT ) internalFormat = _gl.RGBA32F;
				if ( glType === _gl.HALF_FLOAT ) internalFormat = _gl.RGBA16F;
				if ( glType === _gl.UNSIGNED_BYTE ) internalFormat = ( transfer === three_1.SRGBTransfer ) ? _gl.SRGB8_ALPHA8 : _gl.RGBA8;
				if ( glType === _gl.UNSIGNED_SHORT_4_4_4_4 ) internalFormat = _gl.RGBA4;
				if ( glType === _gl.UNSIGNED_SHORT_5_5_5_1 ) internalFormat = _gl.RGB5_A1;

			}

			if ( internalFormat === _gl.R16F || internalFormat === _gl.R32F ||
				internalFormat === _gl.RG16F || internalFormat === _gl.RG32F ||
				internalFormat === _gl.RGBA16F || internalFormat === _gl.RGBA32F ) {

				extensions.get( 'EXT_color_buffer_float' );

			}

			return internalFormat;

		}

		function getMipLevels( texture, image, supportsMips ) {

			if ( textureNeedsGenerateMipmaps( texture, supportsMips ) === true || ( texture.isFramebufferTexture && texture.minFilter !== three_1.NearestFilter && texture.minFilter !== three_1.LinearFilter ) ) {

				return Math.log2( Math.max( image.width, image.height ) ) + 1;

			} else if ( texture.mipmaps !== undefined && texture.mipmaps.length > 0 ) {

				// user-defined mipmaps

				return texture.mipmaps.length;

			} else if ( texture.isCompressedTexture && Array.isArray( texture.image ) ) {

				return image.mipmaps.length;

			} else {

				// texture without mipmaps (only base level)

				return 1;

			}

		}

		// Fallback filters for non-power-of-2 textures

		function filterFallback( f ) {

			if ( f === three_1.NearestFilter || f === three_1.NearestMipmapNearestFilter || f === three_1.NearestMipmapLinearFilter ) {

				return _gl.NEAREST;

			}

			return _gl.LINEAR;

		}

		//

		function onTextureDispose( event ) {

			const texture = event.target;

			texture.removeEventListener( 'dispose', onTextureDispose );

			deallocateTexture( texture );

			if ( texture.isVideoTexture ) {

				_videoTextures.delete( texture );

			}

		}

		function onRenderTargetDispose( event ) {

			const renderTarget = event.target;

			renderTarget.removeEventListener( 'dispose', onRenderTargetDispose );

			deallocateRenderTarget( renderTarget );

		}

		//

		function deallocateTexture( texture ) {

			const textureProperties = properties.get( texture );

			if ( textureProperties.__webglInit === undefined ) return;

			// check if it's necessary to remove the WebGLTexture object

			const source = texture.source;
			const webglTextures = _sources.get( source );

			if ( webglTextures ) {

				const webglTexture = webglTextures[ textureProperties.__cacheKey ];
				webglTexture.usedTimes --;

				// the WebGLTexture object is not used anymore, remove it

				if ( webglTexture.usedTimes === 0 ) {

					deleteTexture( texture );

				}

				// remove the weak map entry if no WebGLTexture uses the source anymore

				if ( Object.keys( webglTextures ).length === 0 ) {

					_sources.delete( source );

				}

			}

			properties.remove( texture );

		}

		function deleteTexture( texture ) {

			const textureProperties = properties.get( texture );
			_gl.deleteTexture( textureProperties.__webglTexture );

			const source = texture.source;
			const webglTextures = _sources.get( source );
			delete webglTextures[ textureProperties.__cacheKey ];

			info.memory.textures --;

		}

		function deallocateRenderTarget( renderTarget ) {

			const texture = renderTarget.texture;

			const renderTargetProperties = properties.get( renderTarget );
			const textureProperties = properties.get( texture );

			if ( textureProperties.__webglTexture !== undefined ) {

				_gl.deleteTexture( textureProperties.__webglTexture );

				info.memory.textures --;

			}

			if ( renderTarget.depthTexture ) {

				renderTarget.depthTexture.dispose();

			}

			if ( renderTarget.isWebGLCubeRenderTarget ) {

				for ( let i = 0; i < 6; i ++ ) {

					if ( Array.isArray( renderTargetProperties.__webglFramebuffer[ i ] ) ) {

						for ( let level = 0; level < renderTargetProperties.__webglFramebuffer[ i ].length; level ++ ) _gl.deleteFramebuffer( renderTargetProperties.__webglFramebuffer[ i ][ level ] );

					} else {

						_gl.deleteFramebuffer( renderTargetProperties.__webglFramebuffer[ i ] );

					}

					if ( renderTargetProperties.__webglDepthbuffer ) _gl.deleteRenderbuffer( renderTargetProperties.__webglDepthbuffer[ i ] );

				}

			} else {

				if ( Array.isArray( renderTargetProperties.__webglFramebuffer ) ) {

					for ( let level = 0; level < renderTargetProperties.__webglFramebuffer.length; level ++ ) _gl.deleteFramebuffer( renderTargetProperties.__webglFramebuffer[ level ] );

				} else {

					_gl.deleteFramebuffer( renderTargetProperties.__webglFramebuffer );

				}

				if ( renderTargetProperties.__webglDepthbuffer ) _gl.deleteRenderbuffer( renderTargetProperties.__webglDepthbuffer );
				if ( renderTargetProperties.__webglMultisampledFramebuffer ) _gl.deleteFramebuffer( renderTargetProperties.__webglMultisampledFramebuffer );

				if ( renderTargetProperties.__webglColorRenderbuffer ) {

					for ( let i = 0; i < renderTargetProperties.__webglColorRenderbuffer.length; i ++ ) {

						if ( renderTargetProperties.__webglColorRenderbuffer[ i ] ) _gl.deleteRenderbuffer( renderTargetProperties.__webglColorRenderbuffer[ i ] );

					}

				}

				if ( renderTargetProperties.__webglDepthRenderbuffer ) _gl.deleteRenderbuffer( renderTargetProperties.__webglDepthRenderbuffer );

			}

			if ( renderTarget.isWebGLMultipleRenderTargets ) {

				for ( let i = 0, il = texture.length; i < il; i ++ ) {

					const attachmentProperties = properties.get( texture[ i ] );

					if ( attachmentProperties.__webglTexture ) {

						_gl.deleteTexture( attachmentProperties.__webglTexture );

						info.memory.textures --;

					}

					properties.remove( texture[ i ] );

				}

			}

			properties.remove( texture );
			properties.remove( renderTarget );

		}

		//

		let textureUnits = 0;

		function resetTextureUnits() {

			textureUnits = 0;

		}

		function allocateTextureUnit() {

			const textureUnit = textureUnits;

			if ( textureUnit >= capabilities.maxTextures ) {

				console.warn( 'THREE.WebGLTextures: Trying to use ' + textureUnit + ' texture units while this GPU supports only ' + capabilities.maxTextures );

			}

			textureUnits += 1;

			return textureUnit;

		}

		function getTextureCacheKey( texture ) {

			const array = [];

			array.push( texture.wrapS );
			array.push( texture.wrapT );
			array.push( texture.wrapR || 0 );
			array.push( texture.magFilter );
			array.push( texture.minFilter );
			array.push( texture.anisotropy );
			array.push( texture.internalFormat );
			array.push( texture.format );
			array.push( texture.type );
			array.push( texture.generateMipmaps );
			array.push( texture.premultiplyAlpha );
			array.push( texture.flipY );
			array.push( texture.unpackAlignment );
			array.push( texture.colorSpace );

			return array.join();

		}

		//

		function setTexture2D( texture, slot ) {

			const textureProperties = properties.get( texture );

			if ( texture.isVideoTexture ) updateVideoTexture( texture );

			if ( texture.isRenderTargetTexture === false && texture.version > 0 && textureProperties.__version !== texture.version ) {

				const image = texture.image;

				if ( image === null ) {

					console.warn( 'THREE.WebGLRenderer: Texture marked for update but no image data found.' );

				} else if ( image.complete === false ) {

					console.warn( 'THREE.WebGLRenderer: Texture marked for update but image is incomplete' );

				} else {

					uploadTexture( textureProperties, texture, slot );
					return;

				}

			}

			state.bindTexture( _gl.TEXTURE_2D, textureProperties.__webglTexture, _gl.TEXTURE0 + slot );

		}

		function setTexture2DArray( texture, slot ) {

			const textureProperties = properties.get( texture );

			if ( texture.version > 0 && textureProperties.__version !== texture.version ) {

				uploadTexture( textureProperties, texture, slot );
				return;

			}

			state.bindTexture( _gl.TEXTURE_2D_ARRAY, textureProperties.__webglTexture, _gl.TEXTURE0 + slot );

		}

		function setTexture3D( texture, slot ) {

			const textureProperties = properties.get( texture );

			if ( texture.version > 0 && textureProperties.__version !== texture.version ) {

				uploadTexture( textureProperties, texture, slot );
				return;

			}

			state.bindTexture( _gl.TEXTURE_3D, textureProperties.__webglTexture, _gl.TEXTURE0 + slot );

		}

		function setTextureCube( texture, slot ) {

			const textureProperties = properties.get( texture );

			if ( texture.version > 0 && textureProperties.__version !== texture.version ) {

				uploadCubeTexture( textureProperties, texture, slot );
				return;

			}

			state.bindTexture( _gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture, _gl.TEXTURE0 + slot );

		}

		const wrappingToGL = {
			[ three_1.RepeatWrapping ]: _gl.REPEAT,
			[ three_1.ClampToEdgeWrapping ]: _gl.CLAMP_TO_EDGE,
			[ three_1.MirroredRepeatWrapping ]: _gl.MIRRORED_REPEAT
		};

		const filterToGL = {
			[ three_1.NearestFilter ]: _gl.NEAREST,
			[ three_1.NearestMipmapNearestFilter ]: _gl.NEAREST_MIPMAP_NEAREST,
			[ three_1.NearestMipmapLinearFilter ]: _gl.NEAREST_MIPMAP_LINEAR,

			[ three_1.LinearFilter ]: _gl.LINEAR,
			[ three_1.LinearMipmapNearestFilter ]: _gl.LINEAR_MIPMAP_NEAREST,
			[ three_1.LinearMipmapLinearFilter ]: _gl.LINEAR_MIPMAP_LINEAR
		};

		const compareToGL = {
			[ three_1.NeverCompare ]: _gl.NEVER,
			[ three_1.AlwaysCompare ]: _gl.ALWAYS,
			[ three_1.LessCompare ]: _gl.LESS,
			[ three_1.LessEqualCompare ]: _gl.LEQUAL,
			[ three_1.EqualCompare ]: _gl.EQUAL,
			[ three_1.GreaterEqualCompare ]: _gl.GEQUAL,
			[ three_1.GreaterCompare ]: _gl.GREATER,
			[ three_1.NotEqualCompare ]: _gl.NOTEQUAL
		};

		function setTextureParameters( textureType, texture, supportsMips ) {

			if ( supportsMips ) {

				_gl.texParameteri( textureType, _gl.TEXTURE_WRAP_S, wrappingToGL[ texture.wrapS ] );
				_gl.texParameteri( textureType, _gl.TEXTURE_WRAP_T, wrappingToGL[ texture.wrapT ] );

				if ( textureType === _gl.TEXTURE_3D || textureType === _gl.TEXTURE_2D_ARRAY ) {

					_gl.texParameteri( textureType, _gl.TEXTURE_WRAP_R, wrappingToGL[ texture.wrapR ] );

				}

				_gl.texParameteri( textureType, _gl.TEXTURE_MAG_FILTER, filterToGL[ texture.magFilter ] );
				_gl.texParameteri( textureType, _gl.TEXTURE_MIN_FILTER, filterToGL[ texture.minFilter ] );

			} else {

				_gl.texParameteri( textureType, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE );
				_gl.texParameteri( textureType, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE );

				if ( textureType === _gl.TEXTURE_3D || textureType === _gl.TEXTURE_2D_ARRAY ) {

					_gl.texParameteri( textureType, _gl.TEXTURE_WRAP_R, _gl.CLAMP_TO_EDGE );

				}

				if ( texture.wrapS !== three_1.ClampToEdgeWrapping || texture.wrapT !== three_1.ClampToEdgeWrapping ) {

					console.warn( 'THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping.' );

				}

				_gl.texParameteri( textureType, _gl.TEXTURE_MAG_FILTER, filterFallback( texture.magFilter ) );
				_gl.texParameteri( textureType, _gl.TEXTURE_MIN_FILTER, filterFallback( texture.minFilter ) );

				if ( texture.minFilter !== three_1.NearestFilter && texture.minFilter !== three_1.LinearFilter ) {

					console.warn( 'THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.' );

				}

			}

			if ( texture.compareFunction ) {

				_gl.texParameteri( textureType, _gl.TEXTURE_COMPARE_MODE, _gl.COMPARE_REF_TO_TEXTURE );
				_gl.texParameteri( textureType, _gl.TEXTURE_COMPARE_FUNC, compareToGL[ texture.compareFunction ] );

			}

			if ( extensions.has( 'EXT_texture_filter_anisotropic' ) === true ) {

				const extension = extensions.get( 'EXT_texture_filter_anisotropic' );

				if ( texture.magFilter === three_1.NearestFilter ) return;
				if ( texture.minFilter !== three_1.NearestMipmapLinearFilter && texture.minFilter !== three_1.LinearMipmapLinearFilter ) return;
				if ( texture.type === three_1.FloatType && extensions.has( 'OES_texture_float_linear' ) === false ) return; // verify extension for WebGL 1 and WebGL 2
				if ( isWebGL2 === false && ( texture.type === three_1.HalfFloatType && extensions.has( 'OES_texture_half_float_linear' ) === false ) ) return; // verify extension for WebGL 1 only

				if ( texture.anisotropy > 1 || properties.get( texture ).__currentAnisotropy ) {

					_gl.texParameterf( textureType, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min( texture.anisotropy, capabilities.getMaxAnisotropy() ) );
					properties.get( texture ).__currentAnisotropy = texture.anisotropy;

				}

			}

		}

		function initTexture( textureProperties, texture ) {

			let forceUpload = false;

			if ( textureProperties.__webglInit === undefined ) {

				textureProperties.__webglInit = true;

				texture.addEventListener( 'dispose', onTextureDispose );

			}

			// create Source <-> WebGLTextures mapping if necessary

			const source = texture.source;
			let webglTextures = _sources.get( source );

			if ( webglTextures === undefined ) {

				webglTextures = {};
				_sources.set( source, webglTextures );

			}

			// check if there is already a WebGLTexture object for the given texture parameters

			const textureCacheKey = getTextureCacheKey( texture );

			if ( textureCacheKey !== textureProperties.__cacheKey ) {

				// if not, create a new instance of WebGLTexture

				if ( webglTextures[ textureCacheKey ] === undefined ) {

					// create new entry

					webglTextures[ textureCacheKey ] = {
						texture: _gl.createTexture(),
						usedTimes: 0
					};

					info.memory.textures ++;

					// when a new instance of WebGLTexture was created, a texture upload is required
					// even if the image contents are identical

					forceUpload = true;

				}

				webglTextures[ textureCacheKey ].usedTimes ++;

				// every time the texture cache key changes, it's necessary to check if an instance of
				// WebGLTexture can be deleted in order to avoid a memory leak.

				const webglTexture = webglTextures[ textureProperties.__cacheKey ];

				if ( webglTexture !== undefined ) {

					webglTextures[ textureProperties.__cacheKey ].usedTimes --;

					if ( webglTexture.usedTimes === 0 ) {

						deleteTexture( texture );

					}

				}

				// store references to cache key and WebGLTexture object

				textureProperties.__cacheKey = textureCacheKey;
				textureProperties.__webglTexture = webglTextures[ textureCacheKey ].texture;

			}

			return forceUpload;

		}

		function uploadTexture( textureProperties, texture, slot ) {

			let textureType = _gl.TEXTURE_2D;

			if ( texture.isDataArrayTexture || texture.isCompressedArrayTexture ) textureType = _gl.TEXTURE_2D_ARRAY;
			if ( texture.isData3DTexture ) textureType = _gl.TEXTURE_3D;

			const forceUpload = initTexture( textureProperties, texture );
			const source = texture.source;

			state.bindTexture( textureType, textureProperties.__webglTexture, _gl.TEXTURE0 + slot );

			const sourceProperties = properties.get( source );

			if ( source.version !== sourceProperties.__version || forceUpload === true ) {

				state.activeTexture( _gl.TEXTURE0 + slot );

				const workingPrimaries = three_1.ColorManagement.getPrimaries( three_1.ColorManagement.workingColorSpace );
				const texturePrimaries = texture.colorSpace === three_1.NoColorSpace ? null : three_1.ColorManagement.getPrimaries( texture.colorSpace );
				const unpackConversion = texture.colorSpace === three_1.NoColorSpace || workingPrimaries === texturePrimaries ? _gl.NONE : _gl.BROWSER_DEFAULT_WEBGL;

				_gl.pixelStorei( _gl.UNPACK_FLIP_Y_WEBGL, texture.flipY );
				_gl.pixelStorei( _gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha );
				_gl.pixelStorei( _gl.UNPACK_ALIGNMENT, texture.unpackAlignment );
				_gl.pixelStorei( _gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion );

				const needsPowerOfTwo = textureNeedsPowerOfTwo( texture ) && isPowerOfTwo( texture.image ) === false;
				let image = resizeImage( texture.image, needsPowerOfTwo, false, capabilities.maxTextureSize );
				image = verifyColorSpace( texture, image );

				const supportsMips = isPowerOfTwo( image ) || isWebGL2,
					glFormat = utils.convert( texture.format, texture.colorSpace );

				let glType = utils.convert( texture.type ),
					glInternalFormat = getInternalFormat( texture.internalFormat, glFormat, glType, texture.colorSpace, texture.isVideoTexture );

				setTextureParameters( textureType, texture, supportsMips );

				let mipmap;
				const mipmaps = texture.mipmaps;

				const useTexStorage = ( isWebGL2 && texture.isVideoTexture !== true && glInternalFormat !== three_1.RGB_ETC1_Format );
				const allocateMemory = ( sourceProperties.__version === undefined ) || ( forceUpload === true );
				const levels = getMipLevels( texture, image, supportsMips );

				if ( texture.isDepthTexture ) {

					// populate depth texture with dummy data

					glInternalFormat = _gl.DEPTH_COMPONENT;

					if ( isWebGL2 ) {

						if ( texture.type === three_1.FloatType ) {

							glInternalFormat = _gl.DEPTH_COMPONENT32F;

						} else if ( texture.type === three_1.UnsignedIntType ) {

							glInternalFormat = _gl.DEPTH_COMPONENT24;

						} else if ( texture.type === three_1.UnsignedInt248Type ) {

							glInternalFormat = _gl.DEPTH24_STENCIL8;

						} else {

							glInternalFormat = _gl.DEPTH_COMPONENT16; // WebGL2 requires sized internalformat for glTexImage2D

						}

					} else {

						if ( texture.type === three_1.FloatType ) {

							console.error( 'WebGLRenderer: Floating point depth texture requires WebGL2.' );

						}

					}

					// validation checks for WebGL 1

					if ( texture.format === three_1.DepthFormat && glInternalFormat === _gl.DEPTH_COMPONENT ) {

						// The error INVALID_OPERATION is generated by texImage2D if format and internalformat are
						// DEPTH_COMPONENT and type is not UNSIGNED_SHORT or UNSIGNED_INT
						// (https://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/)
						if ( texture.type !== three_1.UnsignedShortType && texture.type !== three_1.UnsignedIntType ) {

							console.warn( 'THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture.' );

							texture.type = three_1.UnsignedIntType;
							glType = utils.convert( texture.type );

						}

					}

					if ( texture.format === three_1.DepthStencilFormat && glInternalFormat === _gl.DEPTH_COMPONENT ) {

						// Depth stencil textures need the DEPTH_STENCIL internal format
						// (https://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/)
						glInternalFormat = _gl.DEPTH_STENCIL;

						// The error INVALID_OPERATION is generated by texImage2D if format and internalformat are
						// DEPTH_STENCIL and type is not UNSIGNED_INT_24_8_WEBGL.
						// (https://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/)
						if ( texture.type !== three_1.UnsignedInt248Type ) {

							console.warn( 'THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture.' );

							texture.type = three_1.UnsignedInt248Type;
							glType = utils.convert( texture.type );

						}

					}

					//

					if ( allocateMemory ) {

						if ( useTexStorage ) {

							state.texStorage2D( _gl.TEXTURE_2D, 1, glInternalFormat, image.width, image.height );

						} else {

							state.texImage2D( _gl.TEXTURE_2D, 0, glInternalFormat, image.width, image.height, 0, glFormat, glType, null );

						}

					}

				} else if ( texture.isDataTexture ) {

					// use manually created mipmaps if available
					// if there are no manual mipmaps
					// set 0 level mipmap and then use GL to generate other mipmap levels

					if ( mipmaps.length > 0 && supportsMips ) {

						if ( useTexStorage && allocateMemory ) {

							state.texStorage2D( _gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[ 0 ].width, mipmaps[ 0 ].height );

						}

						for ( let i = 0, il = mipmaps.length; i < il; i ++ ) {

							mipmap = mipmaps[ i ];

							if ( useTexStorage ) {

								state.texSubImage2D( _gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data );

							} else {

								state.texImage2D( _gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data );

							}

						}

						texture.generateMipmaps = false;

					} else {

						if ( useTexStorage ) {

							if ( allocateMemory ) {

								state.texStorage2D( _gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height );

							}

							state.texSubImage2D( _gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, glFormat, glType, image.data );

						} else {

							state.texImage2D( _gl.TEXTURE_2D, 0, glInternalFormat, image.width, image.height, 0, glFormat, glType, image.data );

						}

					}

				} else if ( texture.isCompressedTexture ) {

					if ( texture.isCompressedArrayTexture ) {

						if ( useTexStorage && allocateMemory ) {

							state.texStorage3D( _gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, mipmaps[ 0 ].width, mipmaps[ 0 ].height, image.depth );

						}

						for ( let i = 0, il = mipmaps.length; i < il; i ++ ) {

							mipmap = mipmaps[ i ];

							if ( texture.format !== three_1.RGBAFormat ) {

								if ( glFormat !== null ) {

									if ( useTexStorage ) {

										state.compressedTexSubImage3D( _gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, mipmap.data, 0, 0 );

									} else {

										state.compressedTexImage3D( _gl.TEXTURE_2D_ARRAY, i, glInternalFormat, mipmap.width, mipmap.height, image.depth, 0, mipmap.data, 0, 0 );

									}

								} else {

									console.warn( 'THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()' );

								}

							} else {

								if ( useTexStorage ) {

									state.texSubImage3D( _gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, glType, mipmap.data );

								} else {

									state.texImage3D( _gl.TEXTURE_2D_ARRAY, i, glInternalFormat, mipmap.width, mipmap.height, image.depth, 0, glFormat, glType, mipmap.data );

								}

							}

						}

					} else {

						if ( useTexStorage && allocateMemory ) {

							state.texStorage2D( _gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[ 0 ].width, mipmaps[ 0 ].height );

						}

						for ( let i = 0, il = mipmaps.length; i < il; i ++ ) {

							mipmap = mipmaps[ i ];

							if ( texture.format !== three_1.RGBAFormat ) {

								if ( glFormat !== null ) {

									if ( useTexStorage ) {

										state.compressedTexSubImage2D( _gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data );

									} else {

										state.compressedTexImage2D( _gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, mipmap.data );

									}

								} else {

									console.warn( 'THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()' );

								}

							} else {

								if ( useTexStorage ) {

									state.texSubImage2D( _gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data );

								} else {

									state.texImage2D( _gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data );

								}

							}

						}

					}

				} else if ( texture.isDataArrayTexture ) {

					if ( useTexStorage ) {

						if ( allocateMemory ) {

							state.texStorage3D( _gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, image.width, image.height, image.depth );

						}

						state.texSubImage3D( _gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data );

					} else {

						state.texImage3D( _gl.TEXTURE_2D_ARRAY, 0, glInternalFormat, image.width, image.height, image.depth, 0, glFormat, glType, image.data );

					}

				} else if ( texture.isData3DTexture ) {

					if ( useTexStorage ) {

						if ( allocateMemory ) {

							state.texStorage3D( _gl.TEXTURE_3D, levels, glInternalFormat, image.width, image.height, image.depth );

						}

						state.texSubImage3D( _gl.TEXTURE_3D, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data );

					} else {

						state.texImage3D( _gl.TEXTURE_3D, 0, glInternalFormat, image.width, image.height, image.depth, 0, glFormat, glType, image.data );

					}

				} else if ( texture.isFramebufferTexture ) {

					if ( allocateMemory ) {

						if ( useTexStorage ) {

							state.texStorage2D( _gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height );

						} else {

							let width = image.width, height = image.height;

							for ( let i = 0; i < levels; i ++ ) {

								state.texImage2D( _gl.TEXTURE_2D, i, glInternalFormat, width, height, 0, glFormat, glType, null );

								width >>= 1;
								height >>= 1;

							}

						}

					}

				} else {

					// regular Texture (image, video, canvas)

					// use manually created mipmaps if available
					// if there are no manual mipmaps
					// set 0 level mipmap and then use GL to generate other mipmap levels

					if ( mipmaps.length > 0 && supportsMips ) {

						if ( useTexStorage && allocateMemory ) {

							state.texStorage2D( _gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[ 0 ].width, mipmaps[ 0 ].height );

						}

						for ( let i = 0, il = mipmaps.length; i < il; i ++ ) {

							mipmap = mipmaps[ i ];

							if ( useTexStorage ) {

								state.texSubImage2D( _gl.TEXTURE_2D, i, 0, 0, glFormat, glType, mipmap );

							} else {

								state.texImage2D( _gl.TEXTURE_2D, i, glInternalFormat, glFormat, glType, mipmap );

							}

						}

						texture.generateMipmaps = false;

					} else {

						if ( useTexStorage ) {

							if ( allocateMemory ) {

								state.texStorage2D( _gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height );

							}

							state.texSubImage2D( _gl.TEXTURE_2D, 0, 0, 0, glFormat, glType, image );

						} else {

							state.texImage2D( _gl.TEXTURE_2D, 0, glInternalFormat, glFormat, glType, image );

						}

					}

				}

				if ( textureNeedsGenerateMipmaps( texture, supportsMips ) ) {

					generateMipmap( textureType );

				}

				sourceProperties.__version = source.version;

				if ( texture.onUpdate ) texture.onUpdate( texture );

			}

			textureProperties.__version = texture.version;

		}

		function uploadCubeTexture( textureProperties, texture, slot ) {

			if ( texture.image.length !== 6 ) return;

			const forceUpload = initTexture( textureProperties, texture );
			const source = texture.source;

			state.bindTexture( _gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture, _gl.TEXTURE0 + slot );

			const sourceProperties = properties.get( source );

			if ( source.version !== sourceProperties.__version || forceUpload === true ) {

				state.activeTexture( _gl.TEXTURE0 + slot );

				const workingPrimaries = three_1.ColorManagement.getPrimaries( three_1.ColorManagement.workingColorSpace );
				const texturePrimaries = texture.colorSpace === three_1.NoColorSpace ? null : three_1.ColorManagement.getPrimaries( texture.colorSpace );
				const unpackConversion = texture.colorSpace === three_1.NoColorSpace || workingPrimaries === texturePrimaries ? _gl.NONE : _gl.BROWSER_DEFAULT_WEBGL;

				_gl.pixelStorei( _gl.UNPACK_FLIP_Y_WEBGL, texture.flipY );
				_gl.pixelStorei( _gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha );
				_gl.pixelStorei( _gl.UNPACK_ALIGNMENT, texture.unpackAlignment );
				_gl.pixelStorei( _gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion );

				const isCompressed = ( texture.isCompressedTexture || texture.image[ 0 ].isCompressedTexture );
				const isDataTexture = ( texture.image[ 0 ] && texture.image[ 0 ].isDataTexture );

				const cubeImage = [];

				for ( let i = 0; i < 6; i ++ ) {

					if ( ! isCompressed && ! isDataTexture ) {

						cubeImage[ i ] = resizeImage( texture.image[ i ], false, true, capabilities.maxCubemapSize );

					} else {

						cubeImage[ i ] = isDataTexture ? texture.image[ i ].image : texture.image[ i ];

					}

					cubeImage[ i ] = verifyColorSpace( texture, cubeImage[ i ] );

				}

				const image = cubeImage[ 0 ],
					supportsMips = isPowerOfTwo( image ) || isWebGL2,
					glFormat = utils.convert( texture.format, texture.colorSpace ),
					glType = utils.convert( texture.type ),
					glInternalFormat = getInternalFormat( texture.internalFormat, glFormat, glType, texture.colorSpace );

				const useTexStorage = ( isWebGL2 && texture.isVideoTexture !== true );
				const allocateMemory = ( sourceProperties.__version === undefined ) || ( forceUpload === true );
				let levels = getMipLevels( texture, image, supportsMips );

				setTextureParameters( _gl.TEXTURE_CUBE_MAP, texture, supportsMips );

				let mipmaps;

				if ( isCompressed ) {

					if ( useTexStorage && allocateMemory ) {

						state.texStorage2D( _gl.TEXTURE_CUBE_MAP, levels, glInternalFormat, image.width, image.height );

					}

					for ( let i = 0; i < 6; i ++ ) {

						mipmaps = cubeImage[ i ].mipmaps;

						for ( let j = 0; j < mipmaps.length; j ++ ) {

							const mipmap = mipmaps[ j ];

							if ( texture.format !== three_1.RGBAFormat ) {

								if ( glFormat !== null ) {

									if ( useTexStorage ) {

										state.compressedTexSubImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data );

									} else {

										state.compressedTexImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glInternalFormat, mipmap.width, mipmap.height, 0, mipmap.data );

									}

								} else {

									console.warn( 'THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()' );

								}

							} else {

								if ( useTexStorage ) {

									state.texSubImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data );

								} else {

									state.texImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data );

								}

							}

						}

					}

				} else {

					mipmaps = texture.mipmaps;

					if ( useTexStorage && allocateMemory ) {

						// TODO: Uniformly handle mipmap definitions
						// Normal textures and compressed cube textures define base level + mips with their mipmap array
						// Uncompressed cube textures use their mipmap array only for mips (no base level)

						if ( mipmaps.length > 0 ) levels ++;

						state.texStorage2D( _gl.TEXTURE_CUBE_MAP, levels, glInternalFormat, cubeImage[ 0 ].width, cubeImage[ 0 ].height );

					}

					for ( let i = 0; i < 6; i ++ ) {

						if ( isDataTexture ) {

							if ( useTexStorage ) {

								state.texSubImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, cubeImage[ i ].width, cubeImage[ i ].height, glFormat, glType, cubeImage[ i ].data );

							} else {

								state.texImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, cubeImage[ i ].width, cubeImage[ i ].height, 0, glFormat, glType, cubeImage[ i ].data );

							}

							for ( let j = 0; j < mipmaps.length; j ++ ) {

								const mipmap = mipmaps[ j ];
								const mipmapImage = mipmap.image[ i ].image;

								if ( useTexStorage ) {

									state.texSubImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, 0, 0, mipmapImage.width, mipmapImage.height, glFormat, glType, mipmapImage.data );

								} else {

									state.texImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, glInternalFormat, mipmapImage.width, mipmapImage.height, 0, glFormat, glType, mipmapImage.data );

								}

							}

						} else {

							if ( useTexStorage ) {

								state.texSubImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, glFormat, glType, cubeImage[ i ] );

							} else {

								state.texImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, glFormat, glType, cubeImage[ i ] );

							}

							for ( let j = 0; j < mipmaps.length; j ++ ) {

								const mipmap = mipmaps[ j ];

								if ( useTexStorage ) {

									state.texSubImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, 0, 0, glFormat, glType, mipmap.image[ i ] );

								} else {

									state.texImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, glInternalFormat, glFormat, glType, mipmap.image[ i ] );

								}

							}

						}

					}

				}

				if ( textureNeedsGenerateMipmaps( texture, supportsMips ) ) {

					// We assume images for cube map have the same size.
					generateMipmap( _gl.TEXTURE_CUBE_MAP );

				}

				sourceProperties.__version = source.version;

				if ( texture.onUpdate ) texture.onUpdate( texture );

			}

			textureProperties.__version = texture.version;

		}

		// Render targets

		// Setup storage for target texture and bind it to correct framebuffer
		function setupFrameBufferTexture( framebuffer, renderTarget, texture, attachment, textureTarget, level ) {

			const glFormat = utils.convert( texture.format, texture.colorSpace );
			const glType = utils.convert( texture.type );
			const glInternalFormat = getInternalFormat( texture.internalFormat, glFormat, glType, texture.colorSpace );
			const renderTargetProperties = properties.get( renderTarget );

			if ( ! renderTargetProperties.__hasExternalTextures ) {

				const width = Math.max( 1, renderTarget.width >> level );
				const height = Math.max( 1, renderTarget.height >> level );

				if ( textureTarget === _gl.TEXTURE_3D || textureTarget === _gl.TEXTURE_2D_ARRAY ) {

					state.texImage3D( textureTarget, level, glInternalFormat, width, height, renderTarget.depth, 0, glFormat, glType, null );

				} else {

					state.texImage2D( textureTarget, level, glInternalFormat, width, height, 0, glFormat, glType, null );

				}

			}

			state.bindFramebuffer( _gl.FRAMEBUFFER, framebuffer );

			if ( useMultisampledRTT( renderTarget ) ) {

				multisampledRTTExt.framebufferTexture2DMultisampleEXT( _gl.FRAMEBUFFER, attachment, textureTarget, properties.get( texture ).__webglTexture, 0, getRenderTargetSamples( renderTarget ) );

			} else if ( textureTarget === _gl.TEXTURE_2D || ( textureTarget >= _gl.TEXTURE_CUBE_MAP_POSITIVE_X && textureTarget <= _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ) ) { // see #24753

				_gl.framebufferTexture2D( _gl.FRAMEBUFFER, attachment, textureTarget, properties.get( texture ).__webglTexture, level );

			}

			state.bindFramebuffer( _gl.FRAMEBUFFER, null );

		}


		// Setup storage for internal depth/stencil buffers and bind to correct framebuffer
		function setupRenderBufferStorage( renderbuffer, renderTarget, isMultisample ) {

			_gl.bindRenderbuffer( _gl.RENDERBUFFER, renderbuffer );

			if ( renderTarget.depthBuffer && ! renderTarget.stencilBuffer ) {

				let glInternalFormat = ( isWebGL2 === true ) ? _gl.DEPTH_COMPONENT24 : _gl.DEPTH_COMPONENT16;

				if ( isMultisample || useMultisampledRTT( renderTarget ) ) {

					const depthTexture = renderTarget.depthTexture;

					if ( depthTexture && depthTexture.isDepthTexture ) {

						if ( depthTexture.type === three_1.FloatType ) {

							glInternalFormat = _gl.DEPTH_COMPONENT32F;

						} else if ( depthTexture.type === three_1.UnsignedIntType ) {

							glInternalFormat = _gl.DEPTH_COMPONENT24;

						}

					}

					const samples = getRenderTargetSamples( renderTarget );

					if ( useMultisampledRTT( renderTarget ) ) {

						multisampledRTTExt.renderbufferStorageMultisampleEXT( _gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height );

					} else {

						_gl.renderbufferStorageMultisample( _gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height );

					}

				} else {

					_gl.renderbufferStorage( _gl.RENDERBUFFER, glInternalFormat, renderTarget.width, renderTarget.height );

				}

				_gl.framebufferRenderbuffer( _gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer );

			} else if ( renderTarget.depthBuffer && renderTarget.stencilBuffer ) {

				const samples = getRenderTargetSamples( renderTarget );

				if ( isMultisample && useMultisampledRTT( renderTarget ) === false ) {

					_gl.renderbufferStorageMultisample( _gl.RENDERBUFFER, samples, _gl.DEPTH24_STENCIL8, renderTarget.width, renderTarget.height );

				} else if ( useMultisampledRTT( renderTarget ) ) {

					multisampledRTTExt.renderbufferStorageMultisampleEXT( _gl.RENDERBUFFER, samples, _gl.DEPTH24_STENCIL8, renderTarget.width, renderTarget.height );

				} else {

					_gl.renderbufferStorage( _gl.RENDERBUFFER, _gl.DEPTH_STENCIL, renderTarget.width, renderTarget.height );

				}


				_gl.framebufferRenderbuffer( _gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer );

			} else {

				const textures = renderTarget.isWebGLMultipleRenderTargets === true ? renderTarget.texture : [ renderTarget.texture ];

				for ( let i = 0; i < textures.length; i ++ ) {

					const texture = textures[ i ];

					const glFormat = utils.convert( texture.format, texture.colorSpace );
					const glType = utils.convert( texture.type );
					const glInternalFormat = getInternalFormat( texture.internalFormat, glFormat, glType, texture.colorSpace );
					const samples = getRenderTargetSamples( renderTarget );

					if ( isMultisample && useMultisampledRTT( renderTarget ) === false ) {

						_gl.renderbufferStorageMultisample( _gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height );

					} else if ( useMultisampledRTT( renderTarget ) ) {

						multisampledRTTExt.renderbufferStorageMultisampleEXT( _gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height );

					} else {

						_gl.renderbufferStorage( _gl.RENDERBUFFER, glInternalFormat, renderTarget.width, renderTarget.height );

					}

				}

			}

			_gl.bindRenderbuffer( _gl.RENDERBUFFER, null );

		}

		// Setup resources for a Depth Texture for a FBO (needs an extension)
		function setupDepthTexture( framebuffer, renderTarget ) {

			const isCube = ( renderTarget && renderTarget.isWebGLCubeRenderTarget );
			if ( isCube ) throw new Error( 'Depth Texture with cube render targets is not supported' );

			state.bindFramebuffer( _gl.FRAMEBUFFER, framebuffer );

			if ( ! ( renderTarget.depthTexture && renderTarget.depthTexture.isDepthTexture ) ) {

				throw new Error( 'renderTarget.depthTexture must be an instance of THREE.DepthTexture' );

			}

			// upload an empty depth texture with framebuffer size
			if ( ! properties.get( renderTarget.depthTexture ).__webglTexture ||
					renderTarget.depthTexture.image.width !== renderTarget.width ||
					renderTarget.depthTexture.image.height !== renderTarget.height ) {

				renderTarget.depthTexture.image.width = renderTarget.width;
				renderTarget.depthTexture.image.height = renderTarget.height;
				renderTarget.depthTexture.needsUpdate = true;

			}

			setTexture2D( renderTarget.depthTexture, 0 );

			const webglDepthTexture = properties.get( renderTarget.depthTexture ).__webglTexture;
			const samples = getRenderTargetSamples( renderTarget );

			if ( renderTarget.depthTexture.format === three_1.DepthFormat ) {

				if ( useMultisampledRTT( renderTarget ) ) {

					multisampledRTTExt.framebufferTexture2DMultisampleEXT( _gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0, samples );

				} else {

					_gl.framebufferTexture2D( _gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0 );

				}

			} else if ( renderTarget.depthTexture.format === three_1.DepthStencilFormat ) {

				if ( useMultisampledRTT( renderTarget ) ) {

					multisampledRTTExt.framebufferTexture2DMultisampleEXT( _gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0, samples );

				} else {

					_gl.framebufferTexture2D( _gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.TEXTURE_2D, webglDepthTexture, 0 );

				}

			} else {

				throw new Error( 'Unknown depthTexture format' );

			}

		}

		// Setup GL resources for a non-texture depth buffer
		function setupDepthRenderbuffer( renderTarget ) {

			const renderTargetProperties = properties.get( renderTarget );
			const isCube = ( renderTarget.isWebGLCubeRenderTarget === true );

			if ( renderTarget.depthTexture && ! renderTargetProperties.__autoAllocateDepthBuffer ) {

				if ( isCube ) throw new Error( 'target.depthTexture not supported in Cube render targets' );

				setupDepthTexture( renderTargetProperties.__webglFramebuffer, renderTarget );

			} else {

				if ( isCube ) {

					renderTargetProperties.__webglDepthbuffer = [];

					for ( let i = 0; i < 6; i ++ ) {

						state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[ i ] );
						renderTargetProperties.__webglDepthbuffer[ i ] = _gl.createRenderbuffer();
						setupRenderBufferStorage( renderTargetProperties.__webglDepthbuffer[ i ], renderTarget, false );

					}

				} else {

					state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer );
					renderTargetProperties.__webglDepthbuffer = _gl.createRenderbuffer();
					setupRenderBufferStorage( renderTargetProperties.__webglDepthbuffer, renderTarget, false );

				}

			}

			state.bindFramebuffer( _gl.FRAMEBUFFER, null );

		}

		// rebind framebuffer with external textures
		function rebindTextures( renderTarget, colorTexture, depthTexture ) {

			const renderTargetProperties = properties.get( renderTarget );

			if ( colorTexture !== undefined ) {

				setupFrameBufferTexture( renderTargetProperties.__webglFramebuffer, renderTarget, renderTarget.texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, 0 );

			}

			if ( depthTexture !== undefined ) {

				setupDepthRenderbuffer( renderTarget );

			}

		}

		// Set up GL resources for the render target
		function setupRenderTarget( renderTarget ) {

			const texture = renderTarget.texture;

			const renderTargetProperties = properties.get( renderTarget );
			const textureProperties = properties.get( texture );

			renderTarget.addEventListener( 'dispose', onRenderTargetDispose );

			if ( renderTarget.isWebGLMultipleRenderTargets !== true ) {

				if ( textureProperties.__webglTexture === undefined ) {

					textureProperties.__webglTexture = _gl.createTexture();

				}

				textureProperties.__version = texture.version;
				info.memory.textures ++;

			}

			const isCube = ( renderTarget.isWebGLCubeRenderTarget === true );
			const isMultipleRenderTargets = ( renderTarget.isWebGLMultipleRenderTargets === true );
			const supportsMips = isPowerOfTwo( renderTarget ) || isWebGL2;

			// Setup framebuffer

			if ( isCube ) {

				renderTargetProperties.__webglFramebuffer = [];

				for ( let i = 0; i < 6; i ++ ) {

					if ( isWebGL2 && texture.mipmaps && texture.mipmaps.length > 0 ) {

						renderTargetProperties.__webglFramebuffer[ i ] = [];

						for ( let level = 0; level < texture.mipmaps.length; level ++ ) {

							renderTargetProperties.__webglFramebuffer[ i ][ level ] = _gl.createFramebuffer();

						}

					} else {

						renderTargetProperties.__webglFramebuffer[ i ] = _gl.createFramebuffer();

					}

				}

			} else {

				if ( isWebGL2 && texture.mipmaps && texture.mipmaps.length > 0 ) {

					renderTargetProperties.__webglFramebuffer = [];

					for ( let level = 0; level < texture.mipmaps.length; level ++ ) {

						renderTargetProperties.__webglFramebuffer[ level ] = _gl.createFramebuffer();

					}

				} else {

					renderTargetProperties.__webglFramebuffer = _gl.createFramebuffer();

				}

				if ( isMultipleRenderTargets ) {

					if ( capabilities.drawBuffers ) {

						const textures = renderTarget.texture;

						for ( let i = 0, il = textures.length; i < il; i ++ ) {

							const attachmentProperties = properties.get( textures[ i ] );

							if ( attachmentProperties.__webglTexture === undefined ) {

								attachmentProperties.__webglTexture = _gl.createTexture();

								info.memory.textures ++;

							}

						}

					} else {

						console.warn( 'THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.' );

					}

				}

				if ( ( isWebGL2 && renderTarget.samples > 0 ) && useMultisampledRTT( renderTarget ) === false ) {

					const textures = isMultipleRenderTargets ? texture : [ texture ];

					renderTargetProperties.__webglMultisampledFramebuffer = _gl.createFramebuffer();
					renderTargetProperties.__webglColorRenderbuffer = [];

					state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer );

					for ( let i = 0; i < textures.length; i ++ ) {

						const texture = textures[ i ];
						renderTargetProperties.__webglColorRenderbuffer[ i ] = _gl.createRenderbuffer();

						_gl.bindRenderbuffer( _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[ i ] );

						const glFormat = utils.convert( texture.format, texture.colorSpace );
						const glType = utils.convert( texture.type );
						const glInternalFormat = getInternalFormat( texture.internalFormat, glFormat, glType, texture.colorSpace, renderTarget.isXRRenderTarget === true );
						const samples = getRenderTargetSamples( renderTarget );
						_gl.renderbufferStorageMultisample( _gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height );

						_gl.framebufferRenderbuffer( _gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[ i ] );

					}

					_gl.bindRenderbuffer( _gl.RENDERBUFFER, null );

					if ( renderTarget.depthBuffer ) {

						renderTargetProperties.__webglDepthRenderbuffer = _gl.createRenderbuffer();
						setupRenderBufferStorage( renderTargetProperties.__webglDepthRenderbuffer, renderTarget, true );

					}

					state.bindFramebuffer( _gl.FRAMEBUFFER, null );

				}

			}

			// Setup color buffer

			if ( isCube ) {

				state.bindTexture( _gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture );
				setTextureParameters( _gl.TEXTURE_CUBE_MAP, texture, supportsMips );

				for ( let i = 0; i < 6; i ++ ) {

					if ( isWebGL2 && texture.mipmaps && texture.mipmaps.length > 0 ) {

						for ( let level = 0; level < texture.mipmaps.length; level ++ ) {

							setupFrameBufferTexture( renderTargetProperties.__webglFramebuffer[ i ][ level ], renderTarget, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level );

						}

					} else {

						setupFrameBufferTexture( renderTargetProperties.__webglFramebuffer[ i ], renderTarget, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0 );

					}

				}

				if ( textureNeedsGenerateMipmaps( texture, supportsMips ) ) {

					generateMipmap( _gl.TEXTURE_CUBE_MAP );

				}

				state.unbindTexture();

			} else if ( isMultipleRenderTargets ) {

				const textures = renderTarget.texture;

				for ( let i = 0, il = textures.length; i < il; i ++ ) {

					const attachment = textures[ i ];
					const attachmentProperties = properties.get( attachment );

					state.bindTexture( _gl.TEXTURE_2D, attachmentProperties.__webglTexture );
					setTextureParameters( _gl.TEXTURE_2D, attachment, supportsMips );
					setupFrameBufferTexture( renderTargetProperties.__webglFramebuffer, renderTarget, attachment, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, 0 );

					if ( textureNeedsGenerateMipmaps( attachment, supportsMips ) ) {

						generateMipmap( _gl.TEXTURE_2D );

					}

				}

				state.unbindTexture();

			} else {

				let glTextureType = _gl.TEXTURE_2D;

				if ( renderTarget.isWebGL3DRenderTarget || renderTarget.isWebGLArrayRenderTarget ) {

					if ( isWebGL2 ) {

						glTextureType = renderTarget.isWebGL3DRenderTarget ? _gl.TEXTURE_3D : _gl.TEXTURE_2D_ARRAY;

					} else {

						console.error( 'THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.' );

					}

				}

				state.bindTexture( glTextureType, textureProperties.__webglTexture );
				setTextureParameters( glTextureType, texture, supportsMips );

				if ( isWebGL2 && texture.mipmaps && texture.mipmaps.length > 0 ) {

					for ( let level = 0; level < texture.mipmaps.length; level ++ ) {

						setupFrameBufferTexture( renderTargetProperties.__webglFramebuffer[ level ], renderTarget, texture, _gl.COLOR_ATTACHMENT0, glTextureType, level );

					}

				} else {

					setupFrameBufferTexture( renderTargetProperties.__webglFramebuffer, renderTarget, texture, _gl.COLOR_ATTACHMENT0, glTextureType, 0 );

				}

				if ( textureNeedsGenerateMipmaps( texture, supportsMips ) ) {

					generateMipmap( glTextureType );

				}

				state.unbindTexture();

			}

			// Setup depth and stencil buffers

			if ( renderTarget.depthBuffer ) {

				setupDepthRenderbuffer( renderTarget );

			}

		}

		function updateRenderTargetMipmap( renderTarget ) {

			const supportsMips = isPowerOfTwo( renderTarget ) || isWebGL2;

			const textures = renderTarget.isWebGLMultipleRenderTargets === true ? renderTarget.texture : [ renderTarget.texture ];

			for ( let i = 0, il = textures.length; i < il; i ++ ) {

				const texture = textures[ i ];

				if ( textureNeedsGenerateMipmaps( texture, supportsMips ) ) {

					const target = renderTarget.isWebGLCubeRenderTarget ? _gl.TEXTURE_CUBE_MAP : _gl.TEXTURE_2D;
					const webglTexture = properties.get( texture ).__webglTexture;

					state.bindTexture( target, webglTexture );
					generateMipmap( target );
					state.unbindTexture();

				}

			}

		}

		function updateMultisampleRenderTarget( renderTarget ) {

			if ( ( isWebGL2 && renderTarget.samples > 0 ) && useMultisampledRTT( renderTarget ) === false ) {

				const textures = renderTarget.isWebGLMultipleRenderTargets ? renderTarget.texture : [ renderTarget.texture ];
				const width = renderTarget.width;
				const height = renderTarget.height;
				let mask = _gl.COLOR_BUFFER_BIT;
				const invalidationArray = [];
				const depthStyle = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
				const renderTargetProperties = properties.get( renderTarget );
				const isMultipleRenderTargets = ( renderTarget.isWebGLMultipleRenderTargets === true );

				// If MRT we need to remove FBO attachments
				if ( isMultipleRenderTargets ) {

					for ( let i = 0; i < textures.length; i ++ ) {

						state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer );
						_gl.framebufferRenderbuffer( _gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, null );

						state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer );
						_gl.framebufferTexture2D( _gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, null, 0 );

					}

				}

				state.bindFramebuffer( _gl.READ_FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer );
				state.bindFramebuffer( _gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglFramebuffer );

				for ( let i = 0; i < textures.length; i ++ ) {

					invalidationArray.push( _gl.COLOR_ATTACHMENT0 + i );

					if ( renderTarget.depthBuffer ) {

						invalidationArray.push( depthStyle );

					}

					const ignoreDepthValues = ( renderTargetProperties.__ignoreDepthValues !== undefined ) ? renderTargetProperties.__ignoreDepthValues : false;

					if ( ignoreDepthValues === false ) {

						if ( renderTarget.depthBuffer ) mask |= _gl.DEPTH_BUFFER_BIT;
						if ( renderTarget.stencilBuffer ) mask |= _gl.STENCIL_BUFFER_BIT;

					}

					if ( isMultipleRenderTargets ) {

						_gl.framebufferRenderbuffer( _gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[ i ] );

					}

					if ( ignoreDepthValues === true ) {

						_gl.invalidateFramebuffer( _gl.READ_FRAMEBUFFER, [ depthStyle ] );
						_gl.invalidateFramebuffer( _gl.DRAW_FRAMEBUFFER, [ depthStyle ] );

					}

					if ( isMultipleRenderTargets ) {

						const webglTexture = properties.get( textures[ i ] ).__webglTexture;
						_gl.framebufferTexture2D( _gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, webglTexture, 0 );

					}

					_gl.blitFramebuffer( 0, 0, width, height, 0, 0, width, height, mask, _gl.NEAREST );

					if ( supportsInvalidateFramebuffer ) {

						_gl.invalidateFramebuffer( _gl.READ_FRAMEBUFFER, invalidationArray );

					}


				}

				state.bindFramebuffer( _gl.READ_FRAMEBUFFER, null );
				state.bindFramebuffer( _gl.DRAW_FRAMEBUFFER, null );

				// If MRT since pre-blit we removed the FBO we need to reconstruct the attachments
				if ( isMultipleRenderTargets ) {

					for ( let i = 0; i < textures.length; i ++ ) {

						state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer );
						_gl.framebufferRenderbuffer( _gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[ i ] );

						const webglTexture = properties.get( textures[ i ] ).__webglTexture;

						state.bindFramebuffer( _gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer );
						_gl.framebufferTexture2D( _gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, webglTexture, 0 );

					}

				}

				state.bindFramebuffer( _gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer );

			}

		}

		function getRenderTargetSamples( renderTarget ) {

			return Math.min( capabilities.maxSamples, renderTarget.samples );

		}

		function useMultisampledRTT( renderTarget ) {

			const renderTargetProperties = properties.get( renderTarget );

			return isWebGL2 && renderTarget.samples > 0 && extensions.has( 'WEBGL_multisampled_render_to_texture' ) === true && renderTargetProperties.__useRenderToTexture !== false;

		}

		function updateVideoTexture( texture ) {

			const frame = info.render.frame;

			// Check the last frame we updated the VideoTexture

			if ( _videoTextures.get( texture ) !== frame ) {

				_videoTextures.set( texture, frame );
				texture.update();

			}

		}

		function verifyColorSpace( texture, image ) {

			const colorSpace = texture.colorSpace;
			const format = texture.format;
			const type = texture.type;

			if ( texture.isCompressedTexture === true || texture.isVideoTexture === true || texture.format === three_1._SRGBAFormat ) return image;

			if ( colorSpace !== three_1.LinearSRGBColorSpace && colorSpace !== three_1.NoColorSpace ) {

				// sRGB

				if ( three_1.ColorManagement.getTransfer( colorSpace ) === three_1.SRGBTransfer ) {

					if ( isWebGL2 === false ) {

						// in WebGL 1, try to use EXT_sRGB extension and unsized formats

						if ( extensions.has( 'EXT_sRGB' ) === true && format === three_1.RGBAFormat ) {

							texture.format = three_1._SRGBAFormat;

							// it's not possible to generate mips in WebGL 1 with this extension

							texture.minFilter = three_1.LinearFilter;
							texture.generateMipmaps = false;

						} else {

							// slow fallback (CPU decode)

							image = three_1.ImageUtils.sRGBToLinear( image );

						}

					} else {

						// in WebGL 2 uncompressed textures can only be sRGB encoded if they have the RGBA8 format

						if ( format !== three_1.RGBAFormat || type !== three_1.UnsignedByteType ) {

							console.warn( 'THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.' );

						}

					}

				} else {

					console.error( 'THREE.WebGLTextures: Unsupported texture color space:', colorSpace );

				}

			}

			return image;

		}

		//

		this.allocateTextureUnit = allocateTextureUnit;
		this.resetTextureUnits = resetTextureUnits;

		this.setTexture2D = setTexture2D;
		this.setTexture2DArray = setTexture2DArray;
		this.setTexture3D = setTexture3D;
		this.setTextureCube = setTextureCube;
		this.rebindTextures = rebindTextures;
		this.setupRenderTarget = setupRenderTarget;
		this.updateRenderTargetMipmap = updateRenderTargetMipmap;
		this.updateMultisampleRenderTarget = updateMultisampleRenderTarget;
		this.setupDepthRenderbuffer = setupDepthRenderbuffer;
		this.setupFrameBufferTexture = setupFrameBufferTexture;
		this.useMultisampledRTT = useMultisampledRTT;

	}

	function WebGLUtils( gl, extensions, capabilities ) {

		const isWebGL2 = capabilities.isWebGL2;

		function convert( p, colorSpace = three_1.NoColorSpace ) {

			let extension;

			const transfer = three_1.ColorManagement.getTransfer( colorSpace );

			if ( p === three_1.UnsignedByteType ) return gl.UNSIGNED_BYTE;
			if ( p === three_1.UnsignedShort4444Type ) return gl.UNSIGNED_SHORT_4_4_4_4;
			if ( p === three_1.UnsignedShort5551Type ) return gl.UNSIGNED_SHORT_5_5_5_1;

			if ( p === three_1.ByteType ) return gl.BYTE;
			if ( p === three_1.ShortType ) return gl.SHORT;
			if ( p === three_1.UnsignedShortType ) return gl.UNSIGNED_SHORT;
			if ( p === three_1.IntType ) return gl.INT;
			if ( p === three_1.UnsignedIntType ) return gl.UNSIGNED_INT;
			if ( p === three_1.FloatType ) return gl.FLOAT;

			if ( p === three_1.HalfFloatType ) {

				if ( isWebGL2 ) return gl.HALF_FLOAT;

				extension = extensions.get( 'OES_texture_half_float' );

				if ( extension !== null ) {

					return extension.HALF_FLOAT_OES;

				} else {

					return null;

				}

			}

			if ( p === three_1.AlphaFormat ) return gl.ALPHA;
			if ( p === three_1.RGBAFormat ) return gl.RGBA;
			if ( p === three_1.LuminanceFormat ) return gl.LUMINANCE;
			if ( p === three_1.LuminanceAlphaFormat ) return gl.LUMINANCE_ALPHA;
			if ( p === three_1.DepthFormat ) return gl.DEPTH_COMPONENT;
			if ( p === three_1.DepthStencilFormat ) return gl.DEPTH_STENCIL;

			// WebGL 1 sRGB fallback

			if ( p === three_1._SRGBAFormat ) {

				extension = extensions.get( 'EXT_sRGB' );

				if ( extension !== null ) {

					return extension.SRGB_ALPHA_EXT;

				} else {

					return null;

				}

			}

			// WebGL2 formats.

			if ( p === three_1.RedFormat ) return gl.RED;
			if ( p === three_1.RedIntegerFormat ) return gl.RED_INTEGER;
			if ( p === three_1.RGFormat ) return gl.RG;
			if ( p === three_1.RGIntegerFormat ) return gl.RG_INTEGER;
			if ( p === three_1.RGBAIntegerFormat ) return gl.RGBA_INTEGER;

			// S3TC

			if ( p === three_1.RGB_S3TC_DXT1_Format || p === three_1.RGBA_S3TC_DXT1_Format || p === three_1.RGBA_S3TC_DXT3_Format || p === three_1.RGBA_S3TC_DXT5_Format ) {

				if ( transfer === three_1.SRGBTransfer ) {

					extension = extensions.get( 'WEBGL_compressed_texture_s3tc_srgb' );

					if ( extension !== null ) {

						if ( p === three_1.RGB_S3TC_DXT1_Format ) return extension.COMPRESSED_SRGB_S3TC_DXT1_EXT;
						if ( p === three_1.RGBA_S3TC_DXT1_Format ) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
						if ( p === three_1.RGBA_S3TC_DXT3_Format ) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
						if ( p === three_1.RGBA_S3TC_DXT5_Format ) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;

					} else {

						return null;

					}

				} else {

					extension = extensions.get( 'WEBGL_compressed_texture_s3tc' );

					if ( extension !== null ) {

						if ( p === three_1.RGB_S3TC_DXT1_Format ) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
						if ( p === three_1.RGBA_S3TC_DXT1_Format ) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
						if ( p === three_1.RGBA_S3TC_DXT3_Format ) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
						if ( p === three_1.RGBA_S3TC_DXT5_Format ) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;

					} else {

						return null;

					}

				}

			}

			// PVRTC

			if ( p === three_1.RGB_PVRTC_4BPPV1_Format || p === three_1.RGB_PVRTC_2BPPV1_Format || p === three_1.RGBA_PVRTC_4BPPV1_Format || p === three_1.RGBA_PVRTC_2BPPV1_Format ) {

				extension = extensions.get( 'WEBGL_compressed_texture_pvrtc' );

				if ( extension !== null ) {

					if ( p === three_1.RGB_PVRTC_4BPPV1_Format ) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
					if ( p === three_1.RGB_PVRTC_2BPPV1_Format ) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
					if ( p === three_1.RGBA_PVRTC_4BPPV1_Format ) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
					if ( p === three_1.RGBA_PVRTC_2BPPV1_Format ) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;

				} else {

					return null;

				}

			}

			// ETC1

			if ( p === three_1.RGB_ETC1_Format ) {

				extension = extensions.get( 'WEBGL_compressed_texture_etc1' );

				if ( extension !== null ) {

					return extension.COMPRESSED_RGB_ETC1_WEBGL;

				} else {

					return null;

				}

			}

			// ETC2

			if ( p === three_1.RGB_ETC2_Format || p === three_1.RGBA_ETC2_EAC_Format ) {

				extension = extensions.get( 'WEBGL_compressed_texture_etc' );

				if ( extension !== null ) {

					if ( p === three_1.RGB_ETC2_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ETC2 : extension.COMPRESSED_RGB8_ETC2;
					if ( p === three_1.RGBA_ETC2_EAC_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : extension.COMPRESSED_RGBA8_ETC2_EAC;

				} else {

					return null;

				}

			}

			// ASTC

			if ( p === three_1.RGBA_ASTC_4x4_Format || p === three_1.RGBA_ASTC_5x4_Format || p === three_1.RGBA_ASTC_5x5_Format ||
				p === three_1.RGBA_ASTC_6x5_Format || p === three_1.RGBA_ASTC_6x6_Format || p === three_1.RGBA_ASTC_8x5_Format ||
				p === three_1.RGBA_ASTC_8x6_Format || p === three_1.RGBA_ASTC_8x8_Format || p === three_1.RGBA_ASTC_10x5_Format ||
				p === three_1.RGBA_ASTC_10x6_Format || p === three_1.RGBA_ASTC_10x8_Format || p === three_1.RGBA_ASTC_10x10_Format ||
				p === three_1.RGBA_ASTC_12x10_Format || p === three_1.RGBA_ASTC_12x12_Format ) {

				extension = extensions.get( 'WEBGL_compressed_texture_astc' );

				if ( extension !== null ) {

					if ( p === three_1.RGBA_ASTC_4x4_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : extension.COMPRESSED_RGBA_ASTC_4x4_KHR;
					if ( p === three_1.RGBA_ASTC_5x4_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : extension.COMPRESSED_RGBA_ASTC_5x4_KHR;
					if ( p === three_1.RGBA_ASTC_5x5_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : extension.COMPRESSED_RGBA_ASTC_5x5_KHR;
					if ( p === three_1.RGBA_ASTC_6x5_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : extension.COMPRESSED_RGBA_ASTC_6x5_KHR;
					if ( p === three_1.RGBA_ASTC_6x6_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : extension.COMPRESSED_RGBA_ASTC_6x6_KHR;
					if ( p === three_1.RGBA_ASTC_8x5_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : extension.COMPRESSED_RGBA_ASTC_8x5_KHR;
					if ( p === three_1.RGBA_ASTC_8x6_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : extension.COMPRESSED_RGBA_ASTC_8x6_KHR;
					if ( p === three_1.RGBA_ASTC_8x8_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : extension.COMPRESSED_RGBA_ASTC_8x8_KHR;
					if ( p === three_1.RGBA_ASTC_10x5_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : extension.COMPRESSED_RGBA_ASTC_10x5_KHR;
					if ( p === three_1.RGBA_ASTC_10x6_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : extension.COMPRESSED_RGBA_ASTC_10x6_KHR;
					if ( p === three_1.RGBA_ASTC_10x8_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : extension.COMPRESSED_RGBA_ASTC_10x8_KHR;
					if ( p === three_1.RGBA_ASTC_10x10_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : extension.COMPRESSED_RGBA_ASTC_10x10_KHR;
					if ( p === three_1.RGBA_ASTC_12x10_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : extension.COMPRESSED_RGBA_ASTC_12x10_KHR;
					if ( p === three_1.RGBA_ASTC_12x12_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : extension.COMPRESSED_RGBA_ASTC_12x12_KHR;

				} else {

					return null;

				}

			}

			// BPTC

			if ( p === three_1.RGBA_BPTC_Format || p === three_1.RGB_BPTC_SIGNED_Format || p === three_1.RGB_BPTC_UNSIGNED_Format ) {

				extension = extensions.get( 'EXT_texture_compression_bptc' );

				if ( extension !== null ) {

					if ( p === three_1.RGBA_BPTC_Format ) return ( transfer === three_1.SRGBTransfer ) ? extension.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : extension.COMPRESSED_RGBA_BPTC_UNORM_EXT;
					if ( p === three_1.RGB_BPTC_SIGNED_Format ) return extension.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
					if ( p === three_1.RGB_BPTC_UNSIGNED_Format ) return extension.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;

				} else {

					return null;

				}

			}

			// RGTC

			if ( p === three_1.RED_RGTC1_Format || p === three_1.SIGNED_RED_RGTC1_Format || p === three_1.RED_GREEN_RGTC2_Format || p === three_1.SIGNED_RED_GREEN_RGTC2_Format ) {

				extension = extensions.get( 'EXT_texture_compression_rgtc' );

				if ( extension !== null ) {

					if ( p === three_1.RGBA_BPTC_Format ) return extension.COMPRESSED_RED_RGTC1_EXT;
					if ( p === three_1.SIGNED_RED_RGTC1_Format ) return extension.COMPRESSED_SIGNED_RED_RGTC1_EXT;
					if ( p === three_1.RED_GREEN_RGTC2_Format ) return extension.COMPRESSED_RED_GREEN_RGTC2_EXT;
					if ( p === three_1.SIGNED_RED_GREEN_RGTC2_Format ) return extension.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;

				} else {

					return null;

				}

			}

			//

			if ( p === three_1.UnsignedInt248Type ) {

				if ( isWebGL2 ) return gl.UNSIGNED_INT_24_8;

				extension = extensions.get( 'WEBGL_depth_texture' );

				if ( extension !== null ) {

					return extension.UNSIGNED_INT_24_8_WEBGL;

				} else {

					return null;

				}

			}

			// if "p" can't be resolved, assume the user defines a WebGL constant as a string (fallback/workaround for packed RGB formats)

			return ( gl[ p ] !== undefined ) ? gl[ p ] : null;

		}

		return { convert: convert };

	}

	class ArrayCamera extends three_2.PerspectiveCamera {

		constructor( array = [] ) {

			super();

			this.isArrayCamera = true;

			this.cameras = array;

		}

	}

	class Group extends three_1.Object3D {

		constructor() {

			super();

			this.isGroup = true;

			this.type = 'Group';

		}

	}

	const _moveEvent = { type: 'move' };

	class WebXRController {

		constructor() {

			this._targetRay = null;
			this._grip = null;
			this._hand = null;

		}

		getHandSpace() {

			if ( this._hand === null ) {

				this._hand = new Group();
				this._hand.matrixAutoUpdate = false;
				this._hand.visible = false;

				this._hand.joints = {};
				this._hand.inputState = { pinching: false };

			}

			return this._hand;

		}

		getTargetRaySpace() {

			if ( this._targetRay === null ) {

				this._targetRay = new Group();
				this._targetRay.matrixAutoUpdate = false;
				this._targetRay.visible = false;
				this._targetRay.hasLinearVelocity = false;
				this._targetRay.linearVelocity = new three_1.Vector3();
				this._targetRay.hasAngularVelocity = false;
				this._targetRay.angularVelocity = new three_1.Vector3();

			}

			return this._targetRay;

		}

		getGripSpace() {

			if ( this._grip === null ) {

				this._grip = new Group();
				this._grip.matrixAutoUpdate = false;
				this._grip.visible = false;
				this._grip.hasLinearVelocity = false;
				this._grip.linearVelocity = new three_1.Vector3();
				this._grip.hasAngularVelocity = false;
				this._grip.angularVelocity = new three_1.Vector3();

			}

			return this._grip;

		}

		dispatchEvent( event ) {

			if ( this._targetRay !== null ) {

				this._targetRay.dispatchEvent( event );

			}

			if ( this._grip !== null ) {

				this._grip.dispatchEvent( event );

			}

			if ( this._hand !== null ) {

				this._hand.dispatchEvent( event );

			}

			return this;

		}

		connect( inputSource ) {

			if ( inputSource && inputSource.hand ) {

				const hand = this._hand;

				if ( hand ) {

					for ( const inputjoint of inputSource.hand.values() ) {

						// Initialize hand with joints when connected
						this._getHandJoint( hand, inputjoint );

					}

				}

			}

			this.dispatchEvent( { type: 'connected', data: inputSource } );

			return this;

		}

		disconnect( inputSource ) {

			this.dispatchEvent( { type: 'disconnected', data: inputSource } );

			if ( this._targetRay !== null ) {

				this._targetRay.visible = false;

			}

			if ( this._grip !== null ) {

				this._grip.visible = false;

			}

			if ( this._hand !== null ) {

				this._hand.visible = false;

			}

			return this;

		}

		update( inputSource, frame, referenceSpace ) {

			let inputPose = null;
			let gripPose = null;
			let handPose = null;

			const targetRay = this._targetRay;
			const grip = this._grip;
			const hand = this._hand;

			if ( inputSource && frame.session.visibilityState !== 'visible-blurred' ) {

				if ( hand && inputSource.hand ) {

					handPose = true;

					for ( const inputjoint of inputSource.hand.values() ) {

						// Update the joints groups with the XRJoint poses
						const jointPose = frame.getJointPose( inputjoint, referenceSpace );

						// The transform of this joint will be updated with the joint pose on each frame
						const joint = this._getHandJoint( hand, inputjoint );

						if ( jointPose !== null ) {

							joint.matrix.fromArray( jointPose.transform.matrix );
							joint.matrix.decompose( joint.position, joint.rotation, joint.scale );
							joint.matrixWorldNeedsUpdate = true;
							joint.jointRadius = jointPose.radius;

						}

						joint.visible = jointPose !== null;

					}

					// Custom events

					// Check pinchz
					const indexTip = hand.joints[ 'index-finger-tip' ];
					const thumbTip = hand.joints[ 'thumb-tip' ];
					const distance = indexTip.position.distanceTo( thumbTip.position );

					const distanceToPinch = 0.02;
					const threshold = 0.005;

					if ( hand.inputState.pinching && distance > distanceToPinch + threshold ) {

						hand.inputState.pinching = false;
						this.dispatchEvent( {
							type: 'pinchend',
							handedness: inputSource.handedness,
							target: this
						} );

					} else if ( ! hand.inputState.pinching && distance <= distanceToPinch - threshold ) {

						hand.inputState.pinching = true;
						this.dispatchEvent( {
							type: 'pinchstart',
							handedness: inputSource.handedness,
							target: this
						} );

					}

				} else {

					if ( grip !== null && inputSource.gripSpace ) {

						gripPose = frame.getPose( inputSource.gripSpace, referenceSpace );

						if ( gripPose !== null ) {

							grip.matrix.fromArray( gripPose.transform.matrix );
							grip.matrix.decompose( grip.position, grip.rotation, grip.scale );
							grip.matrixWorldNeedsUpdate = true;

							if ( gripPose.linearVelocity ) {

								grip.hasLinearVelocity = true;
								grip.linearVelocity.copy( gripPose.linearVelocity );

							} else {

								grip.hasLinearVelocity = false;

							}

							if ( gripPose.angularVelocity ) {

								grip.hasAngularVelocity = true;
								grip.angularVelocity.copy( gripPose.angularVelocity );

							} else {

								grip.hasAngularVelocity = false;

							}

						}

					}

				}

				if ( targetRay !== null ) {

					inputPose = frame.getPose( inputSource.targetRaySpace, referenceSpace );

					// Some runtimes (namely Vive Cosmos with Vive OpenXR Runtime) have only grip space and ray space is equal to it
					if ( inputPose === null && gripPose !== null ) {

						inputPose = gripPose;

					}

					if ( inputPose !== null ) {

						targetRay.matrix.fromArray( inputPose.transform.matrix );
						targetRay.matrix.decompose( targetRay.position, targetRay.rotation, targetRay.scale );
						targetRay.matrixWorldNeedsUpdate = true;

						if ( inputPose.linearVelocity ) {

							targetRay.hasLinearVelocity = true;
							targetRay.linearVelocity.copy( inputPose.linearVelocity );

						} else {

							targetRay.hasLinearVelocity = false;

						}

						if ( inputPose.angularVelocity ) {

							targetRay.hasAngularVelocity = true;
							targetRay.angularVelocity.copy( inputPose.angularVelocity );

						} else {

							targetRay.hasAngularVelocity = false;

						}

						this.dispatchEvent( _moveEvent );

					}

				}


			}

			if ( targetRay !== null ) {

				targetRay.visible = ( inputPose !== null );

			}

			if ( grip !== null ) {

				grip.visible = ( gripPose !== null );

			}

			if ( hand !== null ) {

				hand.visible = ( handPose !== null );

			}

			return this;

		}

		// private method

		_getHandJoint( hand, inputjoint ) {

			if ( hand.joints[ inputjoint.jointName ] === undefined ) {

				const joint = new Group();
				joint.matrixAutoUpdate = false;
				joint.visible = false;
				hand.joints[ inputjoint.jointName ] = joint;

				hand.add( joint );

			}

			return hand.joints[ inputjoint.jointName ];

		}

	}

	class WebXRManager extends three_1.EventDispatcher {

		constructor( renderer, gl ) {

			super();

			const scope = this;

			let session = null;

			let framebufferScaleFactor = 1.0;

			let referenceSpace = null;
			let referenceSpaceType = 'local-floor';
			// Set default foveation to maximum.
			let foveation = 1.0;
			let customReferenceSpace = null;

			let pose = null;
			let glBinding = null;
			let glProjLayer = null;
			let glBaseLayer = null;
			let xrFrame = null;
			const attributes = gl.getContextAttributes();
			let initialRenderTarget = null;
			let newRenderTarget = null;

			const controllers = [];
			const controllerInputSources = [];

			const currentSize = new three_1.Vector2();
			let currentPixelRatio = null;

			//

			const cameraL = new three_2.PerspectiveCamera();
			cameraL.layers.enable( 1 );
			cameraL.viewport = new three_1.Vector4();

			const cameraR = new three_2.PerspectiveCamera();
			cameraR.layers.enable( 2 );
			cameraR.viewport = new three_1.Vector4();

			const cameras = [ cameraL, cameraR ];

			const cameraXR = new ArrayCamera();
			cameraXR.layers.enable( 1 );
			cameraXR.layers.enable( 2 );

			let _currentDepthNear = null;
			let _currentDepthFar = null;

			//

			this.cameraAutoUpdate = true;
			this.enabled = false;

			this.isPresenting = false;

			this.getController = function ( index ) {

				let controller = controllers[ index ];

				if ( controller === undefined ) {

					controller = new WebXRController();
					controllers[ index ] = controller;

				}

				return controller.getTargetRaySpace();

			};

			this.getControllerGrip = function ( index ) {

				let controller = controllers[ index ];

				if ( controller === undefined ) {

					controller = new WebXRController();
					controllers[ index ] = controller;

				}

				return controller.getGripSpace();

			};

			this.getHand = function ( index ) {

				let controller = controllers[ index ];

				if ( controller === undefined ) {

					controller = new WebXRController();
					controllers[ index ] = controller;

				}

				return controller.getHandSpace();

			};

			//

			function onSessionEvent( event ) {

				const controllerIndex = controllerInputSources.indexOf( event.inputSource );

				if ( controllerIndex === -1 ) {

					return;

				}

				const controller = controllers[ controllerIndex ];

				if ( controller !== undefined ) {

					controller.update( event.inputSource, event.frame, customReferenceSpace || referenceSpace );
					controller.dispatchEvent( { type: event.type, data: event.inputSource } );

				}

			}

			function onSessionEnd() {

				session.removeEventListener( 'select', onSessionEvent );
				session.removeEventListener( 'selectstart', onSessionEvent );
				session.removeEventListener( 'selectend', onSessionEvent );
				session.removeEventListener( 'squeeze', onSessionEvent );
				session.removeEventListener( 'squeezestart', onSessionEvent );
				session.removeEventListener( 'squeezeend', onSessionEvent );
				session.removeEventListener( 'end', onSessionEnd );
				session.removeEventListener( 'inputsourceschange', onInputSourcesChange );

				for ( let i = 0; i < controllers.length; i ++ ) {

					const inputSource = controllerInputSources[ i ];

					if ( inputSource === null ) continue;

					controllerInputSources[ i ] = null;

					controllers[ i ].disconnect( inputSource );

				}

				_currentDepthNear = null;
				_currentDepthFar = null;

				// restore framebuffer/rendering state

				renderer.setRenderTarget( initialRenderTarget );

				glBaseLayer = null;
				glProjLayer = null;
				glBinding = null;
				session = null;
				newRenderTarget = null;

				//

				animation.stop();

				scope.isPresenting = false;

				renderer.setPixelRatio( currentPixelRatio );
				renderer.setSize( currentSize.width, currentSize.height, false );

				scope.dispatchEvent( { type: 'sessionend' } );

			}

			this.setFramebufferScaleFactor = function ( value ) {

				framebufferScaleFactor = value;

				if ( scope.isPresenting === true ) {

					console.warn( 'THREE.WebXRManager: Cannot change framebuffer scale while presenting.' );

				}

			};

			this.setReferenceSpaceType = function ( value ) {

				referenceSpaceType = value;

				if ( scope.isPresenting === true ) {

					console.warn( 'THREE.WebXRManager: Cannot change reference space type while presenting.' );

				}

			};

			this.getReferenceSpace = function () {

				return customReferenceSpace || referenceSpace;

			};

			this.setReferenceSpace = function ( space ) {

				customReferenceSpace = space;

			};

			this.getBaseLayer = function () {

				return glProjLayer !== null ? glProjLayer : glBaseLayer;

			};

			this.getBinding = function () {

				return glBinding;

			};

			this.getFrame = function () {

				return xrFrame;

			};

			this.getSession = function () {

				return session;

			};

			this.setSession = async function ( value ) {

				session = value;

				if ( session !== null ) {

					initialRenderTarget = renderer.getRenderTarget();

					session.addEventListener( 'select', onSessionEvent );
					session.addEventListener( 'selectstart', onSessionEvent );
					session.addEventListener( 'selectend', onSessionEvent );
					session.addEventListener( 'squeeze', onSessionEvent );
					session.addEventListener( 'squeezestart', onSessionEvent );
					session.addEventListener( 'squeezeend', onSessionEvent );
					session.addEventListener( 'end', onSessionEnd );
					session.addEventListener( 'inputsourceschange', onInputSourcesChange );

					if ( attributes.xrCompatible !== true ) {

						await gl.makeXRCompatible();

					}

					currentPixelRatio = renderer.getPixelRatio();
					renderer.getSize( currentSize );

					if ( ( session.renderState.layers === undefined ) || ( renderer.capabilities.isWebGL2 === false ) ) {

						const layerInit = {
							antialias: ( session.renderState.layers === undefined ) ? attributes.antialias : true,
							alpha: true,
							depth: attributes.depth,
							stencil: attributes.stencil,
							framebufferScaleFactor: framebufferScaleFactor
						};

						glBaseLayer = new XRWebGLLayer( session, gl, layerInit );

						session.updateRenderState( { baseLayer: glBaseLayer } );

						renderer.setPixelRatio( 1 );
						renderer.setSize( glBaseLayer.framebufferWidth, glBaseLayer.framebufferHeight, false );

						newRenderTarget = new three_1.WebGLRenderTarget(
							glBaseLayer.framebufferWidth,
							glBaseLayer.framebufferHeight,
							{
								format: three_1.RGBAFormat,
								type: three_1.UnsignedByteType,
								colorSpace: renderer.outputColorSpace,
								stencilBuffer: attributes.stencil
							}
						);

					} else {

						let depthFormat = null;
						let depthType = null;
						let glDepthFormat = null;

						if ( attributes.depth ) {

							glDepthFormat = attributes.stencil ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24;
							depthFormat = attributes.stencil ? three_1.DepthStencilFormat : three_1.DepthFormat;
							depthType = attributes.stencil ? three_1.UnsignedInt248Type : three_1.UnsignedIntType;

						}

						const projectionlayerInit = {
							colorFormat: gl.RGBA8,
							depthFormat: glDepthFormat,
							scaleFactor: framebufferScaleFactor
						};

						glBinding = new XRWebGLBinding( session, gl );

						glProjLayer = glBinding.createProjectionLayer( projectionlayerInit );

						session.updateRenderState( { layers: [ glProjLayer ] } );

						renderer.setPixelRatio( 1 );
						renderer.setSize( glProjLayer.textureWidth, glProjLayer.textureHeight, false );

						newRenderTarget = new three_1.WebGLRenderTarget(
							glProjLayer.textureWidth,
							glProjLayer.textureHeight,
							{
								format: three_1.RGBAFormat,
								type: three_1.UnsignedByteType,
								depthTexture: new three_3.DepthTexture( glProjLayer.textureWidth, glProjLayer.textureHeight, depthType, undefined, undefined, undefined, undefined, undefined, undefined, depthFormat ),
								stencilBuffer: attributes.stencil,
								colorSpace: renderer.outputColorSpace,
								samples: attributes.antialias ? 4 : 0
							} );

						const renderTargetProperties = renderer.properties.get( newRenderTarget );
						renderTargetProperties.__ignoreDepthValues = glProjLayer.ignoreDepthValues;

					}

					newRenderTarget.isXRRenderTarget = true; // TODO Remove this when possible, see #23278

					this.setFoveation( foveation );

					customReferenceSpace = null;
					referenceSpace = await session.requestReferenceSpace( referenceSpaceType );

					animation.setContext( session );
					animation.start();

					scope.isPresenting = true;

					scope.dispatchEvent( { type: 'sessionstart' } );

				}

			};

			this.getEnvironmentBlendMode = function () {

				if ( session !== null ) {

					return session.environmentBlendMode;

				}

			};

			function onInputSourcesChange( event ) {

				// Notify disconnected

				for ( let i = 0; i < event.removed.length; i ++ ) {

					const inputSource = event.removed[ i ];
					const index = controllerInputSources.indexOf( inputSource );

					if ( index >= 0 ) {

						controllerInputSources[ index ] = null;
						controllers[ index ].disconnect( inputSource );

					}

				}

				// Notify connected

				for ( let i = 0; i < event.added.length; i ++ ) {

					const inputSource = event.added[ i ];

					let controllerIndex = controllerInputSources.indexOf( inputSource );

					if ( controllerIndex === -1 ) {

						// Assign input source a controller that currently has no input source

						for ( let i = 0; i < controllers.length; i ++ ) {

							if ( i >= controllerInputSources.length ) {

								controllerInputSources.push( inputSource );
								controllerIndex = i;
								break;

							} else if ( controllerInputSources[ i ] === null ) {

								controllerInputSources[ i ] = inputSource;
								controllerIndex = i;
								break;

							}

						}

						// If all controllers do currently receive input we ignore new ones

						if ( controllerIndex === -1 ) break;

					}

					const controller = controllers[ controllerIndex ];

					if ( controller ) {

						controller.connect( inputSource );

					}

				}

			}

			//

			const cameraLPos = new three_1.Vector3();
			const cameraRPos = new three_1.Vector3();

			/**
			 * Assumes 2 cameras that are parallel and share an X-axis, and that
			 * the cameras' projection and world matrices have already been set.
			 * And that near and far planes are identical for both cameras.
			 * Visualization of this technique: https://computergraphics.stackexchange.com/a/4765
			 */
			function setProjectionFromUnion( camera, cameraL, cameraR ) {

				cameraLPos.setFromMatrixPosition( cameraL.matrixWorld );
				cameraRPos.setFromMatrixPosition( cameraR.matrixWorld );

				const ipd = cameraLPos.distanceTo( cameraRPos );

				const projL = cameraL.projectionMatrix.elements;
				const projR = cameraR.projectionMatrix.elements;

				// VR systems will have identical far and near planes, and
				// most likely identical top and bottom frustum extents.
				// Use the left camera for these values.
				const near = projL[ 14 ] / ( projL[ 10 ] - 1 );
				const far = projL[ 14 ] / ( projL[ 10 ] + 1 );
				const topFov = ( projL[ 9 ] + 1 ) / projL[ 5 ];
				const bottomFov = ( projL[ 9 ] - 1 ) / projL[ 5 ];

				const leftFov = ( projL[ 8 ] - 1 ) / projL[ 0 ];
				const rightFov = ( projR[ 8 ] + 1 ) / projR[ 0 ];
				const left = near * leftFov;
				const right = near * rightFov;

				// Calculate the new camera's position offset from the
				// left camera. xOffset should be roughly half `ipd`.
				const zOffset = ipd / ( - leftFov + rightFov );
				const xOffset = zOffset * - leftFov;

				// TODO: Better way to apply this offset?
				cameraL.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale );
				camera.translateX( xOffset );
				camera.translateZ( zOffset );
				camera.matrixWorld.compose( camera.position, camera.quaternion, camera.scale );
				camera.matrixWorldInverse.copy( camera.matrixWorld ).invert();

				// Find the union of the frustum values of the cameras and scale
				// the values so that the near plane's position does not change in world space,
				// although must now be relative to the new union camera.
				const near2 = near + zOffset;
				const far2 = far + zOffset;
				const left2 = left - xOffset;
				const right2 = right + ( ipd - xOffset );
				const top2 = topFov * far / far2 * near2;
				const bottom2 = bottomFov * far / far2 * near2;

				camera.projectionMatrix.makePerspective( left2, right2, top2, bottom2, near2, far2 );
				camera.projectionMatrixInverse.copy( camera.projectionMatrix ).invert();

			}

			function updateCamera( camera, parent ) {

				if ( parent === null ) {

					camera.matrixWorld.copy( camera.matrix );

				} else {

					camera.matrixWorld.multiplyMatrices( parent.matrixWorld, camera.matrix );

				}

				camera.matrixWorldInverse.copy( camera.matrixWorld ).invert();

			}

			this.updateCamera = function ( camera ) {

				if ( session === null ) return;

				cameraXR.near = cameraR.near = cameraL.near = camera.near;
				cameraXR.far = cameraR.far = cameraL.far = camera.far;

				if ( _currentDepthNear !== cameraXR.near || _currentDepthFar !== cameraXR.far ) {

					// Note that the new renderState won't apply until the next frame. See #18320

					session.updateRenderState( {
						depthNear: cameraXR.near,
						depthFar: cameraXR.far
					} );

					_currentDepthNear = cameraXR.near;
					_currentDepthFar = cameraXR.far;

				}

				const parent = camera.parent;
				const cameras = cameraXR.cameras;

				updateCamera( cameraXR, parent );

				for ( let i = 0; i < cameras.length; i ++ ) {

					updateCamera( cameras[ i ], parent );

				}

				// update projection matrix for proper view frustum culling

				if ( cameras.length === 2 ) {

					setProjectionFromUnion( cameraXR, cameraL, cameraR );

				} else {

					// assume single camera setup (AR)

					cameraXR.projectionMatrix.copy( cameraL.projectionMatrix );

				}

				// update user camera and its children

				updateUserCamera( camera, cameraXR, parent );

			};

			function updateUserCamera( camera, cameraXR, parent ) {

				if ( parent === null ) {

					camera.matrix.copy( cameraXR.matrixWorld );

				} else {

					camera.matrix.copy( parent.matrixWorld );
					camera.matrix.invert();
					camera.matrix.multiply( cameraXR.matrixWorld );

				}

				camera.matrix.decompose( camera.position, camera.quaternion, camera.scale );
				camera.updateMatrixWorld( true );

				camera.projectionMatrix.copy( cameraXR.projectionMatrix );
				camera.projectionMatrixInverse.copy( cameraXR.projectionMatrixInverse );

				if ( camera.isPerspectiveCamera ) {

					camera.fov = three_1.RAD2DEG * 2 * Math.atan( 1 / camera.projectionMatrix.elements[ 5 ] );
					camera.zoom = 1;

				}

			}

			this.getCamera = function () {

				return cameraXR;

			};

			this.getFoveation = function () {

				if ( glProjLayer === null && glBaseLayer === null ) {

					return undefined;

				}

				return foveation;

			};

			this.setFoveation = function ( value ) {

				// 0 = no foveation = full resolution
				// 1 = maximum foveation = the edges render at lower resolution

				foveation = value;

				if ( glProjLayer !== null ) {

					glProjLayer.fixedFoveation = value;

				}

				if ( glBaseLayer !== null && glBaseLayer.fixedFoveation !== undefined ) {

					glBaseLayer.fixedFoveation = value;

				}

			};

			// Animation Loop

			let onAnimationFrameCallback = null;

			function onAnimationFrame( time, frame ) {

				pose = frame.getViewerPose( customReferenceSpace || referenceSpace );
				xrFrame = frame;

				if ( pose !== null ) {

					const views = pose.views;

					if ( glBaseLayer !== null ) {

						renderer.setRenderTargetFramebuffer( newRenderTarget, glBaseLayer.framebuffer );
						renderer.setRenderTarget( newRenderTarget );

					}

					let cameraXRNeedsUpdate = false;

					// check if it's necessary to rebuild cameraXR's camera list

					if ( views.length !== cameraXR.cameras.length ) {

						cameraXR.cameras.length = 0;
						cameraXRNeedsUpdate = true;

					}

					for ( let i = 0; i < views.length; i ++ ) {

						const view = views[ i ];

						let viewport = null;

						if ( glBaseLayer !== null ) {

							viewport = glBaseLayer.getViewport( view );

						} else {

							const glSubImage = glBinding.getViewSubImage( glProjLayer, view );
							viewport = glSubImage.viewport;

							// For side-by-side projection, we only produce a single texture for both eyes.
							if ( i === 0 ) {

								renderer.setRenderTargetTextures(
									newRenderTarget,
									glSubImage.colorTexture,
									glProjLayer.ignoreDepthValues ? undefined : glSubImage.depthStencilTexture );

								renderer.setRenderTarget( newRenderTarget );

							}

						}

						let camera = cameras[ i ];

						if ( camera === undefined ) {

							camera = new three_2.PerspectiveCamera();
							camera.layers.enable( i );
							camera.viewport = new three_1.Vector4();
							cameras[ i ] = camera;

						}

						camera.matrix.fromArray( view.transform.matrix );
						camera.matrix.decompose( camera.position, camera.quaternion, camera.scale );
						camera.projectionMatrix.fromArray( view.projectionMatrix );
						camera.projectionMatrixInverse.copy( camera.projectionMatrix ).invert();
						camera.viewport.set( viewport.x, viewport.y, viewport.width, viewport.height );

						if ( i === 0 ) {

							cameraXR.matrix.copy( camera.matrix );
							cameraXR.matrix.decompose( cameraXR.position, cameraXR.quaternion, cameraXR.scale );

						}

						if ( cameraXRNeedsUpdate === true ) {

							cameraXR.cameras.push( camera );

						}

					}

				}

				//

				for ( let i = 0; i < controllers.length; i ++ ) {

					const inputSource = controllerInputSources[ i ];
					const controller = controllers[ i ];

					if ( inputSource !== null && controller !== undefined ) {

						controller.update( inputSource, frame, customReferenceSpace || referenceSpace );

					}

				}

				if ( onAnimationFrameCallback ) onAnimationFrameCallback( time, frame );

				if ( frame.detectedPlanes ) {

					scope.dispatchEvent( { type: 'planesdetected', data: frame } );

				}

				xrFrame = null;

			}

			const animation = new three_2.WebGLAnimation();

			animation.setAnimationLoop( onAnimationFrame );

			this.setAnimationLoop = function ( callback ) {

				onAnimationFrameCallback = callback;

			};

			this.dispose = function () {};

		}

	}

	function WebGLMaterials( renderer, properties ) {

		function refreshTransformUniform( map, uniform ) {

			if ( map.matrixAutoUpdate === true ) {

				map.updateMatrix();

			}

			uniform.value.copy( map.matrix );

		}

		function refreshFogUniforms( uniforms, fog ) {

			fog.color.getRGB( uniforms.fogColor.value, three_2.getUnlitUniformColorSpace( renderer ) );

			if ( fog.isFog ) {

				uniforms.fogNear.value = fog.near;
				uniforms.fogFar.value = fog.far;

			} else if ( fog.isFogExp2 ) {

				uniforms.fogDensity.value = fog.density;

			}

		}

		function refreshMaterialUniforms( uniforms, material, pixelRatio, height, transmissionRenderTarget ) {

			if ( material.isMeshBasicMaterial ) {

				refreshUniformsCommon( uniforms, material );

			} else if ( material.isMeshLambertMaterial ) {

				refreshUniformsCommon( uniforms, material );

			} else if ( material.isMeshToonMaterial ) {

				refreshUniformsCommon( uniforms, material );
				refreshUniformsToon( uniforms, material );

			} else if ( material.isMeshPhongMaterial ) {

				refreshUniformsCommon( uniforms, material );
				refreshUniformsPhong( uniforms, material );

			} else if ( material.isMeshStandardMaterial ) {

				refreshUniformsCommon( uniforms, material );
				refreshUniformsStandard( uniforms, material );

				if ( material.isMeshPhysicalMaterial ) {

					refreshUniformsPhysical( uniforms, material, transmissionRenderTarget );

				}

			} else if ( material.isMeshMatcapMaterial ) {

				refreshUniformsCommon( uniforms, material );
				refreshUniformsMatcap( uniforms, material );

			} else if ( material.isMeshDepthMaterial ) {

				refreshUniformsCommon( uniforms, material );

			} else if ( material.isMeshDistanceMaterial ) {

				refreshUniformsCommon( uniforms, material );
				refreshUniformsDistance( uniforms, material );

			} else if ( material.isMeshNormalMaterial ) {

				refreshUniformsCommon( uniforms, material );

			} else if ( material.isLineBasicMaterial ) {

				refreshUniformsLine( uniforms, material );

				if ( material.isLineDashedMaterial ) {

					refreshUniformsDash( uniforms, material );

				}

			} else if ( material.isPointsMaterial ) {

				refreshUniformsPoints( uniforms, material, pixelRatio, height );

			} else if ( material.isSpriteMaterial ) {

				refreshUniformsSprites( uniforms, material );

			} else if ( material.isShadowMaterial ) {

				uniforms.color.value.copy( material.color );
				uniforms.opacity.value = material.opacity;

			} else if ( material.isShaderMaterial ) {

				material.uniformsNeedUpdate = false; // #15581

			}

		}

		function refreshUniformsCommon( uniforms, material ) {

			uniforms.opacity.value = material.opacity;

			if ( material.color ) {

				uniforms.diffuse.value.copy( material.color );

			}

			if ( material.emissive ) {

				uniforms.emissive.value.copy( material.emissive ).multiplyScalar( material.emissiveIntensity );

			}

			if ( material.map ) {

				uniforms.map.value = material.map;

				refreshTransformUniform( material.map, uniforms.mapTransform );

			}

			if ( material.alphaMap ) {

				uniforms.alphaMap.value = material.alphaMap;

				refreshTransformUniform( material.alphaMap, uniforms.alphaMapTransform );

			}

			if ( material.bumpMap ) {

				uniforms.bumpMap.value = material.bumpMap;

				refreshTransformUniform( material.bumpMap, uniforms.bumpMapTransform );

				uniforms.bumpScale.value = material.bumpScale;

				if ( material.side === three_1.BackSide ) {

					uniforms.bumpScale.value *= -1;

				}

			}

			if ( material.normalMap ) {

				uniforms.normalMap.value = material.normalMap;

				refreshTransformUniform( material.normalMap, uniforms.normalMapTransform );

				uniforms.normalScale.value.copy( material.normalScale );

				if ( material.side === three_1.BackSide ) {

					uniforms.normalScale.value.negate();

				}

			}

			if ( material.displacementMap ) {

				uniforms.displacementMap.value = material.displacementMap;

				refreshTransformUniform( material.displacementMap, uniforms.displacementMapTransform );

				uniforms.displacementScale.value = material.displacementScale;
				uniforms.displacementBias.value = material.displacementBias;

			}

			if ( material.emissiveMap ) {

				uniforms.emissiveMap.value = material.emissiveMap;

				refreshTransformUniform( material.emissiveMap, uniforms.emissiveMapTransform );

			}

			if ( material.specularMap ) {

				uniforms.specularMap.value = material.specularMap;

				refreshTransformUniform( material.specularMap, uniforms.specularMapTransform );

			}

			if ( material.alphaTest > 0 ) {

				uniforms.alphaTest.value = material.alphaTest;

			}

			const envMap = properties.get( material ).envMap;

			if ( envMap ) {

				uniforms.envMap.value = envMap;

				uniforms.flipEnvMap.value = ( envMap.isCubeTexture && envMap.isRenderTargetTexture === false ) ? -1 : 1;

				uniforms.reflectivity.value = material.reflectivity;
				uniforms.ior.value = material.ior;
				uniforms.refractionRatio.value = material.refractionRatio;

			}

			if ( material.lightMap ) {

				uniforms.lightMap.value = material.lightMap;

				// artist-friendly light intensity scaling factor
				const scaleFactor = ( renderer._useLegacyLights === true ) ? Math.PI : 1;

				uniforms.lightMapIntensity.value = material.lightMapIntensity * scaleFactor;

				refreshTransformUniform( material.lightMap, uniforms.lightMapTransform );

			}

			if ( material.aoMap ) {

				uniforms.aoMap.value = material.aoMap;
				uniforms.aoMapIntensity.value = material.aoMapIntensity;

				refreshTransformUniform( material.aoMap, uniforms.aoMapTransform );

			}

		}

		function refreshUniformsLine( uniforms, material ) {

			uniforms.diffuse.value.copy( material.color );
			uniforms.opacity.value = material.opacity;

			if ( material.map ) {

				uniforms.map.value = material.map;

				refreshTransformUniform( material.map, uniforms.mapTransform );

			}

		}

		function refreshUniformsDash( uniforms, material ) {

			uniforms.dashSize.value = material.dashSize;
			uniforms.totalSize.value = material.dashSize + material.gapSize;
			uniforms.scale.value = material.scale;

		}

		function refreshUniformsPoints( uniforms, material, pixelRatio, height ) {

			uniforms.diffuse.value.copy( material.color );
			uniforms.opacity.value = material.opacity;
			uniforms.size.value = material.size * pixelRatio;
			uniforms.scale.value = height * 0.5;

			if ( material.map ) {

				uniforms.map.value = material.map;

				refreshTransformUniform( material.map, uniforms.uvTransform );

			}

			if ( material.alphaMap ) {

				uniforms.alphaMap.value = material.alphaMap;

				refreshTransformUniform( material.alphaMap, uniforms.alphaMapTransform );

			}

			if ( material.alphaTest > 0 ) {

				uniforms.alphaTest.value = material.alphaTest;

			}

		}

		function refreshUniformsSprites( uniforms, material ) {

			uniforms.diffuse.value.copy( material.color );
			uniforms.opacity.value = material.opacity;
			uniforms.rotation.value = material.rotation;

			if ( material.map ) {

				uniforms.map.value = material.map;

				refreshTransformUniform( material.map, uniforms.mapTransform );

			}

			if ( material.alphaMap ) {

				uniforms.alphaMap.value = material.alphaMap;

				refreshTransformUniform( material.alphaMap, uniforms.alphaMapTransform );

			}

			if ( material.alphaTest > 0 ) {

				uniforms.alphaTest.value = material.alphaTest;

			}

		}

		function refreshUniformsPhong( uniforms, material ) {

			uniforms.specular.value.copy( material.specular );
			uniforms.shininess.value = Math.max( material.shininess, 1e-4 ); // to prevent pow( 0.0, 0.0 )

		}

		function refreshUniformsToon( uniforms, material ) {

			if ( material.gradientMap ) {

				uniforms.gradientMap.value = material.gradientMap;

			}

		}

		function refreshUniformsStandard( uniforms, material ) {

			uniforms.metalness.value = material.metalness;

			if ( material.metalnessMap ) {

				uniforms.metalnessMap.value = material.metalnessMap;

				refreshTransformUniform( material.metalnessMap, uniforms.metalnessMapTransform );

			}

			uniforms.roughness.value = material.roughness;

			if ( material.roughnessMap ) {

				uniforms.roughnessMap.value = material.roughnessMap;

				refreshTransformUniform( material.roughnessMap, uniforms.roughnessMapTransform );

			}

			const envMap = properties.get( material ).envMap;

			if ( envMap ) {

				//uniforms.envMap.value = material.envMap; // part of uniforms common
				uniforms.envMapIntensity.value = material.envMapIntensity;

			}

		}

		function refreshUniformsPhysical( uniforms, material, transmissionRenderTarget ) {

			uniforms.ior.value = material.ior; // also part of uniforms common

			if ( material.sheen > 0 ) {

				uniforms.sheenColor.value.copy( material.sheenColor ).multiplyScalar( material.sheen );

				uniforms.sheenRoughness.value = material.sheenRoughness;

				if ( material.sheenColorMap ) {

					uniforms.sheenColorMap.value = material.sheenColorMap;

					refreshTransformUniform( material.sheenColorMap, uniforms.sheenColorMapTransform );

				}

				if ( material.sheenRoughnessMap ) {

					uniforms.sheenRoughnessMap.value = material.sheenRoughnessMap;

					refreshTransformUniform( material.sheenRoughnessMap, uniforms.sheenRoughnessMapTransform );

				}

			}

			if ( material.clearcoat > 0 ) {

				uniforms.clearcoat.value = material.clearcoat;
				uniforms.clearcoatRoughness.value = material.clearcoatRoughness;

				if ( material.clearcoatMap ) {

					uniforms.clearcoatMap.value = material.clearcoatMap;

					refreshTransformUniform( material.clearcoatMap, uniforms.clearcoatMapTransform );

				}

				if ( material.clearcoatRoughnessMap ) {

					uniforms.clearcoatRoughnessMap.value = material.clearcoatRoughnessMap;

					refreshTransformUniform( material.clearcoatRoughnessMap, uniforms.clearcoatRoughnessMapTransform );

				}

				if ( material.clearcoatNormalMap ) {

					uniforms.clearcoatNormalMap.value = material.clearcoatNormalMap;

					refreshTransformUniform( material.clearcoatNormalMap, uniforms.clearcoatNormalMapTransform );

					uniforms.clearcoatNormalScale.value.copy( material.clearcoatNormalScale );

					if ( material.side === three_1.BackSide ) {

						uniforms.clearcoatNormalScale.value.negate();

					}

				}

			}

			if ( material.iridescence > 0 ) {

				uniforms.iridescence.value = material.iridescence;
				uniforms.iridescenceIOR.value = material.iridescenceIOR;
				uniforms.iridescenceThicknessMinimum.value = material.iridescenceThicknessRange[ 0 ];
				uniforms.iridescenceThicknessMaximum.value = material.iridescenceThicknessRange[ 1 ];

				if ( material.iridescenceMap ) {

					uniforms.iridescenceMap.value = material.iridescenceMap;

					refreshTransformUniform( material.iridescenceMap, uniforms.iridescenceMapTransform );

				}

				if ( material.iridescenceThicknessMap ) {

					uniforms.iridescenceThicknessMap.value = material.iridescenceThicknessMap;

					refreshTransformUniform( material.iridescenceThicknessMap, uniforms.iridescenceThicknessMapTransform );

				}

			}

			if ( material.transmission > 0 ) {

				uniforms.transmission.value = material.transmission;
				uniforms.transmissionSamplerMap.value = transmissionRenderTarget.texture;
				uniforms.transmissionSamplerSize.value.set( transmissionRenderTarget.width, transmissionRenderTarget.height );

				if ( material.transmissionMap ) {

					uniforms.transmissionMap.value = material.transmissionMap;

					refreshTransformUniform( material.transmissionMap, uniforms.transmissionMapTransform );

				}

				uniforms.thickness.value = material.thickness;

				if ( material.thicknessMap ) {

					uniforms.thicknessMap.value = material.thicknessMap;

					refreshTransformUniform( material.thicknessMap, uniforms.thicknessMapTransform );

				}

				uniforms.attenuationDistance.value = material.attenuationDistance;
				uniforms.attenuationColor.value.copy( material.attenuationColor );

			}

			if ( material.anisotropy > 0 ) {

				uniforms.anisotropyVector.value.set( material.anisotropy * Math.cos( material.anisotropyRotation ), material.anisotropy * Math.sin( material.anisotropyRotation ) );

				if ( material.anisotropyMap ) {

					uniforms.anisotropyMap.value = material.anisotropyMap;

					refreshTransformUniform( material.anisotropyMap, uniforms.anisotropyMapTransform );

				}

			}

			uniforms.specularIntensity.value = material.specularIntensity;
			uniforms.specularColor.value.copy( material.specularColor );

			if ( material.specularColorMap ) {

				uniforms.specularColorMap.value = material.specularColorMap;

				refreshTransformUniform( material.specularColorMap, uniforms.specularColorMapTransform );

			}

			if ( material.specularIntensityMap ) {

				uniforms.specularIntensityMap.value = material.specularIntensityMap;

				refreshTransformUniform( material.specularIntensityMap, uniforms.specularIntensityMapTransform );

			}

		}

		function refreshUniformsMatcap( uniforms, material ) {

			if ( material.matcap ) {

				uniforms.matcap.value = material.matcap;

			}

		}

		function refreshUniformsDistance( uniforms, material ) {

			const light = properties.get( material ).light;

			uniforms.referencePosition.value.setFromMatrixPosition( light.matrixWorld );
			uniforms.nearDistance.value = light.shadow.camera.near;
			uniforms.farDistance.value = light.shadow.camera.far;

		}

		return {
			refreshFogUniforms: refreshFogUniforms,
			refreshMaterialUniforms: refreshMaterialUniforms
		};

	}

	function WebGLUniformsGroups( gl, info, capabilities, state ) {

		let buffers = {};
		let updateList = {};
		let allocatedBindingPoints = [];

		const maxBindingPoints = ( capabilities.isWebGL2 ) ? gl.getParameter( gl.MAX_UNIFORM_BUFFER_BINDINGS ) : 0; // binding points are global whereas block indices are per shader program

		function bind( uniformsGroup, program ) {

			const webglProgram = program.program;
			state.uniformBlockBinding( uniformsGroup, webglProgram );

		}

		function update( uniformsGroup, program ) {

			let buffer = buffers[ uniformsGroup.id ];

			if ( buffer === undefined ) {

				prepareUniformsGroup( uniformsGroup );

				buffer = createBuffer( uniformsGroup );
				buffers[ uniformsGroup.id ] = buffer;

				uniformsGroup.addEventListener( 'dispose', onUniformsGroupsDispose );

			}

			// ensure to update the binding points/block indices mapping for this program

			const webglProgram = program.program;
			state.updateUBOMapping( uniformsGroup, webglProgram );

			// update UBO once per frame

			const frame = info.render.frame;

			if ( updateList[ uniformsGroup.id ] !== frame ) {

				updateBufferData( uniformsGroup );

				updateList[ uniformsGroup.id ] = frame;

			}

		}

		function createBuffer( uniformsGroup ) {

			// the setup of an UBO is independent of a particular shader program but global

			const bindingPointIndex = allocateBindingPointIndex();
			uniformsGroup.__bindingPointIndex = bindingPointIndex;

			const buffer = gl.createBuffer();
			const size = uniformsGroup.__size;
			const usage = uniformsGroup.usage;

			gl.bindBuffer( gl.UNIFORM_BUFFER, buffer );
			gl.bufferData( gl.UNIFORM_BUFFER, size, usage );
			gl.bindBuffer( gl.UNIFORM_BUFFER, null );
			gl.bindBufferBase( gl.UNIFORM_BUFFER, bindingPointIndex, buffer );

			return buffer;

		}

		function allocateBindingPointIndex() {

			for ( let i = 0; i < maxBindingPoints; i ++ ) {

				if ( allocatedBindingPoints.indexOf( i ) === -1 ) {

					allocatedBindingPoints.push( i );
					return i;

				}

			}

			console.error( 'THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.' );

			return 0;

		}

		function updateBufferData( uniformsGroup ) {

			const buffer = buffers[ uniformsGroup.id ];
			const uniforms = uniformsGroup.uniforms;
			const cache = uniformsGroup.__cache;

			gl.bindBuffer( gl.UNIFORM_BUFFER, buffer );

			for ( let i = 0, il = uniforms.length; i < il; i ++ ) {

				const uniformArray = Array.isArray( uniforms[ i ] ) ? uniforms[ i ] : [ uniforms[ i ] ];

				for ( let j = 0, jl = uniformArray.length; j < jl; j ++ ) {

					const uniform = uniformArray[ j ];

					if ( hasUniformChanged( uniform, i, j, cache ) === true ) {

						const offset = uniform.__offset;

						const values = Array.isArray( uniform.value ) ? uniform.value : [ uniform.value ];

						let arrayOffset = 0;

						for ( let k = 0; k < values.length; k ++ ) {

							const value = values[ k ];

							const info = getUniformSize( value );

							// TODO add integer and struct support
							if ( typeof value === 'number' || typeof value === 'boolean' ) {

								uniform.__data[ 0 ] = value;
								gl.bufferSubData( gl.UNIFORM_BUFFER, offset + arrayOffset, uniform.__data );

							} else if ( value.isMatrix3 ) {

								// manually converting 3x3 to 3x4

								uniform.__data[ 0 ] = value.elements[ 0 ];
								uniform.__data[ 1 ] = value.elements[ 1 ];
								uniform.__data[ 2 ] = value.elements[ 2 ];
								uniform.__data[ 3 ] = 0;
								uniform.__data[ 4 ] = value.elements[ 3 ];
								uniform.__data[ 5 ] = value.elements[ 4 ];
								uniform.__data[ 6 ] = value.elements[ 5 ];
								uniform.__data[ 7 ] = 0;
								uniform.__data[ 8 ] = value.elements[ 6 ];
								uniform.__data[ 9 ] = value.elements[ 7 ];
								uniform.__data[ 10 ] = value.elements[ 8 ];
								uniform.__data[ 11 ] = 0;

							} else {

								value.toArray( uniform.__data, arrayOffset );

								arrayOffset += info.storage / Float32Array.BYTES_PER_ELEMENT;

							}

						}

						gl.bufferSubData( gl.UNIFORM_BUFFER, offset, uniform.__data );

					}

				}

			}

			gl.bindBuffer( gl.UNIFORM_BUFFER, null );

		}

		function hasUniformChanged( uniform, index, indexArray, cache ) {

			const value = uniform.value;
			const indexString = index + '_' + indexArray;

			if ( cache[ indexString ] === undefined ) {

				// cache entry does not exist so far

				if ( typeof value === 'number' || typeof value === 'boolean' ) {

					cache[ indexString ] = value;

				} else {

					cache[ indexString ] = value.clone();

				}

				return true;

			} else {

				const cachedObject = cache[ indexString ];

				// compare current value with cached entry

				if ( typeof value === 'number' || typeof value === 'boolean' ) {

					if ( cachedObject !== value ) {

						cache[ indexString ] = value;
						return true;

					}

				} else {

					if ( cachedObject.equals( value ) === false ) {

						cachedObject.copy( value );
						return true;

					}

				}

			}

			return false;

		}

		function prepareUniformsGroup( uniformsGroup ) {

			// determine total buffer size according to the STD140 layout
			// Hint: STD140 is the only supported layout in WebGL 2

			const uniforms = uniformsGroup.uniforms;

			let offset = 0; // global buffer offset in bytes
			const chunkSize = 16; // size of a chunk in bytes

			for ( let i = 0, l = uniforms.length; i < l; i ++ ) {

				const uniformArray = Array.isArray( uniforms[ i ] ) ? uniforms[ i ] : [ uniforms[ i ] ];

				for ( let j = 0, jl = uniformArray.length; j < jl; j ++ ) {

					const uniform = uniformArray[ j ];

					const values = Array.isArray( uniform.value ) ? uniform.value : [ uniform.value ];

					for ( let k = 0, kl = values.length; k < kl; k ++ ) {

						const value = values[ k ];

						const info = getUniformSize( value );

						// Calculate the chunk offset
						const chunkOffsetUniform = offset % chunkSize;

						// Check for chunk overflow
						if ( chunkOffsetUniform !== 0 && ( chunkSize - chunkOffsetUniform ) < info.boundary ) {

							// Add padding and adjust offset
							offset += ( chunkSize - chunkOffsetUniform );

						}

						// the following two properties will be used for partial buffer updates

						uniform.__data = new Float32Array( info.storage / Float32Array.BYTES_PER_ELEMENT );
						uniform.__offset = offset;


						// Update the global offset
						offset += info.storage;


					}

				}

			}

			// ensure correct final padding

			const chunkOffset = offset % chunkSize;

			if ( chunkOffset > 0 ) offset += ( chunkSize - chunkOffset );

			//

			uniformsGroup.__size = offset;
			uniformsGroup.__cache = {};

			return this;

		}

		function getUniformSize( value ) {

			const info = {
				boundary: 0, // bytes
				storage: 0 // bytes
			};

			// determine sizes according to STD140

			if ( typeof value === 'number' || typeof value === 'boolean' ) {

				// float/int/bool

				info.boundary = 4;
				info.storage = 4;

			} else if ( value.isVector2 ) {

				// vec2

				info.boundary = 8;
				info.storage = 8;

			} else if ( value.isVector3 || value.isColor ) {

				// vec3

				info.boundary = 16;
				info.storage = 12; // evil: vec3 must start on a 16-byte boundary but it only consumes 12 bytes

			} else if ( value.isVector4 ) {

				// vec4

				info.boundary = 16;
				info.storage = 16;

			} else if ( value.isMatrix3 ) {

				// mat3 (in STD140 a 3x3 matrix is represented as 3x4)

				info.boundary = 48;
				info.storage = 48;

			} else if ( value.isMatrix4 ) {

				// mat4

				info.boundary = 64;
				info.storage = 64;

			} else if ( value.isTexture ) {

				console.warn( 'THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.' );

			} else {

				console.warn( 'THREE.WebGLRenderer: Unsupported uniform value type.', value );

			}

			return info;

		}

		function onUniformsGroupsDispose( event ) {

			const uniformsGroup = event.target;

			uniformsGroup.removeEventListener( 'dispose', onUniformsGroupsDispose );

			const index = allocatedBindingPoints.indexOf( uniformsGroup.__bindingPointIndex );
			allocatedBindingPoints.splice( index, 1 );

			gl.deleteBuffer( buffers[ uniformsGroup.id ] );

			delete buffers[ uniformsGroup.id ];
			delete updateList[ uniformsGroup.id ];

		}

		function dispose() {

			for ( const id in buffers ) {

				gl.deleteBuffer( buffers[ id ] );

			}

			allocatedBindingPoints = [];
			buffers = {};
			updateList = {};

		}

		return {

			bind: bind,
			update: update,

			dispose: dispose

		};

	}

	class WebGLRenderer {

		constructor( parameters = {} ) {

			const {
				canvas = three_1.createCanvasElement(),
				context = null,
				depth = true,
				stencil = true,
				alpha = false,
				antialias = false,
				premultipliedAlpha = true,
				preserveDrawingBuffer = false,
				powerPreference = 'default',
				failIfMajorPerformanceCaveat = false,
			} = parameters;

			this.isWebGLRenderer = true;

			let _alpha;

			if ( context !== null ) {

				_alpha = context.getContextAttributes().alpha;

			} else {

				_alpha = alpha;

			}

			const uintClearColor = new Uint32Array( 4 );
			const intClearColor = new Int32Array( 4 );

			let currentRenderList = null;
			let currentRenderState = null;

			// render() can be called from within a callback triggered by another render.
			// We track this so that the nested render call gets its list and state isolated from the parent render call.

			const renderListStack = [];
			const renderStateStack = [];

			// public properties

			this.domElement = canvas;

			// Debug configuration container
			this.debug = {

				/**
				 * Enables error checking and reporting when shader programs are being compiled
				 * @type {boolean}
				 */
				checkShaderErrors: true,
				/**
				 * Callback for custom error reporting.
				 * @type {?Function}
				 */
				onShaderError: null
			};

			// clearing

			this.autoClear = true;
			this.autoClearColor = true;
			this.autoClearDepth = true;
			this.autoClearStencil = true;

			// scene graph

			this.sortObjects = true;

			// user-defined clipping

			this.clippingPlanes = [];
			this.localClippingEnabled = false;

			// physically based shading

			this._outputColorSpace = three_1.SRGBColorSpace;

			// physical lights

			this._useLegacyLights = false;

			// tone mapping

			this.toneMapping = three_1.NoToneMapping;
			this.toneMappingExposure = 1.0;

			// internal properties

			const _this = this;

			let _isContextLost = false;

			// internal state cache

			let _currentActiveCubeFace = 0;
			let _currentActiveMipmapLevel = 0;
			let _currentRenderTarget = null;
			let _currentMaterialId = -1;

			let _currentCamera = null;

			const _currentViewport = new three_1.Vector4();
			const _currentScissor = new three_1.Vector4();
			let _currentScissorTest = null;

			const _currentClearColor = new three_1.Color( 0x000000 );
			let _currentClearAlpha = 0;

			//

			let _width = canvas.width;
			let _height = canvas.height;

			let _pixelRatio = 1;
			let _opaqueSort = null;
			let _transparentSort = null;

			const _viewport = new three_1.Vector4( 0, 0, _width, _height );
			const _scissor = new three_1.Vector4( 0, 0, _width, _height );
			let _scissorTest = false;

			// frustum

			const _frustum = new three_2.Frustum();

			// clipping

			let _clippingEnabled = false;
			let _localClippingEnabled = false;

			// transmission

			let _transmissionRenderTarget = null;

			// camera matrices cache

			const _projScreenMatrix = new three_1.Matrix4();

			const _vector2 = new three_1.Vector2();
			const _vector3 = new three_1.Vector3();

			const _emptyScene = { background: null, fog: null, environment: null, overrideMaterial: null, isScene: true };

			function getTargetPixelRatio() {

				return _currentRenderTarget === null ? _pixelRatio : 1;

			}

			// initialize

			let _gl = context;

			function getContext( contextNames, contextAttributes ) {

				for ( let i = 0; i < contextNames.length; i ++ ) {

					const contextName = contextNames[ i ];
					const context = canvas.getContext( contextName, contextAttributes );
					if ( context !== null ) return context;

				}

				return null;

			}

			try {

				const contextAttributes = {
					alpha: true,
					depth,
					stencil,
					antialias,
					premultipliedAlpha,
					preserveDrawingBuffer,
					powerPreference,
					failIfMajorPerformanceCaveat,
				};

				// OffscreenCanvas does not have setAttribute, see #22811
				if ( 'setAttribute' in canvas ) canvas.setAttribute( 'data-engine', `three.js r${three_1.REVISION}` );

				// event listeners must be registered before WebGL context is created, see #12753
				canvas.addEventListener( 'webglcontextlost', onContextLost, false );
				canvas.addEventListener( 'webglcontextrestored', onContextRestore, false );
				canvas.addEventListener( 'webglcontextcreationerror', onContextCreationError, false );

				if ( _gl === null ) {

					const contextNames = [ 'webgl2', 'webgl', 'experimental-webgl' ];

					if ( _this.isWebGL1Renderer === true ) {

						contextNames.shift();

					}

					_gl = getContext( contextNames, contextAttributes );

					if ( _gl === null ) {

						if ( getContext( contextNames ) ) {

							throw new Error( 'Error creating WebGL context with your selected attributes.' );

						} else {

							throw new Error( 'Error creating WebGL context.' );

						}

					}

				}

				if ( typeof WebGLRenderingContext !== 'undefined' && _gl instanceof WebGLRenderingContext ) { // @deprecated, r153

					console.warn( 'THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163.' );

				}

				// Some experimental-webgl implementations do not have getShaderPrecisionFormat

				if ( _gl.getShaderPrecisionFormat === undefined ) {

					_gl.getShaderPrecisionFormat = function () {

						return { 'rangeMin': 1, 'rangeMax': 1, 'precision': 1 };

					};

				}

			} catch ( error ) {

				console.error( 'THREE.WebGLRenderer: ' + error.message );
				throw error;

			}

			let extensions, capabilities, state, info;
			let properties, textures, cubemaps, cubeuvmaps, attributes, geometries, objects;
			let programCache, materials, renderLists, renderStates, clipping, shadowMap;

			let background, morphtargets, bufferRenderer, indexedBufferRenderer;

			let utils, bindingStates, uniformsGroups;

			function initGLContext() {

				extensions = new three_3.WebGLExtensions( _gl );

				capabilities = new three_3.WebGLCapabilities( _gl, extensions, parameters );

				extensions.init( capabilities );

				utils = new WebGLUtils( _gl, extensions, capabilities );

				state = new WebGLState( _gl, extensions, capabilities );

				info = new three_3.WebGLInfo( _gl );
				properties = new three_3.WebGLProperties();
				textures = new WebGLTextures( _gl, extensions, state, properties, capabilities, utils, info );
				cubemaps = new three_3.WebGLCubeMaps( _this );
				cubeuvmaps = new three_3.WebGLCubeUVMaps( _this );
				attributes = new three_2.WebGLAttributes( _gl, capabilities );
				bindingStates = new three_3.WebGLBindingStates( _gl, extensions, attributes, capabilities );
				geometries = new three_3.WebGLGeometries( _gl, attributes, info, bindingStates );
				objects = new three_3.WebGLObjects( _gl, geometries, attributes, info );
				morphtargets = new three_3.WebGLMorphtargets( _gl, capabilities, textures );
				clipping = new three_3.WebGLClipping( properties );
				programCache = new three_3.WebGLPrograms( _this, cubemaps, cubeuvmaps, extensions, capabilities, bindingStates, clipping );
				materials = new WebGLMaterials( _this, properties );
				renderLists = new three_3.WebGLRenderLists();
				renderStates = new three_3.WebGLRenderStates( extensions, capabilities );
				background = new three_3.WebGLBackground( _this, cubemaps, cubeuvmaps, state, objects, _alpha, premultipliedAlpha );
				shadowMap = new three_3.WebGLShadowMap( _this, objects, capabilities );
				uniformsGroups = new WebGLUniformsGroups( _gl, info, capabilities, state );

				bufferRenderer = new three_3.WebGLBufferRenderer( _gl, extensions, info, capabilities );
				indexedBufferRenderer = new three_3.WebGLIndexedBufferRenderer( _gl, extensions, info, capabilities );

				info.programs = programCache.programs;

				_this.capabilities = capabilities;
				_this.extensions = extensions;
				_this.properties = properties;
				_this.renderLists = renderLists;
				_this.shadowMap = shadowMap;
				_this.state = state;
				_this.info = info;

			}

			initGLContext();

			// xr

			const xr = new WebXRManager( _this, _gl );

			this.xr = xr;

			// API

			this.getContext = function () {

				return _gl;

			};

			this.getContextAttributes = function () {

				return _gl.getContextAttributes();

			};

			this.forceContextLoss = function () {

				const extension = extensions.get( 'WEBGL_lose_context' );
				if ( extension ) extension.loseContext();

			};

			this.forceContextRestore = function () {

				const extension = extensions.get( 'WEBGL_lose_context' );
				if ( extension ) extension.restoreContext();

			};

			this.getPixelRatio = function () {

				return _pixelRatio;

			};

			this.setPixelRatio = function ( value ) {

				if ( value === undefined ) return;

				_pixelRatio = value;

				this.setSize( _width, _height, false );

			};

			this.getSize = function ( target ) {

				return target.set( _width, _height );

			};

			this.setSize = function ( width, height, updateStyle = true ) {

				if ( xr.isPresenting ) {

					console.warn( 'THREE.WebGLRenderer: Can\'t change size while VR device is presenting.' );
					return;

				}

				_width = width;
				_height = height;

				canvas.width = Math.floor( width * _pixelRatio );
				canvas.height = Math.floor( height * _pixelRatio );

				if ( updateStyle === true ) {

					canvas.style.width = width + 'px';
					canvas.style.height = height + 'px';

				}

				this.setViewport( 0, 0, width, height );

			};

			this.getDrawingBufferSize = function ( target ) {

				return target.set( _width * _pixelRatio, _height * _pixelRatio ).floor();

			};

			this.setDrawingBufferSize = function ( width, height, pixelRatio ) {

				_width = width;
				_height = height;

				_pixelRatio = pixelRatio;

				canvas.width = Math.floor( width * pixelRatio );
				canvas.height = Math.floor( height * pixelRatio );

				this.setViewport( 0, 0, width, height );

			};

			this.getCurrentViewport = function ( target ) {

				return target.copy( _currentViewport );

			};

			this.getViewport = function ( target ) {

				return target.copy( _viewport );

			};

			this.setViewport = function ( x, y, width, height ) {

				if ( x.isVector4 ) {

					_viewport.set( x.x, x.y, x.z, x.w );

				} else {

					_viewport.set( x, y, width, height );

				}

				state.viewport( _currentViewport.copy( _viewport ).multiplyScalar( _pixelRatio ).floor() );

			};

			this.getScissor = function ( target ) {

				return target.copy( _scissor );

			};

			this.setScissor = function ( x, y, width, height ) {

				if ( x.isVector4 ) {

					_scissor.set( x.x, x.y, x.z, x.w );

				} else {

					_scissor.set( x, y, width, height );

				}

				state.scissor( _currentScissor.copy( _scissor ).multiplyScalar( _pixelRatio ).floor() );

			};

			this.getScissorTest = function () {

				return _scissorTest;

			};

			this.setScissorTest = function ( boolean ) {

				state.setScissorTest( _scissorTest = boolean );

			};

			this.setOpaqueSort = function ( method ) {

				_opaqueSort = method;

			};

			this.setTransparentSort = function ( method ) {

				_transparentSort = method;

			};

			// Clearing

			this.getClearColor = function ( target ) {

				return target.copy( background.getClearColor() );

			};

			this.setClearColor = function () {

				background.setClearColor.apply( background, arguments );

			};

			this.getClearAlpha = function () {

				return background.getClearAlpha();

			};

			this.setClearAlpha = function () {

				background.setClearAlpha.apply( background, arguments );

			};

			this.clear = function ( color = true, depth = true, stencil = true ) {

				let bits = 0;

				if ( color ) {

					// check if we're trying to clear an integer target
					let isIntegerFormat = false;
					if ( _currentRenderTarget !== null ) {

						const targetFormat = _currentRenderTarget.texture.format;
						isIntegerFormat = targetFormat === three_1.RGBAIntegerFormat ||
							targetFormat === three_1.RGIntegerFormat ||
							targetFormat === three_1.RedIntegerFormat;

					}

					// use the appropriate clear functions to clear the target if it's a signed
					// or unsigned integer target
					if ( isIntegerFormat ) {

						const targetType = _currentRenderTarget.texture.type;
						const isUnsignedType = targetType === three_1.UnsignedByteType ||
							targetType === three_1.UnsignedIntType ||
							targetType === three_1.UnsignedShortType ||
							targetType === three_1.UnsignedInt248Type ||
							targetType === three_1.UnsignedShort4444Type ||
							targetType === three_1.UnsignedShort5551Type;

						const clearColor = background.getClearColor();
						const a = background.getClearAlpha();
						const r = clearColor.r;
						const g = clearColor.g;
						const b = clearColor.b;

						if ( isUnsignedType ) {

							uintClearColor[ 0 ] = r;
							uintClearColor[ 1 ] = g;
							uintClearColor[ 2 ] = b;
							uintClearColor[ 3 ] = a;
							_gl.clearBufferuiv( _gl.COLOR, 0, uintClearColor );

						} else {

							intClearColor[ 0 ] = r;
							intClearColor[ 1 ] = g;
							intClearColor[ 2 ] = b;
							intClearColor[ 3 ] = a;
							_gl.clearBufferiv( _gl.COLOR, 0, intClearColor );

						}

					} else {

						bits |= _gl.COLOR_BUFFER_BIT;

					}

				}

				if ( depth ) bits |= _gl.DEPTH_BUFFER_BIT;
				if ( stencil ) {

					bits |= _gl.STENCIL_BUFFER_BIT;
					this.state.buffers.stencil.setMask( 0xffffffff );

				}

				_gl.clear( bits );

			};

			this.clearColor = function () {

				this.clear( true, false, false );

			};

			this.clearDepth = function () {

				this.clear( false, true, false );

			};

			this.clearStencil = function () {

				this.clear( false, false, true );

			};

			//

			this.dispose = function () {

				canvas.removeEventListener( 'webglcontextlost', onContextLost, false );
				canvas.removeEventListener( 'webglcontextrestored', onContextRestore, false );
				canvas.removeEventListener( 'webglcontextcreationerror', onContextCreationError, false );

				renderLists.dispose();
				renderStates.dispose();
				properties.dispose();
				cubemaps.dispose();
				cubeuvmaps.dispose();
				objects.dispose();
				bindingStates.dispose();
				uniformsGroups.dispose();
				programCache.dispose();

				xr.dispose();

				xr.removeEventListener( 'sessionstart', onXRSessionStart );
				xr.removeEventListener( 'sessionend', onXRSessionEnd );

				if ( _transmissionRenderTarget ) {

					_transmissionRenderTarget.dispose();
					_transmissionRenderTarget = null;

				}

				animation.stop();

			};

			// Events

			function onContextLost( event ) {

				event.preventDefault();

				console.log( 'THREE.WebGLRenderer: Context Lost.' );

				_isContextLost = true;

			}

			function onContextRestore( /* event */ ) {

				console.log( 'THREE.WebGLRenderer: Context Restored.' );

				_isContextLost = false;

				const infoAutoReset = info.autoReset;
				const shadowMapEnabled = shadowMap.enabled;
				const shadowMapAutoUpdate = shadowMap.autoUpdate;
				const shadowMapNeedsUpdate = shadowMap.needsUpdate;
				const shadowMapType = shadowMap.type;

				initGLContext();

				info.autoReset = infoAutoReset;
				shadowMap.enabled = shadowMapEnabled;
				shadowMap.autoUpdate = shadowMapAutoUpdate;
				shadowMap.needsUpdate = shadowMapNeedsUpdate;
				shadowMap.type = shadowMapType;

			}

			function onContextCreationError( event ) {

				console.error( 'THREE.WebGLRenderer: A WebGL context could not be created. Reason: ', event.statusMessage );

			}

			function onMaterialDispose( event ) {

				const material = event.target;

				material.removeEventListener( 'dispose', onMaterialDispose );

				deallocateMaterial( material );

			}

			// Buffer deallocation

			function deallocateMaterial( material ) {

				releaseMaterialProgramReferences( material );

				properties.remove( material );

			}


			function releaseMaterialProgramReferences( material ) {

				const programs = properties.get( material ).programs;

				if ( programs !== undefined ) {

					programs.forEach( function ( program ) {

						programCache.releaseProgram( program );

					} );

					if ( material.isShaderMaterial ) {

						programCache.releaseShaderCache( material );

					}

				}

			}

			// Buffer rendering

			this.renderBufferDirect = function ( camera, scene, geometry, material, object, group ) {

				if ( scene === null ) scene = _emptyScene; // renderBufferDirect second parameter used to be fog (could be null)

				const frontFaceCW = ( object.isMesh && object.matrixWorld.determinant() < 0 );

				const program = setProgram( camera, scene, geometry, material, object );

				state.setMaterial( material, frontFaceCW );

				//

				let index = geometry.index;
				let rangeFactor = 1;

				if ( material.wireframe === true ) {

					index = geometries.getWireframeAttribute( geometry );

					if ( index === undefined ) return;

					rangeFactor = 2;

				}

				//

				const drawRange = geometry.drawRange;
				const position = geometry.attributes.position;

				let drawStart = drawRange.start * rangeFactor;
				let drawEnd = ( drawRange.start + drawRange.count ) * rangeFactor;

				if ( group !== null ) {

					drawStart = Math.max( drawStart, group.start * rangeFactor );
					drawEnd = Math.min( drawEnd, ( group.start + group.count ) * rangeFactor );

				}

				if ( index !== null ) {

					drawStart = Math.max( drawStart, 0 );
					drawEnd = Math.min( drawEnd, index.count );

				} else if ( position !== undefined && position !== null ) {

					drawStart = Math.max( drawStart, 0 );
					drawEnd = Math.min( drawEnd, position.count );

				}

				const drawCount = drawEnd - drawStart;

				if ( drawCount < 0 || drawCount === Infinity ) return;

				//

				bindingStates.setup( object, material, program, geometry, index );

				let attribute;
				let renderer = bufferRenderer;

				if ( index !== null ) {

					attribute = attributes.get( index );

					renderer = indexedBufferRenderer;
					renderer.setIndex( attribute );

				}

				//

				if ( object.isMesh ) {

					if ( material.wireframe === true ) {

						state.setLineWidth( material.wireframeLinewidth * getTargetPixelRatio() );
						renderer.setMode( _gl.LINES );

					} else {

						renderer.setMode( _gl.TRIANGLES );

					}

				} else if ( object.isLine ) {

					let lineWidth = material.linewidth;

					if ( lineWidth === undefined ) lineWidth = 1; // Not using Line*Material

					state.setLineWidth( lineWidth * getTargetPixelRatio() );

					if ( object.isLineSegments ) {

						renderer.setMode( _gl.LINES );

					} else if ( object.isLineLoop ) {

						renderer.setMode( _gl.LINE_LOOP );

					} else {

						renderer.setMode( _gl.LINE_STRIP );

					}

				} else if ( object.isPoints ) {

					renderer.setMode( _gl.POINTS );

				} else if ( object.isSprite ) {

					renderer.setMode( _gl.TRIANGLES );

				}

				if ( object.isBatchedMesh ) {

					renderer.renderMultiDraw( object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount );

				} else if ( object.isInstancedMesh ) {

					renderer.renderInstances( drawStart, drawCount, object.count );

				} else if ( geometry.isInstancedBufferGeometry ) {

					const maxInstanceCount = geometry._maxInstanceCount !== undefined ? geometry._maxInstanceCount : Infinity;
					const instanceCount = Math.min( geometry.instanceCount, maxInstanceCount );

					renderer.renderInstances( drawStart, drawCount, instanceCount );

				} else {

					renderer.render( drawStart, drawCount );

				}

			};

			// Compile

			function prepareMaterial( material, scene, object ) {

				if ( material.transparent === true && material.side === three_1.DoubleSide && material.forceSinglePass === false ) {

					material.side = three_1.BackSide;
					material.needsUpdate = true;
					getProgram( material, scene, object );

					material.side = three_1.FrontSide;
					material.needsUpdate = true;
					getProgram( material, scene, object );

					material.side = three_1.DoubleSide;

				} else {

					getProgram( material, scene, object );

				}

			}

			this.compile = function ( scene, camera, targetScene = null ) {

				if ( targetScene === null ) targetScene = scene;

				currentRenderState = renderStates.get( targetScene );
				currentRenderState.init();

				renderStateStack.push( currentRenderState );

				// gather lights from both the target scene and the new object that will be added to the scene.

				targetScene.traverseVisible( function ( object ) {

					if ( object.isLight && object.layers.test( camera.layers ) ) {

						currentRenderState.pushLight( object );

						if ( object.castShadow ) {

							currentRenderState.pushShadow( object );

						}

					}

				} );

				if ( scene !== targetScene ) {

					scene.traverseVisible( function ( object ) {

						if ( object.isLight && object.layers.test( camera.layers ) ) {

							currentRenderState.pushLight( object );

							if ( object.castShadow ) {

								currentRenderState.pushShadow( object );

							}

						}

					} );

				}

				currentRenderState.setupLights( _this._useLegacyLights );

				// Only initialize materials in the new scene, not the targetScene.

				const materials = new Set();

				scene.traverse( function ( object ) {

					const material = object.material;

					if ( material ) {

						if ( Array.isArray( material ) ) {

							for ( let i = 0; i < material.length; i ++ ) {

								const material2 = material[ i ];

								prepareMaterial( material2, targetScene, object );
								materials.add( material2 );

							}

						} else {

							prepareMaterial( material, targetScene, object );
							materials.add( material );

						}

					}

				} );

				renderStateStack.pop();
				currentRenderState = null;

				return materials;

			};

			// compileAsync

			this.compileAsync = function ( scene, camera, targetScene = null ) {

				const materials = this.compile( scene, camera, targetScene );

				// Wait for all the materials in the new object to indicate that they're
				// ready to be used before resolving the promise.

				return new Promise( ( resolve ) => {

					function checkMaterialsReady() {

						materials.forEach( function ( material ) {

							const materialProperties = properties.get( material );
							const program = materialProperties.currentProgram;

							if ( program.isReady() ) {

								// remove any programs that report they're ready to use from the list
								materials.delete( material );

							}

						} );

						// once the list of compiling materials is empty, call the callback

						if ( materials.size === 0 ) {

							resolve( scene );
							return;

						}

						// if some materials are still not ready, wait a bit and check again

						setTimeout( checkMaterialsReady, 10 );

					}

					if ( extensions.get( 'KHR_parallel_shader_compile' ) !== null ) {

						// If we can check the compilation status of the materials without
						// blocking then do so right away.

						checkMaterialsReady();

					} else {

						// Otherwise start by waiting a bit to give the materials we just
						// initialized a chance to finish.

						setTimeout( checkMaterialsReady, 10 );

					}

				} );

			};

			// Animation Loop

			let onAnimationFrameCallback = null;

			function onAnimationFrame( time ) {

				if ( onAnimationFrameCallback ) onAnimationFrameCallback( time );

			}

			function onXRSessionStart() {

				animation.stop();

			}

			function onXRSessionEnd() {

				animation.start();

			}

			const animation = new three_2.WebGLAnimation();
			animation.setAnimationLoop( onAnimationFrame );

			if ( typeof self !== 'undefined' ) animation.setContext( self );

			this.setAnimationLoop = function ( callback ) {

				onAnimationFrameCallback = callback;
				xr.setAnimationLoop( callback );

				( callback === null ) ? animation.stop() : animation.start();

			};

			xr.addEventListener( 'sessionstart', onXRSessionStart );
			xr.addEventListener( 'sessionend', onXRSessionEnd );

			// Rendering

			this.render = function ( scene, camera ) {

				if ( camera !== undefined && camera.isCamera !== true ) {

					console.error( 'THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.' );
					return;

				}

				if ( _isContextLost === true ) return;

				// update scene graph

				if ( scene.matrixWorldAutoUpdate === true ) scene.updateMatrixWorld();

				// update camera matrices and frustum

				if ( camera.parent === null && camera.matrixWorldAutoUpdate === true ) camera.updateMatrixWorld();

				if ( xr.enabled === true && xr.isPresenting === true ) {

					if ( xr.cameraAutoUpdate === true ) xr.updateCamera( camera );

					camera = xr.getCamera(); // use XR camera for rendering

				}

				//
				if ( scene.isScene === true ) scene.onBeforeRender( _this, scene, camera, _currentRenderTarget );

				currentRenderState = renderStates.get( scene, renderStateStack.length );
				currentRenderState.init();

				renderStateStack.push( currentRenderState );

				_projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
				_frustum.setFromProjectionMatrix( _projScreenMatrix );

				_localClippingEnabled = this.localClippingEnabled;
				_clippingEnabled = clipping.init( this.clippingPlanes, _localClippingEnabled );

				currentRenderList = renderLists.get( scene, renderListStack.length );
				currentRenderList.init();

				renderListStack.push( currentRenderList );

				projectObject( scene, camera, 0, _this.sortObjects );

				currentRenderList.finish();

				if ( _this.sortObjects === true ) {

					currentRenderList.sort( _opaqueSort, _transparentSort );

				}

				//

				this.info.render.frame ++;

				if ( _clippingEnabled === true ) clipping.beginShadows();

				const shadowsArray = currentRenderState.state.shadowsArray;

				shadowMap.render( shadowsArray, scene, camera );

				if ( _clippingEnabled === true ) clipping.endShadows();

				//

				if ( this.info.autoReset === true ) this.info.reset();


				//

				background.render( currentRenderList, scene );

				// render scene

				currentRenderState.setupLights( _this._useLegacyLights );

				if ( camera.isArrayCamera ) {

					const cameras = camera.cameras;

					for ( let i = 0, l = cameras.length; i < l; i ++ ) {

						const camera2 = cameras[ i ];

						renderScene( currentRenderList, scene, camera2, camera2.viewport );

					}

				} else {

					renderScene( currentRenderList, scene, camera );

				}

				//

				if ( _currentRenderTarget !== null ) {

					// resolve multisample renderbuffers to a single-sample texture if necessary

					textures.updateMultisampleRenderTarget( _currentRenderTarget );

					// Generate mipmap if we're using any kind of mipmap filtering

					textures.updateRenderTargetMipmap( _currentRenderTarget );

				}

				//

				if ( scene.isScene === true ) scene.onAfterRender( _this, scene, camera );

				// _gl.finish();

				bindingStates.resetDefaultState();
				_currentMaterialId = -1;
				_currentCamera = null;

				renderStateStack.pop();

				if ( renderStateStack.length > 0 ) {

					currentRenderState = renderStateStack[ renderStateStack.length - 1 ];

				} else {

					currentRenderState = null;

				}

				renderListStack.pop();

				if ( renderListStack.length > 0 ) {

					currentRenderList = renderListStack[ renderListStack.length - 1 ];

				} else {

					currentRenderList = null;

				}

			};

			function projectObject( object, camera, groupOrder, sortObjects ) {

				if ( object.visible === false ) return;

				const visible = object.layers.test( camera.layers );

				if ( visible ) {

					if ( object.isGroup ) {

						groupOrder = object.renderOrder;

					} else if ( object.isLOD ) {

						if ( object.autoUpdate === true ) object.update( camera );

					} else if ( object.isLight ) {

						currentRenderState.pushLight( object );

						if ( object.castShadow ) {

							currentRenderState.pushShadow( object );

						}

					} else if ( object.isSprite ) {

						if ( ! object.frustumCulled || _frustum.intersectsSprite( object ) ) {

							if ( sortObjects ) {

								_vector3.setFromMatrixPosition( object.matrixWorld )
									.applyMatrix4( _projScreenMatrix );

							}

							const geometry = objects.update( object );
							const material = object.material;

							if ( material.visible ) {

								currentRenderList.push( object, geometry, material, groupOrder, _vector3.z, null );

							}

						}

					} else if ( object.isMesh || object.isLine || object.isPoints ) {

						if ( ! object.frustumCulled || _frustum.intersectsObject( object ) ) {

							const geometry = objects.update( object );
							const material = object.material;

							if ( sortObjects ) {

								if ( object.boundingSphere !== undefined ) {

									if ( object.boundingSphere === null ) object.computeBoundingSphere();
									_vector3.copy( object.boundingSphere.center );

								} else {

									if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();
									_vector3.copy( geometry.boundingSphere.center );

								}

								_vector3
									.applyMatrix4( object.matrixWorld )
									.applyMatrix4( _projScreenMatrix );

							}

							if ( Array.isArray( material ) ) {

								const groups = geometry.groups;

								for ( let i = 0, l = groups.length; i < l; i ++ ) {

									const group = groups[ i ];
									const groupMaterial = material[ group.materialIndex ];

									if ( groupMaterial && groupMaterial.visible ) {

										currentRenderList.push( object, geometry, groupMaterial, groupOrder, _vector3.z, group );

									}

								}

							} else if ( material.visible ) {

								currentRenderList.push( object, geometry, material, groupOrder, _vector3.z, null );

							}

						}

					}

				}

				const children = object.children;

				for ( let i = 0, l = children.length; i < l; i ++ ) {

					projectObject( children[ i ], camera, groupOrder, sortObjects );

				}

			}

			function renderScene( currentRenderList, scene, camera, viewport ) {

				const opaqueObjects = currentRenderList.opaque;
				const transmissiveObjects = currentRenderList.transmissive;
				const transparentObjects = currentRenderList.transparent;

				currentRenderState.setupLightsView( camera );

				if ( _clippingEnabled === true ) clipping.setGlobalState( _this.clippingPlanes, camera );

				if ( transmissiveObjects.length > 0 ) renderTransmissionPass( opaqueObjects, transmissiveObjects, scene, camera );

				if ( viewport ) state.viewport( _currentViewport.copy( viewport ) );

				if ( opaqueObjects.length > 0 ) renderObjects( opaqueObjects, scene, camera );
				if ( transmissiveObjects.length > 0 ) renderObjects( transmissiveObjects, scene, camera );
				if ( transparentObjects.length > 0 ) renderObjects( transparentObjects, scene, camera );

				// Ensure depth buffer writing is enabled so it can be cleared on next render

				state.buffers.depth.setTest( true );
				state.buffers.depth.setMask( true );
				state.buffers.color.setMask( true );

				state.setPolygonOffset( false );

			}

			function renderTransmissionPass( opaqueObjects, transmissiveObjects, scene, camera ) {

				const overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;

				if ( overrideMaterial !== null ) {

					return;

				}

				const isWebGL2 = capabilities.isWebGL2;

				if ( _transmissionRenderTarget === null ) {

					_transmissionRenderTarget = new three_1.WebGLRenderTarget( 1, 1, {
						generateMipmaps: true,
						type: extensions.has( 'EXT_color_buffer_half_float' ) ? three_1.HalfFloatType : three_1.UnsignedByteType,
						minFilter: three_1.LinearMipmapLinearFilter,
						samples: ( isWebGL2 ) ? 4 : 0
					} );

					// debug

					/*
					const geometry = new PlaneGeometry();
					const material = new MeshBasicMaterial( { map: _transmissionRenderTarget.texture } );

					const mesh = new Mesh( geometry, material );
					scene.add( mesh );
					*/

				}

				_this.getDrawingBufferSize( _vector2 );

				if ( isWebGL2 ) {

					_transmissionRenderTarget.setSize( _vector2.x, _vector2.y );

				} else {

					_transmissionRenderTarget.setSize( three_1.floorPowerOfTwo( _vector2.x ), three_1.floorPowerOfTwo( _vector2.y ) );

				}

				//

				const currentRenderTarget = _this.getRenderTarget();
				_this.setRenderTarget( _transmissionRenderTarget );

				_this.getClearColor( _currentClearColor );
				_currentClearAlpha = _this.getClearAlpha();
				if ( _currentClearAlpha < 1 ) _this.setClearColor( 0xffffff, 0.5 );

				_this.clear();

				// Turn off the features which can affect the frag color for opaque objects pass.
				// Otherwise they are applied twice in opaque objects pass and transmission objects pass.
				const currentToneMapping = _this.toneMapping;
				_this.toneMapping = three_1.NoToneMapping;

				renderObjects( opaqueObjects, scene, camera );

				textures.updateMultisampleRenderTarget( _transmissionRenderTarget );
				textures.updateRenderTargetMipmap( _transmissionRenderTarget );

				let renderTargetNeedsUpdate = false;

				for ( let i = 0, l = transmissiveObjects.length; i < l; i ++ ) {

					const renderItem = transmissiveObjects[ i ];

					const object = renderItem.object;
					const geometry = renderItem.geometry;
					const material = renderItem.material;
					const group = renderItem.group;

					if ( material.side === three_1.DoubleSide && object.layers.test( camera.layers ) ) {

						const currentSide = material.side;

						material.side = three_1.BackSide;
						material.needsUpdate = true;

						renderObject( object, scene, camera, geometry, material, group );

						material.side = currentSide;
						material.needsUpdate = true;

						renderTargetNeedsUpdate = true;

					}

				}

				if ( renderTargetNeedsUpdate === true ) {

					textures.updateMultisampleRenderTarget( _transmissionRenderTarget );
					textures.updateRenderTargetMipmap( _transmissionRenderTarget );

				}

				_this.setRenderTarget( currentRenderTarget );

				_this.setClearColor( _currentClearColor, _currentClearAlpha );

				_this.toneMapping = currentToneMapping;

			}

			function renderObjects( renderList, scene, camera ) {

				const overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;

				for ( let i = 0, l = renderList.length; i < l; i ++ ) {

					const renderItem = renderList[ i ];

					const object = renderItem.object;
					const geometry = renderItem.geometry;
					const material = overrideMaterial === null ? renderItem.material : overrideMaterial;
					const group = renderItem.group;

					if ( object.layers.test( camera.layers ) ) {

						renderObject( object, scene, camera, geometry, material, group );

					}

				}

			}

			function renderObject( object, scene, camera, geometry, material, group ) {

				object.onBeforeRender( _this, scene, camera, geometry, material, group );

				object.modelViewMatrix.multiplyMatrices( camera.matrixWorldInverse, object.matrixWorld );
				object.normalMatrix.getNormalMatrix( object.modelViewMatrix );

				material.onBeforeRender( _this, scene, camera, geometry, object, group );

				if ( material.transparent === true && material.side === three_1.DoubleSide && material.forceSinglePass === false ) {

					material.side = three_1.BackSide;
					material.needsUpdate = true;
					_this.renderBufferDirect( camera, scene, geometry, material, object, group );

					material.side = three_1.FrontSide;
					material.needsUpdate = true;
					_this.renderBufferDirect( camera, scene, geometry, material, object, group );

					material.side = three_1.DoubleSide;

				} else {

					_this.renderBufferDirect( camera, scene, geometry, material, object, group );

				}

				object.onAfterRender( _this, scene, camera, geometry, material, group );

			}

			function getProgram( material, scene, object ) {

				if ( scene.isScene !== true ) scene = _emptyScene; // scene could be a Mesh, Line, Points, ...

				const materialProperties = properties.get( material );

				const lights = currentRenderState.state.lights;
				const shadowsArray = currentRenderState.state.shadowsArray;

				const lightsStateVersion = lights.state.version;

				const parameters = programCache.getParameters( material, lights.state, shadowsArray, scene, object );
				const programCacheKey = programCache.getProgramCacheKey( parameters );

				let programs = materialProperties.programs;

				// always update environment and fog - changing these trigger an getProgram call, but it's possible that the program doesn't change

				materialProperties.environment = material.isMeshStandardMaterial ? scene.environment : null;
				materialProperties.fog = scene.fog;
				materialProperties.envMap = ( material.isMeshStandardMaterial ? cubeuvmaps : cubemaps ).get( material.envMap || materialProperties.environment );

				if ( programs === undefined ) {

					// new material

					material.addEventListener( 'dispose', onMaterialDispose );

					programs = new Map();
					materialProperties.programs = programs;

				}

				let program = programs.get( programCacheKey );

				if ( program !== undefined ) {

					// early out if program and light state is identical

					if ( materialProperties.currentProgram === program && materialProperties.lightsStateVersion === lightsStateVersion ) {

						updateCommonMaterialProperties( material, parameters );

						return program;

					}

				} else {

					parameters.uniforms = programCache.getUniforms( material );

					material.onBuild( object, parameters, _this );

					material.onBeforeCompile( parameters, _this );

					program = programCache.acquireProgram( parameters, programCacheKey );
					programs.set( programCacheKey, program );

					materialProperties.uniforms = parameters.uniforms;

				}

				const uniforms = materialProperties.uniforms;

				if ( ( ! material.isShaderMaterial && ! material.isRawShaderMaterial ) || material.clipping === true ) {

					uniforms.clippingPlanes = clipping.uniform;

				}

				updateCommonMaterialProperties( material, parameters );

				// store the light setup it was created for

				materialProperties.needsLights = materialNeedsLights( material );
				materialProperties.lightsStateVersion = lightsStateVersion;

				if ( materialProperties.needsLights ) {

					// wire up the material to this renderer's lighting state

					uniforms.ambientLightColor.value = lights.state.ambient;
					uniforms.lightProbe.value = lights.state.probe;
					uniforms.directionalLights.value = lights.state.directional;
					uniforms.directionalLightShadows.value = lights.state.directionalShadow;
					uniforms.spotLights.value = lights.state.spot;
					uniforms.spotLightShadows.value = lights.state.spotShadow;
					uniforms.rectAreaLights.value = lights.state.rectArea;
					uniforms.ltc_1.value = lights.state.rectAreaLTC1;
					uniforms.ltc_2.value = lights.state.rectAreaLTC2;
					uniforms.pointLights.value = lights.state.point;
					uniforms.pointLightShadows.value = lights.state.pointShadow;
					uniforms.hemisphereLights.value = lights.state.hemi;

					uniforms.directionalShadowMap.value = lights.state.directionalShadowMap;
					uniforms.directionalShadowMatrix.value = lights.state.directionalShadowMatrix;
					uniforms.spotShadowMap.value = lights.state.spotShadowMap;
					uniforms.spotLightMatrix.value = lights.state.spotLightMatrix;
					uniforms.spotLightMap.value = lights.state.spotLightMap;
					uniforms.pointShadowMap.value = lights.state.pointShadowMap;
					uniforms.pointShadowMatrix.value = lights.state.pointShadowMatrix;
					// TODO (abelnation): add area lights shadow info to uniforms

				}

				materialProperties.currentProgram = program;
				materialProperties.uniformsList = null;

				return program;

			}

			function getUniformList( materialProperties ) {

				if ( materialProperties.uniformsList === null ) {

					const progUniforms = materialProperties.currentProgram.getUniforms();
					materialProperties.uniformsList = three_3.WebGLUniforms.seqWithValue( progUniforms.seq, materialProperties.uniforms );

				}

				return materialProperties.uniformsList;

			}

			function updateCommonMaterialProperties( material, parameters ) {

				const materialProperties = properties.get( material );

				materialProperties.outputColorSpace = parameters.outputColorSpace;
				materialProperties.batching = parameters.batching;
				materialProperties.instancing = parameters.instancing;
				materialProperties.instancingColor = parameters.instancingColor;
				materialProperties.skinning = parameters.skinning;
				materialProperties.morphTargets = parameters.morphTargets;
				materialProperties.morphNormals = parameters.morphNormals;
				materialProperties.morphColors = parameters.morphColors;
				materialProperties.morphTargetsCount = parameters.morphTargetsCount;
				materialProperties.numClippingPlanes = parameters.numClippingPlanes;
				materialProperties.numIntersection = parameters.numClipIntersection;
				materialProperties.vertexAlphas = parameters.vertexAlphas;
				materialProperties.vertexTangents = parameters.vertexTangents;
				materialProperties.toneMapping = parameters.toneMapping;

			}

			function setProgram( camera, scene, geometry, material, object ) {

				if ( scene.isScene !== true ) scene = _emptyScene; // scene could be a Mesh, Line, Points, ...

				textures.resetTextureUnits();

				const fog = scene.fog;
				const environment = material.isMeshStandardMaterial ? scene.environment : null;
				const colorSpace = ( _currentRenderTarget === null ) ? _this.outputColorSpace : ( _currentRenderTarget.isXRRenderTarget === true ? _currentRenderTarget.texture.colorSpace : three_1.LinearSRGBColorSpace );
				const envMap = ( material.isMeshStandardMaterial ? cubeuvmaps : cubemaps ).get( material.envMap || environment );
				const vertexAlphas = material.vertexColors === true && !! geometry.attributes.color && geometry.attributes.color.itemSize === 4;
				const vertexTangents = !! geometry.attributes.tangent && ( !! material.normalMap || material.anisotropy > 0 );
				const morphTargets = !! geometry.morphAttributes.position;
				const morphNormals = !! geometry.morphAttributes.normal;
				const morphColors = !! geometry.morphAttributes.color;

				let toneMapping = three_1.NoToneMapping;

				if ( material.toneMapped ) {

					if ( _currentRenderTarget === null || _currentRenderTarget.isXRRenderTarget === true ) {

						toneMapping = _this.toneMapping;

					}

				}

				const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
				const morphTargetsCount = ( morphAttribute !== undefined ) ? morphAttribute.length : 0;

				const materialProperties = properties.get( material );
				const lights = currentRenderState.state.lights;

				if ( _clippingEnabled === true ) {

					if ( _localClippingEnabled === true || camera !== _currentCamera ) {

						const useCache =
							camera === _currentCamera &&
							material.id === _currentMaterialId;

						// we might want to call this function with some ClippingGroup
						// object instead of the material, once it becomes feasible
						// (#8465, #8379)
						clipping.setState( material, camera, useCache );

					}

				}

				//

				let needsProgramChange = false;

				if ( material.version === materialProperties.__version ) {

					if ( materialProperties.needsLights && ( materialProperties.lightsStateVersion !== lights.state.version ) ) {

						needsProgramChange = true;

					} else if ( materialProperties.outputColorSpace !== colorSpace ) {

						needsProgramChange = true;

					} else if ( object.isBatchedMesh && materialProperties.batching === false ) {

						needsProgramChange = true;

					} else if ( ! object.isBatchedMesh && materialProperties.batching === true ) {

						needsProgramChange = true;

					} else if ( object.isInstancedMesh && materialProperties.instancing === false ) {

						needsProgramChange = true;

					} else if ( ! object.isInstancedMesh && materialProperties.instancing === true ) {

						needsProgramChange = true;

					} else if ( object.isSkinnedMesh && materialProperties.skinning === false ) {

						needsProgramChange = true;

					} else if ( ! object.isSkinnedMesh && materialProperties.skinning === true ) {

						needsProgramChange = true;

					} else if ( object.isInstancedMesh && materialProperties.instancingColor === true && object.instanceColor === null ) {

						needsProgramChange = true;

					} else if ( object.isInstancedMesh && materialProperties.instancingColor === false && object.instanceColor !== null ) {

						needsProgramChange = true;

					} else if ( materialProperties.envMap !== envMap ) {

						needsProgramChange = true;

					} else if ( material.fog === true && materialProperties.fog !== fog ) {

						needsProgramChange = true;

					} else if ( materialProperties.numClippingPlanes !== undefined &&
						( materialProperties.numClippingPlanes !== clipping.numPlanes ||
						materialProperties.numIntersection !== clipping.numIntersection ) ) {

						needsProgramChange = true;

					} else if ( materialProperties.vertexAlphas !== vertexAlphas ) {

						needsProgramChange = true;

					} else if ( materialProperties.vertexTangents !== vertexTangents ) {

						needsProgramChange = true;

					} else if ( materialProperties.morphTargets !== morphTargets ) {

						needsProgramChange = true;

					} else if ( materialProperties.morphNormals !== morphNormals ) {

						needsProgramChange = true;

					} else if ( materialProperties.morphColors !== morphColors ) {

						needsProgramChange = true;

					} else if ( materialProperties.toneMapping !== toneMapping ) {

						needsProgramChange = true;

					} else if ( capabilities.isWebGL2 === true && materialProperties.morphTargetsCount !== morphTargetsCount ) {

						needsProgramChange = true;

					}

				} else {

					needsProgramChange = true;
					materialProperties.__version = material.version;

				}

				//

				let program = materialProperties.currentProgram;

				if ( needsProgramChange === true ) {

					program = getProgram( material, scene, object );

				}

				let refreshProgram = false;
				let refreshMaterial = false;
				let refreshLights = false;

				const p_uniforms = program.getUniforms(),
					m_uniforms = materialProperties.uniforms;

				if ( state.useProgram( program.program ) ) {

					refreshProgram = true;
					refreshMaterial = true;
					refreshLights = true;

				}

				if ( material.id !== _currentMaterialId ) {

					_currentMaterialId = material.id;

					refreshMaterial = true;

				}

				if ( refreshProgram || _currentCamera !== camera ) {

					// common camera uniforms

					p_uniforms.setValue( _gl, 'projectionMatrix', camera.projectionMatrix );
					p_uniforms.setValue( _gl, 'viewMatrix', camera.matrixWorldInverse );

					const uCamPos = p_uniforms.map.cameraPosition;

					if ( uCamPos !== undefined ) {

						uCamPos.setValue( _gl, _vector3.setFromMatrixPosition( camera.matrixWorld ) );

					}

					if ( capabilities.logarithmicDepthBuffer ) {

						p_uniforms.setValue( _gl, 'logDepthBufFC',
							2.0 / ( Math.log( camera.far + 1.0 ) / Math.LN2 ) );

					}

					// consider moving isOrthographic to UniformLib and WebGLMaterials, see https://github.com/mrdoob/three.js/pull/26467#issuecomment-1645185067

					if ( material.isMeshPhongMaterial ||
						material.isMeshToonMaterial ||
						material.isMeshLambertMaterial ||
						material.isMeshBasicMaterial ||
						material.isMeshStandardMaterial ||
						material.isShaderMaterial ) {

						p_uniforms.setValue( _gl, 'isOrthographic', camera.isOrthographicCamera === true );

					}

					if ( _currentCamera !== camera ) {

						_currentCamera = camera;

						// lighting uniforms depend on the camera so enforce an update
						// now, in case this material supports lights - or later, when
						// the next material that does gets activated:

						refreshMaterial = true;		// set to true on material change
						refreshLights = true;		// remains set until update done

					}

				}

				// skinning and morph target uniforms must be set even if material didn't change
				// auto-setting of texture unit for bone and morph texture must go before other textures
				// otherwise textures used for skinning and morphing can take over texture units reserved for other material textures

				if ( object.isSkinnedMesh ) {

					p_uniforms.setOptional( _gl, object, 'bindMatrix' );
					p_uniforms.setOptional( _gl, object, 'bindMatrixInverse' );

					const skeleton = object.skeleton;

					if ( skeleton ) {

						if ( capabilities.floatVertexTextures ) {

							if ( skeleton.boneTexture === null ) skeleton.computeBoneTexture();

							p_uniforms.setValue( _gl, 'boneTexture', skeleton.boneTexture, textures );

						} else {

							console.warn( 'THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required.' );

						}

					}

				}

				if ( object.isBatchedMesh ) {

					p_uniforms.setOptional( _gl, object, 'batchingTexture' );
					p_uniforms.setValue( _gl, 'batchingTexture', object._matricesTexture, textures );

				}

				const morphAttributes = geometry.morphAttributes;

				if ( morphAttributes.position !== undefined || morphAttributes.normal !== undefined || ( morphAttributes.color !== undefined && capabilities.isWebGL2 === true ) ) {

					morphtargets.update( object, geometry, program );

				}

				if ( refreshMaterial || materialProperties.receiveShadow !== object.receiveShadow ) {

					materialProperties.receiveShadow = object.receiveShadow;
					p_uniforms.setValue( _gl, 'receiveShadow', object.receiveShadow );

				}

				// https://github.com/mrdoob/three.js/pull/24467#issuecomment-1209031512

				if ( material.isMeshGouraudMaterial && material.envMap !== null ) {

					m_uniforms.envMap.value = envMap;

					m_uniforms.flipEnvMap.value = ( envMap.isCubeTexture && envMap.isRenderTargetTexture === false ) ? -1 : 1;

				}

				if ( refreshMaterial ) {

					p_uniforms.setValue( _gl, 'toneMappingExposure', _this.toneMappingExposure );

					if ( materialProperties.needsLights ) {

						// the current material requires lighting info

						// note: all lighting uniforms are always set correctly
						// they simply reference the renderer's state for their
						// values
						//
						// use the current material's .needsUpdate flags to set
						// the GL state when required

						markUniformsLightsNeedsUpdate( m_uniforms, refreshLights );

					}

					// refresh uniforms common to several materials

					if ( fog && material.fog === true ) {

						materials.refreshFogUniforms( m_uniforms, fog );

					}

					materials.refreshMaterialUniforms( m_uniforms, material, _pixelRatio, _height, _transmissionRenderTarget );

					three_3.WebGLUniforms.upload( _gl, getUniformList( materialProperties ), m_uniforms, textures );

				}

				if ( material.isShaderMaterial && material.uniformsNeedUpdate === true ) {

					three_3.WebGLUniforms.upload( _gl, getUniformList( materialProperties ), m_uniforms, textures );
					material.uniformsNeedUpdate = false;

				}

				if ( material.isSpriteMaterial ) {

					p_uniforms.setValue( _gl, 'center', object.center );

				}

				// common matrices

				p_uniforms.setValue( _gl, 'modelViewMatrix', object.modelViewMatrix );
				p_uniforms.setValue( _gl, 'normalMatrix', object.normalMatrix );
				p_uniforms.setValue( _gl, 'modelMatrix', object.matrixWorld );

				// UBOs

				if ( material.isShaderMaterial || material.isRawShaderMaterial ) {

					const groups = material.uniformsGroups;

					for ( let i = 0, l = groups.length; i < l; i ++ ) {

						if ( capabilities.isWebGL2 ) {

							const group = groups[ i ];

							uniformsGroups.update( group, program );
							uniformsGroups.bind( group, program );

						} else {

							console.warn( 'THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.' );

						}

					}

				}

				return program;

			}

			// If uniforms are marked as clean, they don't need to be loaded to the GPU.

			function markUniformsLightsNeedsUpdate( uniforms, value ) {

				uniforms.ambientLightColor.needsUpdate = value;
				uniforms.lightProbe.needsUpdate = value;

				uniforms.directionalLights.needsUpdate = value;
				uniforms.directionalLightShadows.needsUpdate = value;
				uniforms.pointLights.needsUpdate = value;
				uniforms.pointLightShadows.needsUpdate = value;
				uniforms.spotLights.needsUpdate = value;
				uniforms.spotLightShadows.needsUpdate = value;
				uniforms.rectAreaLights.needsUpdate = value;
				uniforms.hemisphereLights.needsUpdate = value;

			}

			function materialNeedsLights( material ) {

				return material.isMeshLambertMaterial || material.isMeshToonMaterial || material.isMeshPhongMaterial ||
					material.isMeshStandardMaterial || material.isShadowMaterial ||
					( material.isShaderMaterial && material.lights === true );

			}

			this.getActiveCubeFace = function () {

				return _currentActiveCubeFace;

			};

			this.getActiveMipmapLevel = function () {

				return _currentActiveMipmapLevel;

			};

			this.getRenderTarget = function () {

				return _currentRenderTarget;

			};

			this.setRenderTargetTextures = function ( renderTarget, colorTexture, depthTexture ) {

				properties.get( renderTarget.texture ).__webglTexture = colorTexture;
				properties.get( renderTarget.depthTexture ).__webglTexture = depthTexture;

				const renderTargetProperties = properties.get( renderTarget );
				renderTargetProperties.__hasExternalTextures = true;

				if ( renderTargetProperties.__hasExternalTextures ) {

					renderTargetProperties.__autoAllocateDepthBuffer = depthTexture === undefined;

					if ( ! renderTargetProperties.__autoAllocateDepthBuffer ) {

						// The multisample_render_to_texture extension doesn't work properly if there
						// are midframe flushes and an external depth buffer. Disable use of the extension.
						if ( extensions.has( 'WEBGL_multisampled_render_to_texture' ) === true ) {

							console.warn( 'THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided' );
							renderTargetProperties.__useRenderToTexture = false;

						}

					}

				}

			};

			this.setRenderTargetFramebuffer = function ( renderTarget, defaultFramebuffer ) {

				const renderTargetProperties = properties.get( renderTarget );
				renderTargetProperties.__webglFramebuffer = defaultFramebuffer;
				renderTargetProperties.__useDefaultFramebuffer = defaultFramebuffer === undefined;

			};

			this.setRenderTarget = function ( renderTarget, activeCubeFace = 0, activeMipmapLevel = 0 ) {

				_currentRenderTarget = renderTarget;
				_currentActiveCubeFace = activeCubeFace;
				_currentActiveMipmapLevel = activeMipmapLevel;

				let useDefaultFramebuffer = true;
				let framebuffer = null;
				let isCube = false;
				let isRenderTarget3D = false;

				if ( renderTarget ) {

					const renderTargetProperties = properties.get( renderTarget );

					if ( renderTargetProperties.__useDefaultFramebuffer !== undefined ) {

						// We need to make sure to rebind the framebuffer.
						state.bindFramebuffer( _gl.FRAMEBUFFER, null );
						useDefaultFramebuffer = false;

					} else if ( renderTargetProperties.__webglFramebuffer === undefined ) {

						textures.setupRenderTarget( renderTarget );

					} else if ( renderTargetProperties.__hasExternalTextures ) {

						// Color and depth texture must be rebound in order for the swapchain to update.
						textures.rebindTextures( renderTarget, properties.get( renderTarget.texture ).__webglTexture, properties.get( renderTarget.depthTexture ).__webglTexture );

					}

					const texture = renderTarget.texture;

					if ( texture.isData3DTexture || texture.isDataArrayTexture || texture.isCompressedArrayTexture ) {

						isRenderTarget3D = true;

					}

					const __webglFramebuffer = properties.get( renderTarget ).__webglFramebuffer;

					if ( renderTarget.isWebGLCubeRenderTarget ) {

						if ( Array.isArray( __webglFramebuffer[ activeCubeFace ] ) ) {

							framebuffer = __webglFramebuffer[ activeCubeFace ][ activeMipmapLevel ];

						} else {

							framebuffer = __webglFramebuffer[ activeCubeFace ];

						}

						isCube = true;

					} else if ( ( capabilities.isWebGL2 && renderTarget.samples > 0 ) && textures.useMultisampledRTT( renderTarget ) === false ) {

						framebuffer = properties.get( renderTarget ).__webglMultisampledFramebuffer;

					} else {

						if ( Array.isArray( __webglFramebuffer ) ) {

							framebuffer = __webglFramebuffer[ activeMipmapLevel ];

						} else {

							framebuffer = __webglFramebuffer;

						}

					}

					_currentViewport.copy( renderTarget.viewport );
					_currentScissor.copy( renderTarget.scissor );
					_currentScissorTest = renderTarget.scissorTest;

				} else {

					_currentViewport.copy( _viewport ).multiplyScalar( _pixelRatio ).floor();
					_currentScissor.copy( _scissor ).multiplyScalar( _pixelRatio ).floor();
					_currentScissorTest = _scissorTest;

				}

				const framebufferBound = state.bindFramebuffer( _gl.FRAMEBUFFER, framebuffer );

				if ( framebufferBound && capabilities.drawBuffers && useDefaultFramebuffer ) {

					state.drawBuffers( renderTarget, framebuffer );

				}

				state.viewport( _currentViewport );
				state.scissor( _currentScissor );
				state.setScissorTest( _currentScissorTest );

				if ( isCube ) {

					const textureProperties = properties.get( renderTarget.texture );
					_gl.framebufferTexture2D( _gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + activeCubeFace, textureProperties.__webglTexture, activeMipmapLevel );

				} else if ( isRenderTarget3D ) {

					const textureProperties = properties.get( renderTarget.texture );
					const layer = activeCubeFace || 0;
					_gl.framebufferTextureLayer( _gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, textureProperties.__webglTexture, activeMipmapLevel || 0, layer );

				}

				_currentMaterialId = -1; // reset current material to ensure correct uniform bindings

			};

			this.readRenderTargetPixels = function ( renderTarget, x, y, width, height, buffer, activeCubeFaceIndex ) {

				if ( ! ( renderTarget && renderTarget.isWebGLRenderTarget ) ) {

					console.error( 'THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.' );
					return;

				}

				let framebuffer = properties.get( renderTarget ).__webglFramebuffer;

				if ( renderTarget.isWebGLCubeRenderTarget && activeCubeFaceIndex !== undefined ) {

					framebuffer = framebuffer[ activeCubeFaceIndex ];

				}

				if ( framebuffer ) {

					state.bindFramebuffer( _gl.FRAMEBUFFER, framebuffer );

					try {

						const texture = renderTarget.texture;
						const textureFormat = texture.format;
						const textureType = texture.type;

						if ( textureFormat !== three_1.RGBAFormat && utils.convert( textureFormat ) !== _gl.getParameter( _gl.IMPLEMENTATION_COLOR_READ_FORMAT ) ) {

							console.error( 'THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.' );
							return;

						}

						const halfFloatSupportedByExt = ( textureType === three_1.HalfFloatType ) && ( extensions.has( 'EXT_color_buffer_half_float' ) || ( capabilities.isWebGL2 && extensions.has( 'EXT_color_buffer_float' ) ) );

						if ( textureType !== three_1.UnsignedByteType && utils.convert( textureType ) !== _gl.getParameter( _gl.IMPLEMENTATION_COLOR_READ_TYPE ) && // Edge and Chrome Mac < 52 (#9513)
							! ( textureType === three_1.FloatType && ( capabilities.isWebGL2 || extensions.has( 'OES_texture_float' ) || extensions.has( 'WEBGL_color_buffer_float' ) ) ) && // Chrome Mac >= 52 and Firefox
							! halfFloatSupportedByExt ) {

							console.error( 'THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.' );
							return;

						}

						// the following if statement ensures valid read requests (no out-of-bounds pixels, see #8604)

						if ( ( x >= 0 && x <= ( renderTarget.width - width ) ) && ( y >= 0 && y <= ( renderTarget.height - height ) ) ) {

							_gl.readPixels( x, y, width, height, utils.convert( textureFormat ), utils.convert( textureType ), buffer );

						}

					} finally {

						// restore framebuffer of current render target if necessary

						const framebuffer = ( _currentRenderTarget !== null ) ? properties.get( _currentRenderTarget ).__webglFramebuffer : null;
						state.bindFramebuffer( _gl.FRAMEBUFFER, framebuffer );

					}

				}

			};

			this.copyFramebufferToTexture = function ( position, texture, level = 0 ) {

				const levelScale = Math.pow( 2, - level );
				const width = Math.floor( texture.image.width * levelScale );
				const height = Math.floor( texture.image.height * levelScale );

				textures.setTexture2D( texture, 0 );

				_gl.copyTexSubImage2D( _gl.TEXTURE_2D, level, 0, 0, position.x, position.y, width, height );

				state.unbindTexture();

			};

			this.copyTextureToTexture = function ( position, srcTexture, dstTexture, level = 0 ) {

				const width = srcTexture.image.width;
				const height = srcTexture.image.height;
				const glFormat = utils.convert( dstTexture.format );
				const glType = utils.convert( dstTexture.type );

				textures.setTexture2D( dstTexture, 0 );

				// As another texture upload may have changed pixelStorei
				// parameters, make sure they are correct for the dstTexture
				_gl.pixelStorei( _gl.UNPACK_FLIP_Y_WEBGL, dstTexture.flipY );
				_gl.pixelStorei( _gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, dstTexture.premultiplyAlpha );
				_gl.pixelStorei( _gl.UNPACK_ALIGNMENT, dstTexture.unpackAlignment );

				if ( srcTexture.isDataTexture ) {

					_gl.texSubImage2D( _gl.TEXTURE_2D, level, position.x, position.y, width, height, glFormat, glType, srcTexture.image.data );

				} else {

					if ( srcTexture.isCompressedTexture ) {

						_gl.compressedTexSubImage2D( _gl.TEXTURE_2D, level, position.x, position.y, srcTexture.mipmaps[ 0 ].width, srcTexture.mipmaps[ 0 ].height, glFormat, srcTexture.mipmaps[ 0 ].data );

					} else {

						_gl.texSubImage2D( _gl.TEXTURE_2D, level, position.x, position.y, glFormat, glType, srcTexture.image );

					}

				}

				// Generate mipmaps only when copying level 0
				if ( level === 0 && dstTexture.generateMipmaps ) _gl.generateMipmap( _gl.TEXTURE_2D );

				state.unbindTexture();

			};

			this.copyTextureToTexture3D = function ( sourceBox, position, srcTexture, dstTexture, level = 0 ) {

				if ( _this.isWebGL1Renderer ) {

					console.warn( 'THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.' );
					return;

				}

				const width = sourceBox.max.x - sourceBox.min.x + 1;
				const height = sourceBox.max.y - sourceBox.min.y + 1;
				const depth = sourceBox.max.z - sourceBox.min.z + 1;
				const glFormat = utils.convert( dstTexture.format );
				const glType = utils.convert( dstTexture.type );
				let glTarget;

				if ( dstTexture.isData3DTexture ) {

					textures.setTexture3D( dstTexture, 0 );
					glTarget = _gl.TEXTURE_3D;

				} else if ( dstTexture.isDataArrayTexture || dstTexture.isCompressedArrayTexture ) {

					textures.setTexture2DArray( dstTexture, 0 );
					glTarget = _gl.TEXTURE_2D_ARRAY;

				} else {

					console.warn( 'THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.' );
					return;

				}

				_gl.pixelStorei( _gl.UNPACK_FLIP_Y_WEBGL, dstTexture.flipY );
				_gl.pixelStorei( _gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, dstTexture.premultiplyAlpha );
				_gl.pixelStorei( _gl.UNPACK_ALIGNMENT, dstTexture.unpackAlignment );

				const unpackRowLen = _gl.getParameter( _gl.UNPACK_ROW_LENGTH );
				const unpackImageHeight = _gl.getParameter( _gl.UNPACK_IMAGE_HEIGHT );
				const unpackSkipPixels = _gl.getParameter( _gl.UNPACK_SKIP_PIXELS );
				const unpackSkipRows = _gl.getParameter( _gl.UNPACK_SKIP_ROWS );
				const unpackSkipImages = _gl.getParameter( _gl.UNPACK_SKIP_IMAGES );

				const image = srcTexture.isCompressedTexture ? srcTexture.mipmaps[ level ] : srcTexture.image;

				_gl.pixelStorei( _gl.UNPACK_ROW_LENGTH, image.width );
				_gl.pixelStorei( _gl.UNPACK_IMAGE_HEIGHT, image.height );
				_gl.pixelStorei( _gl.UNPACK_SKIP_PIXELS, sourceBox.min.x );
				_gl.pixelStorei( _gl.UNPACK_SKIP_ROWS, sourceBox.min.y );
				_gl.pixelStorei( _gl.UNPACK_SKIP_IMAGES, sourceBox.min.z );

				if ( srcTexture.isDataTexture || srcTexture.isData3DTexture ) {

					_gl.texSubImage3D( glTarget, level, position.x, position.y, position.z, width, height, depth, glFormat, glType, image.data );

				} else {

					if ( srcTexture.isCompressedArrayTexture ) {

						console.warn( 'THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture.' );
						_gl.compressedTexSubImage3D( glTarget, level, position.x, position.y, position.z, width, height, depth, glFormat, image.data );

					} else {

						_gl.texSubImage3D( glTarget, level, position.x, position.y, position.z, width, height, depth, glFormat, glType, image );

					}

				}

				_gl.pixelStorei( _gl.UNPACK_ROW_LENGTH, unpackRowLen );
				_gl.pixelStorei( _gl.UNPACK_IMAGE_HEIGHT, unpackImageHeight );
				_gl.pixelStorei( _gl.UNPACK_SKIP_PIXELS, unpackSkipPixels );
				_gl.pixelStorei( _gl.UNPACK_SKIP_ROWS, unpackSkipRows );
				_gl.pixelStorei( _gl.UNPACK_SKIP_IMAGES, unpackSkipImages );

				// Generate mipmaps only when copying level 0
				if ( level === 0 && dstTexture.generateMipmaps ) _gl.generateMipmap( glTarget );

				state.unbindTexture();

			};

			this.initTexture = function ( texture ) {

				if ( texture.isCubeTexture ) {

					textures.setTextureCube( texture, 0 );

				} else if ( texture.isData3DTexture ) {

					textures.setTexture3D( texture, 0 );

				} else if ( texture.isDataArrayTexture || texture.isCompressedArrayTexture ) {

					textures.setTexture2DArray( texture, 0 );

				} else {

					textures.setTexture2D( texture, 0 );

				}

				state.unbindTexture();

			};

			this.resetState = function () {

				_currentActiveCubeFace = 0;
				_currentActiveMipmapLevel = 0;
				_currentRenderTarget = null;

				state.reset();
				bindingStates.reset();

			};

			if ( typeof __THREE_DEVTOOLS__ !== 'undefined' ) {

				__THREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'observe', { detail: this } ) );

			}

		}

		get coordinateSystem() {

			return three_1.WebGLCoordinateSystem;

		}

		get outputColorSpace() {

			return this._outputColorSpace;

		}

		set outputColorSpace( colorSpace ) {

			this._outputColorSpace = colorSpace;

			const gl = this.getContext();
			gl.drawingBufferColorSpace = colorSpace === three_1.DisplayP3ColorSpace ? 'display-p3' : 'srgb';
			gl.unpackColorSpace = three_1.ColorManagement.workingColorSpace === three_1.LinearDisplayP3ColorSpace ? 'display-p3' : 'srgb';

		}

		get outputEncoding() { // @deprecated, r152

			console.warn( 'THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead.' );
			return this.outputColorSpace === three_1.SRGBColorSpace ? three_1.sRGBEncoding : three_1.LinearEncoding;

		}

		set outputEncoding( encoding ) { // @deprecated, r152

			console.warn( 'THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead.' );
			this.outputColorSpace = encoding === three_1.sRGBEncoding ? three_1.SRGBColorSpace : three_1.LinearSRGBColorSpace;

		}

		get useLegacyLights() { // @deprecated, r155

			console.warn( 'THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733.' );
			return this._useLegacyLights;

		}

		set useLegacyLights( value ) { // @deprecated, r155

			console.warn( 'THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733.' );
			this._useLegacyLights = value;

		}

	}

	class WebGL1Renderer extends WebGLRenderer {}

	WebGL1Renderer.prototype.isWebGL1Renderer = true;

	class FogExp2 {

		constructor( color, density = 0.00025 ) {

			this.isFogExp2 = true;

			this.name = '';

			this.color = new three_1.Color( color );
			this.density = density;

		}

		clone() {

			return new FogExp2( this.color, this.density );

		}

		toJSON( /* meta */ ) {

			return {
				type: 'FogExp2',
				name: this.name,
				color: this.color.getHex(),
				density: this.density
			};

		}

	}

	class Fog {

		constructor( color, near = 1, far = 1000 ) {

			this.isFog = true;

			this.name = '';

			this.color = new three_1.Color( color );

			this.near = near;
			this.far = far;

		}

		clone() {

			return new Fog( this.color, this.near, this.far );

		}

		toJSON( /* meta */ ) {

			return {
				type: 'Fog',
				name: this.name,
				color: this.color.getHex(),
				near: this.near,
				far: this.far
			};

		}

	}

	class Scene extends three_1.Object3D {

		constructor() {

			super();

			this.isScene = true;

			this.type = 'Scene';

			this.background = null;
			this.environment = null;
			this.fog = null;

			this.backgroundBlurriness = 0;
			this.backgroundIntensity = 1;

			this.overrideMaterial = null;

			if ( typeof __THREE_DEVTOOLS__ !== 'undefined' ) {

				__THREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'observe', { detail: this } ) );

			}

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			if ( source.background !== null ) this.background = source.background.clone();
			if ( source.environment !== null ) this.environment = source.environment.clone();
			if ( source.fog !== null ) this.fog = source.fog.clone();

			this.backgroundBlurriness = source.backgroundBlurriness;
			this.backgroundIntensity = source.backgroundIntensity;

			if ( source.overrideMaterial !== null ) this.overrideMaterial = source.overrideMaterial.clone();

			this.matrixAutoUpdate = source.matrixAutoUpdate;

			return this;

		}

		toJSON( meta ) {

			const data = super.toJSON( meta );

			if ( this.fog !== null ) data.object.fog = this.fog.toJSON();
			if ( this.backgroundBlurriness > 0 ) data.object.backgroundBlurriness = this.backgroundBlurriness;
			if ( this.backgroundIntensity !== 1 ) data.object.backgroundIntensity = this.backgroundIntensity;

			return data;

		}

	}

	class InterleavedBuffer {

		constructor( array, stride ) {

			this.isInterleavedBuffer = true;

			this.array = array;
			this.stride = stride;
			this.count = array !== undefined ? array.length / stride : 0;

			this.usage = three_1.StaticDrawUsage;
			this._updateRange = { offset: 0, count: -1 };
			this.updateRanges = [];

			this.version = 0;

			this.uuid = three_1.generateUUID();

		}

		onUploadCallback() {}

		set needsUpdate( value ) {

			if ( value === true ) this.version ++;

		}

		get updateRange() {

			console.warn( 'THREE.InterleavedBuffer: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead.' ); // @deprecated, r159
			return this._updateRange;

		}

		setUsage( value ) {

			this.usage = value;

			return this;

		}

		addUpdateRange( start, count ) {

			this.updateRanges.push( { start, count } );

		}

		clearUpdateRanges() {

			this.updateRanges.length = 0;

		}

		copy( source ) {

			this.array = new source.array.constructor( source.array );
			this.count = source.count;
			this.stride = source.stride;
			this.usage = source.usage;

			return this;

		}

		copyAt( index1, attribute, index2 ) {

			index1 *= this.stride;
			index2 *= attribute.stride;

			for ( let i = 0, l = this.stride; i < l; i ++ ) {

				this.array[ index1 + i ] = attribute.array[ index2 + i ];

			}

			return this;

		}

		set( value, offset = 0 ) {

			this.array.set( value, offset );

			return this;

		}

		clone( data ) {

			if ( data.arrayBuffers === undefined ) {

				data.arrayBuffers = {};

			}

			if ( this.array.buffer._uuid === undefined ) {

				this.array.buffer._uuid = three_1.generateUUID();

			}

			if ( data.arrayBuffers[ this.array.buffer._uuid ] === undefined ) {

				data.arrayBuffers[ this.array.buffer._uuid ] = this.array.slice( 0 ).buffer;

			}

			const array = new this.array.constructor( data.arrayBuffers[ this.array.buffer._uuid ] );

			const ib = new this.constructor( array, this.stride );
			ib.setUsage( this.usage );

			return ib;

		}

		onUpload( callback ) {

			this.onUploadCallback = callback;

			return this;

		}

		toJSON( data ) {

			if ( data.arrayBuffers === undefined ) {

				data.arrayBuffers = {};

			}

			// generate UUID for array buffer if necessary

			if ( this.array.buffer._uuid === undefined ) {

				this.array.buffer._uuid = three_1.generateUUID();

			}

			if ( data.arrayBuffers[ this.array.buffer._uuid ] === undefined ) {

				data.arrayBuffers[ this.array.buffer._uuid ] = Array.from( new Uint32Array( this.array.buffer ) );

			}

			//

			return {
				uuid: this.uuid,
				buffer: this.array.buffer._uuid,
				type: this.array.constructor.name,
				stride: this.stride
			};

		}

	}

	const _vector = /*@__PURE__*/ new three_1.Vector3();

	class InterleavedBufferAttribute {

		constructor( interleavedBuffer, itemSize, offset, normalized = false ) {

			this.isInterleavedBufferAttribute = true;

			this.name = '';

			this.data = interleavedBuffer;
			this.itemSize = itemSize;
			this.offset = offset;

			this.normalized = normalized;

		}

		get count() {

			return this.data.count;

		}

		get array() {

			return this.data.array;

		}

		set needsUpdate( value ) {

			this.data.needsUpdate = value;

		}

		applyMatrix4( m ) {

			for ( let i = 0, l = this.data.count; i < l; i ++ ) {

				_vector.fromBufferAttribute( this, i );

				_vector.applyMatrix4( m );

				this.setXYZ( i, _vector.x, _vector.y, _vector.z );

			}

			return this;

		}

		applyNormalMatrix( m ) {

			for ( let i = 0, l = this.count; i < l; i ++ ) {

				_vector.fromBufferAttribute( this, i );

				_vector.applyNormalMatrix( m );

				this.setXYZ( i, _vector.x, _vector.y, _vector.z );

			}

			return this;

		}

		transformDirection( m ) {

			for ( let i = 0, l = this.count; i < l; i ++ ) {

				_vector.fromBufferAttribute( this, i );

				_vector.transformDirection( m );

				this.setXYZ( i, _vector.x, _vector.y, _vector.z );

			}

			return this;

		}

		setX( index, x ) {

			if ( this.normalized ) x = three_1.normalize( x, this.array );

			this.data.array[ index * this.data.stride + this.offset ] = x;

			return this;

		}

		setY( index, y ) {

			if ( this.normalized ) y = three_1.normalize( y, this.array );

			this.data.array[ index * this.data.stride + this.offset + 1 ] = y;

			return this;

		}

		setZ( index, z ) {

			if ( this.normalized ) z = three_1.normalize( z, this.array );

			this.data.array[ index * this.data.stride + this.offset + 2 ] = z;

			return this;

		}

		setW( index, w ) {

			if ( this.normalized ) w = three_1.normalize( w, this.array );

			this.data.array[ index * this.data.stride + this.offset + 3 ] = w;

			return this;

		}

		getX( index ) {

			let x = this.data.array[ index * this.data.stride + this.offset ];

			if ( this.normalized ) x = three_1.denormalize( x, this.array );

			return x;

		}

		getY( index ) {

			let y = this.data.array[ index * this.data.stride + this.offset + 1 ];

			if ( this.normalized ) y = three_1.denormalize( y, this.array );

			return y;

		}

		getZ( index ) {

			let z = this.data.array[ index * this.data.stride + this.offset + 2 ];

			if ( this.normalized ) z = three_1.denormalize( z, this.array );

			return z;

		}

		getW( index ) {

			let w = this.data.array[ index * this.data.stride + this.offset + 3 ];

			if ( this.normalized ) w = three_1.denormalize( w, this.array );

			return w;

		}

		setXY( index, x, y ) {

			index = index * this.data.stride + this.offset;

			if ( this.normalized ) {

				x = three_1.normalize( x, this.array );
				y = three_1.normalize( y, this.array );

			}

			this.data.array[ index + 0 ] = x;
			this.data.array[ index + 1 ] = y;

			return this;

		}

		setXYZ( index, x, y, z ) {

			index = index * this.data.stride + this.offset;

			if ( this.normalized ) {

				x = three_1.normalize( x, this.array );
				y = three_1.normalize( y, this.array );
				z = three_1.normalize( z, this.array );

			}

			this.data.array[ index + 0 ] = x;
			this.data.array[ index + 1 ] = y;
			this.data.array[ index + 2 ] = z;

			return this;

		}

		setXYZW( index, x, y, z, w ) {

			index = index * this.data.stride + this.offset;

			if ( this.normalized ) {

				x = three_1.normalize( x, this.array );
				y = three_1.normalize( y, this.array );
				z = three_1.normalize( z, this.array );
				w = three_1.normalize( w, this.array );

			}

			this.data.array[ index + 0 ] = x;
			this.data.array[ index + 1 ] = y;
			this.data.array[ index + 2 ] = z;
			this.data.array[ index + 3 ] = w;

			return this;

		}

		clone( data ) {

			if ( data === undefined ) {

				console.log( 'THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.' );

				const array = [];

				for ( let i = 0; i < this.count; i ++ ) {

					const index = i * this.data.stride + this.offset;

					for ( let j = 0; j < this.itemSize; j ++ ) {

						array.push( this.data.array[ index + j ] );

					}

				}

				return new three_1.BufferAttribute( new this.array.constructor( array ), this.itemSize, this.normalized );

			} else {

				if ( data.interleavedBuffers === undefined ) {

					data.interleavedBuffers = {};

				}

				if ( data.interleavedBuffers[ this.data.uuid ] === undefined ) {

					data.interleavedBuffers[ this.data.uuid ] = this.data.clone( data );

				}

				return new InterleavedBufferAttribute( data.interleavedBuffers[ this.data.uuid ], this.itemSize, this.offset, this.normalized );

			}

		}

		toJSON( data ) {

			if ( data === undefined ) {

				console.log( 'THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.' );

				const array = [];

				for ( let i = 0; i < this.count; i ++ ) {

					const index = i * this.data.stride + this.offset;

					for ( let j = 0; j < this.itemSize; j ++ ) {

						array.push( this.data.array[ index + j ] );

					}

				}

				// de-interleave data and save it as an ordinary buffer attribute for now

				return {
					itemSize: this.itemSize,
					type: this.array.constructor.name,
					array: array,
					normalized: this.normalized
				};

			} else {

				// save as true interleaved attribute

				if ( data.interleavedBuffers === undefined ) {

					data.interleavedBuffers = {};

				}

				if ( data.interleavedBuffers[ this.data.uuid ] === undefined ) {

					data.interleavedBuffers[ this.data.uuid ] = this.data.toJSON( data );

				}

				return {
					isInterleavedBufferAttribute: true,
					itemSize: this.itemSize,
					data: this.data.uuid,
					offset: this.offset,
					normalized: this.normalized
				};

			}

		}

	}

	class SpriteMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isSpriteMaterial = true;

			this.type = 'SpriteMaterial';

			this.color = new three_1.Color( 0xffffff );

			this.map = null;

			this.alphaMap = null;

			this.rotation = 0;

			this.sizeAttenuation = true;

			this.transparent = true;

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );

			this.map = source.map;

			this.alphaMap = source.alphaMap;

			this.rotation = source.rotation;

			this.sizeAttenuation = source.sizeAttenuation;

			this.fog = source.fog;

			return this;

		}

	}

	exports.ArrayCamera = ArrayCamera;
	exports.Fog = Fog;
	exports.FogExp2 = FogExp2;
	exports.Group = Group;
	exports.InterleavedBuffer = InterleavedBuffer;
	exports.InterleavedBufferAttribute = InterleavedBufferAttribute;
	exports.Scene = Scene;
	exports.SpriteMaterial = SpriteMaterial;
	exports.WebGL1Renderer = WebGL1Renderer;
	exports.WebGLRenderer = WebGLRenderer;
	exports.WebGLUtils = WebGLUtils;

}));
