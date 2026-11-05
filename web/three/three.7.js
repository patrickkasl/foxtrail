// three.js r160 (https://threejs.org), part "three.7".
// Copyright 2010-2023 three.js authors, MIT License: see the LICENSE file in this folder.
// This is three's own source, bundled without minifying and cut into parts by the Fox Trail workshop
// (tools/make-three.mjs), because the page is opened from disk and each file must stay small enough to read.
// One thing is left out: the glTF reader's WebP and AVIF texture extensions, which the trail does not use.
foxtrailPart('three.7', ['exports', './three.1', './three.2', './three.4', './three.3', './three.5', './three.6'], (function (exports, three_1, three_2, three_4, three_3, three_5, three_6) { 'use strict';

	class ShapePath {

		constructor() {

			this.type = 'ShapePath';

			this.color = new three_1.Color();

			this.subPaths = [];
			this.currentPath = null;

		}

		moveTo( x, y ) {

			this.currentPath = new three_5.Path();
			this.subPaths.push( this.currentPath );
			this.currentPath.moveTo( x, y );

			return this;

		}

		lineTo( x, y ) {

			this.currentPath.lineTo( x, y );

			return this;

		}

		quadraticCurveTo( aCPx, aCPy, aX, aY ) {

			this.currentPath.quadraticCurveTo( aCPx, aCPy, aX, aY );

			return this;

		}

		bezierCurveTo( aCP1x, aCP1y, aCP2x, aCP2y, aX, aY ) {

			this.currentPath.bezierCurveTo( aCP1x, aCP1y, aCP2x, aCP2y, aX, aY );

			return this;

		}

		splineThru( pts ) {

			this.currentPath.splineThru( pts );

			return this;

		}

		toShapes( isCCW ) {

			function toShapesNoHoles( inSubpaths ) {

				const shapes = [];

				for ( let i = 0, l = inSubpaths.length; i < l; i ++ ) {

					const tmpPath = inSubpaths[ i ];

					const tmpShape = new three_5.Shape();
					tmpShape.curves = tmpPath.curves;

					shapes.push( tmpShape );

				}

				return shapes;

			}

			function isPointInsidePolygon( inPt, inPolygon ) {

				const polyLen = inPolygon.length;

				// inPt on polygon contour => immediate success    or
				// toggling of inside/outside at every single! intersection point of an edge
				//  with the horizontal line through inPt, left of inPt
				//  not counting lowerY endpoints of edges and whole edges on that line
				let inside = false;
				for ( let p = polyLen - 1, q = 0; q < polyLen; p = q ++ ) {

					let edgeLowPt = inPolygon[ p ];
					let edgeHighPt = inPolygon[ q ];

					let edgeDx = edgeHighPt.x - edgeLowPt.x;
					let edgeDy = edgeHighPt.y - edgeLowPt.y;

					if ( Math.abs( edgeDy ) > Number.EPSILON ) {

						// not parallel
						if ( edgeDy < 0 ) {

							edgeLowPt = inPolygon[ q ]; edgeDx = - edgeDx;
							edgeHighPt = inPolygon[ p ]; edgeDy = - edgeDy;

						}

						if ( ( inPt.y < edgeLowPt.y ) || ( inPt.y > edgeHighPt.y ) ) 		continue;

						if ( inPt.y === edgeLowPt.y ) {

							if ( inPt.x === edgeLowPt.x )		return	true;		// inPt is on contour ?
							// continue;				// no intersection or edgeLowPt => doesn't count !!!

						} else {

							const perpEdge = edgeDy * ( inPt.x - edgeLowPt.x ) - edgeDx * ( inPt.y - edgeLowPt.y );
							if ( perpEdge === 0 )				return	true;		// inPt is on contour ?
							if ( perpEdge < 0 ) 				continue;
							inside = ! inside;		// true intersection left of inPt

						}

					} else {

						// parallel or collinear
						if ( inPt.y !== edgeLowPt.y ) 		continue;			// parallel
						// edge lies on the same horizontal line as inPt
						if ( ( ( edgeHighPt.x <= inPt.x ) && ( inPt.x <= edgeLowPt.x ) ) ||
							 ( ( edgeLowPt.x <= inPt.x ) && ( inPt.x <= edgeHighPt.x ) ) )		return	true;	// inPt: Point on contour !
						// continue;

					}

				}

				return	inside;

			}

			const isClockWise = three_5.ShapeUtils.isClockWise;

			const subPaths = this.subPaths;
			if ( subPaths.length === 0 ) return [];

			let solid, tmpPath, tmpShape;
			const shapes = [];

			if ( subPaths.length === 1 ) {

				tmpPath = subPaths[ 0 ];
				tmpShape = new three_5.Shape();
				tmpShape.curves = tmpPath.curves;
				shapes.push( tmpShape );
				return shapes;

			}

			let holesFirst = ! isClockWise( subPaths[ 0 ].getPoints() );
			holesFirst = isCCW ? ! holesFirst : holesFirst;

			// console.log("Holes first", holesFirst);

			const betterShapeHoles = [];
			const newShapes = [];
			let newShapeHoles = [];
			let mainIdx = 0;
			let tmpPoints;

			newShapes[ mainIdx ] = undefined;
			newShapeHoles[ mainIdx ] = [];

			for ( let i = 0, l = subPaths.length; i < l; i ++ ) {

				tmpPath = subPaths[ i ];
				tmpPoints = tmpPath.getPoints();
				solid = isClockWise( tmpPoints );
				solid = isCCW ? ! solid : solid;

				if ( solid ) {

					if ( ( ! holesFirst ) && ( newShapes[ mainIdx ] ) )	mainIdx ++;

					newShapes[ mainIdx ] = { s: new three_5.Shape(), p: tmpPoints };
					newShapes[ mainIdx ].s.curves = tmpPath.curves;

					if ( holesFirst )	mainIdx ++;
					newShapeHoles[ mainIdx ] = [];

					//console.log('cw', i);

				} else {

					newShapeHoles[ mainIdx ].push( { h: tmpPath, p: tmpPoints[ 0 ] } );

					//console.log('ccw', i);

				}

			}

			// only Holes? -> probably all Shapes with wrong orientation
			if ( ! newShapes[ 0 ] )	return	toShapesNoHoles( subPaths );


			if ( newShapes.length > 1 ) {

				let ambiguous = false;
				let toChange = 0;

				for ( let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx ++ ) {

					betterShapeHoles[ sIdx ] = [];

				}

				for ( let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx ++ ) {

					const sho = newShapeHoles[ sIdx ];

					for ( let hIdx = 0; hIdx < sho.length; hIdx ++ ) {

						const ho = sho[ hIdx ];
						let hole_unassigned = true;

						for ( let s2Idx = 0; s2Idx < newShapes.length; s2Idx ++ ) {

							if ( isPointInsidePolygon( ho.p, newShapes[ s2Idx ].p ) ) {

								if ( sIdx !== s2Idx )	toChange ++;

								if ( hole_unassigned ) {

									hole_unassigned = false;
									betterShapeHoles[ s2Idx ].push( ho );

								} else {

									ambiguous = true;

								}

							}

						}

						if ( hole_unassigned ) {

							betterShapeHoles[ sIdx ].push( ho );

						}

					}

				}

				if ( toChange > 0 && ambiguous === false ) {

					newShapeHoles = betterShapeHoles;

				}

			}

			let tmpHoles;

			for ( let i = 0, il = newShapes.length; i < il; i ++ ) {

				tmpShape = newShapes[ i ].s;
				shapes.push( tmpShape );
				tmpHoles = newShapeHoles[ i ];

				for ( let j = 0, jl = tmpHoles.length; j < jl; j ++ ) {

					tmpShape.holes.push( tmpHoles[ j ].h );

				}

			}

			//console.log("shape", shapes);

			return shapes;

		}

	}

	if ( typeof __THREE_DEVTOOLS__ !== 'undefined' ) {

		__THREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'register', { detail: {
			revision: three_1.REVISION,
		} } ) );

	}

	if ( typeof window !== 'undefined' ) {

		if ( window.__THREE__ ) {

			console.warn( 'WARNING: Multiple instances of Three.js being imported.' );

		} else {

			window.__THREE__ = three_1.REVISION;

		}

	}

	const THREE = /*#__PURE__*/Object.freeze({
		__proto__: null,
		ACESFilmicToneMapping: three_1.ACESFilmicToneMapping,
		AddEquation: three_1.AddEquation,
		AddOperation: three_1.AddOperation,
		AdditiveAnimationBlendMode: three_1.AdditiveAnimationBlendMode,
		AdditiveBlending: three_1.AdditiveBlending,
		AgXToneMapping: three_1.AgXToneMapping,
		AlphaFormat: three_1.AlphaFormat,
		AlwaysCompare: three_1.AlwaysCompare,
		AlwaysDepth: three_1.AlwaysDepth,
		AlwaysStencilFunc: three_1.AlwaysStencilFunc,
		AmbientLight: three_6.AmbientLight,
		AnimationAction: three_6.AnimationAction,
		AnimationClip: three_6.AnimationClip,
		AnimationLoader: three_6.AnimationLoader,
		AnimationMixer: three_6.AnimationMixer,
		AnimationObjectGroup: three_6.AnimationObjectGroup,
		AnimationUtils: three_5.AnimationUtils,
		ArcCurve: three_5.ArcCurve,
		ArrayCamera: three_4.ArrayCamera,
		ArrowHelper: three_6.ArrowHelper,
		AttachedBindMode: three_1.AttachedBindMode,
		Audio: three_6.Audio,
		AudioAnalyser: three_6.AudioAnalyser,
		AudioContext: three_6.AudioContext,
		AudioListener: three_6.AudioListener,
		AudioLoader: three_6.AudioLoader,
		AxesHelper: three_6.AxesHelper,
		BackSide: three_1.BackSide,
		BasicDepthPacking: three_1.BasicDepthPacking,
		BasicShadowMap: three_1.BasicShadowMap,
		BatchedMesh: three_5.BatchedMesh,
		Bone: three_5.Bone,
		BooleanKeyframeTrack: three_6.BooleanKeyframeTrack,
		Box2: three_6.Box2,
		Box3: three_1.Box3,
		Box3Helper: three_6.Box3Helper,
		BoxGeometry: three_2.BoxGeometry,
		BoxHelper: three_6.BoxHelper,
		BufferAttribute: three_1.BufferAttribute,
		BufferGeometry: three_2.BufferGeometry,
		BufferGeometryLoader: three_6.BufferGeometryLoader,
		ByteType: three_1.ByteType,
		Cache: three_6.Cache,
		Camera: three_2.Camera,
		CameraHelper: three_6.CameraHelper,
		CanvasTexture: three_5.CanvasTexture,
		CapsuleGeometry: three_5.CapsuleGeometry,
		CatmullRomCurve3: three_5.CatmullRomCurve3,
		CineonToneMapping: three_1.CineonToneMapping,
		CircleGeometry: three_5.CircleGeometry,
		ClampToEdgeWrapping: three_1.ClampToEdgeWrapping,
		Clock: three_6.Clock,
		Color: three_1.Color,
		ColorKeyframeTrack: three_6.ColorKeyframeTrack,
		ColorManagement: three_1.ColorManagement,
		CompressedArrayTexture: three_5.CompressedArrayTexture,
		CompressedCubeTexture: three_5.CompressedCubeTexture,
		CompressedTexture: three_5.CompressedTexture,
		CompressedTextureLoader: three_6.CompressedTextureLoader,
		ConeGeometry: three_5.ConeGeometry,
		ConstantAlphaFactor: three_1.ConstantAlphaFactor,
		ConstantColorFactor: three_1.ConstantColorFactor,
		CubeCamera: three_2.CubeCamera,
		CubeReflectionMapping: three_1.CubeReflectionMapping,
		CubeRefractionMapping: three_1.CubeRefractionMapping,
		CubeTexture: three_2.CubeTexture,
		CubeTextureLoader: three_6.CubeTextureLoader,
		CubeUVReflectionMapping: three_1.CubeUVReflectionMapping,
		CubicBezierCurve: three_5.CubicBezierCurve,
		CubicBezierCurve3: three_5.CubicBezierCurve3,
		CubicInterpolant: three_5.CubicInterpolant,
		CullFaceBack: three_1.CullFaceBack,
		CullFaceFront: three_1.CullFaceFront,
		CullFaceFrontBack: three_1.CullFaceFrontBack,
		CullFaceNone: three_1.CullFaceNone,
		Curve: three_5.Curve,
		CurvePath: three_5.CurvePath,
		CustomBlending: three_1.CustomBlending,
		CustomToneMapping: three_1.CustomToneMapping,
		CylinderGeometry: three_5.CylinderGeometry,
		Cylindrical: three_6.Cylindrical,
		Data3DTexture: three_1.Data3DTexture,
		DataArrayTexture: three_1.DataArrayTexture,
		DataTexture: three_5.DataTexture,
		DataTextureLoader: three_6.DataTextureLoader,
		DataUtils: three_1.DataUtils,
		DecrementStencilOp: three_1.DecrementStencilOp,
		DecrementWrapStencilOp: three_1.DecrementWrapStencilOp,
		DefaultLoadingManager: three_6.DefaultLoadingManager,
		DepthFormat: three_1.DepthFormat,
		DepthStencilFormat: three_1.DepthStencilFormat,
		DepthTexture: three_3.DepthTexture,
		DetachedBindMode: three_1.DetachedBindMode,
		DirectionalLight: three_6.DirectionalLight,
		DirectionalLightHelper: three_6.DirectionalLightHelper,
		DiscreteInterpolant: three_5.DiscreteInterpolant,
		DisplayP3ColorSpace: three_1.DisplayP3ColorSpace,
		DodecahedronGeometry: three_5.DodecahedronGeometry,
		DoubleSide: three_1.DoubleSide,
		DstAlphaFactor: three_1.DstAlphaFactor,
		DstColorFactor: three_1.DstColorFactor,
		DynamicCopyUsage: three_1.DynamicCopyUsage,
		DynamicDrawUsage: three_1.DynamicDrawUsage,
		DynamicReadUsage: three_1.DynamicReadUsage,
		EdgesGeometry: three_5.EdgesGeometry,
		EllipseCurve: three_5.EllipseCurve,
		EqualCompare: three_1.EqualCompare,
		EqualDepth: three_1.EqualDepth,
		EqualStencilFunc: three_1.EqualStencilFunc,
		EquirectangularReflectionMapping: three_1.EquirectangularReflectionMapping,
		EquirectangularRefractionMapping: three_1.EquirectangularRefractionMapping,
		Euler: three_1.Euler,
		EventDispatcher: three_1.EventDispatcher,
		ExtrudeGeometry: three_5.ExtrudeGeometry,
		FileLoader: three_6.FileLoader,
		Float16BufferAttribute: three_1.Float16BufferAttribute,
		Float32BufferAttribute: three_1.Float32BufferAttribute,
		Float64BufferAttribute: three_1.Float64BufferAttribute,
		FloatType: three_1.FloatType,
		Fog: three_4.Fog,
		FogExp2: three_4.FogExp2,
		FramebufferTexture: three_5.FramebufferTexture,
		FrontSide: three_1.FrontSide,
		Frustum: three_2.Frustum,
		GLBufferAttribute: three_6.GLBufferAttribute,
		GLSL1: three_1.GLSL1,
		GLSL3: three_1.GLSL3,
		GreaterCompare: three_1.GreaterCompare,
		GreaterDepth: three_1.GreaterDepth,
		GreaterEqualCompare: three_1.GreaterEqualCompare,
		GreaterEqualDepth: three_1.GreaterEqualDepth,
		GreaterEqualStencilFunc: three_1.GreaterEqualStencilFunc,
		GreaterStencilFunc: three_1.GreaterStencilFunc,
		GridHelper: three_6.GridHelper,
		Group: three_4.Group,
		HalfFloatType: three_1.HalfFloatType,
		HemisphereLight: three_6.HemisphereLight,
		HemisphereLightHelper: three_6.HemisphereLightHelper,
		IcosahedronGeometry: three_5.IcosahedronGeometry,
		ImageBitmapLoader: three_6.ImageBitmapLoader,
		ImageLoader: three_6.ImageLoader,
		ImageUtils: three_1.ImageUtils,
		IncrementStencilOp: three_1.IncrementStencilOp,
		IncrementWrapStencilOp: three_1.IncrementWrapStencilOp,
		InstancedBufferAttribute: three_5.InstancedBufferAttribute,
		InstancedBufferGeometry: three_6.InstancedBufferGeometry,
		InstancedInterleavedBuffer: three_6.InstancedInterleavedBuffer,
		InstancedMesh: three_5.InstancedMesh,
		Int16BufferAttribute: three_1.Int16BufferAttribute,
		Int32BufferAttribute: three_1.Int32BufferAttribute,
		Int8BufferAttribute: three_1.Int8BufferAttribute,
		IntType: three_1.IntType,
		InterleavedBuffer: three_4.InterleavedBuffer,
		InterleavedBufferAttribute: three_4.InterleavedBufferAttribute,
		Interpolant: three_5.Interpolant,
		InterpolateDiscrete: three_1.InterpolateDiscrete,
		InterpolateLinear: three_1.InterpolateLinear,
		InterpolateSmooth: three_1.InterpolateSmooth,
		InvertStencilOp: three_1.InvertStencilOp,
		KeepStencilOp: three_1.KeepStencilOp,
		KeyframeTrack: three_6.KeyframeTrack,
		LOD: three_5.LOD,
		LatheGeometry: three_5.LatheGeometry,
		Layers: three_1.Layers,
		LessCompare: three_1.LessCompare,
		LessDepth: three_1.LessDepth,
		LessEqualCompare: three_1.LessEqualCompare,
		LessEqualDepth: three_1.LessEqualDepth,
		LessEqualStencilFunc: three_1.LessEqualStencilFunc,
		LessStencilFunc: three_1.LessStencilFunc,
		Light: three_6.Light,
		LightProbe: three_6.LightProbe,
		Line: three_5.Line,
		Line3: three_6.Line3,
		LineBasicMaterial: three_5.LineBasicMaterial,
		LineCurve: three_5.LineCurve,
		LineCurve3: three_5.LineCurve3,
		LineDashedMaterial: three_5.LineDashedMaterial,
		LineLoop: three_5.LineLoop,
		LineSegments: three_5.LineSegments,
		LinearDisplayP3ColorSpace: three_1.LinearDisplayP3ColorSpace,
		LinearEncoding: three_1.LinearEncoding,
		LinearFilter: three_1.LinearFilter,
		LinearInterpolant: three_5.LinearInterpolant,
		LinearMipMapLinearFilter: three_1.LinearMipMapLinearFilter,
		LinearMipMapNearestFilter: three_1.LinearMipMapNearestFilter,
		LinearMipmapLinearFilter: three_1.LinearMipmapLinearFilter,
		LinearMipmapNearestFilter: three_1.LinearMipmapNearestFilter,
		LinearSRGBColorSpace: three_1.LinearSRGBColorSpace,
		LinearToneMapping: three_1.LinearToneMapping,
		LinearTransfer: three_1.LinearTransfer,
		Loader: three_6.Loader,
		LoaderUtils: three_6.LoaderUtils,
		LoadingManager: three_6.LoadingManager,
		LoopOnce: three_1.LoopOnce,
		LoopPingPong: three_1.LoopPingPong,
		LoopRepeat: three_1.LoopRepeat,
		LuminanceAlphaFormat: three_1.LuminanceAlphaFormat,
		LuminanceFormat: three_1.LuminanceFormat,
		MOUSE: three_1.MOUSE,
		Material: three_1.Material,
		MaterialLoader: three_6.MaterialLoader,
		MathUtils: three_1.MathUtils,
		Matrix3: three_1.Matrix3,
		Matrix4: three_1.Matrix4,
		MaxEquation: three_1.MaxEquation,
		Mesh: three_2.Mesh,
		MeshBasicMaterial: three_1.MeshBasicMaterial,
		MeshDepthMaterial: three_3.MeshDepthMaterial,
		MeshDistanceMaterial: three_3.MeshDistanceMaterial,
		MeshLambertMaterial: three_5.MeshLambertMaterial,
		MeshMatcapMaterial: three_5.MeshMatcapMaterial,
		MeshNormalMaterial: three_5.MeshNormalMaterial,
		MeshPhongMaterial: three_5.MeshPhongMaterial,
		MeshPhysicalMaterial: three_5.MeshPhysicalMaterial,
		MeshStandardMaterial: three_5.MeshStandardMaterial,
		MeshToonMaterial: three_5.MeshToonMaterial,
		MinEquation: three_1.MinEquation,
		MirroredRepeatWrapping: three_1.MirroredRepeatWrapping,
		MixOperation: three_1.MixOperation,
		MultiplyBlending: three_1.MultiplyBlending,
		MultiplyOperation: three_1.MultiplyOperation,
		NearestFilter: three_1.NearestFilter,
		NearestMipMapLinearFilter: three_1.NearestMipMapLinearFilter,
		NearestMipMapNearestFilter: three_1.NearestMipMapNearestFilter,
		NearestMipmapLinearFilter: three_1.NearestMipmapLinearFilter,
		NearestMipmapNearestFilter: three_1.NearestMipmapNearestFilter,
		NeverCompare: three_1.NeverCompare,
		NeverDepth: three_1.NeverDepth,
		NeverStencilFunc: three_1.NeverStencilFunc,
		NoBlending: three_1.NoBlending,
		NoColorSpace: three_1.NoColorSpace,
		NoToneMapping: three_1.NoToneMapping,
		NormalAnimationBlendMode: three_1.NormalAnimationBlendMode,
		NormalBlending: three_1.NormalBlending,
		NotEqualCompare: three_1.NotEqualCompare,
		NotEqualDepth: three_1.NotEqualDepth,
		NotEqualStencilFunc: three_1.NotEqualStencilFunc,
		NumberKeyframeTrack: three_6.NumberKeyframeTrack,
		Object3D: three_1.Object3D,
		ObjectLoader: three_6.ObjectLoader,
		ObjectSpaceNormalMap: three_1.ObjectSpaceNormalMap,
		OctahedronGeometry: three_5.OctahedronGeometry,
		OneFactor: three_1.OneFactor,
		OneMinusConstantAlphaFactor: three_1.OneMinusConstantAlphaFactor,
		OneMinusConstantColorFactor: three_1.OneMinusConstantColorFactor,
		OneMinusDstAlphaFactor: three_1.OneMinusDstAlphaFactor,
		OneMinusDstColorFactor: three_1.OneMinusDstColorFactor,
		OneMinusSrcAlphaFactor: three_1.OneMinusSrcAlphaFactor,
		OneMinusSrcColorFactor: three_1.OneMinusSrcColorFactor,
		OrthographicCamera: three_3.OrthographicCamera,
		P3Primaries: three_1.P3Primaries,
		PCFShadowMap: three_1.PCFShadowMap,
		PCFSoftShadowMap: three_1.PCFSoftShadowMap,
		PMREMGenerator: three_3.PMREMGenerator,
		Path: three_5.Path,
		PerspectiveCamera: three_2.PerspectiveCamera,
		Plane: three_2.Plane,
		PlaneGeometry: three_2.PlaneGeometry,
		PlaneHelper: three_6.PlaneHelper,
		PointLight: three_6.PointLight,
		PointLightHelper: three_6.PointLightHelper,
		Points: three_5.Points,
		PointsMaterial: three_5.PointsMaterial,
		PolarGridHelper: three_6.PolarGridHelper,
		PolyhedronGeometry: three_5.PolyhedronGeometry,
		PositionalAudio: three_6.PositionalAudio,
		PropertyBinding: three_6.PropertyBinding,
		PropertyMixer: three_6.PropertyMixer,
		QuadraticBezierCurve: three_5.QuadraticBezierCurve,
		QuadraticBezierCurve3: three_5.QuadraticBezierCurve3,
		Quaternion: three_1.Quaternion,
		QuaternionKeyframeTrack: three_6.QuaternionKeyframeTrack,
		QuaternionLinearInterpolant: three_6.QuaternionLinearInterpolant,
		RED_GREEN_RGTC2_Format: three_1.RED_GREEN_RGTC2_Format,
		RED_RGTC1_Format: three_1.RED_RGTC1_Format,
		REVISION: three_1.REVISION,
		RGBADepthPacking: three_1.RGBADepthPacking,
		RGBAFormat: three_1.RGBAFormat,
		RGBAIntegerFormat: three_1.RGBAIntegerFormat,
		RGBA_ASTC_10x10_Format: three_1.RGBA_ASTC_10x10_Format,
		RGBA_ASTC_10x5_Format: three_1.RGBA_ASTC_10x5_Format,
		RGBA_ASTC_10x6_Format: three_1.RGBA_ASTC_10x6_Format,
		RGBA_ASTC_10x8_Format: three_1.RGBA_ASTC_10x8_Format,
		RGBA_ASTC_12x10_Format: three_1.RGBA_ASTC_12x10_Format,
		RGBA_ASTC_12x12_Format: three_1.RGBA_ASTC_12x12_Format,
		RGBA_ASTC_4x4_Format: three_1.RGBA_ASTC_4x4_Format,
		RGBA_ASTC_5x4_Format: three_1.RGBA_ASTC_5x4_Format,
		RGBA_ASTC_5x5_Format: three_1.RGBA_ASTC_5x5_Format,
		RGBA_ASTC_6x5_Format: three_1.RGBA_ASTC_6x5_Format,
		RGBA_ASTC_6x6_Format: three_1.RGBA_ASTC_6x6_Format,
		RGBA_ASTC_8x5_Format: three_1.RGBA_ASTC_8x5_Format,
		RGBA_ASTC_8x6_Format: three_1.RGBA_ASTC_8x6_Format,
		RGBA_ASTC_8x8_Format: three_1.RGBA_ASTC_8x8_Format,
		RGBA_BPTC_Format: three_1.RGBA_BPTC_Format,
		RGBA_ETC2_EAC_Format: three_1.RGBA_ETC2_EAC_Format,
		RGBA_PVRTC_2BPPV1_Format: three_1.RGBA_PVRTC_2BPPV1_Format,
		RGBA_PVRTC_4BPPV1_Format: three_1.RGBA_PVRTC_4BPPV1_Format,
		RGBA_S3TC_DXT1_Format: three_1.RGBA_S3TC_DXT1_Format,
		RGBA_S3TC_DXT3_Format: three_1.RGBA_S3TC_DXT3_Format,
		RGBA_S3TC_DXT5_Format: three_1.RGBA_S3TC_DXT5_Format,
		RGB_BPTC_SIGNED_Format: three_1.RGB_BPTC_SIGNED_Format,
		RGB_BPTC_UNSIGNED_Format: three_1.RGB_BPTC_UNSIGNED_Format,
		RGB_ETC1_Format: three_1.RGB_ETC1_Format,
		RGB_ETC2_Format: three_1.RGB_ETC2_Format,
		RGB_PVRTC_2BPPV1_Format: three_1.RGB_PVRTC_2BPPV1_Format,
		RGB_PVRTC_4BPPV1_Format: three_1.RGB_PVRTC_4BPPV1_Format,
		RGB_S3TC_DXT1_Format: three_1.RGB_S3TC_DXT1_Format,
		RGFormat: three_1.RGFormat,
		RGIntegerFormat: three_1.RGIntegerFormat,
		RawShaderMaterial: three_5.RawShaderMaterial,
		Ray: three_1.Ray,
		Raycaster: three_6.Raycaster,
		Rec709Primaries: three_1.Rec709Primaries,
		RectAreaLight: three_6.RectAreaLight,
		RedFormat: three_1.RedFormat,
		RedIntegerFormat: three_1.RedIntegerFormat,
		ReinhardToneMapping: three_1.ReinhardToneMapping,
		RenderTarget: three_1.RenderTarget,
		RepeatWrapping: three_1.RepeatWrapping,
		ReplaceStencilOp: three_1.ReplaceStencilOp,
		ReverseSubtractEquation: three_1.ReverseSubtractEquation,
		RingGeometry: three_5.RingGeometry,
		SIGNED_RED_GREEN_RGTC2_Format: three_1.SIGNED_RED_GREEN_RGTC2_Format,
		SIGNED_RED_RGTC1_Format: three_1.SIGNED_RED_RGTC1_Format,
		SRGBColorSpace: three_1.SRGBColorSpace,
		SRGBTransfer: three_1.SRGBTransfer,
		Scene: three_4.Scene,
		ShaderChunk: three_3.ShaderChunk,
		ShaderLib: three_3.ShaderLib,
		ShaderMaterial: three_2.ShaderMaterial,
		ShadowMaterial: three_5.ShadowMaterial,
		Shape: three_5.Shape,
		ShapeGeometry: three_5.ShapeGeometry,
		ShapePath,
		ShapeUtils: three_5.ShapeUtils,
		ShortType: three_1.ShortType,
		Skeleton: three_5.Skeleton,
		SkeletonHelper: three_6.SkeletonHelper,
		SkinnedMesh: three_5.SkinnedMesh,
		Source: three_1.Source,
		Sphere: three_1.Sphere,
		SphereGeometry: three_5.SphereGeometry,
		Spherical: three_6.Spherical,
		SphericalHarmonics3: three_6.SphericalHarmonics3,
		SplineCurve: three_5.SplineCurve,
		SpotLight: three_6.SpotLight,
		SpotLightHelper: three_6.SpotLightHelper,
		Sprite: three_5.Sprite,
		SpriteMaterial: three_4.SpriteMaterial,
		SrcAlphaFactor: three_1.SrcAlphaFactor,
		SrcAlphaSaturateFactor: three_1.SrcAlphaSaturateFactor,
		SrcColorFactor: three_1.SrcColorFactor,
		StaticCopyUsage: three_1.StaticCopyUsage,
		StaticDrawUsage: three_1.StaticDrawUsage,
		StaticReadUsage: three_1.StaticReadUsage,
		StereoCamera: three_6.StereoCamera,
		StreamCopyUsage: three_1.StreamCopyUsage,
		StreamDrawUsage: three_1.StreamDrawUsage,
		StreamReadUsage: three_1.StreamReadUsage,
		StringKeyframeTrack: three_6.StringKeyframeTrack,
		SubtractEquation: three_1.SubtractEquation,
		SubtractiveBlending: three_1.SubtractiveBlending,
		TOUCH: three_1.TOUCH,
		TangentSpaceNormalMap: three_1.TangentSpaceNormalMap,
		TetrahedronGeometry: three_5.TetrahedronGeometry,
		Texture: three_1.Texture,
		TextureLoader: three_6.TextureLoader,
		TorusGeometry: three_5.TorusGeometry,
		TorusKnotGeometry: three_5.TorusKnotGeometry,
		Triangle: three_1.Triangle,
		TriangleFanDrawMode: three_1.TriangleFanDrawMode,
		TriangleStripDrawMode: three_1.TriangleStripDrawMode,
		TrianglesDrawMode: three_1.TrianglesDrawMode,
		TubeGeometry: three_5.TubeGeometry,
		TwoPassDoubleSide: three_1.TwoPassDoubleSide,
		UVMapping: three_1.UVMapping,
		Uint16BufferAttribute: three_1.Uint16BufferAttribute,
		Uint32BufferAttribute: three_1.Uint32BufferAttribute,
		Uint8BufferAttribute: three_1.Uint8BufferAttribute,
		Uint8ClampedBufferAttribute: three_1.Uint8ClampedBufferAttribute,
		Uniform: three_6.Uniform,
		UniformsGroup: three_6.UniformsGroup,
		UniformsLib: three_3.UniformsLib,
		UniformsUtils: three_2.UniformsUtils,
		UnsignedByteType: three_1.UnsignedByteType,
		UnsignedInt248Type: three_1.UnsignedInt248Type,
		UnsignedIntType: three_1.UnsignedIntType,
		UnsignedShort4444Type: three_1.UnsignedShort4444Type,
		UnsignedShort5551Type: three_1.UnsignedShort5551Type,
		UnsignedShortType: three_1.UnsignedShortType,
		VSMShadowMap: three_1.VSMShadowMap,
		Vector2: three_1.Vector2,
		Vector3: three_1.Vector3,
		Vector4: three_1.Vector4,
		VectorKeyframeTrack: three_6.VectorKeyframeTrack,
		VideoTexture: three_5.VideoTexture,
		WebGL1Renderer: three_4.WebGL1Renderer,
		WebGL3DRenderTarget: three_1.WebGL3DRenderTarget,
		WebGLArrayRenderTarget: three_1.WebGLArrayRenderTarget,
		WebGLCoordinateSystem: three_1.WebGLCoordinateSystem,
		WebGLCubeRenderTarget: three_2.WebGLCubeRenderTarget,
		WebGLMultipleRenderTargets: three_1.WebGLMultipleRenderTargets,
		WebGLRenderTarget: three_1.WebGLRenderTarget,
		WebGLRenderer: three_4.WebGLRenderer,
		WebGLUtils: three_4.WebGLUtils,
		WebGPUCoordinateSystem: three_1.WebGPUCoordinateSystem,
		WireframeGeometry: three_5.WireframeGeometry,
		WrapAroundEnding: three_1.WrapAroundEnding,
		ZeroCurvatureEnding: three_1.ZeroCurvatureEnding,
		ZeroFactor: three_1.ZeroFactor,
		ZeroSlopeEnding: three_1.ZeroSlopeEnding,
		ZeroStencilOp: three_1.ZeroStencilOp,
		_SRGBAFormat: three_1._SRGBAFormat,
		createCanvasElement: three_1.createCanvasElement,
		sRGBEncoding: three_1.sRGBEncoding
	});

	exports.THREE = THREE;

}));
