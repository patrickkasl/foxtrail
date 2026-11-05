// three.js r160 (https://threejs.org), part "three.5".
// Copyright 2010-2023 three.js authors, MIT License: see the LICENSE file in this folder.
// This is three's own source, bundled without minifying and cut into parts by the Fox Trail workshop
// (tools/make-three.mjs), because the page is opened from disk and each file must stay small enough to read.
// One thing is left out: the glTF reader's WebP and AVIF texture extensions, which the trail does not use.
foxtrailPart('three.5', ['exports', './three.1', './three.2', './three.4'], (function (exports, three_1, three_2, three_4) { 'use strict';

	let _geometry;

	const _intersectPoint = /*@__PURE__*/ new three_1.Vector3();
	const _worldScale = /*@__PURE__*/ new three_1.Vector3();
	const _mvPosition = /*@__PURE__*/ new three_1.Vector3();

	const _alignedPosition = /*@__PURE__*/ new three_1.Vector2();
	const _rotatedPosition = /*@__PURE__*/ new three_1.Vector2();
	const _viewWorldMatrix = /*@__PURE__*/ new three_1.Matrix4();

	const _vA = /*@__PURE__*/ new three_1.Vector3();
	const _vB = /*@__PURE__*/ new three_1.Vector3();
	const _vC = /*@__PURE__*/ new three_1.Vector3();

	const _uvA = /*@__PURE__*/ new three_1.Vector2();
	const _uvB = /*@__PURE__*/ new three_1.Vector2();
	const _uvC = /*@__PURE__*/ new three_1.Vector2();

	class Sprite extends three_1.Object3D {

		constructor( material = new three_4.SpriteMaterial() ) {

			super();

			this.isSprite = true;

			this.type = 'Sprite';

			if ( _geometry === undefined ) {

				_geometry = new three_2.BufferGeometry();

				const float32Array = new Float32Array( [
					-0.5, -0.5, 0, 0, 0,
					0.5, -0.5, 0, 1, 0,
					0.5, 0.5, 0, 1, 1,
					-0.5, 0.5, 0, 0, 1
				] );

				const interleavedBuffer = new three_4.InterleavedBuffer( float32Array, 5 );

				_geometry.setIndex( [ 0, 1, 2,	0, 2, 3 ] );
				_geometry.setAttribute( 'position', new three_4.InterleavedBufferAttribute( interleavedBuffer, 3, 0, false ) );
				_geometry.setAttribute( 'uv', new three_4.InterleavedBufferAttribute( interleavedBuffer, 2, 3, false ) );

			}

			this.geometry = _geometry;
			this.material = material;

			this.center = new three_1.Vector2( 0.5, 0.5 );

		}

		raycast( raycaster, intersects ) {

			if ( raycaster.camera === null ) {

				console.error( 'THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.' );

			}

			_worldScale.setFromMatrixScale( this.matrixWorld );

			_viewWorldMatrix.copy( raycaster.camera.matrixWorld );
			this.modelViewMatrix.multiplyMatrices( raycaster.camera.matrixWorldInverse, this.matrixWorld );

			_mvPosition.setFromMatrixPosition( this.modelViewMatrix );

			if ( raycaster.camera.isPerspectiveCamera && this.material.sizeAttenuation === false ) {

				_worldScale.multiplyScalar( - _mvPosition.z );

			}

			const rotation = this.material.rotation;
			let sin, cos;

			if ( rotation !== 0 ) {

				cos = Math.cos( rotation );
				sin = Math.sin( rotation );

			}

			const center = this.center;

			transformVertex( _vA.set( -0.5, -0.5, 0 ), _mvPosition, center, _worldScale, sin, cos );
			transformVertex( _vB.set( 0.5, -0.5, 0 ), _mvPosition, center, _worldScale, sin, cos );
			transformVertex( _vC.set( 0.5, 0.5, 0 ), _mvPosition, center, _worldScale, sin, cos );

			_uvA.set( 0, 0 );
			_uvB.set( 1, 0 );
			_uvC.set( 1, 1 );

			// check first triangle
			let intersect = raycaster.ray.intersectTriangle( _vA, _vB, _vC, false, _intersectPoint );

			if ( intersect === null ) {

				// check second triangle
				transformVertex( _vB.set( -0.5, 0.5, 0 ), _mvPosition, center, _worldScale, sin, cos );
				_uvB.set( 0, 1 );

				intersect = raycaster.ray.intersectTriangle( _vA, _vC, _vB, false, _intersectPoint );
				if ( intersect === null ) {

					return;

				}

			}

			const distance = raycaster.ray.origin.distanceTo( _intersectPoint );

			if ( distance < raycaster.near || distance > raycaster.far ) return;

			intersects.push( {

				distance: distance,
				point: _intersectPoint.clone(),
				uv: three_1.Triangle.getInterpolation( _intersectPoint, _vA, _vB, _vC, _uvA, _uvB, _uvC, new three_1.Vector2() ),
				face: null,
				object: this

			} );

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			if ( source.center !== undefined ) this.center.copy( source.center );

			this.material = source.material;

			return this;

		}

	}

	function transformVertex( vertexPosition, mvPosition, center, scale, sin, cos ) {

		// compute position in camera space
		_alignedPosition.subVectors( vertexPosition, center ).addScalar( 0.5 ).multiply( scale );

		// to check if rotation is not zero
		if ( sin !== undefined ) {

			_rotatedPosition.x = ( cos * _alignedPosition.x ) - ( sin * _alignedPosition.y );
			_rotatedPosition.y = ( sin * _alignedPosition.x ) + ( cos * _alignedPosition.y );

		} else {

			_rotatedPosition.copy( _alignedPosition );

		}


		vertexPosition.copy( mvPosition );
		vertexPosition.x += _rotatedPosition.x;
		vertexPosition.y += _rotatedPosition.y;

		// transform to world space
		vertexPosition.applyMatrix4( _viewWorldMatrix );

	}

	const _v1$1 = /*@__PURE__*/ new three_1.Vector3();
	const _v2 = /*@__PURE__*/ new three_1.Vector3();

	class LOD extends three_1.Object3D {

		constructor() {

			super();

			this._currentLevel = 0;

			this.type = 'LOD';

			Object.defineProperties( this, {
				levels: {
					enumerable: true,
					value: []
				},
				isLOD: {
					value: true,
				}
			} );

			this.autoUpdate = true;

		}

		copy( source ) {

			super.copy( source, false );

			const levels = source.levels;

			for ( let i = 0, l = levels.length; i < l; i ++ ) {

				const level = levels[ i ];

				this.addLevel( level.object.clone(), level.distance, level.hysteresis );

			}

			this.autoUpdate = source.autoUpdate;

			return this;

		}

		addLevel( object, distance = 0, hysteresis = 0 ) {

			distance = Math.abs( distance );

			const levels = this.levels;

			let l;

			for ( l = 0; l < levels.length; l ++ ) {

				if ( distance < levels[ l ].distance ) {

					break;

				}

			}

			levels.splice( l, 0, { distance: distance, hysteresis: hysteresis, object: object } );

			this.add( object );

			return this;

		}

		getCurrentLevel() {

			return this._currentLevel;

		}



		getObjectForDistance( distance ) {

			const levels = this.levels;

			if ( levels.length > 0 ) {

				let i, l;

				for ( i = 1, l = levels.length; i < l; i ++ ) {

					let levelDistance = levels[ i ].distance;

					if ( levels[ i ].object.visible ) {

						levelDistance -= levelDistance * levels[ i ].hysteresis;

					}

					if ( distance < levelDistance ) {

						break;

					}

				}

				return levels[ i - 1 ].object;

			}

			return null;

		}

		raycast( raycaster, intersects ) {

			const levels = this.levels;

			if ( levels.length > 0 ) {

				_v1$1.setFromMatrixPosition( this.matrixWorld );

				const distance = raycaster.ray.origin.distanceTo( _v1$1 );

				this.getObjectForDistance( distance ).raycast( raycaster, intersects );

			}

		}

		update( camera ) {

			const levels = this.levels;

			if ( levels.length > 1 ) {

				_v1$1.setFromMatrixPosition( camera.matrixWorld );
				_v2.setFromMatrixPosition( this.matrixWorld );

				const distance = _v1$1.distanceTo( _v2 ) / camera.zoom;

				levels[ 0 ].object.visible = true;

				let i, l;

				for ( i = 1, l = levels.length; i < l; i ++ ) {

					let levelDistance = levels[ i ].distance;

					if ( levels[ i ].object.visible ) {

						levelDistance -= levelDistance * levels[ i ].hysteresis;

					}

					if ( distance >= levelDistance ) {

						levels[ i - 1 ].object.visible = false;
						levels[ i ].object.visible = true;

					} else {

						break;

					}

				}

				this._currentLevel = i - 1;

				for ( ; i < l; i ++ ) {

					levels[ i ].object.visible = false;

				}

			}

		}

		toJSON( meta ) {

			const data = super.toJSON( meta );

			if ( this.autoUpdate === false ) data.object.autoUpdate = false;

			data.object.levels = [];

			const levels = this.levels;

			for ( let i = 0, l = levels.length; i < l; i ++ ) {

				const level = levels[ i ];

				data.object.levels.push( {
					object: level.object.uuid,
					distance: level.distance,
					hysteresis: level.hysteresis
				} );

			}

			return data;

		}

	}

	const _basePosition = /*@__PURE__*/ new three_1.Vector3();

	const _skinIndex = /*@__PURE__*/ new three_1.Vector4();
	const _skinWeight = /*@__PURE__*/ new three_1.Vector4();

	const _vector3 = /*@__PURE__*/ new three_1.Vector3();
	const _matrix4 = /*@__PURE__*/ new three_1.Matrix4();
	const _vertex = /*@__PURE__*/ new three_1.Vector3();

	const _sphere$4 = /*@__PURE__*/ new three_1.Sphere();
	const _inverseMatrix$2 = /*@__PURE__*/ new three_1.Matrix4();
	const _ray$2 = /*@__PURE__*/ new three_1.Ray();

	class SkinnedMesh extends three_2.Mesh {

		constructor( geometry, material ) {

			super( geometry, material );

			this.isSkinnedMesh = true;

			this.type = 'SkinnedMesh';

			this.bindMode = three_1.AttachedBindMode;
			this.bindMatrix = new three_1.Matrix4();
			this.bindMatrixInverse = new three_1.Matrix4();

			this.boundingBox = null;
			this.boundingSphere = null;

		}

		computeBoundingBox() {

			const geometry = this.geometry;

			if ( this.boundingBox === null ) {

				this.boundingBox = new three_1.Box3();

			}

			this.boundingBox.makeEmpty();

			const positionAttribute = geometry.getAttribute( 'position' );

			for ( let i = 0; i < positionAttribute.count; i ++ ) {

				this.getVertexPosition( i, _vertex );
				this.boundingBox.expandByPoint( _vertex );

			}

		}

		computeBoundingSphere() {

			const geometry = this.geometry;

			if ( this.boundingSphere === null ) {

				this.boundingSphere = new three_1.Sphere();

			}

			this.boundingSphere.makeEmpty();

			const positionAttribute = geometry.getAttribute( 'position' );

			for ( let i = 0; i < positionAttribute.count; i ++ ) {

				this.getVertexPosition( i, _vertex );
				this.boundingSphere.expandByPoint( _vertex );

			}

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			this.bindMode = source.bindMode;
			this.bindMatrix.copy( source.bindMatrix );
			this.bindMatrixInverse.copy( source.bindMatrixInverse );

			this.skeleton = source.skeleton;

			if ( source.boundingBox !== null ) this.boundingBox = source.boundingBox.clone();
			if ( source.boundingSphere !== null ) this.boundingSphere = source.boundingSphere.clone();

			return this;

		}

		raycast( raycaster, intersects ) {

			const material = this.material;
			const matrixWorld = this.matrixWorld;

			if ( material === undefined ) return;

			// test with bounding sphere in world space

			if ( this.boundingSphere === null ) this.computeBoundingSphere();

			_sphere$4.copy( this.boundingSphere );
			_sphere$4.applyMatrix4( matrixWorld );

			if ( raycaster.ray.intersectsSphere( _sphere$4 ) === false ) return;

			// convert ray to local space of skinned mesh

			_inverseMatrix$2.copy( matrixWorld ).invert();
			_ray$2.copy( raycaster.ray ).applyMatrix4( _inverseMatrix$2 );

			// test with bounding box in local space

			if ( this.boundingBox !== null ) {

				if ( _ray$2.intersectsBox( this.boundingBox ) === false ) return;

			}

			// test for intersections with geometry

			this._computeIntersections( raycaster, intersects, _ray$2 );

		}

		getVertexPosition( index, target ) {

			super.getVertexPosition( index, target );

			this.applyBoneTransform( index, target );

			return target;

		}

		bind( skeleton, bindMatrix ) {

			this.skeleton = skeleton;

			if ( bindMatrix === undefined ) {

				this.updateMatrixWorld( true );

				this.skeleton.calculateInverses();

				bindMatrix = this.matrixWorld;

			}

			this.bindMatrix.copy( bindMatrix );
			this.bindMatrixInverse.copy( bindMatrix ).invert();

		}

		pose() {

			this.skeleton.pose();

		}

		normalizeSkinWeights() {

			const vector = new three_1.Vector4();

			const skinWeight = this.geometry.attributes.skinWeight;

			for ( let i = 0, l = skinWeight.count; i < l; i ++ ) {

				vector.fromBufferAttribute( skinWeight, i );

				const scale = 1.0 / vector.manhattanLength();

				if ( scale !== Infinity ) {

					vector.multiplyScalar( scale );

				} else {

					vector.set( 1, 0, 0, 0 ); // do something reasonable

				}

				skinWeight.setXYZW( i, vector.x, vector.y, vector.z, vector.w );

			}

		}

		updateMatrixWorld( force ) {

			super.updateMatrixWorld( force );

			if ( this.bindMode === three_1.AttachedBindMode ) {

				this.bindMatrixInverse.copy( this.matrixWorld ).invert();

			} else if ( this.bindMode === three_1.DetachedBindMode ) {

				this.bindMatrixInverse.copy( this.bindMatrix ).invert();

			} else {

				console.warn( 'THREE.SkinnedMesh: Unrecognized bindMode: ' + this.bindMode );

			}

		}

		applyBoneTransform( index, vector ) {

			const skeleton = this.skeleton;
			const geometry = this.geometry;

			_skinIndex.fromBufferAttribute( geometry.attributes.skinIndex, index );
			_skinWeight.fromBufferAttribute( geometry.attributes.skinWeight, index );

			_basePosition.copy( vector ).applyMatrix4( this.bindMatrix );

			vector.set( 0, 0, 0 );

			for ( let i = 0; i < 4; i ++ ) {

				const weight = _skinWeight.getComponent( i );

				if ( weight !== 0 ) {

					const boneIndex = _skinIndex.getComponent( i );

					_matrix4.multiplyMatrices( skeleton.bones[ boneIndex ].matrixWorld, skeleton.boneInverses[ boneIndex ] );

					vector.addScaledVector( _vector3.copy( _basePosition ).applyMatrix4( _matrix4 ), weight );

				}

			}

			return vector.applyMatrix4( this.bindMatrixInverse );

		}

		boneTransform( index, vector ) { // @deprecated, r151

			console.warn( 'THREE.SkinnedMesh: .boneTransform() was renamed to .applyBoneTransform() in r151.' );
			return this.applyBoneTransform( index, vector );

		}


	}

	class Bone extends three_1.Object3D {

		constructor() {

			super();

			this.isBone = true;

			this.type = 'Bone';

		}

	}

	class DataTexture extends three_1.Texture {

		constructor( data = null, width = 1, height = 1, format, type, mapping, wrapS, wrapT, magFilter = three_1.NearestFilter, minFilter = three_1.NearestFilter, anisotropy, colorSpace ) {

			super( null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace );

			this.isDataTexture = true;

			this.image = { data: data, width: width, height: height };

			this.generateMipmaps = false;
			this.flipY = false;
			this.unpackAlignment = 1;

		}

	}

	const _offsetMatrix = /*@__PURE__*/ new three_1.Matrix4();
	const _identityMatrix$1 = /*@__PURE__*/ new three_1.Matrix4();

	class Skeleton {

		constructor( bones = [], boneInverses = [] ) {

			this.uuid = three_1.generateUUID();

			this.bones = bones.slice( 0 );
			this.boneInverses = boneInverses;
			this.boneMatrices = null;

			this.boneTexture = null;

			this.init();

		}

		init() {

			const bones = this.bones;
			const boneInverses = this.boneInverses;

			this.boneMatrices = new Float32Array( bones.length * 16 );

			// calculate inverse bone matrices if necessary

			if ( boneInverses.length === 0 ) {

				this.calculateInverses();

			} else {

				// handle special case

				if ( bones.length !== boneInverses.length ) {

					console.warn( 'THREE.Skeleton: Number of inverse bone matrices does not match amount of bones.' );

					this.boneInverses = [];

					for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

						this.boneInverses.push( new three_1.Matrix4() );

					}

				}

			}

		}

		calculateInverses() {

			this.boneInverses.length = 0;

			for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

				const inverse = new three_1.Matrix4();

				if ( this.bones[ i ] ) {

					inverse.copy( this.bones[ i ].matrixWorld ).invert();

				}

				this.boneInverses.push( inverse );

			}

		}

		pose() {

			// recover the bind-time world matrices

			for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

				const bone = this.bones[ i ];

				if ( bone ) {

					bone.matrixWorld.copy( this.boneInverses[ i ] ).invert();

				}

			}

			// compute the local matrices, positions, rotations and scales

			for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

				const bone = this.bones[ i ];

				if ( bone ) {

					if ( bone.parent && bone.parent.isBone ) {

						bone.matrix.copy( bone.parent.matrixWorld ).invert();
						bone.matrix.multiply( bone.matrixWorld );

					} else {

						bone.matrix.copy( bone.matrixWorld );

					}

					bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );

				}

			}

		}

		update() {

			const bones = this.bones;
			const boneInverses = this.boneInverses;
			const boneMatrices = this.boneMatrices;
			const boneTexture = this.boneTexture;

			// flatten bone matrices to array

			for ( let i = 0, il = bones.length; i < il; i ++ ) {

				// compute the offset between the current and the original transform

				const matrix = bones[ i ] ? bones[ i ].matrixWorld : _identityMatrix$1;

				_offsetMatrix.multiplyMatrices( matrix, boneInverses[ i ] );
				_offsetMatrix.toArray( boneMatrices, i * 16 );

			}

			if ( boneTexture !== null ) {

				boneTexture.needsUpdate = true;

			}

		}

		clone() {

			return new Skeleton( this.bones, this.boneInverses );

		}

		computeBoneTexture() {

			// layout (1 matrix = 4 pixels)
			//      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
			//  with  8x8  pixel texture max   16 bones * 4 pixels =  (8 * 8)
			//       16x16 pixel texture max   64 bones * 4 pixels = (16 * 16)
			//       32x32 pixel texture max  256 bones * 4 pixels = (32 * 32)
			//       64x64 pixel texture max 1024 bones * 4 pixels = (64 * 64)

			let size = Math.sqrt( this.bones.length * 4 ); // 4 pixels needed for 1 matrix
			size = Math.ceil( size / 4 ) * 4;
			size = Math.max( size, 4 );

			const boneMatrices = new Float32Array( size * size * 4 ); // 4 floats per RGBA pixel
			boneMatrices.set( this.boneMatrices ); // copy current values

			const boneTexture = new DataTexture( boneMatrices, size, size, three_1.RGBAFormat, three_1.FloatType );
			boneTexture.needsUpdate = true;

			this.boneMatrices = boneMatrices;
			this.boneTexture = boneTexture;

			return this;

		}

		getBoneByName( name ) {

			for ( let i = 0, il = this.bones.length; i < il; i ++ ) {

				const bone = this.bones[ i ];

				if ( bone.name === name ) {

					return bone;

				}

			}

			return undefined;

		}

		dispose( ) {

			if ( this.boneTexture !== null ) {

				this.boneTexture.dispose();

				this.boneTexture = null;

			}

		}

		fromJSON( json, bones ) {

			this.uuid = json.uuid;

			for ( let i = 0, l = json.bones.length; i < l; i ++ ) {

				const uuid = json.bones[ i ];
				let bone = bones[ uuid ];

				if ( bone === undefined ) {

					console.warn( 'THREE.Skeleton: No bone found with UUID:', uuid );
					bone = new Bone();

				}

				this.bones.push( bone );
				this.boneInverses.push( new three_1.Matrix4().fromArray( json.boneInverses[ i ] ) );

			}

			this.init();

			return this;

		}

		toJSON() {

			const data = {
				metadata: {
					version: 4.6,
					type: 'Skeleton',
					generator: 'Skeleton.toJSON'
				},
				bones: [],
				boneInverses: []
			};

			data.uuid = this.uuid;

			const bones = this.bones;
			const boneInverses = this.boneInverses;

			for ( let i = 0, l = bones.length; i < l; i ++ ) {

				const bone = bones[ i ];
				data.bones.push( bone.uuid );

				const boneInverse = boneInverses[ i ];
				data.boneInverses.push( boneInverse.toArray() );

			}

			return data;

		}

	}

	class InstancedBufferAttribute extends three_1.BufferAttribute {

		constructor( array, itemSize, normalized, meshPerAttribute = 1 ) {

			super( array, itemSize, normalized );

			this.isInstancedBufferAttribute = true;

			this.meshPerAttribute = meshPerAttribute;

		}

		copy( source ) {

			super.copy( source );

			this.meshPerAttribute = source.meshPerAttribute;

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.meshPerAttribute = this.meshPerAttribute;

			data.isInstancedBufferAttribute = true;

			return data;

		}

	}

	const _instanceLocalMatrix = /*@__PURE__*/ new three_1.Matrix4();
	const _instanceWorldMatrix = /*@__PURE__*/ new three_1.Matrix4();

	const _instanceIntersects = [];

	const _box3 = /*@__PURE__*/ new three_1.Box3();
	const _identity = /*@__PURE__*/ new three_1.Matrix4();
	const _mesh$1 = /*@__PURE__*/ new three_2.Mesh();
	const _sphere$3 = /*@__PURE__*/ new three_1.Sphere();

	class InstancedMesh extends three_2.Mesh {

		constructor( geometry, material, count ) {

			super( geometry, material );

			this.isInstancedMesh = true;

			this.instanceMatrix = new InstancedBufferAttribute( new Float32Array( count * 16 ), 16 );
			this.instanceColor = null;

			this.count = count;

			this.boundingBox = null;
			this.boundingSphere = null;

			for ( let i = 0; i < count; i ++ ) {

				this.setMatrixAt( i, _identity );

			}

		}

		computeBoundingBox() {

			const geometry = this.geometry;
			const count = this.count;

			if ( this.boundingBox === null ) {

				this.boundingBox = new three_1.Box3();

			}

			if ( geometry.boundingBox === null ) {

				geometry.computeBoundingBox();

			}

			this.boundingBox.makeEmpty();

			for ( let i = 0; i < count; i ++ ) {

				this.getMatrixAt( i, _instanceLocalMatrix );

				_box3.copy( geometry.boundingBox ).applyMatrix4( _instanceLocalMatrix );

				this.boundingBox.union( _box3 );

			}

		}

		computeBoundingSphere() {

			const geometry = this.geometry;
			const count = this.count;

			if ( this.boundingSphere === null ) {

				this.boundingSphere = new three_1.Sphere();

			}

			if ( geometry.boundingSphere === null ) {

				geometry.computeBoundingSphere();

			}

			this.boundingSphere.makeEmpty();

			for ( let i = 0; i < count; i ++ ) {

				this.getMatrixAt( i, _instanceLocalMatrix );

				_sphere$3.copy( geometry.boundingSphere ).applyMatrix4( _instanceLocalMatrix );

				this.boundingSphere.union( _sphere$3 );

			}

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			this.instanceMatrix.copy( source.instanceMatrix );

			if ( source.instanceColor !== null ) this.instanceColor = source.instanceColor.clone();

			this.count = source.count;

			if ( source.boundingBox !== null ) this.boundingBox = source.boundingBox.clone();
			if ( source.boundingSphere !== null ) this.boundingSphere = source.boundingSphere.clone();

			return this;

		}

		getColorAt( index, color ) {

			color.fromArray( this.instanceColor.array, index * 3 );

		}

		getMatrixAt( index, matrix ) {

			matrix.fromArray( this.instanceMatrix.array, index * 16 );

		}

		raycast( raycaster, intersects ) {

			const matrixWorld = this.matrixWorld;
			const raycastTimes = this.count;

			_mesh$1.geometry = this.geometry;
			_mesh$1.material = this.material;

			if ( _mesh$1.material === undefined ) return;

			// test with bounding sphere first

			if ( this.boundingSphere === null ) this.computeBoundingSphere();

			_sphere$3.copy( this.boundingSphere );
			_sphere$3.applyMatrix4( matrixWorld );

			if ( raycaster.ray.intersectsSphere( _sphere$3 ) === false ) return;

			// now test each instance

			for ( let instanceId = 0; instanceId < raycastTimes; instanceId ++ ) {

				// calculate the world matrix for each instance

				this.getMatrixAt( instanceId, _instanceLocalMatrix );

				_instanceWorldMatrix.multiplyMatrices( matrixWorld, _instanceLocalMatrix );

				// the mesh represents this single instance

				_mesh$1.matrixWorld = _instanceWorldMatrix;

				_mesh$1.raycast( raycaster, _instanceIntersects );

				// process the result of raycast

				for ( let i = 0, l = _instanceIntersects.length; i < l; i ++ ) {

					const intersect = _instanceIntersects[ i ];
					intersect.instanceId = instanceId;
					intersect.object = this;
					intersects.push( intersect );

				}

				_instanceIntersects.length = 0;

			}

		}

		setColorAt( index, color ) {

			if ( this.instanceColor === null ) {

				this.instanceColor = new InstancedBufferAttribute( new Float32Array( this.instanceMatrix.count * 3 ), 3 );

			}

			color.toArray( this.instanceColor.array, index * 3 );

		}

		setMatrixAt( index, matrix ) {

			matrix.toArray( this.instanceMatrix.array, index * 16 );

		}

		updateMorphTargets() {

		}

		dispose() {

			this.dispatchEvent( { type: 'dispose' } );

		}

	}

	function sortOpaque( a, b ) {

		return a.z - b.z;

	}

	function sortTransparent( a, b ) {

		return b.z - a.z;

	}

	class MultiDrawRenderList {

		constructor() {

			this.index = 0;
			this.pool = [];
			this.list = [];

		}

		push( drawRange, z ) {

			const pool = this.pool;
			const list = this.list;
			if ( this.index >= pool.length ) {

				pool.push( {

					start: -1,
					count: -1,
					z: -1,

				} );

			}

			const item = pool[ this.index ];
			list.push( item );
			this.index ++;

			item.start = drawRange.start;
			item.count = drawRange.count;
			item.z = z;

		}

		reset() {

			this.list.length = 0;
			this.index = 0;

		}

	}

	const ID_ATTR_NAME = 'batchId';
	const _matrix = /*@__PURE__*/ new three_1.Matrix4();
	const _invMatrixWorld = /*@__PURE__*/ new three_1.Matrix4();
	const _identityMatrix = /*@__PURE__*/ new three_1.Matrix4();
	const _projScreenMatrix = /*@__PURE__*/ new three_1.Matrix4();
	const _frustum = /*@__PURE__*/ new three_2.Frustum();
	const _box = /*@__PURE__*/ new three_1.Box3();
	const _sphere$2 = /*@__PURE__*/ new three_1.Sphere();
	const _vector = /*@__PURE__*/ new three_1.Vector3();
	const _renderList = /*@__PURE__*/ new MultiDrawRenderList();
	const _mesh = /*@__PURE__*/ new three_2.Mesh();
	const _batchIntersects = [];

	// @TODO: SkinnedMesh support?
	// @TODO: geometry.groups support?
	// @TODO: geometry.drawRange support?
	// @TODO: geometry.morphAttributes support?
	// @TODO: Support uniform parameter per geometry
	// @TODO: Add an "optimize" function to pack geometry and remove data gaps

	// copies data from attribute "src" into "target" starting at "targetOffset"
	function copyAttributeData( src, target, targetOffset = 0 ) {

		const itemSize = target.itemSize;
		if ( src.isInterleavedBufferAttribute || src.array.constructor !== target.array.constructor ) {

			// use the component getters and setters if the array data cannot
			// be copied directly
			const vertexCount = src.count;
			for ( let i = 0; i < vertexCount; i ++ ) {

				for ( let c = 0; c < itemSize; c ++ ) {

					target.setComponent( i + targetOffset, c, src.getComponent( i, c ) );

				}

			}

		} else {

			// faster copy approach using typed array set function
			target.array.set( src.array, targetOffset * itemSize );

		}

		target.needsUpdate = true;

	}

	class BatchedMesh extends three_2.Mesh {

		get maxGeometryCount() {

			return this._maxGeometryCount;

		}

		constructor( maxGeometryCount, maxVertexCount, maxIndexCount = maxVertexCount * 2, material ) {

			super( new three_2.BufferGeometry(), material );

			this.isBatchedMesh = true;
			this.perObjectFrustumCulled = true;
			this.sortObjects = true;
			this.boundingBox = null;
			this.boundingSphere = null;
			this.customSort = null;

			this._drawRanges = [];
			this._reservedRanges = [];

			this._visibility = [];
			this._active = [];
			this._bounds = [];

			this._maxGeometryCount = maxGeometryCount;
			this._maxVertexCount = maxVertexCount;
			this._maxIndexCount = maxIndexCount;

			this._geometryInitialized = false;
			this._geometryCount = 0;
			this._multiDrawCounts = new Int32Array( maxGeometryCount );
			this._multiDrawStarts = new Int32Array( maxGeometryCount );
			this._multiDrawCount = 0;
			this._visibilityChanged = true;

			// Local matrix per geometry by using data texture
			this._matricesTexture = null;

			this._initMatricesTexture();

		}

		_initMatricesTexture() {

			// layout (1 matrix = 4 pixels)
			//      RGBA RGBA RGBA RGBA (=> column1, column2, column3, column4)
			//  with  8x8  pixel texture max   16 matrices * 4 pixels =  (8 * 8)
			//       16x16 pixel texture max   64 matrices * 4 pixels = (16 * 16)
			//       32x32 pixel texture max  256 matrices * 4 pixels = (32 * 32)
			//       64x64 pixel texture max 1024 matrices * 4 pixels = (64 * 64)

			let size = Math.sqrt( this._maxGeometryCount * 4 ); // 4 pixels needed for 1 matrix
			size = Math.ceil( size / 4 ) * 4;
			size = Math.max( size, 4 );

			const matricesArray = new Float32Array( size * size * 4 ); // 4 floats per RGBA pixel
			const matricesTexture = new DataTexture( matricesArray, size, size, three_1.RGBAFormat, three_1.FloatType );

			this._matricesTexture = matricesTexture;

		}

		_initializeGeometry( reference ) {

			const geometry = this.geometry;
			const maxVertexCount = this._maxVertexCount;
			const maxGeometryCount = this._maxGeometryCount;
			const maxIndexCount = this._maxIndexCount;
			if ( this._geometryInitialized === false ) {

				for ( const attributeName in reference.attributes ) {

					const srcAttribute = reference.getAttribute( attributeName );
					const { array, itemSize, normalized } = srcAttribute;

					const dstArray = new array.constructor( maxVertexCount * itemSize );
					const dstAttribute = new srcAttribute.constructor( dstArray, itemSize, normalized );
					dstAttribute.setUsage( srcAttribute.usage );

					geometry.setAttribute( attributeName, dstAttribute );

				}

				if ( reference.getIndex() !== null ) {

					const indexArray = maxVertexCount > 65536
						? new Uint32Array( maxIndexCount )
						: new Uint16Array( maxIndexCount );

					geometry.setIndex( new three_1.BufferAttribute( indexArray, 1 ) );

				}

				const idArray = maxGeometryCount > 65536
					? new Uint32Array( maxVertexCount )
					: new Uint16Array( maxVertexCount );
				geometry.setAttribute( ID_ATTR_NAME, new three_1.BufferAttribute( idArray, 1 ) );

				this._geometryInitialized = true;

			}

		}

		// Make sure the geometry is compatible with the existing combined geometry atributes
		_validateGeometry( geometry ) {

			// check that the geometry doesn't have a version of our reserved id attribute
			if ( geometry.getAttribute( ID_ATTR_NAME ) ) {

				throw new Error( `BatchedMesh: Geometry cannot use attribute "${ ID_ATTR_NAME }"` );

			}

			// check to ensure the geometries are using consistent attributes and indices
			const batchGeometry = this.geometry;
			if ( Boolean( geometry.getIndex() ) !== Boolean( batchGeometry.getIndex() ) ) {

				throw new Error( 'BatchedMesh: All geometries must consistently have "index".' );

			}

			for ( const attributeName in batchGeometry.attributes ) {

				if ( attributeName === ID_ATTR_NAME ) {

					continue;

				}

				if ( ! geometry.hasAttribute( attributeName ) ) {

					throw new Error( `BatchedMesh: Added geometry missing "${ attributeName }". All geometries must have consistent attributes.` );

				}

				const srcAttribute = geometry.getAttribute( attributeName );
				const dstAttribute = batchGeometry.getAttribute( attributeName );
				if ( srcAttribute.itemSize !== dstAttribute.itemSize || srcAttribute.normalized !== dstAttribute.normalized ) {

					throw new Error( 'BatchedMesh: All attributes must have a consistent itemSize and normalized value.' );

				}

			}

		}

		setCustomSort( func ) {

			this.customSort = func;
			return this;

		}

		computeBoundingBox() {

			if ( this.boundingBox === null ) {

				this.boundingBox = new three_1.Box3();

			}

			const geometryCount = this._geometryCount;
			const boundingBox = this.boundingBox;
			const active = this._active;

			boundingBox.makeEmpty();
			for ( let i = 0; i < geometryCount; i ++ ) {

				if ( active[ i ] === false ) continue;

				this.getMatrixAt( i, _matrix );
				this.getBoundingBoxAt( i, _box ).applyMatrix4( _matrix );
				boundingBox.union( _box );

			}

		}

		computeBoundingSphere() {

			if ( this.boundingSphere === null ) {

				this.boundingSphere = new three_1.Sphere();

			}

			const geometryCount = this._geometryCount;
			const boundingSphere = this.boundingSphere;
			const active = this._active;

			boundingSphere.makeEmpty();
			for ( let i = 0; i < geometryCount; i ++ ) {

				if ( active[ i ] === false ) continue;

				this.getMatrixAt( i, _matrix );
				this.getBoundingSphereAt( i, _sphere$2 ).applyMatrix4( _matrix );
				boundingSphere.union( _sphere$2 );

			}

		}

		addGeometry( geometry, vertexCount = -1, indexCount = -1 ) {

			this._initializeGeometry( geometry );

			this._validateGeometry( geometry );

			// ensure we're not over geometry
			if ( this._geometryCount >= this._maxGeometryCount ) {

				throw new Error( 'BatchedMesh: Maximum geometry count reached.' );

			}

			// get the necessary range fo the geometry
			const reservedRange = {
				vertexStart: -1,
				vertexCount: -1,
				indexStart: -1,
				indexCount: -1,
			};

			let lastRange = null;
			const reservedRanges = this._reservedRanges;
			const drawRanges = this._drawRanges;
			const bounds = this._bounds;
			if ( this._geometryCount !== 0 ) {

				lastRange = reservedRanges[ reservedRanges.length - 1 ];

			}

			if ( vertexCount === -1 ) {

				reservedRange.vertexCount = geometry.getAttribute( 'position' ).count;

			} else {

				reservedRange.vertexCount = vertexCount;

			}

			if ( lastRange === null ) {

				reservedRange.vertexStart = 0;

			} else {

				reservedRange.vertexStart = lastRange.vertexStart + lastRange.vertexCount;

			}

			const index = geometry.getIndex();
			const hasIndex = index !== null;
			if ( hasIndex ) {

				if ( indexCount	=== -1 ) {

					reservedRange.indexCount = index.count;

				} else {

					reservedRange.indexCount = indexCount;

				}

				if ( lastRange === null ) {

					reservedRange.indexStart = 0;

				} else {

					reservedRange.indexStart = lastRange.indexStart + lastRange.indexCount;

				}

			}

			if (
				reservedRange.indexStart !== -1 &&
				reservedRange.indexStart + reservedRange.indexCount > this._maxIndexCount ||
				reservedRange.vertexStart + reservedRange.vertexCount > this._maxVertexCount
			) {

				throw new Error( 'BatchedMesh: Reserved space request exceeds the maximum buffer size.' );

			}

			const visibility = this._visibility;
			const active = this._active;
			const matricesTexture = this._matricesTexture;
			const matricesArray = this._matricesTexture.image.data;

			// push new visibility states
			visibility.push( true );
			active.push( true );

			// update id
			const geometryId = this._geometryCount;
			this._geometryCount ++;

			// initialize matrix information
			_identityMatrix.toArray( matricesArray, geometryId * 16 );
			matricesTexture.needsUpdate = true;

			// add the reserved range and draw range objects
			reservedRanges.push( reservedRange );
			drawRanges.push( {
				start: hasIndex ? reservedRange.indexStart : reservedRange.vertexStart,
				count: -1
			} );
			bounds.push( {
				boxInitialized: false,
				box: new three_1.Box3(),

				sphereInitialized: false,
				sphere: new three_1.Sphere()
			} );

			// set the id for the geometry
			const idAttribute = this.geometry.getAttribute( ID_ATTR_NAME );
			for ( let i = 0; i < reservedRange.vertexCount; i ++ ) {

				idAttribute.setX( reservedRange.vertexStart + i, geometryId );

			}

			idAttribute.needsUpdate = true;

			// update the geometry
			this.setGeometryAt( geometryId, geometry );

			return geometryId;

		}

		setGeometryAt( id, geometry ) {

			if ( id >= this._geometryCount ) {

				throw new Error( 'BatchedMesh: Maximum geometry count reached.' );

			}

			this._validateGeometry( geometry );

			const batchGeometry = this.geometry;
			const hasIndex = batchGeometry.getIndex() !== null;
			const dstIndex = batchGeometry.getIndex();
			const srcIndex = geometry.getIndex();
			const reservedRange = this._reservedRanges[ id ];
			if (
				hasIndex &&
				srcIndex.count > reservedRange.indexCount ||
				geometry.attributes.position.count > reservedRange.vertexCount
			) {

				throw new Error( 'BatchedMesh: Reserved space not large enough for provided geometry.' );

			}

			// copy geometry over
			const vertexStart = reservedRange.vertexStart;
			const vertexCount = reservedRange.vertexCount;
			for ( const attributeName in batchGeometry.attributes ) {

				if ( attributeName === ID_ATTR_NAME ) {

					continue;

				}

				// copy attribute data
				const srcAttribute = geometry.getAttribute( attributeName );
				const dstAttribute = batchGeometry.getAttribute( attributeName );
				copyAttributeData( srcAttribute, dstAttribute, vertexStart );

				// fill the rest in with zeroes
				const itemSize = srcAttribute.itemSize;
				for ( let i = srcAttribute.count, l = vertexCount; i < l; i ++ ) {

					const index = vertexStart + i;
					for ( let c = 0; c < itemSize; c ++ ) {

						dstAttribute.setComponent( index, c, 0 );

					}

				}

				dstAttribute.needsUpdate = true;

			}

			// copy index
			if ( hasIndex ) {

				const indexStart = reservedRange.indexStart;

				// copy index data over
				for ( let i = 0; i < srcIndex.count; i ++ ) {

					dstIndex.setX( indexStart + i, vertexStart + srcIndex.getX( i ) );

				}

				// fill the rest in with zeroes
				for ( let i = srcIndex.count, l = reservedRange.indexCount; i < l; i ++ ) {

					dstIndex.setX( indexStart + i, vertexStart );

				}

				dstIndex.needsUpdate = true;

			}

			// store the bounding boxes
			const bound = this._bounds[ id ];
			if ( geometry.boundingBox !== null ) {

				bound.box.copy( geometry.boundingBox );
				bound.boxInitialized = true;

			} else {

				bound.boxInitialized = false;

			}

			if ( geometry.boundingSphere !== null ) {

				bound.sphere.copy( geometry.boundingSphere );
				bound.sphereInitialized = true;

			} else {

				bound.sphereInitialized = false;

			}

			// set drawRange count
			const drawRange = this._drawRanges[ id ];
			const posAttr = geometry.getAttribute( 'position' );
			drawRange.count = hasIndex ? srcIndex.count : posAttr.count;
			this._visibilityChanged = true;

			return id;

		}

		deleteGeometry( geometryId ) {

			// Note: User needs to call optimize() afterward to pack the data.

			const active = this._active;
			if ( geometryId >= active.length || active[ geometryId ] === false ) {

				return this;

			}

			active[ geometryId ] = false;
			this._visibilityChanged = true;

			return this;

		}

		// get bounding box and compute it if it doesn't exist
		getBoundingBoxAt( id, target ) {

			const active = this._active;
			if ( active[ id ] === false ) {

				return this;

			}

			// compute bounding box
			const bound = this._bounds[ id ];
			const box = bound.box;
			const geometry = this.geometry;
			if ( bound.boxInitialized === false ) {

				box.makeEmpty();

				const index = geometry.index;
				const position = geometry.attributes.position;
				const drawRange = this._drawRanges[ id ];
				for ( let i = drawRange.start, l = drawRange.start + drawRange.count; i < l; i ++ ) {

					let iv = i;
					if ( index ) {

						iv = index.getX( iv );

					}

					box.expandByPoint( _vector.fromBufferAttribute( position, iv ) );

				}

				bound.boxInitialized = true;

			}

			target.copy( box );
			return target;

		}

		// get bounding sphere and compute it if it doesn't exist
		getBoundingSphereAt( id, target ) {

			const active = this._active;
			if ( active[ id ] === false ) {

				return this;

			}

			// compute bounding sphere
			const bound = this._bounds[ id ];
			const sphere = bound.sphere;
			const geometry = this.geometry;
			if ( bound.sphereInitialized === false ) {

				sphere.makeEmpty();

				this.getBoundingBoxAt( id, _box );
				_box.getCenter( sphere.center );

				const index = geometry.index;
				const position = geometry.attributes.position;
				const drawRange = this._drawRanges[ id ];

				let maxRadiusSq = 0;
				for ( let i = drawRange.start, l = drawRange.start + drawRange.count; i < l; i ++ ) {

					let iv = i;
					if ( index ) {

						iv = index.getX( iv );

					}

					_vector.fromBufferAttribute( position, iv );
					maxRadiusSq = Math.max( maxRadiusSq, sphere.center.distanceToSquared( _vector ) );

				}

				sphere.radius = Math.sqrt( maxRadiusSq );
				bound.sphereInitialized = true;

			}

			target.copy( sphere );
			return target;

		}

		setMatrixAt( geometryId, matrix ) {

			// @TODO: Map geometryId to index of the arrays because
			//        optimize() can make geometryId mismatch the index

			const active = this._active;
			const matricesTexture = this._matricesTexture;
			const matricesArray = this._matricesTexture.image.data;
			const geometryCount = this._geometryCount;
			if ( geometryId >= geometryCount || active[ geometryId ] === false ) {

				return this;

			}

			matrix.toArray( matricesArray, geometryId * 16 );
			matricesTexture.needsUpdate = true;

			return this;

		}

		getMatrixAt( geometryId, matrix ) {

			const active = this._active;
			const matricesArray = this._matricesTexture.image.data;
			const geometryCount = this._geometryCount;
			if ( geometryId >= geometryCount || active[ geometryId ] === false ) {

				return null;

			}

			return matrix.fromArray( matricesArray, geometryId * 16 );

		}

		setVisibleAt( geometryId, value ) {

			const visibility = this._visibility;
			const active = this._active;
			const geometryCount = this._geometryCount;

			// if the geometry is out of range, not active, or visibility state
			// does not change then return early
			if (
				geometryId >= geometryCount ||
				active[ geometryId ] === false ||
				visibility[ geometryId ] === value
			) {

				return this;

			}

			visibility[ geometryId ] = value;
			this._visibilityChanged = true;

			return this;

		}

		getVisibleAt( geometryId ) {

			const visibility = this._visibility;
			const active = this._active;
			const geometryCount = this._geometryCount;

			// return early if the geometry is out of range or not active
			if ( geometryId >= geometryCount || active[ geometryId ] === false ) {

				return false;

			}

			return visibility[ geometryId ];

		}

		raycast( raycaster, intersects ) {

			const visibility = this._visibility;
			const active = this._active;
			const drawRanges = this._drawRanges;
			const geometryCount = this._geometryCount;
			const matrixWorld = this.matrixWorld;
			const batchGeometry = this.geometry;

			// iterate over each geometry
			_mesh.material = this.material;
			_mesh.geometry.index = batchGeometry.index;
			_mesh.geometry.attributes = batchGeometry.attributes;
			if ( _mesh.geometry.boundingBox === null ) {

				_mesh.geometry.boundingBox = new three_1.Box3();

			}

			if ( _mesh.geometry.boundingSphere === null ) {

				_mesh.geometry.boundingSphere = new three_1.Sphere();

			}

			for ( let i = 0; i < geometryCount; i ++ ) {

				if ( ! visibility[ i ] || ! active[ i ] ) {

					continue;

				}

				const drawRange = drawRanges[ i ];
				_mesh.geometry.setDrawRange( drawRange.start, drawRange.count );

				// ge the intersects
				this.getMatrixAt( i, _mesh.matrixWorld ).premultiply( matrixWorld );
				this.getBoundingBoxAt( i, _mesh.geometry.boundingBox );
				this.getBoundingSphereAt( i, _mesh.geometry.boundingSphere );
				_mesh.raycast( raycaster, _batchIntersects );

				// add batch id to the intersects
				for ( let j = 0, l = _batchIntersects.length; j < l; j ++ ) {

					const intersect = _batchIntersects[ j ];
					intersect.object = this;
					intersect.batchId = i;
					intersects.push( intersect );

				}

				_batchIntersects.length = 0;

			}

			_mesh.material = null;
			_mesh.geometry.index = null;
			_mesh.geometry.attributes = {};
			_mesh.geometry.setDrawRange( 0, Infinity );

		}

		copy( source ) {

			super.copy( source );

			this.geometry = source.geometry.clone();
			this.perObjectFrustumCulled = source.perObjectFrustumCulled;
			this.sortObjects = source.sortObjects;
			this.boundingBox = source.boundingBox !== null ? source.boundingBox.clone() : null;
			this.boundingSphere = source.boundingSphere !== null ? source.boundingSphere.clone() : null;

			this._drawRanges = source._drawRanges.map( range => ( { ...range } ) );
			this._reservedRanges = source._reservedRanges.map( range => ( { ...range } ) );

			this._visibility = source._visibility.slice();
			this._active = source._active.slice();
			this._bounds = source._bounds.map( bound => ( {
				boxInitialized: bound.boxInitialized,
				box: bound.box.clone(),

				sphereInitialized: bound.sphereInitialized,
				sphere: bound.sphere.clone()
			} ) );

			this._maxGeometryCount = source._maxGeometryCount;
			this._maxVertexCount = source._maxVertexCount;
			this._maxIndexCount = source._maxIndexCount;

			this._geometryInitialized = source._geometryInitialized;
			this._geometryCount = source._geometryCount;
			this._multiDrawCounts = source._multiDrawCounts.slice();
			this._multiDrawStarts = source._multiDrawStarts.slice();

			this._matricesTexture = source._matricesTexture.clone();
			this._matricesTexture.image.data = this._matricesTexture.image.slice();

			return this;

		}

		dispose() {

			// Assuming the geometry is not shared with other meshes
			this.geometry.dispose();

			this._matricesTexture.dispose();
			this._matricesTexture = null;
			return this;

		}

		onBeforeRender( renderer, scene, camera, geometry, material/*, _group*/ ) {

			// if visibility has not changed and frustum culling and object sorting is not required
			// then skip iterating over all items
			if ( ! this._visibilityChanged && ! this.perObjectFrustumCulled && ! this.sortObjects ) {

				return;

			}

			// the indexed version of the multi draw function requires specifying the start
			// offset in bytes.
			const index = geometry.getIndex();
			const bytesPerElement = index === null ? 1 : index.array.BYTES_PER_ELEMENT;

			const visibility = this._visibility;
			const multiDrawStarts = this._multiDrawStarts;
			const multiDrawCounts = this._multiDrawCounts;
			const drawRanges = this._drawRanges;
			const perObjectFrustumCulled = this.perObjectFrustumCulled;

			// prepare the frustum in the local frame
			if ( perObjectFrustumCulled ) {

				_projScreenMatrix
					.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse )
					.multiply( this.matrixWorld );
				_frustum.setFromProjectionMatrix(
					_projScreenMatrix,
					renderer.isWebGPURenderer ? three_1.WebGPUCoordinateSystem : three_1.WebGLCoordinateSystem
				);

			}

			let count = 0;
			if ( this.sortObjects ) {

				// get the camera position in the local frame
				_invMatrixWorld.copy( this.matrixWorld ).invert();
				_vector.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _invMatrixWorld );

				for ( let i = 0, l = visibility.length; i < l; i ++ ) {

					if ( visibility[ i ] ) {

						// get the bounds in world space
						this.getMatrixAt( i, _matrix );
						this.getBoundingSphereAt( i, _sphere$2 ).applyMatrix4( _matrix );

						// determine whether the batched geometry is within the frustum
						let culled = false;
						if ( perObjectFrustumCulled ) {

							culled = ! _frustum.intersectsSphere( _sphere$2 );

						}

						if ( ! culled ) {

							// get the distance from camera used for sorting
							const z = _vector.distanceTo( _sphere$2.center );
							_renderList.push( drawRanges[ i ], z );

						}

					}

				}

				// Sort the draw ranges and prep for rendering
				const list = _renderList.list;
				const customSort = this.customSort;
				if ( customSort === null ) {

					list.sort( material.transparent ? sortTransparent : sortOpaque );

				} else {

					customSort.call( this, list, camera );

				}

				for ( let i = 0, l = list.length; i < l; i ++ ) {

					const item = list[ i ];
					multiDrawStarts[ count ] = item.start * bytesPerElement;
					multiDrawCounts[ count ] = item.count;
					count ++;

				}

				_renderList.reset();

			} else {

				for ( let i = 0, l = visibility.length; i < l; i ++ ) {

					if ( visibility[ i ] ) {

						// determine whether the batched geometry is within the frustum
						let culled = false;
						if ( perObjectFrustumCulled ) {

							// get the bounds in world space
							this.getMatrixAt( i, _matrix );
							this.getBoundingSphereAt( i, _sphere$2 ).applyMatrix4( _matrix );
							culled = ! _frustum.intersectsSphere( _sphere$2 );

						}

						if ( ! culled ) {

							const range = drawRanges[ i ];
							multiDrawStarts[ count ] = range.start * bytesPerElement;
							multiDrawCounts[ count ] = range.count;
							count ++;

						}

					}

				}

			}

			this._multiDrawCount = count;
			this._visibilityChanged = false;

		}

		onBeforeShadow( renderer, object, camera, shadowCamera, geometry, depthMaterial/* , group */ ) {

			this.onBeforeRender( renderer, null, shadowCamera, geometry, depthMaterial );

		}

	}

	class LineBasicMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isLineBasicMaterial = true;

			this.type = 'LineBasicMaterial';

			this.color = new three_1.Color( 0xffffff );

			this.map = null;

			this.linewidth = 1;
			this.linecap = 'round';
			this.linejoin = 'round';

			this.fog = true;

			this.setValues( parameters );

		}


		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );

			this.map = source.map;

			this.linewidth = source.linewidth;
			this.linecap = source.linecap;
			this.linejoin = source.linejoin;

			this.fog = source.fog;

			return this;

		}

	}

	const _start$1 = /*@__PURE__*/ new three_1.Vector3();
	const _end$1 = /*@__PURE__*/ new three_1.Vector3();
	const _inverseMatrix$1 = /*@__PURE__*/ new three_1.Matrix4();
	const _ray$1 = /*@__PURE__*/ new three_1.Ray();
	const _sphere$1 = /*@__PURE__*/ new three_1.Sphere();

	class Line extends three_1.Object3D {

		constructor( geometry = new three_2.BufferGeometry(), material = new LineBasicMaterial() ) {

			super();

			this.isLine = true;

			this.type = 'Line';

			this.geometry = geometry;
			this.material = material;

			this.updateMorphTargets();

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			this.material = Array.isArray( source.material ) ? source.material.slice() : source.material;
			this.geometry = source.geometry;

			return this;

		}

		computeLineDistances() {

			const geometry = this.geometry;

			// we assume non-indexed geometry

			if ( geometry.index === null ) {

				const positionAttribute = geometry.attributes.position;
				const lineDistances = [ 0 ];

				for ( let i = 1, l = positionAttribute.count; i < l; i ++ ) {

					_start$1.fromBufferAttribute( positionAttribute, i - 1 );
					_end$1.fromBufferAttribute( positionAttribute, i );

					lineDistances[ i ] = lineDistances[ i - 1 ];
					lineDistances[ i ] += _start$1.distanceTo( _end$1 );

				}

				geometry.setAttribute( 'lineDistance', new three_1.Float32BufferAttribute( lineDistances, 1 ) );

			} else {

				console.warn( 'THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.' );

			}

			return this;

		}

		raycast( raycaster, intersects ) {

			const geometry = this.geometry;
			const matrixWorld = this.matrixWorld;
			const threshold = raycaster.params.Line.threshold;
			const drawRange = geometry.drawRange;

			// Checking boundingSphere distance to ray

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			_sphere$1.copy( geometry.boundingSphere );
			_sphere$1.applyMatrix4( matrixWorld );
			_sphere$1.radius += threshold;

			if ( raycaster.ray.intersectsSphere( _sphere$1 ) === false ) return;

			//

			_inverseMatrix$1.copy( matrixWorld ).invert();
			_ray$1.copy( raycaster.ray ).applyMatrix4( _inverseMatrix$1 );

			const localThreshold = threshold / ( ( this.scale.x + this.scale.y + this.scale.z ) / 3 );
			const localThresholdSq = localThreshold * localThreshold;

			const vStart = new three_1.Vector3();
			const vEnd = new three_1.Vector3();
			const interSegment = new three_1.Vector3();
			const interRay = new three_1.Vector3();
			const step = this.isLineSegments ? 2 : 1;

			const index = geometry.index;
			const attributes = geometry.attributes;
			const positionAttribute = attributes.position;

			if ( index !== null ) {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, l = end - 1; i < l; i += step ) {

					const a = index.getX( i );
					const b = index.getX( i + 1 );

					vStart.fromBufferAttribute( positionAttribute, a );
					vEnd.fromBufferAttribute( positionAttribute, b );

					const distSq = _ray$1.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

					if ( distSq > localThresholdSq ) continue;

					interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

					const distance = raycaster.ray.origin.distanceTo( interRay );

					if ( distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						// What do we want? intersection point on the ray or on the segment??
						// point: raycaster.ray.at( distance ),
						point: interSegment.clone().applyMatrix4( this.matrixWorld ),
						index: i,
						face: null,
						faceIndex: null,
						object: this

					} );

				}

			} else {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( positionAttribute.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, l = end - 1; i < l; i += step ) {

					vStart.fromBufferAttribute( positionAttribute, i );
					vEnd.fromBufferAttribute( positionAttribute, i + 1 );

					const distSq = _ray$1.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

					if ( distSq > localThresholdSq ) continue;

					interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

					const distance = raycaster.ray.origin.distanceTo( interRay );

					if ( distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						// What do we want? intersection point on the ray or on the segment??
						// point: raycaster.ray.at( distance ),
						point: interSegment.clone().applyMatrix4( this.matrixWorld ),
						index: i,
						face: null,
						faceIndex: null,
						object: this

					} );

				}

			}

		}

		updateMorphTargets() {

			const geometry = this.geometry;

			const morphAttributes = geometry.morphAttributes;
			const keys = Object.keys( morphAttributes );

			if ( keys.length > 0 ) {

				const morphAttribute = morphAttributes[ keys[ 0 ] ];

				if ( morphAttribute !== undefined ) {

					this.morphTargetInfluences = [];
					this.morphTargetDictionary = {};

					for ( let m = 0, ml = morphAttribute.length; m < ml; m ++ ) {

						const name = morphAttribute[ m ].name || String( m );

						this.morphTargetInfluences.push( 0 );
						this.morphTargetDictionary[ name ] = m;

					}

				}

			}

		}

	}

	const _start = /*@__PURE__*/ new three_1.Vector3();
	const _end = /*@__PURE__*/ new three_1.Vector3();

	class LineSegments extends Line {

		constructor( geometry, material ) {

			super( geometry, material );

			this.isLineSegments = true;

			this.type = 'LineSegments';

		}

		computeLineDistances() {

			const geometry = this.geometry;

			// we assume non-indexed geometry

			if ( geometry.index === null ) {

				const positionAttribute = geometry.attributes.position;
				const lineDistances = [];

				for ( let i = 0, l = positionAttribute.count; i < l; i += 2 ) {

					_start.fromBufferAttribute( positionAttribute, i );
					_end.fromBufferAttribute( positionAttribute, i + 1 );

					lineDistances[ i ] = ( i === 0 ) ? 0 : lineDistances[ i - 1 ];
					lineDistances[ i + 1 ] = lineDistances[ i ] + _start.distanceTo( _end );

				}

				geometry.setAttribute( 'lineDistance', new three_1.Float32BufferAttribute( lineDistances, 1 ) );

			} else {

				console.warn( 'THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.' );

			}

			return this;

		}

	}

	class LineLoop extends Line {

		constructor( geometry, material ) {

			super( geometry, material );

			this.isLineLoop = true;

			this.type = 'LineLoop';

		}

	}

	class PointsMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isPointsMaterial = true;

			this.type = 'PointsMaterial';

			this.color = new three_1.Color( 0xffffff );

			this.map = null;

			this.alphaMap = null;

			this.size = 1;
			this.sizeAttenuation = true;

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );

			this.map = source.map;

			this.alphaMap = source.alphaMap;

			this.size = source.size;
			this.sizeAttenuation = source.sizeAttenuation;

			this.fog = source.fog;

			return this;

		}

	}

	const _inverseMatrix = /*@__PURE__*/ new three_1.Matrix4();
	const _ray = /*@__PURE__*/ new three_1.Ray();
	const _sphere = /*@__PURE__*/ new three_1.Sphere();
	const _position = /*@__PURE__*/ new three_1.Vector3();

	class Points extends three_1.Object3D {

		constructor( geometry = new three_2.BufferGeometry(), material = new PointsMaterial() ) {

			super();

			this.isPoints = true;

			this.type = 'Points';

			this.geometry = geometry;
			this.material = material;

			this.updateMorphTargets();

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			this.material = Array.isArray( source.material ) ? source.material.slice() : source.material;
			this.geometry = source.geometry;

			return this;

		}

		raycast( raycaster, intersects ) {

			const geometry = this.geometry;
			const matrixWorld = this.matrixWorld;
			const threshold = raycaster.params.Points.threshold;
			const drawRange = geometry.drawRange;

			// Checking boundingSphere distance to ray

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			_sphere.copy( geometry.boundingSphere );
			_sphere.applyMatrix4( matrixWorld );
			_sphere.radius += threshold;

			if ( raycaster.ray.intersectsSphere( _sphere ) === false ) return;

			//

			_inverseMatrix.copy( matrixWorld ).invert();
			_ray.copy( raycaster.ray ).applyMatrix4( _inverseMatrix );

			const localThreshold = threshold / ( ( this.scale.x + this.scale.y + this.scale.z ) / 3 );
			const localThresholdSq = localThreshold * localThreshold;

			const index = geometry.index;
			const attributes = geometry.attributes;
			const positionAttribute = attributes.position;

			if ( index !== null ) {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, il = end; i < il; i ++ ) {

					const a = index.getX( i );

					_position.fromBufferAttribute( positionAttribute, a );

					testPoint( _position, a, localThresholdSq, matrixWorld, raycaster, intersects, this );

				}

			} else {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( positionAttribute.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, l = end; i < l; i ++ ) {

					_position.fromBufferAttribute( positionAttribute, i );

					testPoint( _position, i, localThresholdSq, matrixWorld, raycaster, intersects, this );

				}

			}

		}

		updateMorphTargets() {

			const geometry = this.geometry;

			const morphAttributes = geometry.morphAttributes;
			const keys = Object.keys( morphAttributes );

			if ( keys.length > 0 ) {

				const morphAttribute = morphAttributes[ keys[ 0 ] ];

				if ( morphAttribute !== undefined ) {

					this.morphTargetInfluences = [];
					this.morphTargetDictionary = {};

					for ( let m = 0, ml = morphAttribute.length; m < ml; m ++ ) {

						const name = morphAttribute[ m ].name || String( m );

						this.morphTargetInfluences.push( 0 );
						this.morphTargetDictionary[ name ] = m;

					}

				}

			}

		}

	}

	function testPoint( point, index, localThresholdSq, matrixWorld, raycaster, intersects, object ) {

		const rayPointDistanceSq = _ray.distanceSqToPoint( point );

		if ( rayPointDistanceSq < localThresholdSq ) {

			const intersectPoint = new three_1.Vector3();

			_ray.closestPointToPoint( point, intersectPoint );
			intersectPoint.applyMatrix4( matrixWorld );

			const distance = raycaster.ray.origin.distanceTo( intersectPoint );

			if ( distance < raycaster.near || distance > raycaster.far ) return;

			intersects.push( {

				distance: distance,
				distanceToRay: Math.sqrt( rayPointDistanceSq ),
				point: intersectPoint,
				index: index,
				face: null,
				object: object

			} );

		}

	}

	class VideoTexture extends three_1.Texture {

		constructor( video, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy ) {

			super( video, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

			this.isVideoTexture = true;

			this.minFilter = minFilter !== undefined ? minFilter : three_1.LinearFilter;
			this.magFilter = magFilter !== undefined ? magFilter : three_1.LinearFilter;

			this.generateMipmaps = false;

			const scope = this;

			function updateVideo() {

				scope.needsUpdate = true;
				video.requestVideoFrameCallback( updateVideo );

			}

			if ( 'requestVideoFrameCallback' in video ) {

				video.requestVideoFrameCallback( updateVideo );

			}

		}

		clone() {

			return new this.constructor( this.image ).copy( this );

		}

		update() {

			const video = this.image;
			const hasVideoFrameCallback = 'requestVideoFrameCallback' in video;

			if ( hasVideoFrameCallback === false && video.readyState >= video.HAVE_CURRENT_DATA ) {

				this.needsUpdate = true;

			}

		}

	}

	class FramebufferTexture extends three_1.Texture {

		constructor( width, height ) {

			super( { width, height } );

			this.isFramebufferTexture = true;

			this.magFilter = three_1.NearestFilter;
			this.minFilter = three_1.NearestFilter;

			this.generateMipmaps = false;

			this.needsUpdate = true;

		}

	}

	class CompressedTexture extends three_1.Texture {

		constructor( mipmaps, width, height, format, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, colorSpace ) {

			super( null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, colorSpace );

			this.isCompressedTexture = true;

			this.image = { width: width, height: height };
			this.mipmaps = mipmaps;

			// no flipping for cube textures
			// (also flipping doesn't work for compressed textures )

			this.flipY = false;

			// can't generate mipmaps for compressed textures
			// mips must be embedded in DDS files

			this.generateMipmaps = false;

		}

	}

	class CompressedArrayTexture extends CompressedTexture {

		constructor( mipmaps, width, height, depth, format, type ) {

			super( mipmaps, width, height, format, type );

			this.isCompressedArrayTexture = true;
			this.image.depth = depth;
			this.wrapR = three_1.ClampToEdgeWrapping;

		}

	}

	class CompressedCubeTexture extends CompressedTexture {

		constructor( images, format, type ) {

			super( undefined, images[ 0 ].width, images[ 0 ].height, format, type, three_1.CubeReflectionMapping );

			this.isCompressedCubeTexture = true;
			this.isCubeTexture = true;

			this.image = images;

		}

	}

	class CanvasTexture extends three_1.Texture {

		constructor( canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy ) {

			super( canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

			this.isCanvasTexture = true;

			this.needsUpdate = true;

		}

	}

	/**
	 * Extensible curve object.
	 *
	 * Some common of curve methods:
	 * .getPoint( t, optionalTarget ), .getTangent( t, optionalTarget )
	 * .getPointAt( u, optionalTarget ), .getTangentAt( u, optionalTarget )
	 * .getPoints(), .getSpacedPoints()
	 * .getLength()
	 * .updateArcLengths()
	 *
	 * This following curves inherit from THREE.Curve:
	 *
	 * -- 2D curves --
	 * THREE.ArcCurve
	 * THREE.CubicBezierCurve
	 * THREE.EllipseCurve
	 * THREE.LineCurve
	 * THREE.QuadraticBezierCurve
	 * THREE.SplineCurve
	 *
	 * -- 3D curves --
	 * THREE.CatmullRomCurve3
	 * THREE.CubicBezierCurve3
	 * THREE.LineCurve3
	 * THREE.QuadraticBezierCurve3
	 *
	 * A series of curves can be represented as a THREE.CurvePath.
	 *
	 **/

	class Curve {

		constructor() {

			this.type = 'Curve';

			this.arcLengthDivisions = 200;

		}

		// Virtual base class method to overwrite and implement in subclasses
		//	- t [0 .. 1]

		getPoint( /* t, optionalTarget */ ) {

			console.warn( 'THREE.Curve: .getPoint() not implemented.' );
			return null;

		}

		// Get point at relative position in curve according to arc length
		// - u [0 .. 1]

		getPointAt( u, optionalTarget ) {

			const t = this.getUtoTmapping( u );
			return this.getPoint( t, optionalTarget );

		}

		// Get sequence of points using getPoint( t )

		getPoints( divisions = 5 ) {

			const points = [];

			for ( let d = 0; d <= divisions; d ++ ) {

				points.push( this.getPoint( d / divisions ) );

			}

			return points;

		}

		// Get sequence of points using getPointAt( u )

		getSpacedPoints( divisions = 5 ) {

			const points = [];

			for ( let d = 0; d <= divisions; d ++ ) {

				points.push( this.getPointAt( d / divisions ) );

			}

			return points;

		}

		// Get total curve arc length

		getLength() {

			const lengths = this.getLengths();
			return lengths[ lengths.length - 1 ];

		}

		// Get list of cumulative segment lengths

		getLengths( divisions = this.arcLengthDivisions ) {

			if ( this.cacheArcLengths &&
				( this.cacheArcLengths.length === divisions + 1 ) &&
				! this.needsUpdate ) {

				return this.cacheArcLengths;

			}

			this.needsUpdate = false;

			const cache = [];
			let current, last = this.getPoint( 0 );
			let sum = 0;

			cache.push( 0 );

			for ( let p = 1; p <= divisions; p ++ ) {

				current = this.getPoint( p / divisions );
				sum += current.distanceTo( last );
				cache.push( sum );
				last = current;

			}

			this.cacheArcLengths = cache;

			return cache; // { sums: cache, sum: sum }; Sum is in the last element.

		}

		updateArcLengths() {

			this.needsUpdate = true;
			this.getLengths();

		}

		// Given u ( 0 .. 1 ), get a t to find p. This gives you points which are equidistant

		getUtoTmapping( u, distance ) {

			const arcLengths = this.getLengths();

			let i = 0;
			const il = arcLengths.length;

			let targetArcLength; // The targeted u distance value to get

			if ( distance ) {

				targetArcLength = distance;

			} else {

				targetArcLength = u * arcLengths[ il - 1 ];

			}

			// binary search for the index with largest value smaller than target u distance

			let low = 0, high = il - 1, comparison;

			while ( low <= high ) {

				i = Math.floor( low + ( high - low ) / 2 ); // less likely to overflow, though probably not issue here, JS doesn't really have integers, all numbers are floats

				comparison = arcLengths[ i ] - targetArcLength;

				if ( comparison < 0 ) {

					low = i + 1;

				} else if ( comparison > 0 ) {

					high = i - 1;

				} else {

					high = i;
					break;

					// DONE

				}

			}

			i = high;

			if ( arcLengths[ i ] === targetArcLength ) {

				return i / ( il - 1 );

			}

			// we could get finer grain at lengths, or use simple interpolation between two points

			const lengthBefore = arcLengths[ i ];
			const lengthAfter = arcLengths[ i + 1 ];

			const segmentLength = lengthAfter - lengthBefore;

			// determine where we are between the 'before' and 'after' points

			const segmentFraction = ( targetArcLength - lengthBefore ) / segmentLength;

			// add that fractional amount to t

			const t = ( i + segmentFraction ) / ( il - 1 );

			return t;

		}

		// Returns a unit vector tangent at t
		// In case any sub curve does not implement its tangent derivation,
		// 2 points a small delta apart will be used to find its gradient
		// which seems to give a reasonable approximation

		getTangent( t, optionalTarget ) {

			const delta = 0.0001;
			let t1 = t - delta;
			let t2 = t + delta;

			// Capping in case of danger

			if ( t1 < 0 ) t1 = 0;
			if ( t2 > 1 ) t2 = 1;

			const pt1 = this.getPoint( t1 );
			const pt2 = this.getPoint( t2 );

			const tangent = optionalTarget || ( ( pt1.isVector2 ) ? new three_1.Vector2() : new three_1.Vector3() );

			tangent.copy( pt2 ).sub( pt1 ).normalize();

			return tangent;

		}

		getTangentAt( u, optionalTarget ) {

			const t = this.getUtoTmapping( u );
			return this.getTangent( t, optionalTarget );

		}

		computeFrenetFrames( segments, closed ) {

			// see http://www.cs.indiana.edu/pub/techreports/TR425.pdf

			const normal = new three_1.Vector3();

			const tangents = [];
			const normals = [];
			const binormals = [];

			const vec = new three_1.Vector3();
			const mat = new three_1.Matrix4();

			// compute the tangent vectors for each segment on the curve

			for ( let i = 0; i <= segments; i ++ ) {

				const u = i / segments;

				tangents[ i ] = this.getTangentAt( u, new three_1.Vector3() );

			}

			// select an initial normal vector perpendicular to the first tangent vector,
			// and in the direction of the minimum tangent xyz component

			normals[ 0 ] = new three_1.Vector3();
			binormals[ 0 ] = new three_1.Vector3();
			let min = Number.MAX_VALUE;
			const tx = Math.abs( tangents[ 0 ].x );
			const ty = Math.abs( tangents[ 0 ].y );
			const tz = Math.abs( tangents[ 0 ].z );

			if ( tx <= min ) {

				min = tx;
				normal.set( 1, 0, 0 );

			}

			if ( ty <= min ) {

				min = ty;
				normal.set( 0, 1, 0 );

			}

			if ( tz <= min ) {

				normal.set( 0, 0, 1 );

			}

			vec.crossVectors( tangents[ 0 ], normal ).normalize();

			normals[ 0 ].crossVectors( tangents[ 0 ], vec );
			binormals[ 0 ].crossVectors( tangents[ 0 ], normals[ 0 ] );


			// compute the slowly-varying normal and binormal vectors for each segment on the curve

			for ( let i = 1; i <= segments; i ++ ) {

				normals[ i ] = normals[ i - 1 ].clone();

				binormals[ i ] = binormals[ i - 1 ].clone();

				vec.crossVectors( tangents[ i - 1 ], tangents[ i ] );

				if ( vec.length() > Number.EPSILON ) {

					vec.normalize();

					const theta = Math.acos( three_1.clamp( tangents[ i - 1 ].dot( tangents[ i ] ), -1, 1 ) ); // clamp for floating pt errors

					normals[ i ].applyMatrix4( mat.makeRotationAxis( vec, theta ) );

				}

				binormals[ i ].crossVectors( tangents[ i ], normals[ i ] );

			}

			// if the curve is closed, postprocess the vectors so the first and last normal vectors are the same

			if ( closed === true ) {

				let theta = Math.acos( three_1.clamp( normals[ 0 ].dot( normals[ segments ] ), -1, 1 ) );
				theta /= segments;

				if ( tangents[ 0 ].dot( vec.crossVectors( normals[ 0 ], normals[ segments ] ) ) > 0 ) {

					theta = - theta;

				}

				for ( let i = 1; i <= segments; i ++ ) {

					// twist a little...
					normals[ i ].applyMatrix4( mat.makeRotationAxis( tangents[ i ], theta * i ) );
					binormals[ i ].crossVectors( tangents[ i ], normals[ i ] );

				}

			}

			return {
				tangents: tangents,
				normals: normals,
				binormals: binormals
			};

		}

		clone() {

			return new this.constructor().copy( this );

		}

		copy( source ) {

			this.arcLengthDivisions = source.arcLengthDivisions;

			return this;

		}

		toJSON() {

			const data = {
				metadata: {
					version: 4.6,
					type: 'Curve',
					generator: 'Curve.toJSON'
				}
			};

			data.arcLengthDivisions = this.arcLengthDivisions;
			data.type = this.type;

			return data;

		}

		fromJSON( json ) {

			this.arcLengthDivisions = json.arcLengthDivisions;

			return this;

		}

	}

	class EllipseCurve extends Curve {

		constructor( aX = 0, aY = 0, xRadius = 1, yRadius = 1, aStartAngle = 0, aEndAngle = Math.PI * 2, aClockwise = false, aRotation = 0 ) {

			super();

			this.isEllipseCurve = true;

			this.type = 'EllipseCurve';

			this.aX = aX;
			this.aY = aY;

			this.xRadius = xRadius;
			this.yRadius = yRadius;

			this.aStartAngle = aStartAngle;
			this.aEndAngle = aEndAngle;

			this.aClockwise = aClockwise;

			this.aRotation = aRotation;

		}

		getPoint( t, optionalTarget ) {

			const point = optionalTarget || new three_1.Vector2();

			const twoPi = Math.PI * 2;
			let deltaAngle = this.aEndAngle - this.aStartAngle;
			const samePoints = Math.abs( deltaAngle ) < Number.EPSILON;

			// ensures that deltaAngle is 0 .. 2 PI
			while ( deltaAngle < 0 ) deltaAngle += twoPi;
			while ( deltaAngle > twoPi ) deltaAngle -= twoPi;

			if ( deltaAngle < Number.EPSILON ) {

				if ( samePoints ) {

					deltaAngle = 0;

				} else {

					deltaAngle = twoPi;

				}

			}

			if ( this.aClockwise === true && ! samePoints ) {

				if ( deltaAngle === twoPi ) {

					deltaAngle = - twoPi;

				} else {

					deltaAngle = deltaAngle - twoPi;

				}

			}

			const angle = this.aStartAngle + t * deltaAngle;
			let x = this.aX + this.xRadius * Math.cos( angle );
			let y = this.aY + this.yRadius * Math.sin( angle );

			if ( this.aRotation !== 0 ) {

				const cos = Math.cos( this.aRotation );
				const sin = Math.sin( this.aRotation );

				const tx = x - this.aX;
				const ty = y - this.aY;

				// Rotate the point about the center of the ellipse.
				x = tx * cos - ty * sin + this.aX;
				y = tx * sin + ty * cos + this.aY;

			}

			return point.set( x, y );

		}

		copy( source ) {

			super.copy( source );

			this.aX = source.aX;
			this.aY = source.aY;

			this.xRadius = source.xRadius;
			this.yRadius = source.yRadius;

			this.aStartAngle = source.aStartAngle;
			this.aEndAngle = source.aEndAngle;

			this.aClockwise = source.aClockwise;

			this.aRotation = source.aRotation;

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.aX = this.aX;
			data.aY = this.aY;

			data.xRadius = this.xRadius;
			data.yRadius = this.yRadius;

			data.aStartAngle = this.aStartAngle;
			data.aEndAngle = this.aEndAngle;

			data.aClockwise = this.aClockwise;

			data.aRotation = this.aRotation;

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.aX = json.aX;
			this.aY = json.aY;

			this.xRadius = json.xRadius;
			this.yRadius = json.yRadius;

			this.aStartAngle = json.aStartAngle;
			this.aEndAngle = json.aEndAngle;

			this.aClockwise = json.aClockwise;

			this.aRotation = json.aRotation;

			return this;

		}

	}

	class ArcCurve extends EllipseCurve {

		constructor( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {

			super( aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise );

			this.isArcCurve = true;

			this.type = 'ArcCurve';

		}

	}

	/**
	 * Centripetal CatmullRom Curve - which is useful for avoiding
	 * cusps and self-intersections in non-uniform catmull rom curves.
	 * http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
	 *
	 * curve.type accepts centripetal(default), chordal and catmullrom
	 * curve.tension is used for catmullrom which defaults to 0.5
	 */


	/*
	Based on an optimized c++ solution in
	 - http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/
	 - http://ideone.com/NoEbVM

	This CubicPoly class could be used for reusing some variables and calculations,
	but for three.js curve use, it could be possible inlined and flatten into a single function call
	which can be placed in CurveUtils.
	*/

	function CubicPoly() {

		let c0 = 0, c1 = 0, c2 = 0, c3 = 0;

		/*
		 * Compute coefficients for a cubic polynomial
		 *   p(s) = c0 + c1*s + c2*s^2 + c3*s^3
		 * such that
		 *   p(0) = x0, p(1) = x1
		 *  and
		 *   p'(0) = t0, p'(1) = t1.
		 */
		function init( x0, x1, t0, t1 ) {

			c0 = x0;
			c1 = t0;
			c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1;
			c3 = 2 * x0 - 2 * x1 + t0 + t1;

		}

		return {

			initCatmullRom: function ( x0, x1, x2, x3, tension ) {

				init( x1, x2, tension * ( x2 - x0 ), tension * ( x3 - x1 ) );

			},

			initNonuniformCatmullRom: function ( x0, x1, x2, x3, dt0, dt1, dt2 ) {

				// compute tangents when parameterized in [t1,t2]
				let t1 = ( x1 - x0 ) / dt0 - ( x2 - x0 ) / ( dt0 + dt1 ) + ( x2 - x1 ) / dt1;
				let t2 = ( x2 - x1 ) / dt1 - ( x3 - x1 ) / ( dt1 + dt2 ) + ( x3 - x2 ) / dt2;

				// rescale tangents for parametrization in [0,1]
				t1 *= dt1;
				t2 *= dt1;

				init( x1, x2, t1, t2 );

			},

			calc: function ( t ) {

				const t2 = t * t;
				const t3 = t2 * t;
				return c0 + c1 * t + c2 * t2 + c3 * t3;

			}

		};

	}

	//

	const tmp = /*@__PURE__*/ new three_1.Vector3();
	const px = /*@__PURE__*/ new CubicPoly();
	const py = /*@__PURE__*/ new CubicPoly();
	const pz = /*@__PURE__*/ new CubicPoly();

	class CatmullRomCurve3 extends Curve {

		constructor( points = [], closed = false, curveType = 'centripetal', tension = 0.5 ) {

			super();

			this.isCatmullRomCurve3 = true;

			this.type = 'CatmullRomCurve3';

			this.points = points;
			this.closed = closed;
			this.curveType = curveType;
			this.tension = tension;

		}

		getPoint( t, optionalTarget = new three_1.Vector3() ) {

			const point = optionalTarget;

			const points = this.points;
			const l = points.length;

			const p = ( l - ( this.closed ? 0 : 1 ) ) * t;
			let intPoint = Math.floor( p );
			let weight = p - intPoint;

			if ( this.closed ) {

				intPoint += intPoint > 0 ? 0 : ( Math.floor( Math.abs( intPoint ) / l ) + 1 ) * l;

			} else if ( weight === 0 && intPoint === l - 1 ) {

				intPoint = l - 2;
				weight = 1;

			}

			let p0, p3; // 4 points (p1 & p2 defined below)

			if ( this.closed || intPoint > 0 ) {

				p0 = points[ ( intPoint - 1 ) % l ];

			} else {

				// extrapolate first point
				tmp.subVectors( points[ 0 ], points[ 1 ] ).add( points[ 0 ] );
				p0 = tmp;

			}

			const p1 = points[ intPoint % l ];
			const p2 = points[ ( intPoint + 1 ) % l ];

			if ( this.closed || intPoint + 2 < l ) {

				p3 = points[ ( intPoint + 2 ) % l ];

			} else {

				// extrapolate last point
				tmp.subVectors( points[ l - 1 ], points[ l - 2 ] ).add( points[ l - 1 ] );
				p3 = tmp;

			}

			if ( this.curveType === 'centripetal' || this.curveType === 'chordal' ) {

				// init Centripetal / Chordal Catmull-Rom
				const pow = this.curveType === 'chordal' ? 0.5 : 0.25;
				let dt0 = Math.pow( p0.distanceToSquared( p1 ), pow );
				let dt1 = Math.pow( p1.distanceToSquared( p2 ), pow );
				let dt2 = Math.pow( p2.distanceToSquared( p3 ), pow );

				// safety check for repeated points
				if ( dt1 < 1e-4 ) dt1 = 1.0;
				if ( dt0 < 1e-4 ) dt0 = dt1;
				if ( dt2 < 1e-4 ) dt2 = dt1;

				px.initNonuniformCatmullRom( p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2 );
				py.initNonuniformCatmullRom( p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2 );
				pz.initNonuniformCatmullRom( p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2 );

			} else if ( this.curveType === 'catmullrom' ) {

				px.initCatmullRom( p0.x, p1.x, p2.x, p3.x, this.tension );
				py.initCatmullRom( p0.y, p1.y, p2.y, p3.y, this.tension );
				pz.initCatmullRom( p0.z, p1.z, p2.z, p3.z, this.tension );

			}

			point.set(
				px.calc( weight ),
				py.calc( weight ),
				pz.calc( weight )
			);

			return point;

		}

		copy( source ) {

			super.copy( source );

			this.points = [];

			for ( let i = 0, l = source.points.length; i < l; i ++ ) {

				const point = source.points[ i ];

				this.points.push( point.clone() );

			}

			this.closed = source.closed;
			this.curveType = source.curveType;
			this.tension = source.tension;

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.points = [];

			for ( let i = 0, l = this.points.length; i < l; i ++ ) {

				const point = this.points[ i ];
				data.points.push( point.toArray() );

			}

			data.closed = this.closed;
			data.curveType = this.curveType;
			data.tension = this.tension;

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.points = [];

			for ( let i = 0, l = json.points.length; i < l; i ++ ) {

				const point = json.points[ i ];
				this.points.push( new three_1.Vector3().fromArray( point ) );

			}

			this.closed = json.closed;
			this.curveType = json.curveType;
			this.tension = json.tension;

			return this;

		}

	}

	/**
	 * Bezier Curves formulas obtained from
	 * https://en.wikipedia.org/wiki/B%C3%A9zier_curve
	 */

	function CatmullRom( t, p0, p1, p2, p3 ) {

		const v0 = ( p2 - p0 ) * 0.5;
		const v1 = ( p3 - p1 ) * 0.5;
		const t2 = t * t;
		const t3 = t * t2;
		return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( -3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

	}

	//

	function QuadraticBezierP0( t, p ) {

		const k = 1 - t;
		return k * k * p;

	}

	function QuadraticBezierP1( t, p ) {

		return 2 * ( 1 - t ) * t * p;

	}

	function QuadraticBezierP2( t, p ) {

		return t * t * p;

	}

	function QuadraticBezier( t, p0, p1, p2 ) {

		return QuadraticBezierP0( t, p0 ) + QuadraticBezierP1( t, p1 ) +
			QuadraticBezierP2( t, p2 );

	}

	//

	function CubicBezierP0( t, p ) {

		const k = 1 - t;
		return k * k * k * p;

	}

	function CubicBezierP1( t, p ) {

		const k = 1 - t;
		return 3 * k * k * t * p;

	}

	function CubicBezierP2( t, p ) {

		return 3 * ( 1 - t ) * t * t * p;

	}

	function CubicBezierP3( t, p ) {

		return t * t * t * p;

	}

	function CubicBezier( t, p0, p1, p2, p3 ) {

		return CubicBezierP0( t, p0 ) + CubicBezierP1( t, p1 ) + CubicBezierP2( t, p2 ) +
			CubicBezierP3( t, p3 );

	}

	class CubicBezierCurve extends Curve {

		constructor( v0 = new three_1.Vector2(), v1 = new three_1.Vector2(), v2 = new three_1.Vector2(), v3 = new three_1.Vector2() ) {

			super();

			this.isCubicBezierCurve = true;

			this.type = 'CubicBezierCurve';

			this.v0 = v0;
			this.v1 = v1;
			this.v2 = v2;
			this.v3 = v3;

		}

		getPoint( t, optionalTarget = new three_1.Vector2() ) {

			const point = optionalTarget;

			const v0 = this.v0, v1 = this.v1, v2 = this.v2, v3 = this.v3;

			point.set(
				CubicBezier( t, v0.x, v1.x, v2.x, v3.x ),
				CubicBezier( t, v0.y, v1.y, v2.y, v3.y )
			);

			return point;

		}

		copy( source ) {

			super.copy( source );

			this.v0.copy( source.v0 );
			this.v1.copy( source.v1 );
			this.v2.copy( source.v2 );
			this.v3.copy( source.v3 );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.v0 = this.v0.toArray();
			data.v1 = this.v1.toArray();
			data.v2 = this.v2.toArray();
			data.v3 = this.v3.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.v0.fromArray( json.v0 );
			this.v1.fromArray( json.v1 );
			this.v2.fromArray( json.v2 );
			this.v3.fromArray( json.v3 );

			return this;

		}

	}

	class CubicBezierCurve3 extends Curve {

		constructor( v0 = new three_1.Vector3(), v1 = new three_1.Vector3(), v2 = new three_1.Vector3(), v3 = new three_1.Vector3() ) {

			super();

			this.isCubicBezierCurve3 = true;

			this.type = 'CubicBezierCurve3';

			this.v0 = v0;
			this.v1 = v1;
			this.v2 = v2;
			this.v3 = v3;

		}

		getPoint( t, optionalTarget = new three_1.Vector3() ) {

			const point = optionalTarget;

			const v0 = this.v0, v1 = this.v1, v2 = this.v2, v3 = this.v3;

			point.set(
				CubicBezier( t, v0.x, v1.x, v2.x, v3.x ),
				CubicBezier( t, v0.y, v1.y, v2.y, v3.y ),
				CubicBezier( t, v0.z, v1.z, v2.z, v3.z )
			);

			return point;

		}

		copy( source ) {

			super.copy( source );

			this.v0.copy( source.v0 );
			this.v1.copy( source.v1 );
			this.v2.copy( source.v2 );
			this.v3.copy( source.v3 );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.v0 = this.v0.toArray();
			data.v1 = this.v1.toArray();
			data.v2 = this.v2.toArray();
			data.v3 = this.v3.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.v0.fromArray( json.v0 );
			this.v1.fromArray( json.v1 );
			this.v2.fromArray( json.v2 );
			this.v3.fromArray( json.v3 );

			return this;

		}

	}

	class LineCurve extends Curve {

		constructor( v1 = new three_1.Vector2(), v2 = new three_1.Vector2() ) {

			super();

			this.isLineCurve = true;

			this.type = 'LineCurve';

			this.v1 = v1;
			this.v2 = v2;

		}

		getPoint( t, optionalTarget = new three_1.Vector2() ) {

			const point = optionalTarget;

			if ( t === 1 ) {

				point.copy( this.v2 );

			} else {

				point.copy( this.v2 ).sub( this.v1 );
				point.multiplyScalar( t ).add( this.v1 );

			}

			return point;

		}

		// Line curve is linear, so we can overwrite default getPointAt
		getPointAt( u, optionalTarget ) {

			return this.getPoint( u, optionalTarget );

		}

		getTangent( t, optionalTarget = new three_1.Vector2() ) {

			return optionalTarget.subVectors( this.v2, this.v1 ).normalize();

		}

		getTangentAt( u, optionalTarget ) {

			return this.getTangent( u, optionalTarget );

		}

		copy( source ) {

			super.copy( source );

			this.v1.copy( source.v1 );
			this.v2.copy( source.v2 );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.v1 = this.v1.toArray();
			data.v2 = this.v2.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.v1.fromArray( json.v1 );
			this.v2.fromArray( json.v2 );

			return this;

		}

	}

	class LineCurve3 extends Curve {

		constructor( v1 = new three_1.Vector3(), v2 = new three_1.Vector3() ) {

			super();

			this.isLineCurve3 = true;

			this.type = 'LineCurve3';

			this.v1 = v1;
			this.v2 = v2;

		}

		getPoint( t, optionalTarget = new three_1.Vector3() ) {

			const point = optionalTarget;

			if ( t === 1 ) {

				point.copy( this.v2 );

			} else {

				point.copy( this.v2 ).sub( this.v1 );
				point.multiplyScalar( t ).add( this.v1 );

			}

			return point;

		}

		// Line curve is linear, so we can overwrite default getPointAt
		getPointAt( u, optionalTarget ) {

			return this.getPoint( u, optionalTarget );

		}

		getTangent( t, optionalTarget = new three_1.Vector3() ) {

			return optionalTarget.subVectors( this.v2, this.v1 ).normalize();

		}

		getTangentAt( u, optionalTarget ) {

			return this.getTangent( u, optionalTarget );

		}

		copy( source ) {

			super.copy( source );

			this.v1.copy( source.v1 );
			this.v2.copy( source.v2 );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.v1 = this.v1.toArray();
			data.v2 = this.v2.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.v1.fromArray( json.v1 );
			this.v2.fromArray( json.v2 );

			return this;

		}

	}

	class QuadraticBezierCurve extends Curve {

		constructor( v0 = new three_1.Vector2(), v1 = new three_1.Vector2(), v2 = new three_1.Vector2() ) {

			super();

			this.isQuadraticBezierCurve = true;

			this.type = 'QuadraticBezierCurve';

			this.v0 = v0;
			this.v1 = v1;
			this.v2 = v2;

		}

		getPoint( t, optionalTarget = new three_1.Vector2() ) {

			const point = optionalTarget;

			const v0 = this.v0, v1 = this.v1, v2 = this.v2;

			point.set(
				QuadraticBezier( t, v0.x, v1.x, v2.x ),
				QuadraticBezier( t, v0.y, v1.y, v2.y )
			);

			return point;

		}

		copy( source ) {

			super.copy( source );

			this.v0.copy( source.v0 );
			this.v1.copy( source.v1 );
			this.v2.copy( source.v2 );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.v0 = this.v0.toArray();
			data.v1 = this.v1.toArray();
			data.v2 = this.v2.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.v0.fromArray( json.v0 );
			this.v1.fromArray( json.v1 );
			this.v2.fromArray( json.v2 );

			return this;

		}

	}

	class QuadraticBezierCurve3 extends Curve {

		constructor( v0 = new three_1.Vector3(), v1 = new three_1.Vector3(), v2 = new three_1.Vector3() ) {

			super();

			this.isQuadraticBezierCurve3 = true;

			this.type = 'QuadraticBezierCurve3';

			this.v0 = v0;
			this.v1 = v1;
			this.v2 = v2;

		}

		getPoint( t, optionalTarget = new three_1.Vector3() ) {

			const point = optionalTarget;

			const v0 = this.v0, v1 = this.v1, v2 = this.v2;

			point.set(
				QuadraticBezier( t, v0.x, v1.x, v2.x ),
				QuadraticBezier( t, v0.y, v1.y, v2.y ),
				QuadraticBezier( t, v0.z, v1.z, v2.z )
			);

			return point;

		}

		copy( source ) {

			super.copy( source );

			this.v0.copy( source.v0 );
			this.v1.copy( source.v1 );
			this.v2.copy( source.v2 );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.v0 = this.v0.toArray();
			data.v1 = this.v1.toArray();
			data.v2 = this.v2.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.v0.fromArray( json.v0 );
			this.v1.fromArray( json.v1 );
			this.v2.fromArray( json.v2 );

			return this;

		}

	}

	class SplineCurve extends Curve {

		constructor( points = [] ) {

			super();

			this.isSplineCurve = true;

			this.type = 'SplineCurve';

			this.points = points;

		}

		getPoint( t, optionalTarget = new three_1.Vector2() ) {

			const point = optionalTarget;

			const points = this.points;
			const p = ( points.length - 1 ) * t;

			const intPoint = Math.floor( p );
			const weight = p - intPoint;

			const p0 = points[ intPoint === 0 ? intPoint : intPoint - 1 ];
			const p1 = points[ intPoint ];
			const p2 = points[ intPoint > points.length - 2 ? points.length - 1 : intPoint + 1 ];
			const p3 = points[ intPoint > points.length - 3 ? points.length - 1 : intPoint + 2 ];

			point.set(
				CatmullRom( weight, p0.x, p1.x, p2.x, p3.x ),
				CatmullRom( weight, p0.y, p1.y, p2.y, p3.y )
			);

			return point;

		}

		copy( source ) {

			super.copy( source );

			this.points = [];

			for ( let i = 0, l = source.points.length; i < l; i ++ ) {

				const point = source.points[ i ];

				this.points.push( point.clone() );

			}

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.points = [];

			for ( let i = 0, l = this.points.length; i < l; i ++ ) {

				const point = this.points[ i ];
				data.points.push( point.toArray() );

			}

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.points = [];

			for ( let i = 0, l = json.points.length; i < l; i ++ ) {

				const point = json.points[ i ];
				this.points.push( new three_1.Vector2().fromArray( point ) );

			}

			return this;

		}

	}

	const Curves = /*#__PURE__*/Object.freeze({
		__proto__: null,
		ArcCurve,
		CatmullRomCurve3,
		CubicBezierCurve,
		CubicBezierCurve3,
		EllipseCurve,
		LineCurve,
		LineCurve3,
		QuadraticBezierCurve,
		QuadraticBezierCurve3,
		SplineCurve
	});

	/**************************************************************
	 *	Curved Path - a curve path is simply a array of connected
	 *  curves, but retains the api of a curve
	 **************************************************************/

	class CurvePath extends Curve {

		constructor() {

			super();

			this.type = 'CurvePath';

			this.curves = [];
			this.autoClose = false; // Automatically closes the path

		}

		add( curve ) {

			this.curves.push( curve );

		}

		closePath() {

			// Add a line curve if start and end of lines are not connected
			const startPoint = this.curves[ 0 ].getPoint( 0 );
			const endPoint = this.curves[ this.curves.length - 1 ].getPoint( 1 );

			if ( ! startPoint.equals( endPoint ) ) {

				const lineType = ( startPoint.isVector2 === true ) ? 'LineCurve' : 'LineCurve3';
				this.curves.push( new Curves[ lineType ]( endPoint, startPoint ) );

			}

			return this;

		}

		// To get accurate point with reference to
		// entire path distance at time t,
		// following has to be done:

		// 1. Length of each sub path have to be known
		// 2. Locate and identify type of curve
		// 3. Get t for the curve
		// 4. Return curve.getPointAt(t')

		getPoint( t, optionalTarget ) {

			const d = t * this.getLength();
			const curveLengths = this.getCurveLengths();
			let i = 0;

			// To think about boundaries points.

			while ( i < curveLengths.length ) {

				if ( curveLengths[ i ] >= d ) {

					const diff = curveLengths[ i ] - d;
					const curve = this.curves[ i ];

					const segmentLength = curve.getLength();
					const u = segmentLength === 0 ? 0 : 1 - diff / segmentLength;

					return curve.getPointAt( u, optionalTarget );

				}

				i ++;

			}

			return null;

			// loop where sum != 0, sum > d , sum+1 <d

		}

		// We cannot use the default THREE.Curve getPoint() with getLength() because in
		// THREE.Curve, getLength() depends on getPoint() but in THREE.CurvePath
		// getPoint() depends on getLength

		getLength() {

			const lens = this.getCurveLengths();
			return lens[ lens.length - 1 ];

		}

		// cacheLengths must be recalculated.
		updateArcLengths() {

			this.needsUpdate = true;
			this.cacheLengths = null;
			this.getCurveLengths();

		}

		// Compute lengths and cache them
		// We cannot overwrite getLengths() because UtoT mapping uses it.

		getCurveLengths() {

			// We use cache values if curves and cache array are same length

			if ( this.cacheLengths && this.cacheLengths.length === this.curves.length ) {

				return this.cacheLengths;

			}

			// Get length of sub-curve
			// Push sums into cached array

			const lengths = [];
			let sums = 0;

			for ( let i = 0, l = this.curves.length; i < l; i ++ ) {

				sums += this.curves[ i ].getLength();
				lengths.push( sums );

			}

			this.cacheLengths = lengths;

			return lengths;

		}

		getSpacedPoints( divisions = 40 ) {

			const points = [];

			for ( let i = 0; i <= divisions; i ++ ) {

				points.push( this.getPoint( i / divisions ) );

			}

			if ( this.autoClose ) {

				points.push( points[ 0 ] );

			}

			return points;

		}

		getPoints( divisions = 12 ) {

			const points = [];
			let last;

			for ( let i = 0, curves = this.curves; i < curves.length; i ++ ) {

				const curve = curves[ i ];
				const resolution = curve.isEllipseCurve ? divisions * 2
					: ( curve.isLineCurve || curve.isLineCurve3 ) ? 1
						: curve.isSplineCurve ? divisions * curve.points.length
							: divisions;

				const pts = curve.getPoints( resolution );

				for ( let j = 0; j < pts.length; j ++ ) {

					const point = pts[ j ];

					if ( last && last.equals( point ) ) continue; // ensures no consecutive points are duplicates

					points.push( point );
					last = point;

				}

			}

			if ( this.autoClose && points.length > 1 && ! points[ points.length - 1 ].equals( points[ 0 ] ) ) {

				points.push( points[ 0 ] );

			}

			return points;

		}

		copy( source ) {

			super.copy( source );

			this.curves = [];

			for ( let i = 0, l = source.curves.length; i < l; i ++ ) {

				const curve = source.curves[ i ];

				this.curves.push( curve.clone() );

			}

			this.autoClose = source.autoClose;

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.autoClose = this.autoClose;
			data.curves = [];

			for ( let i = 0, l = this.curves.length; i < l; i ++ ) {

				const curve = this.curves[ i ];
				data.curves.push( curve.toJSON() );

			}

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.autoClose = json.autoClose;
			this.curves = [];

			for ( let i = 0, l = json.curves.length; i < l; i ++ ) {

				const curve = json.curves[ i ];
				this.curves.push( new Curves[ curve.type ]().fromJSON( curve ) );

			}

			return this;

		}

	}

	class Path extends CurvePath {

		constructor( points ) {

			super();

			this.type = 'Path';

			this.currentPoint = new three_1.Vector2();

			if ( points ) {

				this.setFromPoints( points );

			}

		}

		setFromPoints( points ) {

			this.moveTo( points[ 0 ].x, points[ 0 ].y );

			for ( let i = 1, l = points.length; i < l; i ++ ) {

				this.lineTo( points[ i ].x, points[ i ].y );

			}

			return this;

		}

		moveTo( x, y ) {

			this.currentPoint.set( x, y ); // TODO consider referencing vectors instead of copying?

			return this;

		}

		lineTo( x, y ) {

			const curve = new LineCurve( this.currentPoint.clone(), new three_1.Vector2( x, y ) );
			this.curves.push( curve );

			this.currentPoint.set( x, y );

			return this;

		}

		quadraticCurveTo( aCPx, aCPy, aX, aY ) {

			const curve = new QuadraticBezierCurve(
				this.currentPoint.clone(),
				new three_1.Vector2( aCPx, aCPy ),
				new three_1.Vector2( aX, aY )
			);

			this.curves.push( curve );

			this.currentPoint.set( aX, aY );

			return this;

		}

		bezierCurveTo( aCP1x, aCP1y, aCP2x, aCP2y, aX, aY ) {

			const curve = new CubicBezierCurve(
				this.currentPoint.clone(),
				new three_1.Vector2( aCP1x, aCP1y ),
				new three_1.Vector2( aCP2x, aCP2y ),
				new three_1.Vector2( aX, aY )
			);

			this.curves.push( curve );

			this.currentPoint.set( aX, aY );

			return this;

		}

		splineThru( pts /*Array of Vector*/ ) {

			const npts = [ this.currentPoint.clone() ].concat( pts );

			const curve = new SplineCurve( npts );
			this.curves.push( curve );

			this.currentPoint.copy( pts[ pts.length - 1 ] );

			return this;

		}

		arc( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {

			const x0 = this.currentPoint.x;
			const y0 = this.currentPoint.y;

			this.absarc( aX + x0, aY + y0, aRadius,
				aStartAngle, aEndAngle, aClockwise );

			return this;

		}

		absarc( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {

			this.absellipse( aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise );

			return this;

		}

		ellipse( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation ) {

			const x0 = this.currentPoint.x;
			const y0 = this.currentPoint.y;

			this.absellipse( aX + x0, aY + y0, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation );

			return this;

		}

		absellipse( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation ) {

			const curve = new EllipseCurve( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation );

			if ( this.curves.length > 0 ) {

				// if a previous curve is present, attempt to join
				const firstPoint = curve.getPoint( 0 );

				if ( ! firstPoint.equals( this.currentPoint ) ) {

					this.lineTo( firstPoint.x, firstPoint.y );

				}

			}

			this.curves.push( curve );

			const lastPoint = curve.getPoint( 1 );
			this.currentPoint.copy( lastPoint );

			return this;

		}

		copy( source ) {

			super.copy( source );

			this.currentPoint.copy( source.currentPoint );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.currentPoint = this.currentPoint.toArray();

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.currentPoint.fromArray( json.currentPoint );

			return this;

		}

	}

	class LatheGeometry extends three_2.BufferGeometry {

		constructor( points = [ new three_1.Vector2( 0, -0.5 ), new three_1.Vector2( 0.5, 0 ), new three_1.Vector2( 0, 0.5 ) ], segments = 12, phiStart = 0, phiLength = Math.PI * 2 ) {

			super();

			this.type = 'LatheGeometry';

			this.parameters = {
				points: points,
				segments: segments,
				phiStart: phiStart,
				phiLength: phiLength
			};

			segments = Math.floor( segments );

			// clamp phiLength so it's in range of [ 0, 2PI ]

			phiLength = three_1.clamp( phiLength, 0, Math.PI * 2 );

			// buffers

			const indices = [];
			const vertices = [];
			const uvs = [];
			const initNormals = [];
			const normals = [];

			// helper variables

			const inverseSegments = 1.0 / segments;
			const vertex = new three_1.Vector3();
			const uv = new three_1.Vector2();
			const normal = new three_1.Vector3();
			const curNormal = new three_1.Vector3();
			const prevNormal = new three_1.Vector3();
			let dx = 0;
			let dy = 0;

			// pre-compute normals for initial "meridian"

			for ( let j = 0; j <= ( points.length - 1 ); j ++ ) {

				switch ( j ) {

					case 0:				// special handling for 1st vertex on path

						dx = points[ j + 1 ].x - points[ j ].x;
						dy = points[ j + 1 ].y - points[ j ].y;

						normal.x = dy * 1.0;
						normal.y = - dx;
						normal.z = dy * 0.0;

						prevNormal.copy( normal );

						normal.normalize();

						initNormals.push( normal.x, normal.y, normal.z );

						break;

					case ( points.length - 1 ):	// special handling for last Vertex on path

						initNormals.push( prevNormal.x, prevNormal.y, prevNormal.z );

						break;

					default:			// default handling for all vertices in between

						dx = points[ j + 1 ].x - points[ j ].x;
						dy = points[ j + 1 ].y - points[ j ].y;

						normal.x = dy * 1.0;
						normal.y = - dx;
						normal.z = dy * 0.0;

						curNormal.copy( normal );

						normal.x += prevNormal.x;
						normal.y += prevNormal.y;
						normal.z += prevNormal.z;

						normal.normalize();

						initNormals.push( normal.x, normal.y, normal.z );

						prevNormal.copy( curNormal );

				}

			}

			// generate vertices, uvs and normals

			for ( let i = 0; i <= segments; i ++ ) {

				const phi = phiStart + i * inverseSegments * phiLength;

				const sin = Math.sin( phi );
				const cos = Math.cos( phi );

				for ( let j = 0; j <= ( points.length - 1 ); j ++ ) {

					// vertex

					vertex.x = points[ j ].x * sin;
					vertex.y = points[ j ].y;
					vertex.z = points[ j ].x * cos;

					vertices.push( vertex.x, vertex.y, vertex.z );

					// uv

					uv.x = i / segments;
					uv.y = j / ( points.length - 1 );

					uvs.push( uv.x, uv.y );

					// normal

					const x = initNormals[ 3 * j + 0 ] * sin;
					const y = initNormals[ 3 * j + 1 ];
					const z = initNormals[ 3 * j + 0 ] * cos;

					normals.push( x, y, z );

				}

			}

			// indices

			for ( let i = 0; i < segments; i ++ ) {

				for ( let j = 0; j < ( points.length - 1 ); j ++ ) {

					const base = j + i * points.length;

					const a = base;
					const b = base + points.length;
					const c = base + points.length + 1;
					const d = base + 1;

					// faces

					indices.push( a, b, d );
					indices.push( c, d, b );

				}

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new LatheGeometry( data.points, data.segments, data.phiStart, data.phiLength );

		}

	}

	class CapsuleGeometry extends LatheGeometry {

		constructor( radius = 1, length = 1, capSegments = 4, radialSegments = 8 ) {

			const path = new Path();
			path.absarc( 0, - length / 2, radius, Math.PI * 1.5, 0 );
			path.absarc( 0, length / 2, radius, 0, Math.PI * 0.5 );

			super( path.getPoints( capSegments ), radialSegments );

			this.type = 'CapsuleGeometry';

			this.parameters = {
				radius: radius,
				length: length,
				capSegments: capSegments,
				radialSegments: radialSegments,
			};

		}

		static fromJSON( data ) {

			return new CapsuleGeometry( data.radius, data.length, data.capSegments, data.radialSegments );

		}

	}

	class CircleGeometry extends three_2.BufferGeometry {

		constructor( radius = 1, segments = 32, thetaStart = 0, thetaLength = Math.PI * 2 ) {

			super();

			this.type = 'CircleGeometry';

			this.parameters = {
				radius: radius,
				segments: segments,
				thetaStart: thetaStart,
				thetaLength: thetaLength
			};

			segments = Math.max( 3, segments );

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// helper variables

			const vertex = new three_1.Vector3();
			const uv = new three_1.Vector2();

			// center point

			vertices.push( 0, 0, 0 );
			normals.push( 0, 0, 1 );
			uvs.push( 0.5, 0.5 );

			for ( let s = 0, i = 3; s <= segments; s ++, i += 3 ) {

				const segment = thetaStart + s / segments * thetaLength;

				// vertex

				vertex.x = radius * Math.cos( segment );
				vertex.y = radius * Math.sin( segment );

				vertices.push( vertex.x, vertex.y, vertex.z );

				// normal

				normals.push( 0, 0, 1 );

				// uvs

				uv.x = ( vertices[ i ] / radius + 1 ) / 2;
				uv.y = ( vertices[ i + 1 ] / radius + 1 ) / 2;

				uvs.push( uv.x, uv.y );

			}

			// indices

			for ( let i = 1; i <= segments; i ++ ) {

				indices.push( i, i + 1, 0 );

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new CircleGeometry( data.radius, data.segments, data.thetaStart, data.thetaLength );

		}

	}

	class CylinderGeometry extends three_2.BufferGeometry {

		constructor( radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2 ) {

			super();

			this.type = 'CylinderGeometry';

			this.parameters = {
				radiusTop: radiusTop,
				radiusBottom: radiusBottom,
				height: height,
				radialSegments: radialSegments,
				heightSegments: heightSegments,
				openEnded: openEnded,
				thetaStart: thetaStart,
				thetaLength: thetaLength
			};

			const scope = this;

			radialSegments = Math.floor( radialSegments );
			heightSegments = Math.floor( heightSegments );

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// helper variables

			let index = 0;
			const indexArray = [];
			const halfHeight = height / 2;
			let groupStart = 0;

			// generate geometry

			generateTorso();

			if ( openEnded === false ) {

				if ( radiusTop > 0 ) generateCap( true );
				if ( radiusBottom > 0 ) generateCap( false );

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

			function generateTorso() {

				const normal = new three_1.Vector3();
				const vertex = new three_1.Vector3();

				let groupCount = 0;

				// this will be used to calculate the normal
				const slope = ( radiusBottom - radiusTop ) / height;

				// generate vertices, normals and uvs

				for ( let y = 0; y <= heightSegments; y ++ ) {

					const indexRow = [];

					const v = y / heightSegments;

					// calculate the radius of the current row

					const radius = v * ( radiusBottom - radiusTop ) + radiusTop;

					for ( let x = 0; x <= radialSegments; x ++ ) {

						const u = x / radialSegments;

						const theta = u * thetaLength + thetaStart;

						const sinTheta = Math.sin( theta );
						const cosTheta = Math.cos( theta );

						// vertex

						vertex.x = radius * sinTheta;
						vertex.y = - v * height + halfHeight;
						vertex.z = radius * cosTheta;
						vertices.push( vertex.x, vertex.y, vertex.z );

						// normal

						normal.set( sinTheta, slope, cosTheta ).normalize();
						normals.push( normal.x, normal.y, normal.z );

						// uv

						uvs.push( u, 1 - v );

						// save index of vertex in respective row

						indexRow.push( index ++ );

					}

					// now save vertices of the row in our index array

					indexArray.push( indexRow );

				}

				// generate indices

				for ( let x = 0; x < radialSegments; x ++ ) {

					for ( let y = 0; y < heightSegments; y ++ ) {

						// we use the index array to access the correct indices

						const a = indexArray[ y ][ x ];
						const b = indexArray[ y + 1 ][ x ];
						const c = indexArray[ y + 1 ][ x + 1 ];
						const d = indexArray[ y ][ x + 1 ];

						// faces

						indices.push( a, b, d );
						indices.push( b, c, d );

						// update group counter

						groupCount += 6;

					}

				}

				// add a group to the geometry. this will ensure multi material support

				scope.addGroup( groupStart, groupCount, 0 );

				// calculate new start value for groups

				groupStart += groupCount;

			}

			function generateCap( top ) {

				// save the index of the first center vertex
				const centerIndexStart = index;

				const uv = new three_1.Vector2();
				const vertex = new three_1.Vector3();

				let groupCount = 0;

				const radius = ( top === true ) ? radiusTop : radiusBottom;
				const sign = ( top === true ) ? 1 : -1;

				// first we generate the center vertex data of the cap.
				// because the geometry needs one set of uvs per face,
				// we must generate a center vertex per face/segment

				for ( let x = 1; x <= radialSegments; x ++ ) {

					// vertex

					vertices.push( 0, halfHeight * sign, 0 );

					// normal

					normals.push( 0, sign, 0 );

					// uv

					uvs.push( 0.5, 0.5 );

					// increase index

					index ++;

				}

				// save the index of the last center vertex
				const centerIndexEnd = index;

				// now we generate the surrounding vertices, normals and uvs

				for ( let x = 0; x <= radialSegments; x ++ ) {

					const u = x / radialSegments;
					const theta = u * thetaLength + thetaStart;

					const cosTheta = Math.cos( theta );
					const sinTheta = Math.sin( theta );

					// vertex

					vertex.x = radius * sinTheta;
					vertex.y = halfHeight * sign;
					vertex.z = radius * cosTheta;
					vertices.push( vertex.x, vertex.y, vertex.z );

					// normal

					normals.push( 0, sign, 0 );

					// uv

					uv.x = ( cosTheta * 0.5 ) + 0.5;
					uv.y = ( sinTheta * 0.5 * sign ) + 0.5;
					uvs.push( uv.x, uv.y );

					// increase index

					index ++;

				}

				// generate indices

				for ( let x = 0; x < radialSegments; x ++ ) {

					const c = centerIndexStart + x;
					const i = centerIndexEnd + x;

					if ( top === true ) {

						// face top

						indices.push( i, i + 1, c );

					} else {

						// face bottom

						indices.push( i + 1, i, c );

					}

					groupCount += 3;

				}

				// add a group to the geometry. this will ensure multi material support

				scope.addGroup( groupStart, groupCount, top === true ? 1 : 2 );

				// calculate new start value for groups

				groupStart += groupCount;

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new CylinderGeometry( data.radiusTop, data.radiusBottom, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength );

		}

	}

	class ConeGeometry extends CylinderGeometry {

		constructor( radius = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2 ) {

			super( 0, radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength );

			this.type = 'ConeGeometry';

			this.parameters = {
				radius: radius,
				height: height,
				radialSegments: radialSegments,
				heightSegments: heightSegments,
				openEnded: openEnded,
				thetaStart: thetaStart,
				thetaLength: thetaLength
			};

		}

		static fromJSON( data ) {

			return new ConeGeometry( data.radius, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength );

		}

	}

	class PolyhedronGeometry extends three_2.BufferGeometry {

		constructor( vertices = [], indices = [], radius = 1, detail = 0 ) {

			super();

			this.type = 'PolyhedronGeometry';

			this.parameters = {
				vertices: vertices,
				indices: indices,
				radius: radius,
				detail: detail
			};

			// default buffer data

			const vertexBuffer = [];
			const uvBuffer = [];

			// the subdivision creates the vertex buffer data

			subdivide( detail );

			// all vertices should lie on a conceptual sphere with a given radius

			applyRadius( radius );

			// finally, create the uv data

			generateUVs();

			// build non-indexed geometry

			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertexBuffer, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( vertexBuffer.slice(), 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvBuffer, 2 ) );

			if ( detail === 0 ) {

				this.computeVertexNormals(); // flat normals

			} else {

				this.normalizeNormals(); // smooth normals

			}

			// helper functions

			function subdivide( detail ) {

				const a = new three_1.Vector3();
				const b = new three_1.Vector3();
				const c = new three_1.Vector3();

				// iterate over all faces and apply a subdivision with the given detail value

				for ( let i = 0; i < indices.length; i += 3 ) {

					// get the vertices of the face

					getVertexByIndex( indices[ i + 0 ], a );
					getVertexByIndex( indices[ i + 1 ], b );
					getVertexByIndex( indices[ i + 2 ], c );

					// perform subdivision

					subdivideFace( a, b, c, detail );

				}

			}

			function subdivideFace( a, b, c, detail ) {

				const cols = detail + 1;

				// we use this multidimensional array as a data structure for creating the subdivision

				const v = [];

				// construct all of the vertices for this subdivision

				for ( let i = 0; i <= cols; i ++ ) {

					v[ i ] = [];

					const aj = a.clone().lerp( c, i / cols );
					const bj = b.clone().lerp( c, i / cols );

					const rows = cols - i;

					for ( let j = 0; j <= rows; j ++ ) {

						if ( j === 0 && i === cols ) {

							v[ i ][ j ] = aj;

						} else {

							v[ i ][ j ] = aj.clone().lerp( bj, j / rows );

						}

					}

				}

				// construct all of the faces

				for ( let i = 0; i < cols; i ++ ) {

					for ( let j = 0; j < 2 * ( cols - i ) - 1; j ++ ) {

						const k = Math.floor( j / 2 );

						if ( j % 2 === 0 ) {

							pushVertex( v[ i ][ k + 1 ] );
							pushVertex( v[ i + 1 ][ k ] );
							pushVertex( v[ i ][ k ] );

						} else {

							pushVertex( v[ i ][ k + 1 ] );
							pushVertex( v[ i + 1 ][ k + 1 ] );
							pushVertex( v[ i + 1 ][ k ] );

						}

					}

				}

			}

			function applyRadius( radius ) {

				const vertex = new three_1.Vector3();

				// iterate over the entire buffer and apply the radius to each vertex

				for ( let i = 0; i < vertexBuffer.length; i += 3 ) {

					vertex.x = vertexBuffer[ i + 0 ];
					vertex.y = vertexBuffer[ i + 1 ];
					vertex.z = vertexBuffer[ i + 2 ];

					vertex.normalize().multiplyScalar( radius );

					vertexBuffer[ i + 0 ] = vertex.x;
					vertexBuffer[ i + 1 ] = vertex.y;
					vertexBuffer[ i + 2 ] = vertex.z;

				}

			}

			function generateUVs() {

				const vertex = new three_1.Vector3();

				for ( let i = 0; i < vertexBuffer.length; i += 3 ) {

					vertex.x = vertexBuffer[ i + 0 ];
					vertex.y = vertexBuffer[ i + 1 ];
					vertex.z = vertexBuffer[ i + 2 ];

					const u = azimuth( vertex ) / 2 / Math.PI + 0.5;
					const v = inclination( vertex ) / Math.PI + 0.5;
					uvBuffer.push( u, 1 - v );

				}

				correctUVs();

				correctSeam();

			}

			function correctSeam() {

				// handle case when face straddles the seam, see #3269

				for ( let i = 0; i < uvBuffer.length; i += 6 ) {

					// uv data of a single face

					const x0 = uvBuffer[ i + 0 ];
					const x1 = uvBuffer[ i + 2 ];
					const x2 = uvBuffer[ i + 4 ];

					const max = Math.max( x0, x1, x2 );
					const min = Math.min( x0, x1, x2 );

					// 0.9 is somewhat arbitrary

					if ( max > 0.9 && min < 0.1 ) {

						if ( x0 < 0.2 ) uvBuffer[ i + 0 ] += 1;
						if ( x1 < 0.2 ) uvBuffer[ i + 2 ] += 1;
						if ( x2 < 0.2 ) uvBuffer[ i + 4 ] += 1;

					}

				}

			}

			function pushVertex( vertex ) {

				vertexBuffer.push( vertex.x, vertex.y, vertex.z );

			}

			function getVertexByIndex( index, vertex ) {

				const stride = index * 3;

				vertex.x = vertices[ stride + 0 ];
				vertex.y = vertices[ stride + 1 ];
				vertex.z = vertices[ stride + 2 ];

			}

			function correctUVs() {

				const a = new three_1.Vector3();
				const b = new three_1.Vector3();
				const c = new three_1.Vector3();

				const centroid = new three_1.Vector3();

				const uvA = new three_1.Vector2();
				const uvB = new three_1.Vector2();
				const uvC = new three_1.Vector2();

				for ( let i = 0, j = 0; i < vertexBuffer.length; i += 9, j += 6 ) {

					a.set( vertexBuffer[ i + 0 ], vertexBuffer[ i + 1 ], vertexBuffer[ i + 2 ] );
					b.set( vertexBuffer[ i + 3 ], vertexBuffer[ i + 4 ], vertexBuffer[ i + 5 ] );
					c.set( vertexBuffer[ i + 6 ], vertexBuffer[ i + 7 ], vertexBuffer[ i + 8 ] );

					uvA.set( uvBuffer[ j + 0 ], uvBuffer[ j + 1 ] );
					uvB.set( uvBuffer[ j + 2 ], uvBuffer[ j + 3 ] );
					uvC.set( uvBuffer[ j + 4 ], uvBuffer[ j + 5 ] );

					centroid.copy( a ).add( b ).add( c ).divideScalar( 3 );

					const azi = azimuth( centroid );

					correctUV( uvA, j + 0, a, azi );
					correctUV( uvB, j + 2, b, azi );
					correctUV( uvC, j + 4, c, azi );

				}

			}

			function correctUV( uv, stride, vector, azimuth ) {

				if ( ( azimuth < 0 ) && ( uv.x === 1 ) ) {

					uvBuffer[ stride ] = uv.x - 1;

				}

				if ( ( vector.x === 0 ) && ( vector.z === 0 ) ) {

					uvBuffer[ stride ] = azimuth / 2 / Math.PI + 0.5;

				}

			}

			// Angle around the Y axis, counter-clockwise when looking from above.

			function azimuth( vector ) {

				return Math.atan2( vector.z, - vector.x );

			}


			// Angle above the XZ plane.

			function inclination( vector ) {

				return Math.atan2( - vector.y, Math.sqrt( ( vector.x * vector.x ) + ( vector.z * vector.z ) ) );

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new PolyhedronGeometry( data.vertices, data.indices, data.radius, data.details );

		}

	}

	class DodecahedronGeometry extends PolyhedronGeometry {

		constructor( radius = 1, detail = 0 ) {

			const t = ( 1 + Math.sqrt( 5 ) ) / 2;
			const r = 1 / t;

			const vertices = [

				// (±1, ±1, ±1)
				-1, -1, -1,	-1, -1, 1,
				-1, 1, -1, -1, 1, 1,
				1, -1, -1, 1, -1, 1,
				1, 1, -1, 1, 1, 1,

				// (0, ±1/φ, ±φ)
				0, - r, - t, 0, - r, t,
				0, r, - t, 0, r, t,

				// (±1/φ, ±φ, 0)
				- r, - t, 0, - r, t, 0,
				r, - t, 0, r, t, 0,

				// (±φ, 0, ±1/φ)
				- t, 0, - r, t, 0, - r,
				- t, 0, r, t, 0, r
			];

			const indices = [
				3, 11, 7, 	3, 7, 15, 	3, 15, 13,
				7, 19, 17, 	7, 17, 6, 	7, 6, 15,
				17, 4, 8, 	17, 8, 10, 	17, 10, 6,
				8, 0, 16, 	8, 16, 2, 	8, 2, 10,
				0, 12, 1, 	0, 1, 18, 	0, 18, 16,
				6, 10, 2, 	6, 2, 13, 	6, 13, 15,
				2, 16, 18, 	2, 18, 3, 	2, 3, 13,
				18, 1, 9, 	18, 9, 11, 	18, 11, 3,
				4, 14, 12, 	4, 12, 0, 	4, 0, 8,
				11, 9, 5, 	11, 5, 19, 	11, 19, 7,
				19, 5, 14, 	19, 14, 4, 	19, 4, 17,
				1, 12, 14, 	1, 14, 5, 	1, 5, 9
			];

			super( vertices, indices, radius, detail );

			this.type = 'DodecahedronGeometry';

			this.parameters = {
				radius: radius,
				detail: detail
			};

		}

		static fromJSON( data ) {

			return new DodecahedronGeometry( data.radius, data.detail );

		}

	}

	const _v0 = /*@__PURE__*/ new three_1.Vector3();
	const _v1 = /*@__PURE__*/ new three_1.Vector3();
	const _normal = /*@__PURE__*/ new three_1.Vector3();
	const _triangle = /*@__PURE__*/ new three_1.Triangle();

	class EdgesGeometry extends three_2.BufferGeometry {

		constructor( geometry = null, thresholdAngle = 1 ) {

			super();

			this.type = 'EdgesGeometry';

			this.parameters = {
				geometry: geometry,
				thresholdAngle: thresholdAngle
			};

			if ( geometry !== null ) {

				const precisionPoints = 4;
				const precision = Math.pow( 10, precisionPoints );
				const thresholdDot = Math.cos( three_1.DEG2RAD * thresholdAngle );

				const indexAttr = geometry.getIndex();
				const positionAttr = geometry.getAttribute( 'position' );
				const indexCount = indexAttr ? indexAttr.count : positionAttr.count;

				const indexArr = [ 0, 0, 0 ];
				const vertKeys = [ 'a', 'b', 'c' ];
				const hashes = new Array( 3 );

				const edgeData = {};
				const vertices = [];
				for ( let i = 0; i < indexCount; i += 3 ) {

					if ( indexAttr ) {

						indexArr[ 0 ] = indexAttr.getX( i );
						indexArr[ 1 ] = indexAttr.getX( i + 1 );
						indexArr[ 2 ] = indexAttr.getX( i + 2 );

					} else {

						indexArr[ 0 ] = i;
						indexArr[ 1 ] = i + 1;
						indexArr[ 2 ] = i + 2;

					}

					const { a, b, c } = _triangle;
					a.fromBufferAttribute( positionAttr, indexArr[ 0 ] );
					b.fromBufferAttribute( positionAttr, indexArr[ 1 ] );
					c.fromBufferAttribute( positionAttr, indexArr[ 2 ] );
					_triangle.getNormal( _normal );

					// create hashes for the edge from the vertices
					hashes[ 0 ] = `${ Math.round( a.x * precision ) },${ Math.round( a.y * precision ) },${ Math.round( a.z * precision ) }`;
					hashes[ 1 ] = `${ Math.round( b.x * precision ) },${ Math.round( b.y * precision ) },${ Math.round( b.z * precision ) }`;
					hashes[ 2 ] = `${ Math.round( c.x * precision ) },${ Math.round( c.y * precision ) },${ Math.round( c.z * precision ) }`;

					// skip degenerate triangles
					if ( hashes[ 0 ] === hashes[ 1 ] || hashes[ 1 ] === hashes[ 2 ] || hashes[ 2 ] === hashes[ 0 ] ) {

						continue;

					}

					// iterate over every edge
					for ( let j = 0; j < 3; j ++ ) {

						// get the first and next vertex making up the edge
						const jNext = ( j + 1 ) % 3;
						const vecHash0 = hashes[ j ];
						const vecHash1 = hashes[ jNext ];
						const v0 = _triangle[ vertKeys[ j ] ];
						const v1 = _triangle[ vertKeys[ jNext ] ];

						const hash = `${ vecHash0 }_${ vecHash1 }`;
						const reverseHash = `${ vecHash1 }_${ vecHash0 }`;

						if ( reverseHash in edgeData && edgeData[ reverseHash ] ) {

							// if we found a sibling edge add it into the vertex array if
							// it meets the angle threshold and delete the edge from the map.
							if ( _normal.dot( edgeData[ reverseHash ].normal ) <= thresholdDot ) {

								vertices.push( v0.x, v0.y, v0.z );
								vertices.push( v1.x, v1.y, v1.z );

							}

							edgeData[ reverseHash ] = null;

						} else if ( ! ( hash in edgeData ) ) {

							// if we've already got an edge here then skip adding a new one
							edgeData[ hash ] = {

								index0: indexArr[ j ],
								index1: indexArr[ jNext ],
								normal: _normal.clone(),

							};

						}

					}

				}

				// iterate over all remaining, unmatched edges and add them to the vertex array
				for ( const key in edgeData ) {

					if ( edgeData[ key ] ) {

						const { index0, index1 } = edgeData[ key ];
						_v0.fromBufferAttribute( positionAttr, index0 );
						_v1.fromBufferAttribute( positionAttr, index1 );

						vertices.push( _v0.x, _v0.y, _v0.z );
						vertices.push( _v1.x, _v1.y, _v1.z );

					}

				}

				this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

	}

	class Shape extends Path {

		constructor( points ) {

			super( points );

			this.uuid = three_1.generateUUID();

			this.type = 'Shape';

			this.holes = [];

		}

		getPointsHoles( divisions ) {

			const holesPts = [];

			for ( let i = 0, l = this.holes.length; i < l; i ++ ) {

				holesPts[ i ] = this.holes[ i ].getPoints( divisions );

			}

			return holesPts;

		}

		// get points of shape and holes (keypoints based on segments parameter)

		extractPoints( divisions ) {

			return {

				shape: this.getPoints( divisions ),
				holes: this.getPointsHoles( divisions )

			};

		}

		copy( source ) {

			super.copy( source );

			this.holes = [];

			for ( let i = 0, l = source.holes.length; i < l; i ++ ) {

				const hole = source.holes[ i ];

				this.holes.push( hole.clone() );

			}

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.uuid = this.uuid;
			data.holes = [];

			for ( let i = 0, l = this.holes.length; i < l; i ++ ) {

				const hole = this.holes[ i ];
				data.holes.push( hole.toJSON() );

			}

			return data;

		}

		fromJSON( json ) {

			super.fromJSON( json );

			this.uuid = json.uuid;
			this.holes = [];

			for ( let i = 0, l = json.holes.length; i < l; i ++ ) {

				const hole = json.holes[ i ];
				this.holes.push( new Path().fromJSON( hole ) );

			}

			return this;

		}

	}

	/**
	 * Port from https://github.com/mapbox/earcut (v2.2.4)
	 */

	const Earcut = {

		triangulate: function ( data, holeIndices, dim = 2 ) {

			const hasHoles = holeIndices && holeIndices.length;
			const outerLen = hasHoles ? holeIndices[ 0 ] * dim : data.length;
			let outerNode = linkedList( data, 0, outerLen, dim, true );
			const triangles = [];

			if ( ! outerNode || outerNode.next === outerNode.prev ) return triangles;

			let minX, minY, maxX, maxY, x, y, invSize;

			if ( hasHoles ) outerNode = eliminateHoles( data, holeIndices, outerNode, dim );

			// if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
			if ( data.length > 80 * dim ) {

				minX = maxX = data[ 0 ];
				minY = maxY = data[ 1 ];

				for ( let i = dim; i < outerLen; i += dim ) {

					x = data[ i ];
					y = data[ i + 1 ];
					if ( x < minX ) minX = x;
					if ( y < minY ) minY = y;
					if ( x > maxX ) maxX = x;
					if ( y > maxY ) maxY = y;

				}

				// minX, minY and invSize are later used to transform coords into integers for z-order calculation
				invSize = Math.max( maxX - minX, maxY - minY );
				invSize = invSize !== 0 ? 32767 / invSize : 0;

			}

			earcutLinked( outerNode, triangles, dim, minX, minY, invSize, 0 );

			return triangles;

		}

	};

	// create a circular doubly linked list from polygon points in the specified winding order
	function linkedList( data, start, end, dim, clockwise ) {

		let i, last;

		if ( clockwise === ( signedArea( data, start, end, dim ) > 0 ) ) {

			for ( i = start; i < end; i += dim ) last = insertNode( i, data[ i ], data[ i + 1 ], last );

		} else {

			for ( i = end - dim; i >= start; i -= dim ) last = insertNode( i, data[ i ], data[ i + 1 ], last );

		}

		if ( last && equals( last, last.next ) ) {

			removeNode( last );
			last = last.next;

		}

		return last;

	}

	// eliminate colinear or duplicate points
	function filterPoints( start, end ) {

		if ( ! start ) return start;
		if ( ! end ) end = start;

		let p = start,
			again;
		do {

			again = false;

			if ( ! p.steiner && ( equals( p, p.next ) || area( p.prev, p, p.next ) === 0 ) ) {

				removeNode( p );
				p = end = p.prev;
				if ( p === p.next ) break;
				again = true;

			} else {

				p = p.next;

			}

		} while ( again || p !== end );

		return end;

	}

	// main ear slicing loop which triangulates a polygon (given as a linked list)
	function earcutLinked( ear, triangles, dim, minX, minY, invSize, pass ) {

		if ( ! ear ) return;

		// interlink polygon nodes in z-order
		if ( ! pass && invSize ) indexCurve( ear, minX, minY, invSize );

		let stop = ear,
			prev, next;

		// iterate through ears, slicing them one by one
		while ( ear.prev !== ear.next ) {

			prev = ear.prev;
			next = ear.next;

			if ( invSize ? isEarHashed( ear, minX, minY, invSize ) : isEar( ear ) ) {

				// cut off the triangle
				triangles.push( prev.i / dim | 0 );
				triangles.push( ear.i / dim | 0 );
				triangles.push( next.i / dim | 0 );

				removeNode( ear );

				// skipping the next vertex leads to less sliver triangles
				ear = next.next;
				stop = next.next;

				continue;

			}

			ear = next;

			// if we looped through the whole remaining polygon and can't find any more ears
			if ( ear === stop ) {

				// try filtering points and slicing again
				if ( ! pass ) {

					earcutLinked( filterPoints( ear ), triangles, dim, minX, minY, invSize, 1 );

					// if this didn't work, try curing all small self-intersections locally

				} else if ( pass === 1 ) {

					ear = cureLocalIntersections( filterPoints( ear ), triangles, dim );
					earcutLinked( ear, triangles, dim, minX, minY, invSize, 2 );

					// as a last resort, try splitting the remaining polygon into two

				} else if ( pass === 2 ) {

					splitEarcut( ear, triangles, dim, minX, minY, invSize );

				}

				break;

			}

		}

	}

	// check whether a polygon node forms a valid ear with adjacent nodes
	function isEar( ear ) {

		const a = ear.prev,
			b = ear,
			c = ear.next;

		if ( area( a, b, c ) >= 0 ) return false; // reflex, can't be an ear

		// now make sure we don't have other points inside the potential ear
		const ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;

		// triangle bbox; min & max are calculated like this for speed
		const x0 = ax < bx ? ( ax < cx ? ax : cx ) : ( bx < cx ? bx : cx ),
			y0 = ay < by ? ( ay < cy ? ay : cy ) : ( by < cy ? by : cy ),
			x1 = ax > bx ? ( ax > cx ? ax : cx ) : ( bx > cx ? bx : cx ),
			y1 = ay > by ? ( ay > cy ? ay : cy ) : ( by > cy ? by : cy );

		let p = c.next;
		while ( p !== a ) {

			if ( p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 &&
				pointInTriangle( ax, ay, bx, by, cx, cy, p.x, p.y ) &&
				area( p.prev, p, p.next ) >= 0 ) return false;
			p = p.next;

		}

		return true;

	}

	function isEarHashed( ear, minX, minY, invSize ) {

		const a = ear.prev,
			b = ear,
			c = ear.next;

		if ( area( a, b, c ) >= 0 ) return false; // reflex, can't be an ear

		const ax = a.x, bx = b.x, cx = c.x, ay = a.y, by = b.y, cy = c.y;

		// triangle bbox; min & max are calculated like this for speed
		const x0 = ax < bx ? ( ax < cx ? ax : cx ) : ( bx < cx ? bx : cx ),
			y0 = ay < by ? ( ay < cy ? ay : cy ) : ( by < cy ? by : cy ),
			x1 = ax > bx ? ( ax > cx ? ax : cx ) : ( bx > cx ? bx : cx ),
			y1 = ay > by ? ( ay > cy ? ay : cy ) : ( by > cy ? by : cy );

		// z-order range for the current triangle bbox;
		const minZ = zOrder( x0, y0, minX, minY, invSize ),
			maxZ = zOrder( x1, y1, minX, minY, invSize );

		let p = ear.prevZ,
			n = ear.nextZ;

		// look for points inside the triangle in both directions
		while ( p && p.z >= minZ && n && n.z <= maxZ ) {

			if ( p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c &&
				pointInTriangle( ax, ay, bx, by, cx, cy, p.x, p.y ) && area( p.prev, p, p.next ) >= 0 ) return false;
			p = p.prevZ;

			if ( n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c &&
				pointInTriangle( ax, ay, bx, by, cx, cy, n.x, n.y ) && area( n.prev, n, n.next ) >= 0 ) return false;
			n = n.nextZ;

		}

		// look for remaining points in decreasing z-order
		while ( p && p.z >= minZ ) {

			if ( p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c &&
				pointInTriangle( ax, ay, bx, by, cx, cy, p.x, p.y ) && area( p.prev, p, p.next ) >= 0 ) return false;
			p = p.prevZ;

		}

		// look for remaining points in increasing z-order
		while ( n && n.z <= maxZ ) {

			if ( n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c &&
				pointInTriangle( ax, ay, bx, by, cx, cy, n.x, n.y ) && area( n.prev, n, n.next ) >= 0 ) return false;
			n = n.nextZ;

		}

		return true;

	}

	// go through all polygon nodes and cure small local self-intersections
	function cureLocalIntersections( start, triangles, dim ) {

		let p = start;
		do {

			const a = p.prev,
				b = p.next.next;

			if ( ! equals( a, b ) && intersects( a, p, p.next, b ) && locallyInside( a, b ) && locallyInside( b, a ) ) {

				triangles.push( a.i / dim | 0 );
				triangles.push( p.i / dim | 0 );
				triangles.push( b.i / dim | 0 );

				// remove two nodes involved
				removeNode( p );
				removeNode( p.next );

				p = start = b;

			}

			p = p.next;

		} while ( p !== start );

		return filterPoints( p );

	}

	// try splitting polygon into two and triangulate them independently
	function splitEarcut( start, triangles, dim, minX, minY, invSize ) {

		// look for a valid diagonal that divides the polygon into two
		let a = start;
		do {

			let b = a.next.next;
			while ( b !== a.prev ) {

				if ( a.i !== b.i && isValidDiagonal( a, b ) ) {

					// split the polygon in two by the diagonal
					let c = splitPolygon( a, b );

					// filter colinear points around the cuts
					a = filterPoints( a, a.next );
					c = filterPoints( c, c.next );

					// run earcut on each half
					earcutLinked( a, triangles, dim, minX, minY, invSize, 0 );
					earcutLinked( c, triangles, dim, minX, minY, invSize, 0 );
					return;

				}

				b = b.next;

			}

			a = a.next;

		} while ( a !== start );

	}

	// link every hole into the outer loop, producing a single-ring polygon without holes
	function eliminateHoles( data, holeIndices, outerNode, dim ) {

		const queue = [];
		let i, len, start, end, list;

		for ( i = 0, len = holeIndices.length; i < len; i ++ ) {

			start = holeIndices[ i ] * dim;
			end = i < len - 1 ? holeIndices[ i + 1 ] * dim : data.length;
			list = linkedList( data, start, end, dim, false );
			if ( list === list.next ) list.steiner = true;
			queue.push( getLeftmost( list ) );

		}

		queue.sort( compareX );

		// process holes from left to right
		for ( i = 0; i < queue.length; i ++ ) {

			outerNode = eliminateHole( queue[ i ], outerNode );

		}

		return outerNode;

	}

	function compareX( a, b ) {

		return a.x - b.x;

	}

	// find a bridge between vertices that connects hole with an outer ring and link it
	function eliminateHole( hole, outerNode ) {

		const bridge = findHoleBridge( hole, outerNode );
		if ( ! bridge ) {

			return outerNode;

		}

		const bridgeReverse = splitPolygon( bridge, hole );

		// filter collinear points around the cuts
		filterPoints( bridgeReverse, bridgeReverse.next );
		return filterPoints( bridge, bridge.next );

	}

	// David Eberly's algorithm for finding a bridge between hole and outer polygon
	function findHoleBridge( hole, outerNode ) {

		let p = outerNode,
			qx = - Infinity,
			m;

		const hx = hole.x, hy = hole.y;

		// find a segment intersected by a ray from the hole's leftmost point to the left;
		// segment's endpoint with lesser x will be potential connection point
		do {

			if ( hy <= p.y && hy >= p.next.y && p.next.y !== p.y ) {

				const x = p.x + ( hy - p.y ) * ( p.next.x - p.x ) / ( p.next.y - p.y );
				if ( x <= hx && x > qx ) {

					qx = x;
					m = p.x < p.next.x ? p : p.next;
					if ( x === hx ) return m; // hole touches outer segment; pick leftmost endpoint

				}

			}

			p = p.next;

		} while ( p !== outerNode );

		if ( ! m ) return null;

		// look for points inside the triangle of hole point, segment intersection and endpoint;
		// if there are no points found, we have a valid connection;
		// otherwise choose the point of the minimum angle with the ray as connection point

		const stop = m,
			mx = m.x,
			my = m.y;
		let tanMin = Infinity, tan;

		p = m;

		do {

			if ( hx >= p.x && p.x >= mx && hx !== p.x &&
					pointInTriangle( hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y ) ) {

				tan = Math.abs( hy - p.y ) / ( hx - p.x ); // tangential

				if ( locallyInside( p, hole ) && ( tan < tanMin || ( tan === tanMin && ( p.x > m.x || ( p.x === m.x && sectorContainsSector( m, p ) ) ) ) ) ) {

					m = p;
					tanMin = tan;

				}

			}

			p = p.next;

		} while ( p !== stop );

		return m;

	}

	// whether sector in vertex m contains sector in vertex p in the same coordinates
	function sectorContainsSector( m, p ) {

		return area( m.prev, m, p.prev ) < 0 && area( p.next, m, m.next ) < 0;

	}

	// interlink polygon nodes in z-order
	function indexCurve( start, minX, minY, invSize ) {

		let p = start;
		do {

			if ( p.z === 0 ) p.z = zOrder( p.x, p.y, minX, minY, invSize );
			p.prevZ = p.prev;
			p.nextZ = p.next;
			p = p.next;

		} while ( p !== start );

		p.prevZ.nextZ = null;
		p.prevZ = null;

		sortLinked( p );

	}

	// Simon Tatham's linked list merge sort algorithm
	// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
	function sortLinked( list ) {

		let i, p, q, e, tail, numMerges, pSize, qSize,
			inSize = 1;

		do {

			p = list;
			list = null;
			tail = null;
			numMerges = 0;

			while ( p ) {

				numMerges ++;
				q = p;
				pSize = 0;
				for ( i = 0; i < inSize; i ++ ) {

					pSize ++;
					q = q.nextZ;
					if ( ! q ) break;

				}

				qSize = inSize;

				while ( pSize > 0 || ( qSize > 0 && q ) ) {

					if ( pSize !== 0 && ( qSize === 0 || ! q || p.z <= q.z ) ) {

						e = p;
						p = p.nextZ;
						pSize --;

					} else {

						e = q;
						q = q.nextZ;
						qSize --;

					}

					if ( tail ) tail.nextZ = e;
					else list = e;

					e.prevZ = tail;
					tail = e;

				}

				p = q;

			}

			tail.nextZ = null;
			inSize *= 2;

		} while ( numMerges > 1 );

		return list;

	}

	// z-order of a point given coords and inverse of the longer side of data bbox
	function zOrder( x, y, minX, minY, invSize ) {

		// coords are transformed into non-negative 15-bit integer range
		x = ( x - minX ) * invSize | 0;
		y = ( y - minY ) * invSize | 0;

		x = ( x | ( x << 8 ) ) & 0x00FF00FF;
		x = ( x | ( x << 4 ) ) & 0x0F0F0F0F;
		x = ( x | ( x << 2 ) ) & 0x33333333;
		x = ( x | ( x << 1 ) ) & 0x55555555;

		y = ( y | ( y << 8 ) ) & 0x00FF00FF;
		y = ( y | ( y << 4 ) ) & 0x0F0F0F0F;
		y = ( y | ( y << 2 ) ) & 0x33333333;
		y = ( y | ( y << 1 ) ) & 0x55555555;

		return x | ( y << 1 );

	}

	// find the leftmost node of a polygon ring
	function getLeftmost( start ) {

		let p = start,
			leftmost = start;
		do {

			if ( p.x < leftmost.x || ( p.x === leftmost.x && p.y < leftmost.y ) ) leftmost = p;
			p = p.next;

		} while ( p !== start );

		return leftmost;

	}

	// check if a point lies within a convex triangle
	function pointInTriangle( ax, ay, bx, by, cx, cy, px, py ) {

		return ( cx - px ) * ( ay - py ) >= ( ax - px ) * ( cy - py ) &&
	           ( ax - px ) * ( by - py ) >= ( bx - px ) * ( ay - py ) &&
	           ( bx - px ) * ( cy - py ) >= ( cx - px ) * ( by - py );

	}

	// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
	function isValidDiagonal( a, b ) {

		return a.next.i !== b.i && a.prev.i !== b.i && ! intersectsPolygon( a, b ) && // dones't intersect other edges
	           ( locallyInside( a, b ) && locallyInside( b, a ) && middleInside( a, b ) && // locally visible
	            ( area( a.prev, a, b.prev ) || area( a, b.prev, b ) ) || // does not create opposite-facing sectors
	            equals( a, b ) && area( a.prev, a, a.next ) > 0 && area( b.prev, b, b.next ) > 0 ); // special zero-length case

	}

	// signed area of a triangle
	function area( p, q, r ) {

		return ( q.y - p.y ) * ( r.x - q.x ) - ( q.x - p.x ) * ( r.y - q.y );

	}

	// check if two points are equal
	function equals( p1, p2 ) {

		return p1.x === p2.x && p1.y === p2.y;

	}

	// check if two segments intersect
	function intersects( p1, q1, p2, q2 ) {

		const o1 = sign( area( p1, q1, p2 ) );
		const o2 = sign( area( p1, q1, q2 ) );
		const o3 = sign( area( p2, q2, p1 ) );
		const o4 = sign( area( p2, q2, q1 ) );

		if ( o1 !== o2 && o3 !== o4 ) return true; // general case

		if ( o1 === 0 && onSegment( p1, p2, q1 ) ) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
		if ( o2 === 0 && onSegment( p1, q2, q1 ) ) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
		if ( o3 === 0 && onSegment( p2, p1, q2 ) ) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
		if ( o4 === 0 && onSegment( p2, q1, q2 ) ) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

		return false;

	}

	// for collinear points p, q, r, check if point q lies on segment pr
	function onSegment( p, q, r ) {

		return q.x <= Math.max( p.x, r.x ) && q.x >= Math.min( p.x, r.x ) && q.y <= Math.max( p.y, r.y ) && q.y >= Math.min( p.y, r.y );

	}

	function sign( num ) {

		return num > 0 ? 1 : num < 0 ? -1 : 0;

	}

	// check if a polygon diagonal intersects any polygon segments
	function intersectsPolygon( a, b ) {

		let p = a;
		do {

			if ( p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
				intersects( p, p.next, a, b ) ) return true;
			p = p.next;

		} while ( p !== a );

		return false;

	}

	// check if a polygon diagonal is locally inside the polygon
	function locallyInside( a, b ) {

		return area( a.prev, a, a.next ) < 0 ?
			area( a, b, a.next ) >= 0 && area( a, a.prev, b ) >= 0 :
			area( a, b, a.prev ) < 0 || area( a, a.next, b ) < 0;

	}

	// check if the middle point of a polygon diagonal is inside the polygon
	function middleInside( a, b ) {

		let p = a,
			inside = false;
		const px = ( a.x + b.x ) / 2,
			py = ( a.y + b.y ) / 2;
		do {

			if ( ( ( p.y > py ) !== ( p.next.y > py ) ) && p.next.y !== p.y &&
				( px < ( p.next.x - p.x ) * ( py - p.y ) / ( p.next.y - p.y ) + p.x ) )
				inside = ! inside;
			p = p.next;

		} while ( p !== a );

		return inside;

	}

	// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
	// if one belongs to the outer ring and another to a hole, it merges it into a single ring
	function splitPolygon( a, b ) {

		const a2 = new Node( a.i, a.x, a.y ),
			b2 = new Node( b.i, b.x, b.y ),
			an = a.next,
			bp = b.prev;

		a.next = b;
		b.prev = a;

		a2.next = an;
		an.prev = a2;

		b2.next = a2;
		a2.prev = b2;

		bp.next = b2;
		b2.prev = bp;

		return b2;

	}

	// create a node and optionally link it with previous one (in a circular doubly linked list)
	function insertNode( i, x, y, last ) {

		const p = new Node( i, x, y );

		if ( ! last ) {

			p.prev = p;
			p.next = p;

		} else {

			p.next = last.next;
			p.prev = last;
			last.next.prev = p;
			last.next = p;

		}

		return p;

	}

	function removeNode( p ) {

		p.next.prev = p.prev;
		p.prev.next = p.next;

		if ( p.prevZ ) p.prevZ.nextZ = p.nextZ;
		if ( p.nextZ ) p.nextZ.prevZ = p.prevZ;

	}

	function Node( i, x, y ) {

		// vertex index in coordinates array
		this.i = i;

		// vertex coordinates
		this.x = x;
		this.y = y;

		// previous and next vertex nodes in a polygon ring
		this.prev = null;
		this.next = null;

		// z-order curve value
		this.z = 0;

		// previous and next nodes in z-order
		this.prevZ = null;
		this.nextZ = null;

		// indicates whether this is a steiner point
		this.steiner = false;

	}

	function signedArea( data, start, end, dim ) {

		let sum = 0;
		for ( let i = start, j = end - dim; i < end; i += dim ) {

			sum += ( data[ j ] - data[ i ] ) * ( data[ i + 1 ] + data[ j + 1 ] );
			j = i;

		}

		return sum;

	}

	class ShapeUtils {

		// calculate area of the contour polygon

		static area( contour ) {

			const n = contour.length;
			let a = 0.0;

			for ( let p = n - 1, q = 0; q < n; p = q ++ ) {

				a += contour[ p ].x * contour[ q ].y - contour[ q ].x * contour[ p ].y;

			}

			return a * 0.5;

		}

		static isClockWise( pts ) {

			return ShapeUtils.area( pts ) < 0;

		}

		static triangulateShape( contour, holes ) {

			const vertices = []; // flat array of vertices like [ x0,y0, x1,y1, x2,y2, ... ]
			const holeIndices = []; // array of hole indices
			const faces = []; // final array of vertex indices like [ [ a,b,d ], [ b,c,d ] ]

			removeDupEndPts( contour );
			addContour( vertices, contour );

			//

			let holeIndex = contour.length;

			holes.forEach( removeDupEndPts );

			for ( let i = 0; i < holes.length; i ++ ) {

				holeIndices.push( holeIndex );
				holeIndex += holes[ i ].length;
				addContour( vertices, holes[ i ] );

			}

			//

			const triangles = Earcut.triangulate( vertices, holeIndices );

			//

			for ( let i = 0; i < triangles.length; i += 3 ) {

				faces.push( triangles.slice( i, i + 3 ) );

			}

			return faces;

		}

	}

	function removeDupEndPts( points ) {

		const l = points.length;

		if ( l > 2 && points[ l - 1 ].equals( points[ 0 ] ) ) {

			points.pop();

		}

	}

	function addContour( vertices, contour ) {

		for ( let i = 0; i < contour.length; i ++ ) {

			vertices.push( contour[ i ].x );
			vertices.push( contour[ i ].y );

		}

	}

	/**
	 * Creates extruded geometry from a path shape.
	 *
	 * parameters = {
	 *
	 *  curveSegments: <int>, // number of points on the curves
	 *  steps: <int>, // number of points for z-side extrusions / used for subdividing segments of extrude spline too
	 *  depth: <float>, // Depth to extrude the shape
	 *
	 *  bevelEnabled: <bool>, // turn on bevel
	 *  bevelThickness: <float>, // how deep into the original shape bevel goes
	 *  bevelSize: <float>, // how far from shape outline (including bevelOffset) is bevel
	 *  bevelOffset: <float>, // how far from shape outline does bevel start
	 *  bevelSegments: <int>, // number of bevel layers
	 *
	 *  extrudePath: <THREE.Curve> // curve to extrude shape along
	 *
	 *  UVGenerator: <Object> // object that provides UV generator functions
	 *
	 * }
	 */


	class ExtrudeGeometry extends three_2.BufferGeometry {

		constructor( shapes = new Shape( [ new three_1.Vector2( 0.5, 0.5 ), new three_1.Vector2( -0.5, 0.5 ), new three_1.Vector2( -0.5, -0.5 ), new three_1.Vector2( 0.5, -0.5 ) ] ), options = {} ) {

			super();

			this.type = 'ExtrudeGeometry';

			this.parameters = {
				shapes: shapes,
				options: options
			};

			shapes = Array.isArray( shapes ) ? shapes : [ shapes ];

			const scope = this;

			const verticesArray = [];
			const uvArray = [];

			for ( let i = 0, l = shapes.length; i < l; i ++ ) {

				const shape = shapes[ i ];
				addShape( shape );

			}

			// build geometry

			this.setAttribute( 'position', new three_1.Float32BufferAttribute( verticesArray, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvArray, 2 ) );

			this.computeVertexNormals();

			// functions

			function addShape( shape ) {

				const placeholder = [];

				// options

				const curveSegments = options.curveSegments !== undefined ? options.curveSegments : 12;
				const steps = options.steps !== undefined ? options.steps : 1;
				const depth = options.depth !== undefined ? options.depth : 1;

				let bevelEnabled = options.bevelEnabled !== undefined ? options.bevelEnabled : true;
				let bevelThickness = options.bevelThickness !== undefined ? options.bevelThickness : 0.2;
				let bevelSize = options.bevelSize !== undefined ? options.bevelSize : bevelThickness - 0.1;
				let bevelOffset = options.bevelOffset !== undefined ? options.bevelOffset : 0;
				let bevelSegments = options.bevelSegments !== undefined ? options.bevelSegments : 3;

				const extrudePath = options.extrudePath;

				const uvgen = options.UVGenerator !== undefined ? options.UVGenerator : WorldUVGenerator;

				//

				let extrudePts, extrudeByPath = false;
				let splineTube, binormal, normal, position2;

				if ( extrudePath ) {

					extrudePts = extrudePath.getSpacedPoints( steps );

					extrudeByPath = true;
					bevelEnabled = false; // bevels not supported for path extrusion

					// SETUP TNB variables

					// TODO1 - have a .isClosed in spline?

					splineTube = extrudePath.computeFrenetFrames( steps, false );

					// console.log(splineTube, 'splineTube', splineTube.normals.length, 'steps', steps, 'extrudePts', extrudePts.length);

					binormal = new three_1.Vector3();
					normal = new three_1.Vector3();
					position2 = new three_1.Vector3();

				}

				// Safeguards if bevels are not enabled

				if ( ! bevelEnabled ) {

					bevelSegments = 0;
					bevelThickness = 0;
					bevelSize = 0;
					bevelOffset = 0;

				}

				// Variables initialization

				const shapePoints = shape.extractPoints( curveSegments );

				let vertices = shapePoints.shape;
				const holes = shapePoints.holes;

				const reverse = ! ShapeUtils.isClockWise( vertices );

				if ( reverse ) {

					vertices = vertices.reverse();

					// Maybe we should also check if holes are in the opposite direction, just to be safe ...

					for ( let h = 0, hl = holes.length; h < hl; h ++ ) {

						const ahole = holes[ h ];

						if ( ShapeUtils.isClockWise( ahole ) ) {

							holes[ h ] = ahole.reverse();

						}

					}

				}


				const faces = ShapeUtils.triangulateShape( vertices, holes );

				/* Vertices */

				const contour = vertices; // vertices has all points but contour has only points of circumference

				for ( let h = 0, hl = holes.length; h < hl; h ++ ) {

					const ahole = holes[ h ];

					vertices = vertices.concat( ahole );

				}


				function scalePt2( pt, vec, size ) {

					if ( ! vec ) console.error( 'THREE.ExtrudeGeometry: vec does not exist' );

					return pt.clone().addScaledVector( vec, size );

				}

				const vlen = vertices.length, flen = faces.length;


				// Find directions for point movement


				function getBevelVec( inPt, inPrev, inNext ) {

					// computes for inPt the corresponding point inPt' on a new contour
					//   shifted by 1 unit (length of normalized vector) to the left
					// if we walk along contour clockwise, this new contour is outside the old one
					//
					// inPt' is the intersection of the two lines parallel to the two
					//  adjacent edges of inPt at a distance of 1 unit on the left side.

					let v_trans_x, v_trans_y, shrink_by; // resulting translation vector for inPt

					// good reading for geometry algorithms (here: line-line intersection)
					// http://geomalgorithms.com/a05-_intersect-1.html

					const v_prev_x = inPt.x - inPrev.x,
						v_prev_y = inPt.y - inPrev.y;
					const v_next_x = inNext.x - inPt.x,
						v_next_y = inNext.y - inPt.y;

					const v_prev_lensq = ( v_prev_x * v_prev_x + v_prev_y * v_prev_y );

					// check for collinear edges
					const collinear0 = ( v_prev_x * v_next_y - v_prev_y * v_next_x );

					if ( Math.abs( collinear0 ) > Number.EPSILON ) {

						// not collinear

						// length of vectors for normalizing

						const v_prev_len = Math.sqrt( v_prev_lensq );
						const v_next_len = Math.sqrt( v_next_x * v_next_x + v_next_y * v_next_y );

						// shift adjacent points by unit vectors to the left

						const ptPrevShift_x = ( inPrev.x - v_prev_y / v_prev_len );
						const ptPrevShift_y = ( inPrev.y + v_prev_x / v_prev_len );

						const ptNextShift_x = ( inNext.x - v_next_y / v_next_len );
						const ptNextShift_y = ( inNext.y + v_next_x / v_next_len );

						// scaling factor for v_prev to intersection point

						const sf = ( ( ptNextShift_x - ptPrevShift_x ) * v_next_y -
								( ptNextShift_y - ptPrevShift_y ) * v_next_x ) /
							( v_prev_x * v_next_y - v_prev_y * v_next_x );

						// vector from inPt to intersection point

						v_trans_x = ( ptPrevShift_x + v_prev_x * sf - inPt.x );
						v_trans_y = ( ptPrevShift_y + v_prev_y * sf - inPt.y );

						// Don't normalize!, otherwise sharp corners become ugly
						//  but prevent crazy spikes
						const v_trans_lensq = ( v_trans_x * v_trans_x + v_trans_y * v_trans_y );
						if ( v_trans_lensq <= 2 ) {

							return new three_1.Vector2( v_trans_x, v_trans_y );

						} else {

							shrink_by = Math.sqrt( v_trans_lensq / 2 );

						}

					} else {

						// handle special case of collinear edges

						let direction_eq = false; // assumes: opposite

						if ( v_prev_x > Number.EPSILON ) {

							if ( v_next_x > Number.EPSILON ) {

								direction_eq = true;

							}

						} else {

							if ( v_prev_x < - Number.EPSILON ) {

								if ( v_next_x < - Number.EPSILON ) {

									direction_eq = true;

								}

							} else {

								if ( Math.sign( v_prev_y ) === Math.sign( v_next_y ) ) {

									direction_eq = true;

								}

							}

						}

						if ( direction_eq ) {

							// console.log("Warning: lines are a straight sequence");
							v_trans_x = - v_prev_y;
							v_trans_y = v_prev_x;
							shrink_by = Math.sqrt( v_prev_lensq );

						} else {

							// console.log("Warning: lines are a straight spike");
							v_trans_x = v_prev_x;
							v_trans_y = v_prev_y;
							shrink_by = Math.sqrt( v_prev_lensq / 2 );

						}

					}

					return new three_1.Vector2( v_trans_x / shrink_by, v_trans_y / shrink_by );

				}


				const contourMovements = [];

				for ( let i = 0, il = contour.length, j = il - 1, k = i + 1; i < il; i ++, j ++, k ++ ) {

					if ( j === il ) j = 0;
					if ( k === il ) k = 0;

					//  (j)---(i)---(k)
					// console.log('i,j,k', i, j , k)

					contourMovements[ i ] = getBevelVec( contour[ i ], contour[ j ], contour[ k ] );

				}

				const holesMovements = [];
				let oneHoleMovements, verticesMovements = contourMovements.concat();

				for ( let h = 0, hl = holes.length; h < hl; h ++ ) {

					const ahole = holes[ h ];

					oneHoleMovements = [];

					for ( let i = 0, il = ahole.length, j = il - 1, k = i + 1; i < il; i ++, j ++, k ++ ) {

						if ( j === il ) j = 0;
						if ( k === il ) k = 0;

						//  (j)---(i)---(k)
						oneHoleMovements[ i ] = getBevelVec( ahole[ i ], ahole[ j ], ahole[ k ] );

					}

					holesMovements.push( oneHoleMovements );
					verticesMovements = verticesMovements.concat( oneHoleMovements );

				}


				// Loop bevelSegments, 1 for the front, 1 for the back

				for ( let b = 0; b < bevelSegments; b ++ ) {

					//for ( b = bevelSegments; b > 0; b -- ) {

					const t = b / bevelSegments;
					const z = bevelThickness * Math.cos( t * Math.PI / 2 );
					const bs = bevelSize * Math.sin( t * Math.PI / 2 ) + bevelOffset;

					// contract shape

					for ( let i = 0, il = contour.length; i < il; i ++ ) {

						const vert = scalePt2( contour[ i ], contourMovements[ i ], bs );

						v( vert.x, vert.y, - z );

					}

					// expand holes

					for ( let h = 0, hl = holes.length; h < hl; h ++ ) {

						const ahole = holes[ h ];
						oneHoleMovements = holesMovements[ h ];

						for ( let i = 0, il = ahole.length; i < il; i ++ ) {

							const vert = scalePt2( ahole[ i ], oneHoleMovements[ i ], bs );

							v( vert.x, vert.y, - z );

						}

					}

				}

				const bs = bevelSize + bevelOffset;

				// Back facing vertices

				for ( let i = 0; i < vlen; i ++ ) {

					const vert = bevelEnabled ? scalePt2( vertices[ i ], verticesMovements[ i ], bs ) : vertices[ i ];

					if ( ! extrudeByPath ) {

						v( vert.x, vert.y, 0 );

					} else {

						// v( vert.x, vert.y + extrudePts[ 0 ].y, extrudePts[ 0 ].x );

						normal.copy( splineTube.normals[ 0 ] ).multiplyScalar( vert.x );
						binormal.copy( splineTube.binormals[ 0 ] ).multiplyScalar( vert.y );

						position2.copy( extrudePts[ 0 ] ).add( normal ).add( binormal );

						v( position2.x, position2.y, position2.z );

					}

				}

				// Add stepped vertices...
				// Including front facing vertices

				for ( let s = 1; s <= steps; s ++ ) {

					for ( let i = 0; i < vlen; i ++ ) {

						const vert = bevelEnabled ? scalePt2( vertices[ i ], verticesMovements[ i ], bs ) : vertices[ i ];

						if ( ! extrudeByPath ) {

							v( vert.x, vert.y, depth / steps * s );

						} else {

							// v( vert.x, vert.y + extrudePts[ s - 1 ].y, extrudePts[ s - 1 ].x );

							normal.copy( splineTube.normals[ s ] ).multiplyScalar( vert.x );
							binormal.copy( splineTube.binormals[ s ] ).multiplyScalar( vert.y );

							position2.copy( extrudePts[ s ] ).add( normal ).add( binormal );

							v( position2.x, position2.y, position2.z );

						}

					}

				}


				// Add bevel segments planes

				//for ( b = 1; b <= bevelSegments; b ++ ) {
				for ( let b = bevelSegments - 1; b >= 0; b -- ) {

					const t = b / bevelSegments;
					const z = bevelThickness * Math.cos( t * Math.PI / 2 );
					const bs = bevelSize * Math.sin( t * Math.PI / 2 ) + bevelOffset;

					// contract shape

					for ( let i = 0, il = contour.length; i < il; i ++ ) {

						const vert = scalePt2( contour[ i ], contourMovements[ i ], bs );
						v( vert.x, vert.y, depth + z );

					}

					// expand holes

					for ( let h = 0, hl = holes.length; h < hl; h ++ ) {

						const ahole = holes[ h ];
						oneHoleMovements = holesMovements[ h ];

						for ( let i = 0, il = ahole.length; i < il; i ++ ) {

							const vert = scalePt2( ahole[ i ], oneHoleMovements[ i ], bs );

							if ( ! extrudeByPath ) {

								v( vert.x, vert.y, depth + z );

							} else {

								v( vert.x, vert.y + extrudePts[ steps - 1 ].y, extrudePts[ steps - 1 ].x + z );

							}

						}

					}

				}

				/* Faces */

				// Top and bottom faces

				buildLidFaces();

				// Sides faces

				buildSideFaces();


				/////  Internal functions

				function buildLidFaces() {

					const start = verticesArray.length / 3;

					if ( bevelEnabled ) {

						let layer = 0; // steps + 1
						let offset = vlen * layer;

						// Bottom faces

						for ( let i = 0; i < flen; i ++ ) {

							const face = faces[ i ];
							f3( face[ 2 ] + offset, face[ 1 ] + offset, face[ 0 ] + offset );

						}

						layer = steps + bevelSegments * 2;
						offset = vlen * layer;

						// Top faces

						for ( let i = 0; i < flen; i ++ ) {

							const face = faces[ i ];
							f3( face[ 0 ] + offset, face[ 1 ] + offset, face[ 2 ] + offset );

						}

					} else {

						// Bottom faces

						for ( let i = 0; i < flen; i ++ ) {

							const face = faces[ i ];
							f3( face[ 2 ], face[ 1 ], face[ 0 ] );

						}

						// Top faces

						for ( let i = 0; i < flen; i ++ ) {

							const face = faces[ i ];
							f3( face[ 0 ] + vlen * steps, face[ 1 ] + vlen * steps, face[ 2 ] + vlen * steps );

						}

					}

					scope.addGroup( start, verticesArray.length / 3 - start, 0 );

				}

				// Create faces for the z-sides of the shape

				function buildSideFaces() {

					const start = verticesArray.length / 3;
					let layeroffset = 0;
					sidewalls( contour, layeroffset );
					layeroffset += contour.length;

					for ( let h = 0, hl = holes.length; h < hl; h ++ ) {

						const ahole = holes[ h ];
						sidewalls( ahole, layeroffset );

						//, true
						layeroffset += ahole.length;

					}


					scope.addGroup( start, verticesArray.length / 3 - start, 1 );


				}

				function sidewalls( contour, layeroffset ) {

					let i = contour.length;

					while ( -- i >= 0 ) {

						const j = i;
						let k = i - 1;
						if ( k < 0 ) k = contour.length - 1;

						//console.log('b', i,j, i-1, k,vertices.length);

						for ( let s = 0, sl = ( steps + bevelSegments * 2 ); s < sl; s ++ ) {

							const slen1 = vlen * s;
							const slen2 = vlen * ( s + 1 );

							const a = layeroffset + j + slen1,
								b = layeroffset + k + slen1,
								c = layeroffset + k + slen2,
								d = layeroffset + j + slen2;

							f4( a, b, c, d );

						}

					}

				}

				function v( x, y, z ) {

					placeholder.push( x );
					placeholder.push( y );
					placeholder.push( z );

				}


				function f3( a, b, c ) {

					addVertex( a );
					addVertex( b );
					addVertex( c );

					const nextIndex = verticesArray.length / 3;
					const uvs = uvgen.generateTopUV( scope, verticesArray, nextIndex - 3, nextIndex - 2, nextIndex - 1 );

					addUV( uvs[ 0 ] );
					addUV( uvs[ 1 ] );
					addUV( uvs[ 2 ] );

				}

				function f4( a, b, c, d ) {

					addVertex( a );
					addVertex( b );
					addVertex( d );

					addVertex( b );
					addVertex( c );
					addVertex( d );


					const nextIndex = verticesArray.length / 3;
					const uvs = uvgen.generateSideWallUV( scope, verticesArray, nextIndex - 6, nextIndex - 3, nextIndex - 2, nextIndex - 1 );

					addUV( uvs[ 0 ] );
					addUV( uvs[ 1 ] );
					addUV( uvs[ 3 ] );

					addUV( uvs[ 1 ] );
					addUV( uvs[ 2 ] );
					addUV( uvs[ 3 ] );

				}

				function addVertex( index ) {

					verticesArray.push( placeholder[ index * 3 + 0 ] );
					verticesArray.push( placeholder[ index * 3 + 1 ] );
					verticesArray.push( placeholder[ index * 3 + 2 ] );

				}


				function addUV( vector2 ) {

					uvArray.push( vector2.x );
					uvArray.push( vector2.y );

				}

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			const shapes = this.parameters.shapes;
			const options = this.parameters.options;

			return toJSON$1( shapes, options, data );

		}

		static fromJSON( data, shapes ) {

			const geometryShapes = [];

			for ( let j = 0, jl = data.shapes.length; j < jl; j ++ ) {

				const shape = shapes[ data.shapes[ j ] ];

				geometryShapes.push( shape );

			}

			const extrudePath = data.options.extrudePath;

			if ( extrudePath !== undefined ) {

				data.options.extrudePath = new Curves[ extrudePath.type ]().fromJSON( extrudePath );

			}

			return new ExtrudeGeometry( geometryShapes, data.options );

		}

	}

	const WorldUVGenerator = {

		generateTopUV: function ( geometry, vertices, indexA, indexB, indexC ) {

			const a_x = vertices[ indexA * 3 ];
			const a_y = vertices[ indexA * 3 + 1 ];
			const b_x = vertices[ indexB * 3 ];
			const b_y = vertices[ indexB * 3 + 1 ];
			const c_x = vertices[ indexC * 3 ];
			const c_y = vertices[ indexC * 3 + 1 ];

			return [
				new three_1.Vector2( a_x, a_y ),
				new three_1.Vector2( b_x, b_y ),
				new three_1.Vector2( c_x, c_y )
			];

		},

		generateSideWallUV: function ( geometry, vertices, indexA, indexB, indexC, indexD ) {

			const a_x = vertices[ indexA * 3 ];
			const a_y = vertices[ indexA * 3 + 1 ];
			const a_z = vertices[ indexA * 3 + 2 ];
			const b_x = vertices[ indexB * 3 ];
			const b_y = vertices[ indexB * 3 + 1 ];
			const b_z = vertices[ indexB * 3 + 2 ];
			const c_x = vertices[ indexC * 3 ];
			const c_y = vertices[ indexC * 3 + 1 ];
			const c_z = vertices[ indexC * 3 + 2 ];
			const d_x = vertices[ indexD * 3 ];
			const d_y = vertices[ indexD * 3 + 1 ];
			const d_z = vertices[ indexD * 3 + 2 ];

			if ( Math.abs( a_y - b_y ) < Math.abs( a_x - b_x ) ) {

				return [
					new three_1.Vector2( a_x, 1 - a_z ),
					new three_1.Vector2( b_x, 1 - b_z ),
					new three_1.Vector2( c_x, 1 - c_z ),
					new three_1.Vector2( d_x, 1 - d_z )
				];

			} else {

				return [
					new three_1.Vector2( a_y, 1 - a_z ),
					new three_1.Vector2( b_y, 1 - b_z ),
					new three_1.Vector2( c_y, 1 - c_z ),
					new three_1.Vector2( d_y, 1 - d_z )
				];

			}

		}

	};

	function toJSON$1( shapes, options, data ) {

		data.shapes = [];

		if ( Array.isArray( shapes ) ) {

			for ( let i = 0, l = shapes.length; i < l; i ++ ) {

				const shape = shapes[ i ];

				data.shapes.push( shape.uuid );

			}

		} else {

			data.shapes.push( shapes.uuid );

		}

		data.options = Object.assign( {}, options );

		if ( options.extrudePath !== undefined ) data.options.extrudePath = options.extrudePath.toJSON();

		return data;

	}

	class IcosahedronGeometry extends PolyhedronGeometry {

		constructor( radius = 1, detail = 0 ) {

			const t = ( 1 + Math.sqrt( 5 ) ) / 2;

			const vertices = [
				-1, t, 0, 	1, t, 0, 	-1, - t, 0, 	1, - t, 0,
				0, -1, t, 	0, 1, t,	0, -1, - t, 	0, 1, - t,
				t, 0, -1, 	t, 0, 1, 	- t, 0, -1, 	- t, 0, 1
			];

			const indices = [
				0, 11, 5, 	0, 5, 1, 	0, 1, 7, 	0, 7, 10, 	0, 10, 11,
				1, 5, 9, 	5, 11, 4,	11, 10, 2,	10, 7, 6,	7, 1, 8,
				3, 9, 4, 	3, 4, 2,	3, 2, 6,	3, 6, 8,	3, 8, 9,
				4, 9, 5, 	2, 4, 11,	6, 2, 10,	8, 6, 7,	9, 8, 1
			];

			super( vertices, indices, radius, detail );

			this.type = 'IcosahedronGeometry';

			this.parameters = {
				radius: radius,
				detail: detail
			};

		}

		static fromJSON( data ) {

			return new IcosahedronGeometry( data.radius, data.detail );

		}

	}

	class OctahedronGeometry extends PolyhedronGeometry {

		constructor( radius = 1, detail = 0 ) {

			const vertices = [
				1, 0, 0, 	-1, 0, 0,	0, 1, 0,
				0, -1, 0, 	0, 0, 1,	0, 0, -1
			];

			const indices = [
				0, 2, 4,	0, 4, 3,	0, 3, 5,
				0, 5, 2,	1, 2, 5,	1, 5, 3,
				1, 3, 4,	1, 4, 2
			];

			super( vertices, indices, radius, detail );

			this.type = 'OctahedronGeometry';

			this.parameters = {
				radius: radius,
				detail: detail
			};

		}

		static fromJSON( data ) {

			return new OctahedronGeometry( data.radius, data.detail );

		}

	}

	class RingGeometry extends three_2.BufferGeometry {

		constructor( innerRadius = 0.5, outerRadius = 1, thetaSegments = 32, phiSegments = 1, thetaStart = 0, thetaLength = Math.PI * 2 ) {

			super();

			this.type = 'RingGeometry';

			this.parameters = {
				innerRadius: innerRadius,
				outerRadius: outerRadius,
				thetaSegments: thetaSegments,
				phiSegments: phiSegments,
				thetaStart: thetaStart,
				thetaLength: thetaLength
			};

			thetaSegments = Math.max( 3, thetaSegments );
			phiSegments = Math.max( 1, phiSegments );

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// some helper variables

			let radius = innerRadius;
			const radiusStep = ( ( outerRadius - innerRadius ) / phiSegments );
			const vertex = new three_1.Vector3();
			const uv = new three_1.Vector2();

			// generate vertices, normals and uvs

			for ( let j = 0; j <= phiSegments; j ++ ) {

				for ( let i = 0; i <= thetaSegments; i ++ ) {

					// values are generate from the inside of the ring to the outside

					const segment = thetaStart + i / thetaSegments * thetaLength;

					// vertex

					vertex.x = radius * Math.cos( segment );
					vertex.y = radius * Math.sin( segment );

					vertices.push( vertex.x, vertex.y, vertex.z );

					// normal

					normals.push( 0, 0, 1 );

					// uv

					uv.x = ( vertex.x / outerRadius + 1 ) / 2;
					uv.y = ( vertex.y / outerRadius + 1 ) / 2;

					uvs.push( uv.x, uv.y );

				}

				// increase the radius for next row of vertices

				radius += radiusStep;

			}

			// indices

			for ( let j = 0; j < phiSegments; j ++ ) {

				const thetaSegmentLevel = j * ( thetaSegments + 1 );

				for ( let i = 0; i < thetaSegments; i ++ ) {

					const segment = i + thetaSegmentLevel;

					const a = segment;
					const b = segment + thetaSegments + 1;
					const c = segment + thetaSegments + 2;
					const d = segment + 1;

					// faces

					indices.push( a, b, d );
					indices.push( b, c, d );

				}

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new RingGeometry( data.innerRadius, data.outerRadius, data.thetaSegments, data.phiSegments, data.thetaStart, data.thetaLength );

		}

	}

	class ShapeGeometry extends three_2.BufferGeometry {

		constructor( shapes = new Shape( [ new three_1.Vector2( 0, 0.5 ), new three_1.Vector2( -0.5, -0.5 ), new three_1.Vector2( 0.5, -0.5 ) ] ), curveSegments = 12 ) {

			super();

			this.type = 'ShapeGeometry';

			this.parameters = {
				shapes: shapes,
				curveSegments: curveSegments
			};

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// helper variables

			let groupStart = 0;
			let groupCount = 0;

			// allow single and array values for "shapes" parameter

			if ( Array.isArray( shapes ) === false ) {

				addShape( shapes );

			} else {

				for ( let i = 0; i < shapes.length; i ++ ) {

					addShape( shapes[ i ] );

					this.addGroup( groupStart, groupCount, i ); // enables MultiMaterial support

					groupStart += groupCount;
					groupCount = 0;

				}

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );


			// helper functions

			function addShape( shape ) {

				const indexOffset = vertices.length / 3;
				const points = shape.extractPoints( curveSegments );

				let shapeVertices = points.shape;
				const shapeHoles = points.holes;

				// check direction of vertices

				if ( ShapeUtils.isClockWise( shapeVertices ) === false ) {

					shapeVertices = shapeVertices.reverse();

				}

				for ( let i = 0, l = shapeHoles.length; i < l; i ++ ) {

					const shapeHole = shapeHoles[ i ];

					if ( ShapeUtils.isClockWise( shapeHole ) === true ) {

						shapeHoles[ i ] = shapeHole.reverse();

					}

				}

				const faces = ShapeUtils.triangulateShape( shapeVertices, shapeHoles );

				// join vertices of inner and outer paths to a single array

				for ( let i = 0, l = shapeHoles.length; i < l; i ++ ) {

					const shapeHole = shapeHoles[ i ];
					shapeVertices = shapeVertices.concat( shapeHole );

				}

				// vertices, normals, uvs

				for ( let i = 0, l = shapeVertices.length; i < l; i ++ ) {

					const vertex = shapeVertices[ i ];

					vertices.push( vertex.x, vertex.y, 0 );
					normals.push( 0, 0, 1 );
					uvs.push( vertex.x, vertex.y ); // world uvs

				}

				// indices

				for ( let i = 0, l = faces.length; i < l; i ++ ) {

					const face = faces[ i ];

					const a = face[ 0 ] + indexOffset;
					const b = face[ 1 ] + indexOffset;
					const c = face[ 2 ] + indexOffset;

					indices.push( a, b, c );
					groupCount += 3;

				}

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			const shapes = this.parameters.shapes;

			return toJSON( shapes, data );

		}

		static fromJSON( data, shapes ) {

			const geometryShapes = [];

			for ( let j = 0, jl = data.shapes.length; j < jl; j ++ ) {

				const shape = shapes[ data.shapes[ j ] ];

				geometryShapes.push( shape );

			}

			return new ShapeGeometry( geometryShapes, data.curveSegments );

		}

	}

	function toJSON( shapes, data ) {

		data.shapes = [];

		if ( Array.isArray( shapes ) ) {

			for ( let i = 0, l = shapes.length; i < l; i ++ ) {

				const shape = shapes[ i ];

				data.shapes.push( shape.uuid );

			}

		} else {

			data.shapes.push( shapes.uuid );

		}

		return data;

	}

	class SphereGeometry extends three_2.BufferGeometry {

		constructor( radius = 1, widthSegments = 32, heightSegments = 16, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI ) {

			super();

			this.type = 'SphereGeometry';

			this.parameters = {
				radius: radius,
				widthSegments: widthSegments,
				heightSegments: heightSegments,
				phiStart: phiStart,
				phiLength: phiLength,
				thetaStart: thetaStart,
				thetaLength: thetaLength
			};

			widthSegments = Math.max( 3, Math.floor( widthSegments ) );
			heightSegments = Math.max( 2, Math.floor( heightSegments ) );

			const thetaEnd = Math.min( thetaStart + thetaLength, Math.PI );

			let index = 0;
			const grid = [];

			const vertex = new three_1.Vector3();
			const normal = new three_1.Vector3();

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// generate vertices, normals and uvs

			for ( let iy = 0; iy <= heightSegments; iy ++ ) {

				const verticesRow = [];

				const v = iy / heightSegments;

				// special case for the poles

				let uOffset = 0;

				if ( iy === 0 && thetaStart === 0 ) {

					uOffset = 0.5 / widthSegments;

				} else if ( iy === heightSegments && thetaEnd === Math.PI ) {

					uOffset = -0.5 / widthSegments;

				}

				for ( let ix = 0; ix <= widthSegments; ix ++ ) {

					const u = ix / widthSegments;

					// vertex

					vertex.x = - radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
					vertex.y = radius * Math.cos( thetaStart + v * thetaLength );
					vertex.z = radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );

					vertices.push( vertex.x, vertex.y, vertex.z );

					// normal

					normal.copy( vertex ).normalize();
					normals.push( normal.x, normal.y, normal.z );

					// uv

					uvs.push( u + uOffset, 1 - v );

					verticesRow.push( index ++ );

				}

				grid.push( verticesRow );

			}

			// indices

			for ( let iy = 0; iy < heightSegments; iy ++ ) {

				for ( let ix = 0; ix < widthSegments; ix ++ ) {

					const a = grid[ iy ][ ix + 1 ];
					const b = grid[ iy ][ ix ];
					const c = grid[ iy + 1 ][ ix ];
					const d = grid[ iy + 1 ][ ix + 1 ];

					if ( iy !== 0 || thetaStart > 0 ) indices.push( a, b, d );
					if ( iy !== heightSegments - 1 || thetaEnd < Math.PI ) indices.push( b, c, d );

				}

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new SphereGeometry( data.radius, data.widthSegments, data.heightSegments, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength );

		}

	}

	class TetrahedronGeometry extends PolyhedronGeometry {

		constructor( radius = 1, detail = 0 ) {

			const vertices = [
				1, 1, 1, 	-1, -1, 1, 	-1, 1, -1, 	1, -1, -1
			];

			const indices = [
				2, 1, 0, 	0, 3, 2,	1, 3, 0,	2, 3, 1
			];

			super( vertices, indices, radius, detail );

			this.type = 'TetrahedronGeometry';

			this.parameters = {
				radius: radius,
				detail: detail
			};

		}

		static fromJSON( data ) {

			return new TetrahedronGeometry( data.radius, data.detail );

		}

	}

	class TorusGeometry extends three_2.BufferGeometry {

		constructor( radius = 1, tube = 0.4, radialSegments = 12, tubularSegments = 48, arc = Math.PI * 2 ) {

			super();

			this.type = 'TorusGeometry';

			this.parameters = {
				radius: radius,
				tube: tube,
				radialSegments: radialSegments,
				tubularSegments: tubularSegments,
				arc: arc
			};

			radialSegments = Math.floor( radialSegments );
			tubularSegments = Math.floor( tubularSegments );

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// helper variables

			const center = new three_1.Vector3();
			const vertex = new three_1.Vector3();
			const normal = new three_1.Vector3();

			// generate vertices, normals and uvs

			for ( let j = 0; j <= radialSegments; j ++ ) {

				for ( let i = 0; i <= tubularSegments; i ++ ) {

					const u = i / tubularSegments * arc;
					const v = j / radialSegments * Math.PI * 2;

					// vertex

					vertex.x = ( radius + tube * Math.cos( v ) ) * Math.cos( u );
					vertex.y = ( radius + tube * Math.cos( v ) ) * Math.sin( u );
					vertex.z = tube * Math.sin( v );

					vertices.push( vertex.x, vertex.y, vertex.z );

					// normal

					center.x = radius * Math.cos( u );
					center.y = radius * Math.sin( u );
					normal.subVectors( vertex, center ).normalize();

					normals.push( normal.x, normal.y, normal.z );

					// uv

					uvs.push( i / tubularSegments );
					uvs.push( j / radialSegments );

				}

			}

			// generate indices

			for ( let j = 1; j <= radialSegments; j ++ ) {

				for ( let i = 1; i <= tubularSegments; i ++ ) {

					// indices

					const a = ( tubularSegments + 1 ) * j + i - 1;
					const b = ( tubularSegments + 1 ) * ( j - 1 ) + i - 1;
					const c = ( tubularSegments + 1 ) * ( j - 1 ) + i;
					const d = ( tubularSegments + 1 ) * j + i;

					// faces

					indices.push( a, b, d );
					indices.push( b, c, d );

				}

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new TorusGeometry( data.radius, data.tube, data.radialSegments, data.tubularSegments, data.arc );

		}

	}

	class TorusKnotGeometry extends three_2.BufferGeometry {

		constructor( radius = 1, tube = 0.4, tubularSegments = 64, radialSegments = 8, p = 2, q = 3 ) {

			super();

			this.type = 'TorusKnotGeometry';

			this.parameters = {
				radius: radius,
				tube: tube,
				tubularSegments: tubularSegments,
				radialSegments: radialSegments,
				p: p,
				q: q
			};

			tubularSegments = Math.floor( tubularSegments );
			radialSegments = Math.floor( radialSegments );

			// buffers

			const indices = [];
			const vertices = [];
			const normals = [];
			const uvs = [];

			// helper variables

			const vertex = new three_1.Vector3();
			const normal = new three_1.Vector3();

			const P1 = new three_1.Vector3();
			const P2 = new three_1.Vector3();

			const B = new three_1.Vector3();
			const T = new three_1.Vector3();
			const N = new three_1.Vector3();

			// generate vertices, normals and uvs

			for ( let i = 0; i <= tubularSegments; ++ i ) {

				// the radian "u" is used to calculate the position on the torus curve of the current tubular segment

				const u = i / tubularSegments * p * Math.PI * 2;

				// now we calculate two points. P1 is our current position on the curve, P2 is a little farther ahead.
				// these points are used to create a special "coordinate space", which is necessary to calculate the correct vertex positions

				calculatePositionOnCurve( u, p, q, radius, P1 );
				calculatePositionOnCurve( u + 0.01, p, q, radius, P2 );

				// calculate orthonormal basis

				T.subVectors( P2, P1 );
				N.addVectors( P2, P1 );
				B.crossVectors( T, N );
				N.crossVectors( B, T );

				// normalize B, N. T can be ignored, we don't use it

				B.normalize();
				N.normalize();

				for ( let j = 0; j <= radialSegments; ++ j ) {

					// now calculate the vertices. they are nothing more than an extrusion of the torus curve.
					// because we extrude a shape in the xy-plane, there is no need to calculate a z-value.

					const v = j / radialSegments * Math.PI * 2;
					const cx = - tube * Math.cos( v );
					const cy = tube * Math.sin( v );

					// now calculate the final vertex position.
					// first we orient the extrusion with our basis vectors, then we add it to the current position on the curve

					vertex.x = P1.x + ( cx * N.x + cy * B.x );
					vertex.y = P1.y + ( cx * N.y + cy * B.y );
					vertex.z = P1.z + ( cx * N.z + cy * B.z );

					vertices.push( vertex.x, vertex.y, vertex.z );

					// normal (P1 is always the center/origin of the extrusion, thus we can use it to calculate the normal)

					normal.subVectors( vertex, P1 ).normalize();

					normals.push( normal.x, normal.y, normal.z );

					// uv

					uvs.push( i / tubularSegments );
					uvs.push( j / radialSegments );

				}

			}

			// generate indices

			for ( let j = 1; j <= tubularSegments; j ++ ) {

				for ( let i = 1; i <= radialSegments; i ++ ) {

					// indices

					const a = ( radialSegments + 1 ) * ( j - 1 ) + ( i - 1 );
					const b = ( radialSegments + 1 ) * j + ( i - 1 );
					const c = ( radialSegments + 1 ) * j + i;
					const d = ( radialSegments + 1 ) * ( j - 1 ) + i;

					// faces

					indices.push( a, b, d );
					indices.push( b, c, d );

				}

			}

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

			// this function calculates the current position on the torus curve

			function calculatePositionOnCurve( u, p, q, radius, position ) {

				const cu = Math.cos( u );
				const su = Math.sin( u );
				const quOverP = q / p * u;
				const cs = Math.cos( quOverP );

				position.x = radius * ( 2 + cs ) * 0.5 * cu;
				position.y = radius * ( 2 + cs ) * su * 0.5;
				position.z = radius * Math.sin( quOverP ) * 0.5;

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		static fromJSON( data ) {

			return new TorusKnotGeometry( data.radius, data.tube, data.tubularSegments, data.radialSegments, data.p, data.q );

		}

	}

	class TubeGeometry extends three_2.BufferGeometry {

		constructor( path = new QuadraticBezierCurve3( new three_1.Vector3( -1, -1, 0 ), new three_1.Vector3( -1, 1, 0 ), new three_1.Vector3( 1, 1, 0 ) ), tubularSegments = 64, radius = 1, radialSegments = 8, closed = false ) {

			super();

			this.type = 'TubeGeometry';

			this.parameters = {
				path: path,
				tubularSegments: tubularSegments,
				radius: radius,
				radialSegments: radialSegments,
				closed: closed
			};

			const frames = path.computeFrenetFrames( tubularSegments, closed );

			// expose internals

			this.tangents = frames.tangents;
			this.normals = frames.normals;
			this.binormals = frames.binormals;

			// helper variables

			const vertex = new three_1.Vector3();
			const normal = new three_1.Vector3();
			const uv = new three_1.Vector2();
			let P = new three_1.Vector3();

			// buffer

			const vertices = [];
			const normals = [];
			const uvs = [];
			const indices = [];

			// create buffer data

			generateBufferData();

			// build geometry

			this.setIndex( indices );
			this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new three_1.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new three_1.Float32BufferAttribute( uvs, 2 ) );

			// functions

			function generateBufferData() {

				for ( let i = 0; i < tubularSegments; i ++ ) {

					generateSegment( i );

				}

				// if the geometry is not closed, generate the last row of vertices and normals
				// at the regular position on the given path
				//
				// if the geometry is closed, duplicate the first row of vertices and normals (uvs will differ)

				generateSegment( ( closed === false ) ? tubularSegments : 0 );

				// uvs are generated in a separate function.
				// this makes it easy compute correct values for closed geometries

				generateUVs();

				// finally create faces

				generateIndices();

			}

			function generateSegment( i ) {

				// we use getPointAt to sample evenly distributed points from the given path

				P = path.getPointAt( i / tubularSegments, P );

				// retrieve corresponding normal and binormal

				const N = frames.normals[ i ];
				const B = frames.binormals[ i ];

				// generate normals and vertices for the current segment

				for ( let j = 0; j <= radialSegments; j ++ ) {

					const v = j / radialSegments * Math.PI * 2;

					const sin = Math.sin( v );
					const cos = - Math.cos( v );

					// normal

					normal.x = ( cos * N.x + sin * B.x );
					normal.y = ( cos * N.y + sin * B.y );
					normal.z = ( cos * N.z + sin * B.z );
					normal.normalize();

					normals.push( normal.x, normal.y, normal.z );

					// vertex

					vertex.x = P.x + radius * normal.x;
					vertex.y = P.y + radius * normal.y;
					vertex.z = P.z + radius * normal.z;

					vertices.push( vertex.x, vertex.y, vertex.z );

				}

			}

			function generateIndices() {

				for ( let j = 1; j <= tubularSegments; j ++ ) {

					for ( let i = 1; i <= radialSegments; i ++ ) {

						const a = ( radialSegments + 1 ) * ( j - 1 ) + ( i - 1 );
						const b = ( radialSegments + 1 ) * j + ( i - 1 );
						const c = ( radialSegments + 1 ) * j + i;
						const d = ( radialSegments + 1 ) * ( j - 1 ) + i;

						// faces

						indices.push( a, b, d );
						indices.push( b, c, d );

					}

				}

			}

			function generateUVs() {

				for ( let i = 0; i <= tubularSegments; i ++ ) {

					for ( let j = 0; j <= radialSegments; j ++ ) {

						uv.x = i / tubularSegments;
						uv.y = j / radialSegments;

						uvs.push( uv.x, uv.y );

					}

				}

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

		toJSON() {

			const data = super.toJSON();

			data.path = this.parameters.path.toJSON();

			return data;

		}

		static fromJSON( data ) {

			// This only works for built-in curves (e.g. CatmullRomCurve3).
			// User defined curves or instances of CurvePath will not be deserialized.
			return new TubeGeometry(
				new Curves[ data.path.type ]().fromJSON( data.path ),
				data.tubularSegments,
				data.radius,
				data.radialSegments,
				data.closed
			);

		}

	}

	class WireframeGeometry extends three_2.BufferGeometry {

		constructor( geometry = null ) {

			super();

			this.type = 'WireframeGeometry';

			this.parameters = {
				geometry: geometry
			};

			if ( geometry !== null ) {

				// buffer

				const vertices = [];
				const edges = new Set();

				// helper variables

				const start = new three_1.Vector3();
				const end = new three_1.Vector3();

				if ( geometry.index !== null ) {

					// indexed BufferGeometry

					const position = geometry.attributes.position;
					const indices = geometry.index;
					let groups = geometry.groups;

					if ( groups.length === 0 ) {

						groups = [ { start: 0, count: indices.count, materialIndex: 0 } ];

					}

					// create a data structure that contains all edges without duplicates

					for ( let o = 0, ol = groups.length; o < ol; ++ o ) {

						const group = groups[ o ];

						const groupStart = group.start;
						const groupCount = group.count;

						for ( let i = groupStart, l = ( groupStart + groupCount ); i < l; i += 3 ) {

							for ( let j = 0; j < 3; j ++ ) {

								const index1 = indices.getX( i + j );
								const index2 = indices.getX( i + ( j + 1 ) % 3 );

								start.fromBufferAttribute( position, index1 );
								end.fromBufferAttribute( position, index2 );

								if ( isUniqueEdge( start, end, edges ) === true ) {

									vertices.push( start.x, start.y, start.z );
									vertices.push( end.x, end.y, end.z );

								}

							}

						}

					}

				} else {

					// non-indexed BufferGeometry

					const position = geometry.attributes.position;

					for ( let i = 0, l = ( position.count / 3 ); i < l; i ++ ) {

						for ( let j = 0; j < 3; j ++ ) {

							// three edges per triangle, an edge is represented as (index1, index2)
							// e.g. the first triangle has the following edges: (0,1),(1,2),(2,0)

							const index1 = 3 * i + j;
							const index2 = 3 * i + ( ( j + 1 ) % 3 );

							start.fromBufferAttribute( position, index1 );
							end.fromBufferAttribute( position, index2 );

							if ( isUniqueEdge( start, end, edges ) === true ) {

								vertices.push( start.x, start.y, start.z );
								vertices.push( end.x, end.y, end.z );

							}

						}

					}

				}

				// build geometry

				this.setAttribute( 'position', new three_1.Float32BufferAttribute( vertices, 3 ) );

			}

		}

		copy( source ) {

			super.copy( source );

			this.parameters = Object.assign( {}, source.parameters );

			return this;

		}

	}

	function isUniqueEdge( start, end, edges ) {

		const hash1 = `${start.x},${start.y},${start.z}-${end.x},${end.y},${end.z}`;
		const hash2 = `${end.x},${end.y},${end.z}-${start.x},${start.y},${start.z}`; // coincident edge

		if ( edges.has( hash1 ) === true || edges.has( hash2 ) === true ) {

			return false;

		} else {

			edges.add( hash1 );
			edges.add( hash2 );
			return true;

		}

	}

	const Geometries = /*#__PURE__*/Object.freeze({
		__proto__: null,
		BoxGeometry: three_2.BoxGeometry,
		CapsuleGeometry,
		CircleGeometry,
		ConeGeometry,
		CylinderGeometry,
		DodecahedronGeometry,
		EdgesGeometry,
		ExtrudeGeometry,
		IcosahedronGeometry,
		LatheGeometry,
		OctahedronGeometry,
		PlaneGeometry: three_2.PlaneGeometry,
		PolyhedronGeometry,
		RingGeometry,
		ShapeGeometry,
		SphereGeometry,
		TetrahedronGeometry,
		TorusGeometry,
		TorusKnotGeometry,
		TubeGeometry,
		WireframeGeometry
	});

	class ShadowMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isShadowMaterial = true;

			this.type = 'ShadowMaterial';

			this.color = new three_1.Color( 0x000000 );
			this.transparent = true;

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );

			this.fog = source.fog;

			return this;

		}

	}

	class RawShaderMaterial extends three_2.ShaderMaterial {

		constructor( parameters ) {

			super( parameters );

			this.isRawShaderMaterial = true;

			this.type = 'RawShaderMaterial';

		}

	}

	class MeshStandardMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshStandardMaterial = true;

			this.defines = { 'STANDARD': '' };

			this.type = 'MeshStandardMaterial';

			this.color = new three_1.Color( 0xffffff ); // diffuse
			this.roughness = 1.0;
			this.metalness = 0.0;

			this.map = null;

			this.lightMap = null;
			this.lightMapIntensity = 1.0;

			this.aoMap = null;
			this.aoMapIntensity = 1.0;

			this.emissive = new three_1.Color( 0x000000 );
			this.emissiveIntensity = 1.0;
			this.emissiveMap = null;

			this.bumpMap = null;
			this.bumpScale = 1;

			this.normalMap = null;
			this.normalMapType = three_1.TangentSpaceNormalMap;
			this.normalScale = new three_1.Vector2( 1, 1 );

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.roughnessMap = null;

			this.metalnessMap = null;

			this.alphaMap = null;

			this.envMap = null;
			this.envMapIntensity = 1.0;

			this.wireframe = false;
			this.wireframeLinewidth = 1;
			this.wireframeLinecap = 'round';
			this.wireframeLinejoin = 'round';

			this.flatShading = false;

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.defines = { 'STANDARD': '' };

			this.color.copy( source.color );
			this.roughness = source.roughness;
			this.metalness = source.metalness;

			this.map = source.map;

			this.lightMap = source.lightMap;
			this.lightMapIntensity = source.lightMapIntensity;

			this.aoMap = source.aoMap;
			this.aoMapIntensity = source.aoMapIntensity;

			this.emissive.copy( source.emissive );
			this.emissiveMap = source.emissiveMap;
			this.emissiveIntensity = source.emissiveIntensity;

			this.bumpMap = source.bumpMap;
			this.bumpScale = source.bumpScale;

			this.normalMap = source.normalMap;
			this.normalMapType = source.normalMapType;
			this.normalScale.copy( source.normalScale );

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.roughnessMap = source.roughnessMap;

			this.metalnessMap = source.metalnessMap;

			this.alphaMap = source.alphaMap;

			this.envMap = source.envMap;
			this.envMapIntensity = source.envMapIntensity;

			this.wireframe = source.wireframe;
			this.wireframeLinewidth = source.wireframeLinewidth;
			this.wireframeLinecap = source.wireframeLinecap;
			this.wireframeLinejoin = source.wireframeLinejoin;

			this.flatShading = source.flatShading;

			this.fog = source.fog;

			return this;

		}

	}

	class MeshPhysicalMaterial extends MeshStandardMaterial {

		constructor( parameters ) {

			super();

			this.isMeshPhysicalMaterial = true;

			this.defines = {

				'STANDARD': '',
				'PHYSICAL': ''

			};

			this.type = 'MeshPhysicalMaterial';

			this.anisotropyRotation = 0;
			this.anisotropyMap = null;

			this.clearcoatMap = null;
			this.clearcoatRoughness = 0.0;
			this.clearcoatRoughnessMap = null;
			this.clearcoatNormalScale = new three_1.Vector2( 1, 1 );
			this.clearcoatNormalMap = null;

			this.ior = 1.5;

			Object.defineProperty( this, 'reflectivity', {
				get: function () {

					return ( three_1.clamp( 2.5 * ( this.ior - 1 ) / ( this.ior + 1 ), 0, 1 ) );

				},
				set: function ( reflectivity ) {

					this.ior = ( 1 + 0.4 * reflectivity ) / ( 1 - 0.4 * reflectivity );

				}
			} );

			this.iridescenceMap = null;
			this.iridescenceIOR = 1.3;
			this.iridescenceThicknessRange = [ 100, 400 ];
			this.iridescenceThicknessMap = null;

			this.sheenColor = new three_1.Color( 0x000000 );
			this.sheenColorMap = null;
			this.sheenRoughness = 1.0;
			this.sheenRoughnessMap = null;

			this.transmissionMap = null;

			this.thickness = 0;
			this.thicknessMap = null;
			this.attenuationDistance = Infinity;
			this.attenuationColor = new three_1.Color( 1, 1, 1 );

			this.specularIntensity = 1.0;
			this.specularIntensityMap = null;
			this.specularColor = new three_1.Color( 1, 1, 1 );
			this.specularColorMap = null;

			this._anisotropy = 0;
			this._clearcoat = 0;
			this._iridescence = 0;
			this._sheen = 0.0;
			this._transmission = 0;

			this.setValues( parameters );

		}

		get anisotropy() {

			return this._anisotropy;

		}

		set anisotropy( value ) {

			if ( this._anisotropy > 0 !== value > 0 ) {

				this.version ++;

			}

			this._anisotropy = value;

		}

		get clearcoat() {

			return this._clearcoat;

		}

		set clearcoat( value ) {

			if ( this._clearcoat > 0 !== value > 0 ) {

				this.version ++;

			}

			this._clearcoat = value;

		}

		get iridescence() {

			return this._iridescence;

		}

		set iridescence( value ) {

			if ( this._iridescence > 0 !== value > 0 ) {

				this.version ++;

			}

			this._iridescence = value;

		}

		get sheen() {

			return this._sheen;

		}

		set sheen( value ) {

			if ( this._sheen > 0 !== value > 0 ) {

				this.version ++;

			}

			this._sheen = value;

		}

		get transmission() {

			return this._transmission;

		}

		set transmission( value ) {

			if ( this._transmission > 0 !== value > 0 ) {

				this.version ++;

			}

			this._transmission = value;

		}

		copy( source ) {

			super.copy( source );

			this.defines = {

				'STANDARD': '',
				'PHYSICAL': ''

			};

			this.anisotropy = source.anisotropy;
			this.anisotropyRotation = source.anisotropyRotation;
			this.anisotropyMap = source.anisotropyMap;

			this.clearcoat = source.clearcoat;
			this.clearcoatMap = source.clearcoatMap;
			this.clearcoatRoughness = source.clearcoatRoughness;
			this.clearcoatRoughnessMap = source.clearcoatRoughnessMap;
			this.clearcoatNormalMap = source.clearcoatNormalMap;
			this.clearcoatNormalScale.copy( source.clearcoatNormalScale );

			this.ior = source.ior;

			this.iridescence = source.iridescence;
			this.iridescenceMap = source.iridescenceMap;
			this.iridescenceIOR = source.iridescenceIOR;
			this.iridescenceThicknessRange = [ ...source.iridescenceThicknessRange ];
			this.iridescenceThicknessMap = source.iridescenceThicknessMap;

			this.sheen = source.sheen;
			this.sheenColor.copy( source.sheenColor );
			this.sheenColorMap = source.sheenColorMap;
			this.sheenRoughness = source.sheenRoughness;
			this.sheenRoughnessMap = source.sheenRoughnessMap;

			this.transmission = source.transmission;
			this.transmissionMap = source.transmissionMap;

			this.thickness = source.thickness;
			this.thicknessMap = source.thicknessMap;
			this.attenuationDistance = source.attenuationDistance;
			this.attenuationColor.copy( source.attenuationColor );

			this.specularIntensity = source.specularIntensity;
			this.specularIntensityMap = source.specularIntensityMap;
			this.specularColor.copy( source.specularColor );
			this.specularColorMap = source.specularColorMap;

			return this;

		}

	}

	class MeshPhongMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshPhongMaterial = true;

			this.type = 'MeshPhongMaterial';

			this.color = new three_1.Color( 0xffffff ); // diffuse
			this.specular = new three_1.Color( 0x111111 );
			this.shininess = 30;

			this.map = null;

			this.lightMap = null;
			this.lightMapIntensity = 1.0;

			this.aoMap = null;
			this.aoMapIntensity = 1.0;

			this.emissive = new three_1.Color( 0x000000 );
			this.emissiveIntensity = 1.0;
			this.emissiveMap = null;

			this.bumpMap = null;
			this.bumpScale = 1;

			this.normalMap = null;
			this.normalMapType = three_1.TangentSpaceNormalMap;
			this.normalScale = new three_1.Vector2( 1, 1 );

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.specularMap = null;

			this.alphaMap = null;

			this.envMap = null;
			this.combine = three_1.MultiplyOperation;
			this.reflectivity = 1;
			this.refractionRatio = 0.98;

			this.wireframe = false;
			this.wireframeLinewidth = 1;
			this.wireframeLinecap = 'round';
			this.wireframeLinejoin = 'round';

			this.flatShading = false;

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );
			this.specular.copy( source.specular );
			this.shininess = source.shininess;

			this.map = source.map;

			this.lightMap = source.lightMap;
			this.lightMapIntensity = source.lightMapIntensity;

			this.aoMap = source.aoMap;
			this.aoMapIntensity = source.aoMapIntensity;

			this.emissive.copy( source.emissive );
			this.emissiveMap = source.emissiveMap;
			this.emissiveIntensity = source.emissiveIntensity;

			this.bumpMap = source.bumpMap;
			this.bumpScale = source.bumpScale;

			this.normalMap = source.normalMap;
			this.normalMapType = source.normalMapType;
			this.normalScale.copy( source.normalScale );

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.specularMap = source.specularMap;

			this.alphaMap = source.alphaMap;

			this.envMap = source.envMap;
			this.combine = source.combine;
			this.reflectivity = source.reflectivity;
			this.refractionRatio = source.refractionRatio;

			this.wireframe = source.wireframe;
			this.wireframeLinewidth = source.wireframeLinewidth;
			this.wireframeLinecap = source.wireframeLinecap;
			this.wireframeLinejoin = source.wireframeLinejoin;

			this.flatShading = source.flatShading;

			this.fog = source.fog;

			return this;

		}

	}

	class MeshToonMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshToonMaterial = true;

			this.defines = { 'TOON': '' };

			this.type = 'MeshToonMaterial';

			this.color = new three_1.Color( 0xffffff );

			this.map = null;
			this.gradientMap = null;

			this.lightMap = null;
			this.lightMapIntensity = 1.0;

			this.aoMap = null;
			this.aoMapIntensity = 1.0;

			this.emissive = new three_1.Color( 0x000000 );
			this.emissiveIntensity = 1.0;
			this.emissiveMap = null;

			this.bumpMap = null;
			this.bumpScale = 1;

			this.normalMap = null;
			this.normalMapType = three_1.TangentSpaceNormalMap;
			this.normalScale = new three_1.Vector2( 1, 1 );

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.alphaMap = null;

			this.wireframe = false;
			this.wireframeLinewidth = 1;
			this.wireframeLinecap = 'round';
			this.wireframeLinejoin = 'round';

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );

			this.map = source.map;
			this.gradientMap = source.gradientMap;

			this.lightMap = source.lightMap;
			this.lightMapIntensity = source.lightMapIntensity;

			this.aoMap = source.aoMap;
			this.aoMapIntensity = source.aoMapIntensity;

			this.emissive.copy( source.emissive );
			this.emissiveMap = source.emissiveMap;
			this.emissiveIntensity = source.emissiveIntensity;

			this.bumpMap = source.bumpMap;
			this.bumpScale = source.bumpScale;

			this.normalMap = source.normalMap;
			this.normalMapType = source.normalMapType;
			this.normalScale.copy( source.normalScale );

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.alphaMap = source.alphaMap;

			this.wireframe = source.wireframe;
			this.wireframeLinewidth = source.wireframeLinewidth;
			this.wireframeLinecap = source.wireframeLinecap;
			this.wireframeLinejoin = source.wireframeLinejoin;

			this.fog = source.fog;

			return this;

		}

	}

	class MeshNormalMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshNormalMaterial = true;

			this.type = 'MeshNormalMaterial';

			this.bumpMap = null;
			this.bumpScale = 1;

			this.normalMap = null;
			this.normalMapType = three_1.TangentSpaceNormalMap;
			this.normalScale = new three_1.Vector2( 1, 1 );

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.wireframe = false;
			this.wireframeLinewidth = 1;

			this.flatShading = false;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.bumpMap = source.bumpMap;
			this.bumpScale = source.bumpScale;

			this.normalMap = source.normalMap;
			this.normalMapType = source.normalMapType;
			this.normalScale.copy( source.normalScale );

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.wireframe = source.wireframe;
			this.wireframeLinewidth = source.wireframeLinewidth;

			this.flatShading = source.flatShading;

			return this;

		}

	}

	class MeshLambertMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshLambertMaterial = true;

			this.type = 'MeshLambertMaterial';

			this.color = new three_1.Color( 0xffffff ); // diffuse

			this.map = null;

			this.lightMap = null;
			this.lightMapIntensity = 1.0;

			this.aoMap = null;
			this.aoMapIntensity = 1.0;

			this.emissive = new three_1.Color( 0x000000 );
			this.emissiveIntensity = 1.0;
			this.emissiveMap = null;

			this.bumpMap = null;
			this.bumpScale = 1;

			this.normalMap = null;
			this.normalMapType = three_1.TangentSpaceNormalMap;
			this.normalScale = new three_1.Vector2( 1, 1 );

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.specularMap = null;

			this.alphaMap = null;

			this.envMap = null;
			this.combine = three_1.MultiplyOperation;
			this.reflectivity = 1;
			this.refractionRatio = 0.98;

			this.wireframe = false;
			this.wireframeLinewidth = 1;
			this.wireframeLinecap = 'round';
			this.wireframeLinejoin = 'round';

			this.flatShading = false;

			this.fog = true;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.color.copy( source.color );

			this.map = source.map;

			this.lightMap = source.lightMap;
			this.lightMapIntensity = source.lightMapIntensity;

			this.aoMap = source.aoMap;
			this.aoMapIntensity = source.aoMapIntensity;

			this.emissive.copy( source.emissive );
			this.emissiveMap = source.emissiveMap;
			this.emissiveIntensity = source.emissiveIntensity;

			this.bumpMap = source.bumpMap;
			this.bumpScale = source.bumpScale;

			this.normalMap = source.normalMap;
			this.normalMapType = source.normalMapType;
			this.normalScale.copy( source.normalScale );

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.specularMap = source.specularMap;

			this.alphaMap = source.alphaMap;

			this.envMap = source.envMap;
			this.combine = source.combine;
			this.reflectivity = source.reflectivity;
			this.refractionRatio = source.refractionRatio;

			this.wireframe = source.wireframe;
			this.wireframeLinewidth = source.wireframeLinewidth;
			this.wireframeLinecap = source.wireframeLinecap;
			this.wireframeLinejoin = source.wireframeLinejoin;

			this.flatShading = source.flatShading;

			this.fog = source.fog;

			return this;

		}

	}

	class MeshMatcapMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshMatcapMaterial = true;

			this.defines = { 'MATCAP': '' };

			this.type = 'MeshMatcapMaterial';

			this.color = new three_1.Color( 0xffffff ); // diffuse

			this.matcap = null;

			this.map = null;

			this.bumpMap = null;
			this.bumpScale = 1;

			this.normalMap = null;
			this.normalMapType = three_1.TangentSpaceNormalMap;
			this.normalScale = new three_1.Vector2( 1, 1 );

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.alphaMap = null;

			this.flatShading = false;

			this.fog = true;

			this.setValues( parameters );

		}


		copy( source ) {

			super.copy( source );

			this.defines = { 'MATCAP': '' };

			this.color.copy( source.color );

			this.matcap = source.matcap;

			this.map = source.map;

			this.bumpMap = source.bumpMap;
			this.bumpScale = source.bumpScale;

			this.normalMap = source.normalMap;
			this.normalMapType = source.normalMapType;
			this.normalScale.copy( source.normalScale );

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.alphaMap = source.alphaMap;

			this.flatShading = source.flatShading;

			this.fog = source.fog;

			return this;

		}

	}

	class LineDashedMaterial extends LineBasicMaterial {

		constructor( parameters ) {

			super();

			this.isLineDashedMaterial = true;

			this.type = 'LineDashedMaterial';

			this.scale = 1;
			this.dashSize = 3;
			this.gapSize = 1;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.scale = source.scale;
			this.dashSize = source.dashSize;
			this.gapSize = source.gapSize;

			return this;

		}

	}

	// converts an array to a specific type
	function convertArray( array, type, forceClone ) {

		if ( ! array || // let 'undefined' and 'null' pass
			! forceClone && array.constructor === type ) return array;

		if ( typeof type.BYTES_PER_ELEMENT === 'number' ) {

			return new type( array ); // create typed array

		}

		return Array.prototype.slice.call( array ); // create Array

	}

	function isTypedArray( object ) {

		return ArrayBuffer.isView( object ) &&
			! ( object instanceof DataView );

	}

	// returns an array by which times and values can be sorted
	function getKeyframeOrder( times ) {

		function compareTime( i, j ) {

			return times[ i ] - times[ j ];

		}

		const n = times.length;
		const result = new Array( n );
		for ( let i = 0; i !== n; ++ i ) result[ i ] = i;

		result.sort( compareTime );

		return result;

	}

	// uses the array previously returned by 'getKeyframeOrder' to sort data
	function sortedArray( values, stride, order ) {

		const nValues = values.length;
		const result = new values.constructor( nValues );

		for ( let i = 0, dstOffset = 0; dstOffset !== nValues; ++ i ) {

			const srcOffset = order[ i ] * stride;

			for ( let j = 0; j !== stride; ++ j ) {

				result[ dstOffset ++ ] = values[ srcOffset + j ];

			}

		}

		return result;

	}

	// function for parsing AOS keyframe formats
	function flattenJSON( jsonKeys, times, values, valuePropertyName ) {

		let i = 1, key = jsonKeys[ 0 ];

		while ( key !== undefined && key[ valuePropertyName ] === undefined ) {

			key = jsonKeys[ i ++ ];

		}

		if ( key === undefined ) return; // no data

		let value = key[ valuePropertyName ];
		if ( value === undefined ) return; // no data

		if ( Array.isArray( value ) ) {

			do {

				value = key[ valuePropertyName ];

				if ( value !== undefined ) {

					times.push( key.time );
					values.push.apply( values, value ); // push all elements

				}

				key = jsonKeys[ i ++ ];

			} while ( key !== undefined );

		} else if ( value.toArray !== undefined ) {

			// ...assume THREE.Math-ish

			do {

				value = key[ valuePropertyName ];

				if ( value !== undefined ) {

					times.push( key.time );
					value.toArray( values, values.length );

				}

				key = jsonKeys[ i ++ ];

			} while ( key !== undefined );

		} else {

			// otherwise push as-is

			do {

				value = key[ valuePropertyName ];

				if ( value !== undefined ) {

					times.push( key.time );
					values.push( value );

				}

				key = jsonKeys[ i ++ ];

			} while ( key !== undefined );

		}

	}

	function subclip( sourceClip, name, startFrame, endFrame, fps = 30 ) {

		const clip = sourceClip.clone();

		clip.name = name;

		const tracks = [];

		for ( let i = 0; i < clip.tracks.length; ++ i ) {

			const track = clip.tracks[ i ];
			const valueSize = track.getValueSize();

			const times = [];
			const values = [];

			for ( let j = 0; j < track.times.length; ++ j ) {

				const frame = track.times[ j ] * fps;

				if ( frame < startFrame || frame >= endFrame ) continue;

				times.push( track.times[ j ] );

				for ( let k = 0; k < valueSize; ++ k ) {

					values.push( track.values[ j * valueSize + k ] );

				}

			}

			if ( times.length === 0 ) continue;

			track.times = convertArray( times, track.times.constructor );
			track.values = convertArray( values, track.values.constructor );

			tracks.push( track );

		}

		clip.tracks = tracks;

		// find minimum .times value across all tracks in the trimmed clip

		let minStartTime = Infinity;

		for ( let i = 0; i < clip.tracks.length; ++ i ) {

			if ( minStartTime > clip.tracks[ i ].times[ 0 ] ) {

				minStartTime = clip.tracks[ i ].times[ 0 ];

			}

		}

		// shift all tracks such that clip begins at t=0

		for ( let i = 0; i < clip.tracks.length; ++ i ) {

			clip.tracks[ i ].shift( -1 * minStartTime );

		}

		clip.resetDuration();

		return clip;

	}

	function makeClipAdditive( targetClip, referenceFrame = 0, referenceClip = targetClip, fps = 30 ) {

		if ( fps <= 0 ) fps = 30;

		const numTracks = referenceClip.tracks.length;
		const referenceTime = referenceFrame / fps;

		// Make each track's values relative to the values at the reference frame
		for ( let i = 0; i < numTracks; ++ i ) {

			const referenceTrack = referenceClip.tracks[ i ];
			const referenceTrackType = referenceTrack.ValueTypeName;

			// Skip this track if it's non-numeric
			if ( referenceTrackType === 'bool' || referenceTrackType === 'string' ) continue;

			// Find the track in the target clip whose name and type matches the reference track
			const targetTrack = targetClip.tracks.find( function ( track ) {

				return track.name === referenceTrack.name
					&& track.ValueTypeName === referenceTrackType;

			} );

			if ( targetTrack === undefined ) continue;

			let referenceOffset = 0;
			const referenceValueSize = referenceTrack.getValueSize();

			if ( referenceTrack.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline ) {

				referenceOffset = referenceValueSize / 3;

			}

			let targetOffset = 0;
			const targetValueSize = targetTrack.getValueSize();

			if ( targetTrack.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline ) {

				targetOffset = targetValueSize / 3;

			}

			const lastIndex = referenceTrack.times.length - 1;
			let referenceValue;

			// Find the value to subtract out of the track
			if ( referenceTime <= referenceTrack.times[ 0 ] ) {

				// Reference frame is earlier than the first keyframe, so just use the first keyframe
				const startIndex = referenceOffset;
				const endIndex = referenceValueSize - referenceOffset;
				referenceValue = referenceTrack.values.slice( startIndex, endIndex );

			} else if ( referenceTime >= referenceTrack.times[ lastIndex ] ) {

				// Reference frame is after the last keyframe, so just use the last keyframe
				const startIndex = lastIndex * referenceValueSize + referenceOffset;
				const endIndex = startIndex + referenceValueSize - referenceOffset;
				referenceValue = referenceTrack.values.slice( startIndex, endIndex );

			} else {

				// Interpolate to the reference value
				const interpolant = referenceTrack.createInterpolant();
				const startIndex = referenceOffset;
				const endIndex = referenceValueSize - referenceOffset;
				interpolant.evaluate( referenceTime );
				referenceValue = interpolant.resultBuffer.slice( startIndex, endIndex );

			}

			// Conjugate the quaternion
			if ( referenceTrackType === 'quaternion' ) {

				const referenceQuat = new three_1.Quaternion().fromArray( referenceValue ).normalize().conjugate();
				referenceQuat.toArray( referenceValue );

			}

			// Subtract the reference value from all of the track values

			const numTimes = targetTrack.times.length;
			for ( let j = 0; j < numTimes; ++ j ) {

				const valueStart = j * targetValueSize + targetOffset;

				if ( referenceTrackType === 'quaternion' ) {

					// Multiply the conjugate for quaternion track types
					three_1.Quaternion.multiplyQuaternionsFlat(
						targetTrack.values,
						valueStart,
						referenceValue,
						0,
						targetTrack.values,
						valueStart
					);

				} else {

					const valueEnd = targetValueSize - targetOffset * 2;

					// Subtract each value for all other numeric track types
					for ( let k = 0; k < valueEnd; ++ k ) {

						targetTrack.values[ valueStart + k ] -= referenceValue[ k ];

					}

				}

			}

		}

		targetClip.blendMode = three_1.AdditiveAnimationBlendMode;

		return targetClip;

	}

	const AnimationUtils = {
		convertArray: convertArray,
		isTypedArray: isTypedArray,
		getKeyframeOrder: getKeyframeOrder,
		sortedArray: sortedArray,
		flattenJSON: flattenJSON,
		subclip: subclip,
		makeClipAdditive: makeClipAdditive
	};

	/**
	 * Abstract base class of interpolants over parametric samples.
	 *
	 * The parameter domain is one dimensional, typically the time or a path
	 * along a curve defined by the data.
	 *
	 * The sample values can have any dimensionality and derived classes may
	 * apply special interpretations to the data.
	 *
	 * This class provides the interval seek in a Template Method, deferring
	 * the actual interpolation to derived classes.
	 *
	 * Time complexity is O(1) for linear access crossing at most two points
	 * and O(log N) for random access, where N is the number of positions.
	 *
	 * References:
	 *
	 * 		http://www.oodesign.com/template-method-pattern.html
	 *
	 */

	class Interpolant {

		constructor( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

			this.parameterPositions = parameterPositions;
			this._cachedIndex = 0;

			this.resultBuffer = resultBuffer !== undefined ?
				resultBuffer : new sampleValues.constructor( sampleSize );
			this.sampleValues = sampleValues;
			this.valueSize = sampleSize;

			this.settings = null;
			this.DefaultSettings_ = {};

		}

		evaluate( t ) {

			const pp = this.parameterPositions;
			let i1 = this._cachedIndex,
				t1 = pp[ i1 ],
				t0 = pp[ i1 - 1 ];

			validate_interval: {

				seek: {

					let right;

					linear_scan: {

						//- See http://jsperf.com/comparison-to-undefined/3
						//- slower code:
						//-
						//- 				if ( t >= t1 || t1 === undefined ) {
						forward_scan: if ( ! ( t < t1 ) ) {

							for ( let giveUpAt = i1 + 2; ; ) {

								if ( t1 === undefined ) {

									if ( t < t0 ) break forward_scan;

									// after end

									i1 = pp.length;
									this._cachedIndex = i1;
									return this.copySampleValue_( i1 - 1 );

								}

								if ( i1 === giveUpAt ) break; // this loop

								t0 = t1;
								t1 = pp[ ++ i1 ];

								if ( t < t1 ) {

									// we have arrived at the sought interval
									break seek;

								}

							}

							// prepare binary search on the right side of the index
							right = pp.length;
							break linear_scan;

						}

						//- slower code:
						//-					if ( t < t0 || t0 === undefined ) {
						if ( ! ( t >= t0 ) ) {

							// looping?

							const t1global = pp[ 1 ];

							if ( t < t1global ) {

								i1 = 2; // + 1, using the scan for the details
								t0 = t1global;

							}

							// linear reverse scan

							for ( let giveUpAt = i1 - 2; ; ) {

								if ( t0 === undefined ) {

									// before start

									this._cachedIndex = 0;
									return this.copySampleValue_( 0 );

								}

								if ( i1 === giveUpAt ) break; // this loop

								t1 = t0;
								t0 = pp[ -- i1 - 1 ];

								if ( t >= t0 ) {

									// we have arrived at the sought interval
									break seek;

								}

							}

							// prepare binary search on the left side of the index
							right = i1;
							i1 = 0;
							break linear_scan;

						}

						// the interval is valid

						break validate_interval;

					} // linear scan

					// binary search

					while ( i1 < right ) {

						const mid = ( i1 + right ) >>> 1;

						if ( t < pp[ mid ] ) {

							right = mid;

						} else {

							i1 = mid + 1;

						}

					}

					t1 = pp[ i1 ];
					t0 = pp[ i1 - 1 ];

					// check boundary cases, again

					if ( t0 === undefined ) {

						this._cachedIndex = 0;
						return this.copySampleValue_( 0 );

					}

					if ( t1 === undefined ) {

						i1 = pp.length;
						this._cachedIndex = i1;
						return this.copySampleValue_( i1 - 1 );

					}

				} // seek

				this._cachedIndex = i1;

				this.intervalChanged_( i1, t0, t1 );

			} // validate_interval

			return this.interpolate_( i1, t0, t, t1 );

		}

		getSettings_() {

			return this.settings || this.DefaultSettings_;

		}

		copySampleValue_( index ) {

			// copies a sample value to the result buffer

			const result = this.resultBuffer,
				values = this.sampleValues,
				stride = this.valueSize,
				offset = index * stride;

			for ( let i = 0; i !== stride; ++ i ) {

				result[ i ] = values[ offset + i ];

			}

			return result;

		}

		// Template methods for derived classes:

		interpolate_( /* i1, t0, t, t1 */ ) {

			throw new Error( 'call to abstract method' );
			// implementations shall return this.resultBuffer

		}

		intervalChanged_( /* i1, t0, t1 */ ) {

			// empty

		}

	}

	/**
	 * Fast and simple cubic spline interpolant.
	 *
	 * It was derived from a Hermitian construction setting the first derivative
	 * at each sample position to the linear slope between neighboring positions
	 * over their parameter interval.
	 */

	class CubicInterpolant extends Interpolant {

		constructor( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

			super( parameterPositions, sampleValues, sampleSize, resultBuffer );

			this._weightPrev = -0;
			this._offsetPrev = -0;
			this._weightNext = -0;
			this._offsetNext = -0;

			this.DefaultSettings_ = {

				endingStart: three_1.ZeroCurvatureEnding,
				endingEnd: three_1.ZeroCurvatureEnding

			};

		}

		intervalChanged_( i1, t0, t1 ) {

			const pp = this.parameterPositions;
			let iPrev = i1 - 2,
				iNext = i1 + 1,

				tPrev = pp[ iPrev ],
				tNext = pp[ iNext ];

			if ( tPrev === undefined ) {

				switch ( this.getSettings_().endingStart ) {

					case three_1.ZeroSlopeEnding:

						// f'(t0) = 0
						iPrev = i1;
						tPrev = 2 * t0 - t1;

						break;

					case three_1.WrapAroundEnding:

						// use the other end of the curve
						iPrev = pp.length - 2;
						tPrev = t0 + pp[ iPrev ] - pp[ iPrev + 1 ];

						break;

					default: // ZeroCurvatureEnding

						// f''(t0) = 0 a.k.a. Natural Spline
						iPrev = i1;
						tPrev = t1;

				}

			}

			if ( tNext === undefined ) {

				switch ( this.getSettings_().endingEnd ) {

					case three_1.ZeroSlopeEnding:

						// f'(tN) = 0
						iNext = i1;
						tNext = 2 * t1 - t0;

						break;

					case three_1.WrapAroundEnding:

						// use the other end of the curve
						iNext = 1;
						tNext = t1 + pp[ 1 ] - pp[ 0 ];

						break;

					default: // ZeroCurvatureEnding

						// f''(tN) = 0, a.k.a. Natural Spline
						iNext = i1 - 1;
						tNext = t0;

				}

			}

			const halfDt = ( t1 - t0 ) * 0.5,
				stride = this.valueSize;

			this._weightPrev = halfDt / ( t0 - tPrev );
			this._weightNext = halfDt / ( tNext - t1 );
			this._offsetPrev = iPrev * stride;
			this._offsetNext = iNext * stride;

		}

		interpolate_( i1, t0, t, t1 ) {

			const result = this.resultBuffer,
				values = this.sampleValues,
				stride = this.valueSize,

				o1 = i1 * stride,		o0 = o1 - stride,
				oP = this._offsetPrev, 	oN = this._offsetNext,
				wP = this._weightPrev,	wN = this._weightNext,

				p = ( t - t0 ) / ( t1 - t0 ),
				pp = p * p,
				ppp = pp * p;

			// evaluate polynomials

			const sP = - wP * ppp + 2 * wP * pp - wP * p;
			const s0 = ( 1 + wP ) * ppp + ( -1.5 - 2 * wP ) * pp + ( -0.5 + wP ) * p + 1;
			const s1 = ( -1 - wN ) * ppp + ( 1.5 + wN ) * pp + 0.5 * p;
			const sN = wN * ppp - wN * pp;

			// combine data linearly

			for ( let i = 0; i !== stride; ++ i ) {

				result[ i ] =
						sP * values[ oP + i ] +
						s0 * values[ o0 + i ] +
						s1 * values[ o1 + i ] +
						sN * values[ oN + i ];

			}

			return result;

		}

	}

	class LinearInterpolant extends Interpolant {

		constructor( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

			super( parameterPositions, sampleValues, sampleSize, resultBuffer );

		}

		interpolate_( i1, t0, t, t1 ) {

			const result = this.resultBuffer,
				values = this.sampleValues,
				stride = this.valueSize,

				offset1 = i1 * stride,
				offset0 = offset1 - stride,

				weight1 = ( t - t0 ) / ( t1 - t0 ),
				weight0 = 1 - weight1;

			for ( let i = 0; i !== stride; ++ i ) {

				result[ i ] =
						values[ offset0 + i ] * weight0 +
						values[ offset1 + i ] * weight1;

			}

			return result;

		}

	}

	/**
	 *
	 * Interpolant that evaluates to the sample value at the position preceding
	 * the parameter.
	 */

	class DiscreteInterpolant extends Interpolant {

		constructor( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

			super( parameterPositions, sampleValues, sampleSize, resultBuffer );

		}

		interpolate_( i1 /*, t0, t, t1 */ ) {

			return this.copySampleValue_( i1 - 1 );

		}

	}

	exports.AnimationUtils = AnimationUtils;
	exports.ArcCurve = ArcCurve;
	exports.BatchedMesh = BatchedMesh;
	exports.Bone = Bone;
	exports.CanvasTexture = CanvasTexture;
	exports.CapsuleGeometry = CapsuleGeometry;
	exports.CatmullRomCurve3 = CatmullRomCurve3;
	exports.CircleGeometry = CircleGeometry;
	exports.CompressedArrayTexture = CompressedArrayTexture;
	exports.CompressedCubeTexture = CompressedCubeTexture;
	exports.CompressedTexture = CompressedTexture;
	exports.ConeGeometry = ConeGeometry;
	exports.CubicBezierCurve = CubicBezierCurve;
	exports.CubicBezierCurve3 = CubicBezierCurve3;
	exports.CubicInterpolant = CubicInterpolant;
	exports.Curve = Curve;
	exports.CurvePath = CurvePath;
	exports.CylinderGeometry = CylinderGeometry;
	exports.DataTexture = DataTexture;
	exports.DiscreteInterpolant = DiscreteInterpolant;
	exports.DodecahedronGeometry = DodecahedronGeometry;
	exports.EdgesGeometry = EdgesGeometry;
	exports.EllipseCurve = EllipseCurve;
	exports.ExtrudeGeometry = ExtrudeGeometry;
	exports.FramebufferTexture = FramebufferTexture;
	exports.Geometries = Geometries;
	exports.IcosahedronGeometry = IcosahedronGeometry;
	exports.InstancedBufferAttribute = InstancedBufferAttribute;
	exports.InstancedMesh = InstancedMesh;
	exports.Interpolant = Interpolant;
	exports.LOD = LOD;
	exports.LatheGeometry = LatheGeometry;
	exports.Line = Line;
	exports.LineBasicMaterial = LineBasicMaterial;
	exports.LineCurve = LineCurve;
	exports.LineCurve3 = LineCurve3;
	exports.LineDashedMaterial = LineDashedMaterial;
	exports.LineLoop = LineLoop;
	exports.LineSegments = LineSegments;
	exports.LinearInterpolant = LinearInterpolant;
	exports.MeshLambertMaterial = MeshLambertMaterial;
	exports.MeshMatcapMaterial = MeshMatcapMaterial;
	exports.MeshNormalMaterial = MeshNormalMaterial;
	exports.MeshPhongMaterial = MeshPhongMaterial;
	exports.MeshPhysicalMaterial = MeshPhysicalMaterial;
	exports.MeshStandardMaterial = MeshStandardMaterial;
	exports.MeshToonMaterial = MeshToonMaterial;
	exports.OctahedronGeometry = OctahedronGeometry;
	exports.Path = Path;
	exports.Points = Points;
	exports.PointsMaterial = PointsMaterial;
	exports.PolyhedronGeometry = PolyhedronGeometry;
	exports.QuadraticBezierCurve = QuadraticBezierCurve;
	exports.QuadraticBezierCurve3 = QuadraticBezierCurve3;
	exports.RawShaderMaterial = RawShaderMaterial;
	exports.RingGeometry = RingGeometry;
	exports.ShadowMaterial = ShadowMaterial;
	exports.Shape = Shape;
	exports.ShapeGeometry = ShapeGeometry;
	exports.ShapeUtils = ShapeUtils;
	exports.Skeleton = Skeleton;
	exports.SkinnedMesh = SkinnedMesh;
	exports.SphereGeometry = SphereGeometry;
	exports.SplineCurve = SplineCurve;
	exports.Sprite = Sprite;
	exports.TetrahedronGeometry = TetrahedronGeometry;
	exports.TorusGeometry = TorusGeometry;
	exports.TorusKnotGeometry = TorusKnotGeometry;
	exports.TubeGeometry = TubeGeometry;
	exports.VideoTexture = VideoTexture;
	exports.WireframeGeometry = WireframeGeometry;
	exports.convertArray = convertArray;
	exports.flattenJSON = flattenJSON;
	exports.getKeyframeOrder = getKeyframeOrder;
	exports.isTypedArray = isTypedArray;
	exports.sortedArray = sortedArray;

}));
