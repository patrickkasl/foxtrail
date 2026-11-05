// three.js r160 (https://threejs.org), part "three.3".
// Copyright 2010-2023 three.js authors, MIT License: see the LICENSE file in this folder.
// This is three's own source, bundled without minifying and cut into parts by the Fox Trail workshop
// (tools/make-three.mjs), because the page is opened from disk and each file must stay small enough to read.
// One thing is left out: the glTF reader's WebP and AVIF texture extensions, which the trail does not use.
foxtrailPart('three.3', ['exports', './three.1', './three.2'], (function (exports, three_1, three_2) { 'use strict';

	const vertex$3 = /* glsl */`
uniform float size;
uniform float scale;

#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_POINTS_UV

	varying vec2 vUv;
	uniform mat3 uvTransform;

#endif

void main() {

	#ifdef USE_POINTS_UV

		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;

	#endif

	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>

	gl_PointSize = size;

	#ifdef USE_SIZEATTENUATION

		bool isPerspective = isPerspectiveMatrix( projectionMatrix );

		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );

	#endif

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>

}
`;

	const fragment$3 = /* glsl */`
uniform vec3 diffuse;
uniform float opacity;

#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );

	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>

	outgoingLight = diffuseColor.rgb;

	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>

}
`;

	const vertex$2 = /* glsl */`
#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>

void main() {

	#include <batching_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>

	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

}
`;

	const fragment$2 = /* glsl */`
uniform vec3 color;
uniform float opacity;

#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

void main() {

	#include <logdepthbuf_fragment>

	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );

	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>

}
`;

	const vertex$1 = /* glsl */`
uniform float rotation;
uniform vec2 center;

#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {

	#include <uv_vertex>

	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );

	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

	#ifndef USE_SIZEATTENUATION

		bool isPerspective = isPerspectiveMatrix( projectionMatrix );

		if ( isPerspective ) scale *= - mvPosition.z;

	#endif

	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;

	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;

	mvPosition.xy += rotatedPosition;

	gl_Position = projectionMatrix * mvPosition;

	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>

}
`;

	const fragment$1 = /* glsl */`
uniform vec3 diffuse;
uniform float opacity;

#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>

	outgoingLight = diffuseColor.rgb;

	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>

}
`;

	const ShaderChunk = {
		alphahash_fragment: three_2.alphahash_fragment,
		alphahash_pars_fragment: three_2.alphahash_pars_fragment,
		alphamap_fragment: three_2.alphamap_fragment,
		alphamap_pars_fragment: three_2.alphamap_pars_fragment,
		alphatest_fragment: three_2.alphatest_fragment,
		alphatest_pars_fragment: three_2.alphatest_pars_fragment,
		aomap_fragment: three_2.aomap_fragment,
		aomap_pars_fragment: three_2.aomap_pars_fragment,
		batching_pars_vertex: three_2.batching_pars_vertex,
		batching_vertex: three_2.batching_vertex,
		begin_vertex: three_2.begin_vertex,
		beginnormal_vertex: three_2.beginnormal_vertex,
		bsdfs: three_2.bsdfs,
		iridescence_fragment: three_2.iridescence_fragment,
		bumpmap_pars_fragment: three_2.bumpmap_pars_fragment,
		clipping_planes_fragment: three_2.clipping_planes_fragment,
		clipping_planes_pars_fragment: three_2.clipping_planes_pars_fragment,
		clipping_planes_pars_vertex: three_2.clipping_planes_pars_vertex,
		clipping_planes_vertex: three_2.clipping_planes_vertex,
		color_fragment: three_2.color_fragment,
		color_pars_fragment: three_2.color_pars_fragment,
		color_pars_vertex: three_2.color_pars_vertex,
		color_vertex: three_2.color_vertex,
		common: three_2.common,
		cube_uv_reflection_fragment: three_2.cube_uv_reflection_fragment,
		defaultnormal_vertex: three_2.defaultnormal_vertex,
		displacementmap_pars_vertex: three_2.displacementmap_pars_vertex,
		displacementmap_vertex: three_2.displacementmap_vertex,
		emissivemap_fragment: three_2.emissivemap_fragment,
		emissivemap_pars_fragment: three_2.emissivemap_pars_fragment,
		colorspace_fragment: three_2.colorspace_fragment,
		colorspace_pars_fragment: three_2.colorspace_pars_fragment,
		envmap_fragment: three_2.envmap_fragment,
		envmap_common_pars_fragment: three_2.envmap_common_pars_fragment,
		envmap_pars_fragment: three_2.envmap_pars_fragment,
		envmap_pars_vertex: three_2.envmap_pars_vertex,
		envmap_physical_pars_fragment: three_2.envmap_physical_pars_fragment,
		envmap_vertex: three_2.envmap_vertex,
		fog_vertex: three_2.fog_vertex,
		fog_pars_vertex: three_2.fog_pars_vertex,
		fog_fragment: three_2.fog_fragment,
		fog_pars_fragment: three_2.fog_pars_fragment,
		gradientmap_pars_fragment: three_2.gradientmap_pars_fragment,
		lightmap_fragment: three_2.lightmap_fragment,
		lightmap_pars_fragment: three_2.lightmap_pars_fragment,
		lights_lambert_fragment: three_2.lights_lambert_fragment,
		lights_lambert_pars_fragment: three_2.lights_lambert_pars_fragment,
		lights_pars_begin: three_2.lights_pars_begin,
		lights_toon_fragment: three_2.lights_toon_fragment,
		lights_toon_pars_fragment: three_2.lights_toon_pars_fragment,
		lights_phong_fragment: three_2.lights_phong_fragment,
		lights_phong_pars_fragment: three_2.lights_phong_pars_fragment,
		lights_physical_fragment: three_2.lights_physical_fragment,
		lights_physical_pars_fragment: three_2.lights_physical_pars_fragment,
		lights_fragment_begin: three_2.lights_fragment_begin,
		lights_fragment_maps: three_2.lights_fragment_maps,
		lights_fragment_end: three_2.lights_fragment_end,
		logdepthbuf_fragment: three_2.logdepthbuf_fragment,
		logdepthbuf_pars_fragment: three_2.logdepthbuf_pars_fragment,
		logdepthbuf_pars_vertex: three_2.logdepthbuf_pars_vertex,
		logdepthbuf_vertex: three_2.logdepthbuf_vertex,
		map_fragment: three_2.map_fragment,
		map_pars_fragment: three_2.map_pars_fragment,
		map_particle_fragment: three_2.map_particle_fragment,
		map_particle_pars_fragment: three_2.map_particle_pars_fragment,
		metalnessmap_fragment: three_2.metalnessmap_fragment,
		metalnessmap_pars_fragment: three_2.metalnessmap_pars_fragment,
		morphcolor_vertex: three_2.morphcolor_vertex,
		morphnormal_vertex: three_2.morphnormal_vertex,
		morphtarget_pars_vertex: three_2.morphtarget_pars_vertex,
		morphtarget_vertex: three_2.morphtarget_vertex,
		normal_fragment_begin: three_2.normal_fragment_begin,
		normal_fragment_maps: three_2.normal_fragment_maps,
		normal_pars_fragment: three_2.normal_pars_fragment,
		normal_pars_vertex: three_2.normal_pars_vertex,
		normal_vertex: three_2.normal_vertex,
		normalmap_pars_fragment: three_2.normalmap_pars_fragment,
		clearcoat_normal_fragment_begin: three_2.clearcoat_normal_fragment_begin,
		clearcoat_normal_fragment_maps: three_2.clearcoat_normal_fragment_maps,
		clearcoat_pars_fragment: three_2.clearcoat_pars_fragment,
		iridescence_pars_fragment: three_2.iridescence_pars_fragment,
		opaque_fragment: three_2.opaque_fragment,
		packing: three_2.packing,
		premultiplied_alpha_fragment: three_2.premultiplied_alpha_fragment,
		project_vertex: three_2.project_vertex,
		dithering_fragment: three_2.dithering_fragment,
		dithering_pars_fragment: three_2.dithering_pars_fragment,
		roughnessmap_fragment: three_2.roughnessmap_fragment,
		roughnessmap_pars_fragment: three_2.roughnessmap_pars_fragment,
		shadowmap_pars_fragment: three_2.shadowmap_pars_fragment,
		shadowmap_pars_vertex: three_2.shadowmap_pars_vertex,
		shadowmap_vertex: three_2.shadowmap_vertex,
		shadowmask_pars_fragment: three_2.shadowmask_pars_fragment,
		skinbase_vertex: three_2.skinbase_vertex,
		skinning_pars_vertex: three_2.skinning_pars_vertex,
		skinning_vertex: three_2.skinning_vertex,
		skinnormal_vertex: three_2.skinnormal_vertex,
		specularmap_fragment: three_2.specularmap_fragment,
		specularmap_pars_fragment: three_2.specularmap_pars_fragment,
		tonemapping_fragment: three_2.tonemapping_fragment,
		tonemapping_pars_fragment: three_2.tonemapping_pars_fragment,
		transmission_fragment: three_2.transmission_fragment,
		transmission_pars_fragment: three_2.transmission_pars_fragment,
		uv_pars_fragment: three_2.uv_pars_fragment,
		uv_pars_vertex: three_2.uv_pars_vertex,
		uv_vertex: three_2.uv_vertex,
		worldpos_vertex: three_2.worldpos_vertex,

		background_vert: three_2.vertex$4,
		background_frag: three_2.fragment$4,
		backgroundCube_vert: three_2.vertex$3,
		backgroundCube_frag: three_2.fragment$3,
		cube_vert: three_2.vertex$2,
		cube_frag: three_2.fragment$2,
		depth_vert: three_2.vertex$6,
		depth_frag: three_2.fragment$6,
		distanceRGBA_vert: three_2.vertex,
		distanceRGBA_frag: three_2.fragment,
		equirect_vert: three_2.vertex$1,
		equirect_frag: three_2.fragment$1,
		linedashed_vert: three_2.vertex$7,
		linedashed_frag: three_2.fragment$7,
		meshbasic_vert: three_2.vertex$13,
		meshbasic_frag: three_2.fragment$13,
		meshlambert_vert: three_2.vertex$12,
		meshlambert_frag: three_2.fragment$12,
		meshmatcap_vert: three_2.vertex$8,
		meshmatcap_frag: three_2.fragment$8,
		meshnormal_vert: three_2.vertex$5,
		meshnormal_frag: three_2.fragment$5,
		meshphong_vert: three_2.vertex$11,
		meshphong_frag: three_2.fragment$11,
		meshphysical_vert: three_2.vertex$10,
		meshphysical_frag: three_2.fragment$10,
		meshtoon_vert: three_2.vertex$9,
		meshtoon_frag: three_2.fragment$9,
		points_vert: vertex$3,
		points_frag: fragment$3,
		shadow_vert: vertex$2,
		shadow_frag: fragment$2,
		sprite_vert: vertex$1,
		sprite_frag: fragment$1
	};

	/**
	 * Uniforms library for shared webgl shaders
	 */

	const UniformsLib = {

		common: {

			diffuse: { value: /*@__PURE__*/ new three_1.Color( 0xffffff ) },
			opacity: { value: 1.0 },

			map: { value: null },
			mapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },

			alphaMap: { value: null },
			alphaMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },

			alphaTest: { value: 0 }

		},

		specularmap: {

			specularMap: { value: null },
			specularMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		envmap: {

			envMap: { value: null },
			flipEnvMap: { value: -1 },
			reflectivity: { value: 1.0 }, // basic, lambert, phong
			ior: { value: 1.5 }, // physical
			refractionRatio: { value: 0.98 }, // basic, lambert, phong

		},

		aomap: {

			aoMap: { value: null },
			aoMapIntensity: { value: 1 },
			aoMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		lightmap: {

			lightMap: { value: null },
			lightMapIntensity: { value: 1 },
			lightMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		bumpmap: {

			bumpMap: { value: null },
			bumpMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			bumpScale: { value: 1 }

		},

		normalmap: {

			normalMap: { value: null },
			normalMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			normalScale: { value: /*@__PURE__*/ new three_1.Vector2( 1, 1 ) }

		},

		displacementmap: {

			displacementMap: { value: null },
			displacementMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			displacementScale: { value: 1 },
			displacementBias: { value: 0 }

		},

		emissivemap: {

			emissiveMap: { value: null },
			emissiveMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		metalnessmap: {

			metalnessMap: { value: null },
			metalnessMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		roughnessmap: {

			roughnessMap: { value: null },
			roughnessMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		gradientmap: {

			gradientMap: { value: null }

		},

		fog: {

			fogDensity: { value: 0.00025 },
			fogNear: { value: 1 },
			fogFar: { value: 2000 },
			fogColor: { value: /*@__PURE__*/ new three_1.Color( 0xffffff ) }

		},

		lights: {

			ambientLightColor: { value: [] },

			lightProbe: { value: [] },

			directionalLights: { value: [], properties: {
				direction: {},
				color: {}
			} },

			directionalLightShadows: { value: [], properties: {
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			} },

			directionalShadowMap: { value: [] },
			directionalShadowMatrix: { value: [] },

			spotLights: { value: [], properties: {
				color: {},
				position: {},
				direction: {},
				distance: {},
				coneCos: {},
				penumbraCos: {},
				decay: {}
			} },

			spotLightShadows: { value: [], properties: {
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			} },

			spotLightMap: { value: [] },
			spotShadowMap: { value: [] },
			spotLightMatrix: { value: [] },

			pointLights: { value: [], properties: {
				color: {},
				position: {},
				decay: {},
				distance: {}
			} },

			pointLightShadows: { value: [], properties: {
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {},
				shadowCameraNear: {},
				shadowCameraFar: {}
			} },

			pointShadowMap: { value: [] },
			pointShadowMatrix: { value: [] },

			hemisphereLights: { value: [], properties: {
				direction: {},
				skyColor: {},
				groundColor: {}
			} },

			// TODO (abelnation): RectAreaLight BRDF data needs to be moved from example to main src
			rectAreaLights: { value: [], properties: {
				color: {},
				position: {},
				width: {},
				height: {}
			} },

			ltc_1: { value: null },
			ltc_2: { value: null }

		},

		points: {

			diffuse: { value: /*@__PURE__*/ new three_1.Color( 0xffffff ) },
			opacity: { value: 1.0 },
			size: { value: 1.0 },
			scale: { value: 1.0 },
			map: { value: null },
			alphaMap: { value: null },
			alphaMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			alphaTest: { value: 0 },
			uvTransform: { value: /*@__PURE__*/ new three_1.Matrix3() }

		},

		sprite: {

			diffuse: { value: /*@__PURE__*/ new three_1.Color( 0xffffff ) },
			opacity: { value: 1.0 },
			center: { value: /*@__PURE__*/ new three_1.Vector2( 0.5, 0.5 ) },
			rotation: { value: 0.0 },
			map: { value: null },
			mapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			alphaMap: { value: null },
			alphaMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			alphaTest: { value: 0 }

		}

	};

	const ShaderLib = {

		basic: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.specularmap,
				UniformsLib.envmap,
				UniformsLib.aomap,
				UniformsLib.lightmap,
				UniformsLib.fog
			] ),

			vertexShader: ShaderChunk.meshbasic_vert,
			fragmentShader: ShaderChunk.meshbasic_frag

		},

		lambert: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.specularmap,
				UniformsLib.envmap,
				UniformsLib.aomap,
				UniformsLib.lightmap,
				UniformsLib.emissivemap,
				UniformsLib.bumpmap,
				UniformsLib.normalmap,
				UniformsLib.displacementmap,
				UniformsLib.fog,
				UniformsLib.lights,
				{
					emissive: { value: /*@__PURE__*/ new three_1.Color( 0x000000 ) }
				}
			] ),

			vertexShader: ShaderChunk.meshlambert_vert,
			fragmentShader: ShaderChunk.meshlambert_frag

		},

		phong: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.specularmap,
				UniformsLib.envmap,
				UniformsLib.aomap,
				UniformsLib.lightmap,
				UniformsLib.emissivemap,
				UniformsLib.bumpmap,
				UniformsLib.normalmap,
				UniformsLib.displacementmap,
				UniformsLib.fog,
				UniformsLib.lights,
				{
					emissive: { value: /*@__PURE__*/ new three_1.Color( 0x000000 ) },
					specular: { value: /*@__PURE__*/ new three_1.Color( 0x111111 ) },
					shininess: { value: 30 }
				}
			] ),

			vertexShader: ShaderChunk.meshphong_vert,
			fragmentShader: ShaderChunk.meshphong_frag

		},

		standard: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.envmap,
				UniformsLib.aomap,
				UniformsLib.lightmap,
				UniformsLib.emissivemap,
				UniformsLib.bumpmap,
				UniformsLib.normalmap,
				UniformsLib.displacementmap,
				UniformsLib.roughnessmap,
				UniformsLib.metalnessmap,
				UniformsLib.fog,
				UniformsLib.lights,
				{
					emissive: { value: /*@__PURE__*/ new three_1.Color( 0x000000 ) },
					roughness: { value: 1.0 },
					metalness: { value: 0.0 },
					envMapIntensity: { value: 1 } // temporary
				}
			] ),

			vertexShader: ShaderChunk.meshphysical_vert,
			fragmentShader: ShaderChunk.meshphysical_frag

		},

		toon: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.aomap,
				UniformsLib.lightmap,
				UniformsLib.emissivemap,
				UniformsLib.bumpmap,
				UniformsLib.normalmap,
				UniformsLib.displacementmap,
				UniformsLib.gradientmap,
				UniformsLib.fog,
				UniformsLib.lights,
				{
					emissive: { value: /*@__PURE__*/ new three_1.Color( 0x000000 ) }
				}
			] ),

			vertexShader: ShaderChunk.meshtoon_vert,
			fragmentShader: ShaderChunk.meshtoon_frag

		},

		matcap: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.bumpmap,
				UniformsLib.normalmap,
				UniformsLib.displacementmap,
				UniformsLib.fog,
				{
					matcap: { value: null }
				}
			] ),

			vertexShader: ShaderChunk.meshmatcap_vert,
			fragmentShader: ShaderChunk.meshmatcap_frag

		},

		points: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.points,
				UniformsLib.fog
			] ),

			vertexShader: ShaderChunk.points_vert,
			fragmentShader: ShaderChunk.points_frag

		},

		dashed: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.fog,
				{
					scale: { value: 1 },
					dashSize: { value: 1 },
					totalSize: { value: 2 }
				}
			] ),

			vertexShader: ShaderChunk.linedashed_vert,
			fragmentShader: ShaderChunk.linedashed_frag

		},

		depth: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.displacementmap
			] ),

			vertexShader: ShaderChunk.depth_vert,
			fragmentShader: ShaderChunk.depth_frag

		},

		normal: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.bumpmap,
				UniformsLib.normalmap,
				UniformsLib.displacementmap,
				{
					opacity: { value: 1.0 }
				}
			] ),

			vertexShader: ShaderChunk.meshnormal_vert,
			fragmentShader: ShaderChunk.meshnormal_frag

		},

		sprite: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.sprite,
				UniformsLib.fog
			] ),

			vertexShader: ShaderChunk.sprite_vert,
			fragmentShader: ShaderChunk.sprite_frag

		},

		background: {

			uniforms: {
				uvTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				t2D: { value: null },
				backgroundIntensity: { value: 1 }
			},

			vertexShader: ShaderChunk.background_vert,
			fragmentShader: ShaderChunk.background_frag

		},

		backgroundCube: {

			uniforms: {
				envMap: { value: null },
				flipEnvMap: { value: -1 },
				backgroundBlurriness: { value: 0 },
				backgroundIntensity: { value: 1 }
			},

			vertexShader: ShaderChunk.backgroundCube_vert,
			fragmentShader: ShaderChunk.backgroundCube_frag

		},

		cube: {

			uniforms: {
				tCube: { value: null },
				tFlip: { value: -1 },
				opacity: { value: 1.0 }
			},

			vertexShader: ShaderChunk.cube_vert,
			fragmentShader: ShaderChunk.cube_frag

		},

		equirect: {

			uniforms: {
				tEquirect: { value: null },
			},

			vertexShader: ShaderChunk.equirect_vert,
			fragmentShader: ShaderChunk.equirect_frag

		},

		distanceRGBA: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.common,
				UniformsLib.displacementmap,
				{
					referencePosition: { value: /*@__PURE__*/ new three_1.Vector3() },
					nearDistance: { value: 1 },
					farDistance: { value: 1000 }
				}
			] ),

			vertexShader: ShaderChunk.distanceRGBA_vert,
			fragmentShader: ShaderChunk.distanceRGBA_frag

		},

		shadow: {

			uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
				UniformsLib.lights,
				UniformsLib.fog,
				{
					color: { value: /*@__PURE__*/ new three_1.Color( 0x00000 ) },
					opacity: { value: 1.0 }
				},
			] ),

			vertexShader: ShaderChunk.shadow_vert,
			fragmentShader: ShaderChunk.shadow_frag

		}

	};

	ShaderLib.physical = {

		uniforms: /*@__PURE__*/ three_2.mergeUniforms( [
			ShaderLib.standard.uniforms,
			{
				clearcoat: { value: 0 },
				clearcoatMap: { value: null },
				clearcoatMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				clearcoatNormalMap: { value: null },
				clearcoatNormalMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				clearcoatNormalScale: { value: /*@__PURE__*/ new three_1.Vector2( 1, 1 ) },
				clearcoatRoughness: { value: 0 },
				clearcoatRoughnessMap: { value: null },
				clearcoatRoughnessMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				iridescence: { value: 0 },
				iridescenceMap: { value: null },
				iridescenceMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				iridescenceIOR: { value: 1.3 },
				iridescenceThicknessMinimum: { value: 100 },
				iridescenceThicknessMaximum: { value: 400 },
				iridescenceThicknessMap: { value: null },
				iridescenceThicknessMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				sheen: { value: 0 },
				sheenColor: { value: /*@__PURE__*/ new three_1.Color( 0x000000 ) },
				sheenColorMap: { value: null },
				sheenColorMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				sheenRoughness: { value: 1 },
				sheenRoughnessMap: { value: null },
				sheenRoughnessMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				transmission: { value: 0 },
				transmissionMap: { value: null },
				transmissionMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				transmissionSamplerSize: { value: /*@__PURE__*/ new three_1.Vector2() },
				transmissionSamplerMap: { value: null },
				thickness: { value: 0 },
				thicknessMap: { value: null },
				thicknessMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				attenuationDistance: { value: 0 },
				attenuationColor: { value: /*@__PURE__*/ new three_1.Color( 0x000000 ) },
				specularColor: { value: /*@__PURE__*/ new three_1.Color( 1, 1, 1 ) },
				specularColorMap: { value: null },
				specularColorMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				specularIntensity: { value: 1 },
				specularIntensityMap: { value: null },
				specularIntensityMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
				anisotropyVector: { value: /*@__PURE__*/ new three_1.Vector2() },
				anisotropyMap: { value: null },
				anisotropyMapTransform: { value: /*@__PURE__*/ new three_1.Matrix3() },
			}
		] ),

		vertexShader: ShaderChunk.meshphysical_vert,
		fragmentShader: ShaderChunk.meshphysical_frag

	};

	const _rgb = { r: 0, b: 0, g: 0 };

	function WebGLBackground( renderer, cubemaps, cubeuvmaps, state, objects, alpha, premultipliedAlpha ) {

		const clearColor = new three_1.Color( 0x000000 );
		let clearAlpha = alpha === true ? 0 : 1;

		let planeMesh;
		let boxMesh;

		let currentBackground = null;
		let currentBackgroundVersion = 0;
		let currentTonemapping = null;

		function render( renderList, scene ) {

			let forceClear = false;
			let background = scene.isScene === true ? scene.background : null;

			if ( background && background.isTexture ) {

				const usePMREM = scene.backgroundBlurriness > 0; // use PMREM if the user wants to blur the background
				background = ( usePMREM ? cubeuvmaps : cubemaps ).get( background );

			}

			if ( background === null ) {

				setClear( clearColor, clearAlpha );

			} else if ( background && background.isColor ) {

				setClear( background, 1 );
				forceClear = true;

			}

			const environmentBlendMode = renderer.xr.getEnvironmentBlendMode();

			if ( environmentBlendMode === 'additive' ) {

				state.buffers.color.setClear( 0, 0, 0, 1, premultipliedAlpha );

			} else if ( environmentBlendMode === 'alpha-blend' ) {

				state.buffers.color.setClear( 0, 0, 0, 0, premultipliedAlpha );

			}

			if ( renderer.autoClear || forceClear ) {

				renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );

			}

			if ( background && ( background.isCubeTexture || background.mapping === three_1.CubeUVReflectionMapping ) ) {

				if ( boxMesh === undefined ) {

					boxMesh = new three_2.Mesh(
						new three_2.BoxGeometry( 1, 1, 1 ),
						new three_2.ShaderMaterial( {
							name: 'BackgroundCubeMaterial',
							uniforms: three_2.cloneUniforms( ShaderLib.backgroundCube.uniforms ),
							vertexShader: ShaderLib.backgroundCube.vertexShader,
							fragmentShader: ShaderLib.backgroundCube.fragmentShader,
							side: three_1.BackSide,
							depthTest: false,
							depthWrite: false,
							fog: false
						} )
					);

					boxMesh.geometry.deleteAttribute( 'normal' );
					boxMesh.geometry.deleteAttribute( 'uv' );

					boxMesh.onBeforeRender = function ( renderer, scene, camera ) {

						this.matrixWorld.copyPosition( camera.matrixWorld );

					};

					// add "envMap" material property so the renderer can evaluate it like for built-in materials
					Object.defineProperty( boxMesh.material, 'envMap', {

						get: function () {

							return this.uniforms.envMap.value;

						}

					} );

					objects.update( boxMesh );

				}

				boxMesh.material.uniforms.envMap.value = background;
				boxMesh.material.uniforms.flipEnvMap.value = ( background.isCubeTexture && background.isRenderTargetTexture === false ) ? -1 : 1;
				boxMesh.material.uniforms.backgroundBlurriness.value = scene.backgroundBlurriness;
				boxMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity;
				boxMesh.material.toneMapped = three_1.ColorManagement.getTransfer( background.colorSpace ) !== three_1.SRGBTransfer;

				if ( currentBackground !== background ||
					currentBackgroundVersion !== background.version ||
					currentTonemapping !== renderer.toneMapping ) {

					boxMesh.material.needsUpdate = true;

					currentBackground = background;
					currentBackgroundVersion = background.version;
					currentTonemapping = renderer.toneMapping;

				}

				boxMesh.layers.enableAll();

				// push to the pre-sorted opaque render list
				renderList.unshift( boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null );

			} else if ( background && background.isTexture ) {

				if ( planeMesh === undefined ) {

					planeMesh = new three_2.Mesh(
						new three_2.PlaneGeometry( 2, 2 ),
						new three_2.ShaderMaterial( {
							name: 'BackgroundMaterial',
							uniforms: three_2.cloneUniforms( ShaderLib.background.uniforms ),
							vertexShader: ShaderLib.background.vertexShader,
							fragmentShader: ShaderLib.background.fragmentShader,
							side: three_1.FrontSide,
							depthTest: false,
							depthWrite: false,
							fog: false
						} )
					);

					planeMesh.geometry.deleteAttribute( 'normal' );

					// add "map" material property so the renderer can evaluate it like for built-in materials
					Object.defineProperty( planeMesh.material, 'map', {

						get: function () {

							return this.uniforms.t2D.value;

						}

					} );

					objects.update( planeMesh );

				}

				planeMesh.material.uniforms.t2D.value = background;
				planeMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity;
				planeMesh.material.toneMapped = three_1.ColorManagement.getTransfer( background.colorSpace ) !== three_1.SRGBTransfer;

				if ( background.matrixAutoUpdate === true ) {

					background.updateMatrix();

				}

				planeMesh.material.uniforms.uvTransform.value.copy( background.matrix );

				if ( currentBackground !== background ||
					currentBackgroundVersion !== background.version ||
					currentTonemapping !== renderer.toneMapping ) {

					planeMesh.material.needsUpdate = true;

					currentBackground = background;
					currentBackgroundVersion = background.version;
					currentTonemapping = renderer.toneMapping;

				}

				planeMesh.layers.enableAll();

				// push to the pre-sorted opaque render list
				renderList.unshift( planeMesh, planeMesh.geometry, planeMesh.material, 0, 0, null );

			}

		}

		function setClear( color, alpha ) {

			color.getRGB( _rgb, three_2.getUnlitUniformColorSpace( renderer ) );

			state.buffers.color.setClear( _rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha );

		}

		return {

			getClearColor: function () {

				return clearColor;

			},
			setClearColor: function ( color, alpha = 1 ) {

				clearColor.set( color );
				clearAlpha = alpha;
				setClear( clearColor, clearAlpha );

			},
			getClearAlpha: function () {

				return clearAlpha;

			},
			setClearAlpha: function ( alpha ) {

				clearAlpha = alpha;
				setClear( clearColor, clearAlpha );

			},
			render: render

		};

	}

	function WebGLBindingStates( gl, extensions, attributes, capabilities ) {

		const maxVertexAttributes = gl.getParameter( gl.MAX_VERTEX_ATTRIBS );

		const extension = capabilities.isWebGL2 ? null : extensions.get( 'OES_vertex_array_object' );
		const vaoAvailable = capabilities.isWebGL2 || extension !== null;

		const bindingStates = {};

		const defaultState = createBindingState( null );
		let currentState = defaultState;
		let forceUpdate = false;

		function setup( object, material, program, geometry, index ) {

			let updateBuffers = false;

			if ( vaoAvailable ) {

				const state = getBindingState( geometry, program, material );

				if ( currentState !== state ) {

					currentState = state;
					bindVertexArrayObject( currentState.object );

				}

				updateBuffers = needsUpdate( object, geometry, program, index );

				if ( updateBuffers ) saveCache( object, geometry, program, index );

			} else {

				const wireframe = ( material.wireframe === true );

				if ( currentState.geometry !== geometry.id ||
					currentState.program !== program.id ||
					currentState.wireframe !== wireframe ) {

					currentState.geometry = geometry.id;
					currentState.program = program.id;
					currentState.wireframe = wireframe;

					updateBuffers = true;

				}

			}

			if ( index !== null ) {

				attributes.update( index, gl.ELEMENT_ARRAY_BUFFER );

			}

			if ( updateBuffers || forceUpdate ) {

				forceUpdate = false;

				setupVertexAttributes( object, material, program, geometry );

				if ( index !== null ) {

					gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, attributes.get( index ).buffer );

				}

			}

		}

		function createVertexArrayObject() {

			if ( capabilities.isWebGL2 ) return gl.createVertexArray();

			return extension.createVertexArrayOES();

		}

		function bindVertexArrayObject( vao ) {

			if ( capabilities.isWebGL2 ) return gl.bindVertexArray( vao );

			return extension.bindVertexArrayOES( vao );

		}

		function deleteVertexArrayObject( vao ) {

			if ( capabilities.isWebGL2 ) return gl.deleteVertexArray( vao );

			return extension.deleteVertexArrayOES( vao );

		}

		function getBindingState( geometry, program, material ) {

			const wireframe = ( material.wireframe === true );

			let programMap = bindingStates[ geometry.id ];

			if ( programMap === undefined ) {

				programMap = {};
				bindingStates[ geometry.id ] = programMap;

			}

			let stateMap = programMap[ program.id ];

			if ( stateMap === undefined ) {

				stateMap = {};
				programMap[ program.id ] = stateMap;

			}

			let state = stateMap[ wireframe ];

			if ( state === undefined ) {

				state = createBindingState( createVertexArrayObject() );
				stateMap[ wireframe ] = state;

			}

			return state;

		}

		function createBindingState( vao ) {

			const newAttributes = [];
			const enabledAttributes = [];
			const attributeDivisors = [];

			for ( let i = 0; i < maxVertexAttributes; i ++ ) {

				newAttributes[ i ] = 0;
				enabledAttributes[ i ] = 0;
				attributeDivisors[ i ] = 0;

			}

			return {

				// for backward compatibility on non-VAO support browser
				geometry: null,
				program: null,
				wireframe: false,

				newAttributes: newAttributes,
				enabledAttributes: enabledAttributes,
				attributeDivisors: attributeDivisors,
				object: vao,
				attributes: {},
				index: null

			};

		}

		function needsUpdate( object, geometry, program, index ) {

			const cachedAttributes = currentState.attributes;
			const geometryAttributes = geometry.attributes;

			let attributesNum = 0;

			const programAttributes = program.getAttributes();

			for ( const name in programAttributes ) {

				const programAttribute = programAttributes[ name ];

				if ( programAttribute.location >= 0 ) {

					const cachedAttribute = cachedAttributes[ name ];
					let geometryAttribute = geometryAttributes[ name ];

					if ( geometryAttribute === undefined ) {

						if ( name === 'instanceMatrix' && object.instanceMatrix ) geometryAttribute = object.instanceMatrix;
						if ( name === 'instanceColor' && object.instanceColor ) geometryAttribute = object.instanceColor;

					}

					if ( cachedAttribute === undefined ) return true;

					if ( cachedAttribute.attribute !== geometryAttribute ) return true;

					if ( geometryAttribute && cachedAttribute.data !== geometryAttribute.data ) return true;

					attributesNum ++;

				}

			}

			if ( currentState.attributesNum !== attributesNum ) return true;

			if ( currentState.index !== index ) return true;

			return false;

		}

		function saveCache( object, geometry, program, index ) {

			const cache = {};
			const attributes = geometry.attributes;
			let attributesNum = 0;

			const programAttributes = program.getAttributes();

			for ( const name in programAttributes ) {

				const programAttribute = programAttributes[ name ];

				if ( programAttribute.location >= 0 ) {

					let attribute = attributes[ name ];

					if ( attribute === undefined ) {

						if ( name === 'instanceMatrix' && object.instanceMatrix ) attribute = object.instanceMatrix;
						if ( name === 'instanceColor' && object.instanceColor ) attribute = object.instanceColor;

					}

					const data = {};
					data.attribute = attribute;

					if ( attribute && attribute.data ) {

						data.data = attribute.data;

					}

					cache[ name ] = data;

					attributesNum ++;

				}

			}

			currentState.attributes = cache;
			currentState.attributesNum = attributesNum;

			currentState.index = index;

		}

		function initAttributes() {

			const newAttributes = currentState.newAttributes;

			for ( let i = 0, il = newAttributes.length; i < il; i ++ ) {

				newAttributes[ i ] = 0;

			}

		}

		function enableAttribute( attribute ) {

			enableAttributeAndDivisor( attribute, 0 );

		}

		function enableAttributeAndDivisor( attribute, meshPerAttribute ) {

			const newAttributes = currentState.newAttributes;
			const enabledAttributes = currentState.enabledAttributes;
			const attributeDivisors = currentState.attributeDivisors;

			newAttributes[ attribute ] = 1;

			if ( enabledAttributes[ attribute ] === 0 ) {

				gl.enableVertexAttribArray( attribute );
				enabledAttributes[ attribute ] = 1;

			}

			if ( attributeDivisors[ attribute ] !== meshPerAttribute ) {

				const extension = capabilities.isWebGL2 ? gl : extensions.get( 'ANGLE_instanced_arrays' );

				extension[ capabilities.isWebGL2 ? 'vertexAttribDivisor' : 'vertexAttribDivisorANGLE' ]( attribute, meshPerAttribute );
				attributeDivisors[ attribute ] = meshPerAttribute;

			}

		}

		function disableUnusedAttributes() {

			const newAttributes = currentState.newAttributes;
			const enabledAttributes = currentState.enabledAttributes;

			for ( let i = 0, il = enabledAttributes.length; i < il; i ++ ) {

				if ( enabledAttributes[ i ] !== newAttributes[ i ] ) {

					gl.disableVertexAttribArray( i );
					enabledAttributes[ i ] = 0;

				}

			}

		}

		function vertexAttribPointer( index, size, type, normalized, stride, offset, integer ) {

			if ( integer === true ) {

				gl.vertexAttribIPointer( index, size, type, stride, offset );

			} else {

				gl.vertexAttribPointer( index, size, type, normalized, stride, offset );

			}

		}

		function setupVertexAttributes( object, material, program, geometry ) {

			if ( capabilities.isWebGL2 === false && ( object.isInstancedMesh || geometry.isInstancedBufferGeometry ) ) {

				if ( extensions.get( 'ANGLE_instanced_arrays' ) === null ) return;

			}

			initAttributes();

			const geometryAttributes = geometry.attributes;

			const programAttributes = program.getAttributes();

			const materialDefaultAttributeValues = material.defaultAttributeValues;

			for ( const name in programAttributes ) {

				const programAttribute = programAttributes[ name ];

				if ( programAttribute.location >= 0 ) {

					let geometryAttribute = geometryAttributes[ name ];

					if ( geometryAttribute === undefined ) {

						if ( name === 'instanceMatrix' && object.instanceMatrix ) geometryAttribute = object.instanceMatrix;
						if ( name === 'instanceColor' && object.instanceColor ) geometryAttribute = object.instanceColor;

					}

					if ( geometryAttribute !== undefined ) {

						const normalized = geometryAttribute.normalized;
						const size = geometryAttribute.itemSize;

						const attribute = attributes.get( geometryAttribute );

						// TODO Attribute may not be available on context restore

						if ( attribute === undefined ) continue;

						const buffer = attribute.buffer;
						const type = attribute.type;
						const bytesPerElement = attribute.bytesPerElement;

						// check for integer attributes (WebGL 2 only)

						const integer = ( capabilities.isWebGL2 === true && ( type === gl.INT || type === gl.UNSIGNED_INT || geometryAttribute.gpuType === three_1.IntType ) );

						if ( geometryAttribute.isInterleavedBufferAttribute ) {

							const data = geometryAttribute.data;
							const stride = data.stride;
							const offset = geometryAttribute.offset;

							if ( data.isInstancedInterleavedBuffer ) {

								for ( let i = 0; i < programAttribute.locationSize; i ++ ) {

									enableAttributeAndDivisor( programAttribute.location + i, data.meshPerAttribute );

								}

								if ( object.isInstancedMesh !== true && geometry._maxInstanceCount === undefined ) {

									geometry._maxInstanceCount = data.meshPerAttribute * data.count;

								}

							} else {

								for ( let i = 0; i < programAttribute.locationSize; i ++ ) {

									enableAttribute( programAttribute.location + i );

								}

							}

							gl.bindBuffer( gl.ARRAY_BUFFER, buffer );

							for ( let i = 0; i < programAttribute.locationSize; i ++ ) {

								vertexAttribPointer(
									programAttribute.location + i,
									size / programAttribute.locationSize,
									type,
									normalized,
									stride * bytesPerElement,
									( offset + ( size / programAttribute.locationSize ) * i ) * bytesPerElement,
									integer
								);

							}

						} else {

							if ( geometryAttribute.isInstancedBufferAttribute ) {

								for ( let i = 0; i < programAttribute.locationSize; i ++ ) {

									enableAttributeAndDivisor( programAttribute.location + i, geometryAttribute.meshPerAttribute );

								}

								if ( object.isInstancedMesh !== true && geometry._maxInstanceCount === undefined ) {

									geometry._maxInstanceCount = geometryAttribute.meshPerAttribute * geometryAttribute.count;

								}

							} else {

								for ( let i = 0; i < programAttribute.locationSize; i ++ ) {

									enableAttribute( programAttribute.location + i );

								}

							}

							gl.bindBuffer( gl.ARRAY_BUFFER, buffer );

							for ( let i = 0; i < programAttribute.locationSize; i ++ ) {

								vertexAttribPointer(
									programAttribute.location + i,
									size / programAttribute.locationSize,
									type,
									normalized,
									size * bytesPerElement,
									( size / programAttribute.locationSize ) * i * bytesPerElement,
									integer
								);

							}

						}

					} else if ( materialDefaultAttributeValues !== undefined ) {

						const value = materialDefaultAttributeValues[ name ];

						if ( value !== undefined ) {

							switch ( value.length ) {

								case 2:
									gl.vertexAttrib2fv( programAttribute.location, value );
									break;

								case 3:
									gl.vertexAttrib3fv( programAttribute.location, value );
									break;

								case 4:
									gl.vertexAttrib4fv( programAttribute.location, value );
									break;

								default:
									gl.vertexAttrib1fv( programAttribute.location, value );

							}

						}

					}

				}

			}

			disableUnusedAttributes();

		}

		function dispose() {

			reset();

			for ( const geometryId in bindingStates ) {

				const programMap = bindingStates[ geometryId ];

				for ( const programId in programMap ) {

					const stateMap = programMap[ programId ];

					for ( const wireframe in stateMap ) {

						deleteVertexArrayObject( stateMap[ wireframe ].object );

						delete stateMap[ wireframe ];

					}

					delete programMap[ programId ];

				}

				delete bindingStates[ geometryId ];

			}

		}

		function releaseStatesOfGeometry( geometry ) {

			if ( bindingStates[ geometry.id ] === undefined ) return;

			const programMap = bindingStates[ geometry.id ];

			for ( const programId in programMap ) {

				const stateMap = programMap[ programId ];

				for ( const wireframe in stateMap ) {

					deleteVertexArrayObject( stateMap[ wireframe ].object );

					delete stateMap[ wireframe ];

				}

				delete programMap[ programId ];

			}

			delete bindingStates[ geometry.id ];

		}

		function releaseStatesOfProgram( program ) {

			for ( const geometryId in bindingStates ) {

				const programMap = bindingStates[ geometryId ];

				if ( programMap[ program.id ] === undefined ) continue;

				const stateMap = programMap[ program.id ];

				for ( const wireframe in stateMap ) {

					deleteVertexArrayObject( stateMap[ wireframe ].object );

					delete stateMap[ wireframe ];

				}

				delete programMap[ program.id ];

			}

		}

		function reset() {

			resetDefaultState();
			forceUpdate = true;

			if ( currentState === defaultState ) return;

			currentState = defaultState;
			bindVertexArrayObject( currentState.object );

		}

		// for backward-compatibility

		function resetDefaultState() {

			defaultState.geometry = null;
			defaultState.program = null;
			defaultState.wireframe = false;

		}

		return {

			setup: setup,
			reset: reset,
			resetDefaultState: resetDefaultState,
			dispose: dispose,
			releaseStatesOfGeometry: releaseStatesOfGeometry,
			releaseStatesOfProgram: releaseStatesOfProgram,

			initAttributes: initAttributes,
			enableAttribute: enableAttribute,
			disableUnusedAttributes: disableUnusedAttributes

		};

	}

	function WebGLBufferRenderer( gl, extensions, info, capabilities ) {

		const isWebGL2 = capabilities.isWebGL2;

		let mode;

		function setMode( value ) {

			mode = value;

		}

		function render( start, count ) {

			gl.drawArrays( mode, start, count );

			info.update( count, mode, 1 );

		}

		function renderInstances( start, count, primcount ) {

			if ( primcount === 0 ) return;

			let extension, methodName;

			if ( isWebGL2 ) {

				extension = gl;
				methodName = 'drawArraysInstanced';

			} else {

				extension = extensions.get( 'ANGLE_instanced_arrays' );
				methodName = 'drawArraysInstancedANGLE';

				if ( extension === null ) {

					console.error( 'THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.' );
					return;

				}

			}

			extension[ methodName ]( mode, start, count, primcount );

			info.update( count, mode, primcount );

		}

		function renderMultiDraw( starts, counts, drawCount ) {

			if ( drawCount === 0 ) return;

			const extension = extensions.get( 'WEBGL_multi_draw' );
			if ( extension === null ) {

				for ( let i = 0; i < drawCount; i ++ ) {

					this.render( starts[ i ], counts[ i ] );

				}

			} else {

				extension.multiDrawArraysWEBGL( mode, starts, 0, counts, 0, drawCount );

				let elementCount = 0;
				for ( let i = 0; i < drawCount; i ++ ) {

					elementCount += counts[ i ];

				}

				info.update( elementCount, mode, 1 );

			}

		}

		//

		this.setMode = setMode;
		this.render = render;
		this.renderInstances = renderInstances;
		this.renderMultiDraw = renderMultiDraw;

	}

	function WebGLCapabilities( gl, extensions, parameters ) {

		let maxAnisotropy;

		function getMaxAnisotropy() {

			if ( maxAnisotropy !== undefined ) return maxAnisotropy;

			if ( extensions.has( 'EXT_texture_filter_anisotropic' ) === true ) {

				const extension = extensions.get( 'EXT_texture_filter_anisotropic' );

				maxAnisotropy = gl.getParameter( extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT );

			} else {

				maxAnisotropy = 0;

			}

			return maxAnisotropy;

		}

		function getMaxPrecision( precision ) {

			if ( precision === 'highp' ) {

				if ( gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.HIGH_FLOAT ).precision > 0 &&
					gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.HIGH_FLOAT ).precision > 0 ) {

					return 'highp';

				}

				precision = 'mediump';

			}

			if ( precision === 'mediump' ) {

				if ( gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.MEDIUM_FLOAT ).precision > 0 &&
					gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT ).precision > 0 ) {

					return 'mediump';

				}

			}

			return 'lowp';

		}

		const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl.constructor.name === 'WebGL2RenderingContext';

		let precision = parameters.precision !== undefined ? parameters.precision : 'highp';
		const maxPrecision = getMaxPrecision( precision );

		if ( maxPrecision !== precision ) {

			console.warn( 'THREE.WebGLRenderer:', precision, 'not supported, using', maxPrecision, 'instead.' );
			precision = maxPrecision;

		}

		const drawBuffers = isWebGL2 || extensions.has( 'WEBGL_draw_buffers' );

		const logarithmicDepthBuffer = parameters.logarithmicDepthBuffer === true;

		const maxTextures = gl.getParameter( gl.MAX_TEXTURE_IMAGE_UNITS );
		const maxVertexTextures = gl.getParameter( gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS );
		const maxTextureSize = gl.getParameter( gl.MAX_TEXTURE_SIZE );
		const maxCubemapSize = gl.getParameter( gl.MAX_CUBE_MAP_TEXTURE_SIZE );

		const maxAttributes = gl.getParameter( gl.MAX_VERTEX_ATTRIBS );
		const maxVertexUniforms = gl.getParameter( gl.MAX_VERTEX_UNIFORM_VECTORS );
		const maxVaryings = gl.getParameter( gl.MAX_VARYING_VECTORS );
		const maxFragmentUniforms = gl.getParameter( gl.MAX_FRAGMENT_UNIFORM_VECTORS );

		const vertexTextures = maxVertexTextures > 0;
		const floatFragmentTextures = isWebGL2 || extensions.has( 'OES_texture_float' );
		const floatVertexTextures = vertexTextures && floatFragmentTextures;

		const maxSamples = isWebGL2 ? gl.getParameter( gl.MAX_SAMPLES ) : 0;

		return {

			isWebGL2: isWebGL2,

			drawBuffers: drawBuffers,

			getMaxAnisotropy: getMaxAnisotropy,
			getMaxPrecision: getMaxPrecision,

			precision: precision,
			logarithmicDepthBuffer: logarithmicDepthBuffer,

			maxTextures: maxTextures,
			maxVertexTextures: maxVertexTextures,
			maxTextureSize: maxTextureSize,
			maxCubemapSize: maxCubemapSize,

			maxAttributes: maxAttributes,
			maxVertexUniforms: maxVertexUniforms,
			maxVaryings: maxVaryings,
			maxFragmentUniforms: maxFragmentUniforms,

			vertexTextures: vertexTextures,
			floatFragmentTextures: floatFragmentTextures,
			floatVertexTextures: floatVertexTextures,

			maxSamples: maxSamples

		};

	}

	function WebGLClipping( properties ) {

		const scope = this;

		let globalState = null,
			numGlobalPlanes = 0,
			localClippingEnabled = false,
			renderingShadows = false;

		const plane = new three_2.Plane(),
			viewNormalMatrix = new three_1.Matrix3(),

			uniform = { value: null, needsUpdate: false };

		this.uniform = uniform;
		this.numPlanes = 0;
		this.numIntersection = 0;

		this.init = function ( planes, enableLocalClipping ) {

			const enabled =
				planes.length !== 0 ||
				enableLocalClipping ||
				// enable state of previous frame - the clipping code has to
				// run another frame in order to reset the state:
				numGlobalPlanes !== 0 ||
				localClippingEnabled;

			localClippingEnabled = enableLocalClipping;

			numGlobalPlanes = planes.length;

			return enabled;

		};

		this.beginShadows = function () {

			renderingShadows = true;
			projectPlanes( null );

		};

		this.endShadows = function () {

			renderingShadows = false;

		};

		this.setGlobalState = function ( planes, camera ) {

			globalState = projectPlanes( planes, camera, 0 );

		};

		this.setState = function ( material, camera, useCache ) {

			const planes = material.clippingPlanes,
				clipIntersection = material.clipIntersection,
				clipShadows = material.clipShadows;

			const materialProperties = properties.get( material );

			if ( ! localClippingEnabled || planes === null || planes.length === 0 || renderingShadows && ! clipShadows ) {

				// there's no local clipping

				if ( renderingShadows ) {

					// there's no global clipping

					projectPlanes( null );

				} else {

					resetGlobalState();

				}

			} else {

				const nGlobal = renderingShadows ? 0 : numGlobalPlanes,
					lGlobal = nGlobal * 4;

				let dstArray = materialProperties.clippingState || null;

				uniform.value = dstArray; // ensure unique state

				dstArray = projectPlanes( planes, camera, lGlobal, useCache );

				for ( let i = 0; i !== lGlobal; ++ i ) {

					dstArray[ i ] = globalState[ i ];

				}

				materialProperties.clippingState = dstArray;
				this.numIntersection = clipIntersection ? this.numPlanes : 0;
				this.numPlanes += nGlobal;

			}


		};

		function resetGlobalState() {

			if ( uniform.value !== globalState ) {

				uniform.value = globalState;
				uniform.needsUpdate = numGlobalPlanes > 0;

			}

			scope.numPlanes = numGlobalPlanes;
			scope.numIntersection = 0;

		}

		function projectPlanes( planes, camera, dstOffset, skipTransform ) {

			const nPlanes = planes !== null ? planes.length : 0;
			let dstArray = null;

			if ( nPlanes !== 0 ) {

				dstArray = uniform.value;

				if ( skipTransform !== true || dstArray === null ) {

					const flatSize = dstOffset + nPlanes * 4,
						viewMatrix = camera.matrixWorldInverse;

					viewNormalMatrix.getNormalMatrix( viewMatrix );

					if ( dstArray === null || dstArray.length < flatSize ) {

						dstArray = new Float32Array( flatSize );

					}

					for ( let i = 0, i4 = dstOffset; i !== nPlanes; ++ i, i4 += 4 ) {

						plane.copy( planes[ i ] ).applyMatrix4( viewMatrix, viewNormalMatrix );

						plane.normal.toArray( dstArray, i4 );
						dstArray[ i4 + 3 ] = plane.constant;

					}

				}

				uniform.value = dstArray;
				uniform.needsUpdate = true;

			}

			scope.numPlanes = nPlanes;
			scope.numIntersection = 0;

			return dstArray;

		}

	}

	function WebGLCubeMaps( renderer ) {

		let cubemaps = new WeakMap();

		function mapTextureMapping( texture, mapping ) {

			if ( mapping === three_1.EquirectangularReflectionMapping ) {

				texture.mapping = three_1.CubeReflectionMapping;

			} else if ( mapping === three_1.EquirectangularRefractionMapping ) {

				texture.mapping = three_1.CubeRefractionMapping;

			}

			return texture;

		}

		function get( texture ) {

			if ( texture && texture.isTexture ) {

				const mapping = texture.mapping;

				if ( mapping === three_1.EquirectangularReflectionMapping || mapping === three_1.EquirectangularRefractionMapping ) {

					if ( cubemaps.has( texture ) ) {

						const cubemap = cubemaps.get( texture ).texture;
						return mapTextureMapping( cubemap, texture.mapping );

					} else {

						const image = texture.image;

						if ( image && image.height > 0 ) {

							const renderTarget = new three_2.WebGLCubeRenderTarget( image.height / 2 );
							renderTarget.fromEquirectangularTexture( renderer, texture );
							cubemaps.set( texture, renderTarget );

							texture.addEventListener( 'dispose', onTextureDispose );

							return mapTextureMapping( renderTarget.texture, texture.mapping );

						} else {

							// image not yet ready. try the conversion next frame

							return null;

						}

					}

				}

			}

			return texture;

		}

		function onTextureDispose( event ) {

			const texture = event.target;

			texture.removeEventListener( 'dispose', onTextureDispose );

			const cubemap = cubemaps.get( texture );

			if ( cubemap !== undefined ) {

				cubemaps.delete( texture );
				cubemap.dispose();

			}

		}

		function dispose() {

			cubemaps = new WeakMap();

		}

		return {
			get: get,
			dispose: dispose
		};

	}

	class OrthographicCamera extends three_2.Camera {

		constructor( left = -1, right = 1, top = 1, bottom = -1, near = 0.1, far = 2000 ) {

			super();

			this.isOrthographicCamera = true;

			this.type = 'OrthographicCamera';

			this.zoom = 1;
			this.view = null;

			this.left = left;
			this.right = right;
			this.top = top;
			this.bottom = bottom;

			this.near = near;
			this.far = far;

			this.updateProjectionMatrix();

		}

		copy( source, recursive ) {

			super.copy( source, recursive );

			this.left = source.left;
			this.right = source.right;
			this.top = source.top;
			this.bottom = source.bottom;
			this.near = source.near;
			this.far = source.far;

			this.zoom = source.zoom;
			this.view = source.view === null ? null : Object.assign( {}, source.view );

			return this;

		}

		setViewOffset( fullWidth, fullHeight, x, y, width, height ) {

			if ( this.view === null ) {

				this.view = {
					enabled: true,
					fullWidth: 1,
					fullHeight: 1,
					offsetX: 0,
					offsetY: 0,
					width: 1,
					height: 1
				};

			}

			this.view.enabled = true;
			this.view.fullWidth = fullWidth;
			this.view.fullHeight = fullHeight;
			this.view.offsetX = x;
			this.view.offsetY = y;
			this.view.width = width;
			this.view.height = height;

			this.updateProjectionMatrix();

		}

		clearViewOffset() {

			if ( this.view !== null ) {

				this.view.enabled = false;

			}

			this.updateProjectionMatrix();

		}

		updateProjectionMatrix() {

			const dx = ( this.right - this.left ) / ( 2 * this.zoom );
			const dy = ( this.top - this.bottom ) / ( 2 * this.zoom );
			const cx = ( this.right + this.left ) / 2;
			const cy = ( this.top + this.bottom ) / 2;

			let left = cx - dx;
			let right = cx + dx;
			let top = cy + dy;
			let bottom = cy - dy;

			if ( this.view !== null && this.view.enabled ) {

				const scaleW = ( this.right - this.left ) / this.view.fullWidth / this.zoom;
				const scaleH = ( this.top - this.bottom ) / this.view.fullHeight / this.zoom;

				left += scaleW * this.view.offsetX;
				right = left + scaleW * this.view.width;
				top -= scaleH * this.view.offsetY;
				bottom = top - scaleH * this.view.height;

			}

			this.projectionMatrix.makeOrthographic( left, right, top, bottom, this.near, this.far, this.coordinateSystem );

			this.projectionMatrixInverse.copy( this.projectionMatrix ).invert();

		}

		toJSON( meta ) {

			const data = super.toJSON( meta );

			data.object.zoom = this.zoom;
			data.object.left = this.left;
			data.object.right = this.right;
			data.object.top = this.top;
			data.object.bottom = this.bottom;
			data.object.near = this.near;
			data.object.far = this.far;

			if ( this.view !== null ) data.object.view = Object.assign( {}, this.view );

			return data;

		}

	}

	const LOD_MIN = 4;

	// The standard deviations (radians) associated with the extra mips. These are
	// chosen to approximate a Trowbridge-Reitz distribution function times the
	// geometric shadowing function. These sigma values squared must match the
	// variance #defines in cube_uv_reflection_fragment.glsl.js.
	const EXTRA_LOD_SIGMA = [ 0.125, 0.215, 0.35, 0.446, 0.526, 0.582 ];

	// The maximum length of the blur for loop. Smaller sigmas will use fewer
	// samples and exit early, but not recompile the shader.
	const MAX_SAMPLES = 20;

	const _flatCamera = /*@__PURE__*/ new OrthographicCamera();
	const _clearColor = /*@__PURE__*/ new three_1.Color();
	let _oldTarget = null;
	let _oldActiveCubeFace = 0;
	let _oldActiveMipmapLevel = 0;

	// Golden Ratio
	const PHI = ( 1 + Math.sqrt( 5 ) ) / 2;
	const INV_PHI = 1 / PHI;

	// Vertices of a dodecahedron (except the opposites, which represent the
	// same axis), used as axis directions evenly spread on a sphere.
	const _axisDirections = [
		/*@__PURE__*/ new three_1.Vector3( 1, 1, 1 ),
		/*@__PURE__*/ new three_1.Vector3( -1, 1, 1 ),
		/*@__PURE__*/ new three_1.Vector3( 1, 1, -1 ),
		/*@__PURE__*/ new three_1.Vector3( -1, 1, -1 ),
		/*@__PURE__*/ new three_1.Vector3( 0, PHI, INV_PHI ),
		/*@__PURE__*/ new three_1.Vector3( 0, PHI, - INV_PHI ),
		/*@__PURE__*/ new three_1.Vector3( INV_PHI, 0, PHI ),
		/*@__PURE__*/ new three_1.Vector3( - INV_PHI, 0, PHI ),
		/*@__PURE__*/ new three_1.Vector3( PHI, INV_PHI, 0 ),
		/*@__PURE__*/ new three_1.Vector3( - PHI, INV_PHI, 0 ) ];

	/**
	 * This class generates a Prefiltered, Mipmapped Radiance Environment Map
	 * (PMREM) from a cubeMap environment texture. This allows different levels of
	 * blur to be quickly accessed based on material roughness. It is packed into a
	 * special CubeUV format that allows us to perform custom interpolation so that
	 * we can support nonlinear formats such as RGBE. Unlike a traditional mipmap
	 * chain, it only goes down to the LOD_MIN level (above), and then creates extra
	 * even more filtered 'mips' at the same LOD_MIN resolution, associated with
	 * higher roughness levels. In this way we maintain resolution to smoothly
	 * interpolate diffuse lighting while limiting sampling computation.
	 *
	 * Paper: Fast, Accurate Image-Based Lighting
	 * https://drive.google.com/file/d/15y8r_UpKlU9SvV4ILb0C3qCPecS8pvLz/view
	*/

	class PMREMGenerator {

		constructor( renderer ) {

			this._renderer = renderer;
			this._pingPongRenderTarget = null;

			this._lodMax = 0;
			this._cubeSize = 0;
			this._lodPlanes = [];
			this._sizeLods = [];
			this._sigmas = [];

			this._blurMaterial = null;
			this._cubemapMaterial = null;
			this._equirectMaterial = null;

			this._compileMaterial( this._blurMaterial );

		}

		/**
		 * Generates a PMREM from a supplied Scene, which can be faster than using an
		 * image if networking bandwidth is low. Optional sigma specifies a blur radius
		 * in radians to be applied to the scene before PMREM generation. Optional near
		 * and far planes ensure the scene is rendered in its entirety (the cubeCamera
		 * is placed at the origin).
		 */
		fromScene( scene, sigma = 0, near = 0.1, far = 100 ) {

			_oldTarget = this._renderer.getRenderTarget();
			_oldActiveCubeFace = this._renderer.getActiveCubeFace();
			_oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel();

			this._setSize( 256 );

			const cubeUVRenderTarget = this._allocateTargets();
			cubeUVRenderTarget.depthBuffer = true;

			this._sceneToCubeUV( scene, near, far, cubeUVRenderTarget );

			if ( sigma > 0 ) {

				this._blur( cubeUVRenderTarget, 0, 0, sigma );

			}

			this._applyPMREM( cubeUVRenderTarget );
			this._cleanup( cubeUVRenderTarget );

			return cubeUVRenderTarget;

		}

		/**
		 * Generates a PMREM from an equirectangular texture, which can be either LDR
		 * or HDR. The ideal input image size is 1k (1024 x 512),
		 * as this matches best with the 256 x 256 cubemap output.
		 */
		fromEquirectangular( equirectangular, renderTarget = null ) {

			return this._fromTexture( equirectangular, renderTarget );

		}

		/**
		 * Generates a PMREM from an cubemap texture, which can be either LDR
		 * or HDR. The ideal input cube size is 256 x 256,
		 * as this matches best with the 256 x 256 cubemap output.
		 */
		fromCubemap( cubemap, renderTarget = null ) {

			return this._fromTexture( cubemap, renderTarget );

		}

		/**
		 * Pre-compiles the cubemap shader. You can get faster start-up by invoking this method during
		 * your texture's network fetch for increased concurrency.
		 */
		compileCubemapShader() {

			if ( this._cubemapMaterial === null ) {

				this._cubemapMaterial = _getCubemapMaterial();
				this._compileMaterial( this._cubemapMaterial );

			}

		}

		/**
		 * Pre-compiles the equirectangular shader. You can get faster start-up by invoking this method during
		 * your texture's network fetch for increased concurrency.
		 */
		compileEquirectangularShader() {

			if ( this._equirectMaterial === null ) {

				this._equirectMaterial = _getEquirectMaterial();
				this._compileMaterial( this._equirectMaterial );

			}

		}

		/**
		 * Disposes of the PMREMGenerator's internal memory. Note that PMREMGenerator is a static class,
		 * so you should not need more than one PMREMGenerator object. If you do, calling dispose() on
		 * one of them will cause any others to also become unusable.
		 */
		dispose() {

			this._dispose();

			if ( this._cubemapMaterial !== null ) this._cubemapMaterial.dispose();
			if ( this._equirectMaterial !== null ) this._equirectMaterial.dispose();

		}

		// private interface

		_setSize( cubeSize ) {

			this._lodMax = Math.floor( Math.log2( cubeSize ) );
			this._cubeSize = Math.pow( 2, this._lodMax );

		}

		_dispose() {

			if ( this._blurMaterial !== null ) this._blurMaterial.dispose();

			if ( this._pingPongRenderTarget !== null ) this._pingPongRenderTarget.dispose();

			for ( let i = 0; i < this._lodPlanes.length; i ++ ) {

				this._lodPlanes[ i ].dispose();

			}

		}

		_cleanup( outputTarget ) {

			this._renderer.setRenderTarget( _oldTarget, _oldActiveCubeFace, _oldActiveMipmapLevel );
			outputTarget.scissorTest = false;
			_setViewport( outputTarget, 0, 0, outputTarget.width, outputTarget.height );

		}

		_fromTexture( texture, renderTarget ) {

			if ( texture.mapping === three_1.CubeReflectionMapping || texture.mapping === three_1.CubeRefractionMapping ) {

				this._setSize( texture.image.length === 0 ? 16 : ( texture.image[ 0 ].width || texture.image[ 0 ].image.width ) );

			} else { // Equirectangular

				this._setSize( texture.image.width / 4 );

			}

			_oldTarget = this._renderer.getRenderTarget();
			_oldActiveCubeFace = this._renderer.getActiveCubeFace();
			_oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel();

			const cubeUVRenderTarget = renderTarget || this._allocateTargets();
			this._textureToCubeUV( texture, cubeUVRenderTarget );
			this._applyPMREM( cubeUVRenderTarget );
			this._cleanup( cubeUVRenderTarget );

			return cubeUVRenderTarget;

		}

		_allocateTargets() {

			const width = 3 * Math.max( this._cubeSize, 16 * 7 );
			const height = 4 * this._cubeSize;

			const params = {
				magFilter: three_1.LinearFilter,
				minFilter: three_1.LinearFilter,
				generateMipmaps: false,
				type: three_1.HalfFloatType,
				format: three_1.RGBAFormat,
				colorSpace: three_1.LinearSRGBColorSpace,
				depthBuffer: false
			};

			const cubeUVRenderTarget = _createRenderTarget( width, height, params );

			if ( this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== width || this._pingPongRenderTarget.height !== height ) {

				if ( this._pingPongRenderTarget !== null ) {

					this._dispose();

				}

				this._pingPongRenderTarget = _createRenderTarget( width, height, params );

				const { _lodMax } = this;
				( { sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas } = _createPlanes( _lodMax ) );

				this._blurMaterial = _getBlurShader( _lodMax, width, height );

			}

			return cubeUVRenderTarget;

		}

		_compileMaterial( material ) {

			const tmpMesh = new three_2.Mesh( this._lodPlanes[ 0 ], material );
			this._renderer.compile( tmpMesh, _flatCamera );

		}

		_sceneToCubeUV( scene, near, far, cubeUVRenderTarget ) {

			const fov = 90;
			const aspect = 1;
			const cubeCamera = new three_2.PerspectiveCamera( fov, aspect, near, far );
			const upSign = [ 1, -1, 1, 1, 1, 1 ];
			const forwardSign = [ 1, 1, 1, -1, -1, -1 ];
			const renderer = this._renderer;

			const originalAutoClear = renderer.autoClear;
			const toneMapping = renderer.toneMapping;
			renderer.getClearColor( _clearColor );

			renderer.toneMapping = three_1.NoToneMapping;
			renderer.autoClear = false;

			const backgroundMaterial = new three_1.MeshBasicMaterial( {
				name: 'PMREM.Background',
				side: three_1.BackSide,
				depthWrite: false,
				depthTest: false,
			} );

			const backgroundBox = new three_2.Mesh( new three_2.BoxGeometry(), backgroundMaterial );

			let useSolidColor = false;
			const background = scene.background;

			if ( background ) {

				if ( background.isColor ) {

					backgroundMaterial.color.copy( background );
					scene.background = null;
					useSolidColor = true;

				}

			} else {

				backgroundMaterial.color.copy( _clearColor );
				useSolidColor = true;

			}

			for ( let i = 0; i < 6; i ++ ) {

				const col = i % 3;

				if ( col === 0 ) {

					cubeCamera.up.set( 0, upSign[ i ], 0 );
					cubeCamera.lookAt( forwardSign[ i ], 0, 0 );

				} else if ( col === 1 ) {

					cubeCamera.up.set( 0, 0, upSign[ i ] );
					cubeCamera.lookAt( 0, forwardSign[ i ], 0 );

				} else {

					cubeCamera.up.set( 0, upSign[ i ], 0 );
					cubeCamera.lookAt( 0, 0, forwardSign[ i ] );

				}

				const size = this._cubeSize;

				_setViewport( cubeUVRenderTarget, col * size, i > 2 ? size : 0, size, size );

				renderer.setRenderTarget( cubeUVRenderTarget );

				if ( useSolidColor ) {

					renderer.render( backgroundBox, cubeCamera );

				}

				renderer.render( scene, cubeCamera );

			}

			backgroundBox.geometry.dispose();
			backgroundBox.material.dispose();

			renderer.toneMapping = toneMapping;
			renderer.autoClear = originalAutoClear;
			scene.background = background;

		}

		_textureToCubeUV( texture, cubeUVRenderTarget ) {

			const renderer = this._renderer;

			const isCubeTexture = ( texture.mapping === three_1.CubeReflectionMapping || texture.mapping === three_1.CubeRefractionMapping );

			if ( isCubeTexture ) {

				if ( this._cubemapMaterial === null ) {

					this._cubemapMaterial = _getCubemapMaterial();

				}

				this._cubemapMaterial.uniforms.flipEnvMap.value = ( texture.isRenderTargetTexture === false ) ? -1 : 1;

			} else {

				if ( this._equirectMaterial === null ) {

					this._equirectMaterial = _getEquirectMaterial();

				}

			}

			const material = isCubeTexture ? this._cubemapMaterial : this._equirectMaterial;
			const mesh = new three_2.Mesh( this._lodPlanes[ 0 ], material );

			const uniforms = material.uniforms;

			uniforms[ 'envMap' ].value = texture;

			const size = this._cubeSize;

			_setViewport( cubeUVRenderTarget, 0, 0, 3 * size, 2 * size );

			renderer.setRenderTarget( cubeUVRenderTarget );
			renderer.render( mesh, _flatCamera );

		}

		_applyPMREM( cubeUVRenderTarget ) {

			const renderer = this._renderer;
			const autoClear = renderer.autoClear;
			renderer.autoClear = false;

			for ( let i = 1; i < this._lodPlanes.length; i ++ ) {

				const sigma = Math.sqrt( this._sigmas[ i ] * this._sigmas[ i ] - this._sigmas[ i - 1 ] * this._sigmas[ i - 1 ] );

				const poleAxis = _axisDirections[ ( i - 1 ) % _axisDirections.length ];

				this._blur( cubeUVRenderTarget, i - 1, i, sigma, poleAxis );

			}

			renderer.autoClear = autoClear;

		}

		/**
		 * This is a two-pass Gaussian blur for a cubemap. Normally this is done
		 * vertically and horizontally, but this breaks down on a cube. Here we apply
		 * the blur latitudinally (around the poles), and then longitudinally (towards
		 * the poles) to approximate the orthogonally-separable blur. It is least
		 * accurate at the poles, but still does a decent job.
		 */
		_blur( cubeUVRenderTarget, lodIn, lodOut, sigma, poleAxis ) {

			const pingPongRenderTarget = this._pingPongRenderTarget;

			this._halfBlur(
				cubeUVRenderTarget,
				pingPongRenderTarget,
				lodIn,
				lodOut,
				sigma,
				'latitudinal',
				poleAxis );

			this._halfBlur(
				pingPongRenderTarget,
				cubeUVRenderTarget,
				lodOut,
				lodOut,
				sigma,
				'longitudinal',
				poleAxis );

		}

		_halfBlur( targetIn, targetOut, lodIn, lodOut, sigmaRadians, direction, poleAxis ) {

			const renderer = this._renderer;
			const blurMaterial = this._blurMaterial;

			if ( direction !== 'latitudinal' && direction !== 'longitudinal' ) {

				console.error(
					'blur direction must be either latitudinal or longitudinal!' );

			}

			// Number of standard deviations at which to cut off the discrete approximation.
			const STANDARD_DEVIATIONS = 3;

			const blurMesh = new three_2.Mesh( this._lodPlanes[ lodOut ], blurMaterial );
			const blurUniforms = blurMaterial.uniforms;

			const pixels = this._sizeLods[ lodIn ] - 1;
			const radiansPerPixel = isFinite( sigmaRadians ) ? Math.PI / ( 2 * pixels ) : 2 * Math.PI / ( 2 * MAX_SAMPLES - 1 );
			const sigmaPixels = sigmaRadians / radiansPerPixel;
			const samples = isFinite( sigmaRadians ) ? 1 + Math.floor( STANDARD_DEVIATIONS * sigmaPixels ) : MAX_SAMPLES;

			if ( samples > MAX_SAMPLES ) {

				console.warn( `sigmaRadians, ${
				sigmaRadians}, is too large and will clip, as it requested ${
				samples} samples when the maximum is set to ${MAX_SAMPLES}` );

			}

			const weights = [];
			let sum = 0;

			for ( let i = 0; i < MAX_SAMPLES; ++ i ) {

				const x = i / sigmaPixels;
				const weight = Math.exp( - x * x / 2 );
				weights.push( weight );

				if ( i === 0 ) {

					sum += weight;

				} else if ( i < samples ) {

					sum += 2 * weight;

				}

			}

			for ( let i = 0; i < weights.length; i ++ ) {

				weights[ i ] = weights[ i ] / sum;

			}

			blurUniforms[ 'envMap' ].value = targetIn.texture;
			blurUniforms[ 'samples' ].value = samples;
			blurUniforms[ 'weights' ].value = weights;
			blurUniforms[ 'latitudinal' ].value = direction === 'latitudinal';

			if ( poleAxis ) {

				blurUniforms[ 'poleAxis' ].value = poleAxis;

			}

			const { _lodMax } = this;
			blurUniforms[ 'dTheta' ].value = radiansPerPixel;
			blurUniforms[ 'mipInt' ].value = _lodMax - lodIn;

			const outputSize = this._sizeLods[ lodOut ];
			const x = 3 * outputSize * ( lodOut > _lodMax - LOD_MIN ? lodOut - _lodMax + LOD_MIN : 0 );
			const y = 4 * ( this._cubeSize - outputSize );

			_setViewport( targetOut, x, y, 3 * outputSize, 2 * outputSize );
			renderer.setRenderTarget( targetOut );
			renderer.render( blurMesh, _flatCamera );

		}

	}



	function _createPlanes( lodMax ) {

		const lodPlanes = [];
		const sizeLods = [];
		const sigmas = [];

		let lod = lodMax;

		const totalLods = lodMax - LOD_MIN + 1 + EXTRA_LOD_SIGMA.length;

		for ( let i = 0; i < totalLods; i ++ ) {

			const sizeLod = Math.pow( 2, lod );
			sizeLods.push( sizeLod );
			let sigma = 1.0 / sizeLod;

			if ( i > lodMax - LOD_MIN ) {

				sigma = EXTRA_LOD_SIGMA[ i - lodMax + LOD_MIN - 1 ];

			} else if ( i === 0 ) {

				sigma = 0;

			}

			sigmas.push( sigma );

			const texelSize = 1.0 / ( sizeLod - 2 );
			const min = - texelSize;
			const max = 1 + texelSize;
			const uv1 = [ min, min, max, min, max, max, min, min, max, max, min, max ];

			const cubeFaces = 6;
			const vertices = 6;
			const positionSize = 3;
			const uvSize = 2;
			const faceIndexSize = 1;

			const position = new Float32Array( positionSize * vertices * cubeFaces );
			const uv = new Float32Array( uvSize * vertices * cubeFaces );
			const faceIndex = new Float32Array( faceIndexSize * vertices * cubeFaces );

			for ( let face = 0; face < cubeFaces; face ++ ) {

				const x = ( face % 3 ) * 2 / 3 - 1;
				const y = face > 2 ? 0 : -1;
				const coordinates = [
					x, y, 0,
					x + 2 / 3, y, 0,
					x + 2 / 3, y + 1, 0,
					x, y, 0,
					x + 2 / 3, y + 1, 0,
					x, y + 1, 0
				];
				position.set( coordinates, positionSize * vertices * face );
				uv.set( uv1, uvSize * vertices * face );
				const fill = [ face, face, face, face, face, face ];
				faceIndex.set( fill, faceIndexSize * vertices * face );

			}

			const planes = new three_2.BufferGeometry();
			planes.setAttribute( 'position', new three_1.BufferAttribute( position, positionSize ) );
			planes.setAttribute( 'uv', new three_1.BufferAttribute( uv, uvSize ) );
			planes.setAttribute( 'faceIndex', new three_1.BufferAttribute( faceIndex, faceIndexSize ) );
			lodPlanes.push( planes );

			if ( lod > LOD_MIN ) {

				lod --;

			}

		}

		return { lodPlanes, sizeLods, sigmas };

	}

	function _createRenderTarget( width, height, params ) {

		const cubeUVRenderTarget = new three_1.WebGLRenderTarget( width, height, params );
		cubeUVRenderTarget.texture.mapping = three_1.CubeUVReflectionMapping;
		cubeUVRenderTarget.texture.name = 'PMREM.cubeUv';
		cubeUVRenderTarget.scissorTest = true;
		return cubeUVRenderTarget;

	}

	function _setViewport( target, x, y, width, height ) {

		target.viewport.set( x, y, width, height );
		target.scissor.set( x, y, width, height );

	}

	function _getBlurShader( lodMax, width, height ) {

		const weights = new Float32Array( MAX_SAMPLES );
		const poleAxis = new three_1.Vector3( 0, 1, 0 );
		const shaderMaterial = new three_2.ShaderMaterial( {

			name: 'SphericalGaussianBlur',

			defines: {
				'n': MAX_SAMPLES,
				'CUBEUV_TEXEL_WIDTH': 1.0 / width,
				'CUBEUV_TEXEL_HEIGHT': 1.0 / height,
				'CUBEUV_MAX_MIP': `${lodMax}.0`,
			},

			uniforms: {
				'envMap': { value: null },
				'samples': { value: 1 },
				'weights': { value: weights },
				'latitudinal': { value: false },
				'dTheta': { value: 0 },
				'mipInt': { value: 0 },
				'poleAxis': { value: poleAxis }
			},

			vertexShader: _getCommonVertexShader(),

			fragmentShader: /* glsl */`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,

			blending: three_1.NoBlending,
			depthTest: false,
			depthWrite: false

		} );

		return shaderMaterial;

	}

	function _getEquirectMaterial() {

		return new three_2.ShaderMaterial( {

			name: 'EquirectangularToCubeUV',

			uniforms: {
				'envMap': { value: null }
			},

			vertexShader: _getCommonVertexShader(),

			fragmentShader: /* glsl */`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,

			blending: three_1.NoBlending,
			depthTest: false,
			depthWrite: false

		} );

	}

	function _getCubemapMaterial() {

		return new three_2.ShaderMaterial( {

			name: 'CubemapToCubeUV',

			uniforms: {
				'envMap': { value: null },
				'flipEnvMap': { value: -1 }
			},

			vertexShader: _getCommonVertexShader(),

			fragmentShader: /* glsl */`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,

			blending: three_1.NoBlending,
			depthTest: false,
			depthWrite: false

		} );

	}

	function _getCommonVertexShader() {

		return /* glsl */`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`;

	}

	function WebGLCubeUVMaps( renderer ) {

		let cubeUVmaps = new WeakMap();

		let pmremGenerator = null;

		function get( texture ) {

			if ( texture && texture.isTexture ) {

				const mapping = texture.mapping;

				const isEquirectMap = ( mapping === three_1.EquirectangularReflectionMapping || mapping === three_1.EquirectangularRefractionMapping );
				const isCubeMap = ( mapping === three_1.CubeReflectionMapping || mapping === three_1.CubeRefractionMapping );

				// equirect/cube map to cubeUV conversion

				if ( isEquirectMap || isCubeMap ) {

					if ( texture.isRenderTargetTexture && texture.needsPMREMUpdate === true ) {

						texture.needsPMREMUpdate = false;

						let renderTarget = cubeUVmaps.get( texture );

						if ( pmremGenerator === null ) pmremGenerator = new PMREMGenerator( renderer );

						renderTarget = isEquirectMap ? pmremGenerator.fromEquirectangular( texture, renderTarget ) : pmremGenerator.fromCubemap( texture, renderTarget );
						cubeUVmaps.set( texture, renderTarget );

						return renderTarget.texture;

					} else {

						if ( cubeUVmaps.has( texture ) ) {

							return cubeUVmaps.get( texture ).texture;

						} else {

							const image = texture.image;

							if ( ( isEquirectMap && image && image.height > 0 ) || ( isCubeMap && image && isCubeTextureComplete( image ) ) ) {

								if ( pmremGenerator === null ) pmremGenerator = new PMREMGenerator( renderer );

								const renderTarget = isEquirectMap ? pmremGenerator.fromEquirectangular( texture ) : pmremGenerator.fromCubemap( texture );
								cubeUVmaps.set( texture, renderTarget );

								texture.addEventListener( 'dispose', onTextureDispose );

								return renderTarget.texture;

							} else {

								// image not yet ready. try the conversion next frame

								return null;

							}

						}

					}

				}

			}

			return texture;

		}

		function isCubeTextureComplete( image ) {

			let count = 0;
			const length = 6;

			for ( let i = 0; i < length; i ++ ) {

				if ( image[ i ] !== undefined ) count ++;

			}

			return count === length;


		}

		function onTextureDispose( event ) {

			const texture = event.target;

			texture.removeEventListener( 'dispose', onTextureDispose );

			const cubemapUV = cubeUVmaps.get( texture );

			if ( cubemapUV !== undefined ) {

				cubeUVmaps.delete( texture );
				cubemapUV.dispose();

			}

		}

		function dispose() {

			cubeUVmaps = new WeakMap();

			if ( pmremGenerator !== null ) {

				pmremGenerator.dispose();
				pmremGenerator = null;

			}

		}

		return {
			get: get,
			dispose: dispose
		};

	}

	function WebGLExtensions( gl ) {

		const extensions = {};

		function getExtension( name ) {

			if ( extensions[ name ] !== undefined ) {

				return extensions[ name ];

			}

			let extension;

			switch ( name ) {

				case 'WEBGL_depth_texture':
					extension = gl.getExtension( 'WEBGL_depth_texture' ) || gl.getExtension( 'MOZ_WEBGL_depth_texture' ) || gl.getExtension( 'WEBKIT_WEBGL_depth_texture' );
					break;

				case 'EXT_texture_filter_anisotropic':
					extension = gl.getExtension( 'EXT_texture_filter_anisotropic' ) || gl.getExtension( 'MOZ_EXT_texture_filter_anisotropic' ) || gl.getExtension( 'WEBKIT_EXT_texture_filter_anisotropic' );
					break;

				case 'WEBGL_compressed_texture_s3tc':
					extension = gl.getExtension( 'WEBGL_compressed_texture_s3tc' ) || gl.getExtension( 'MOZ_WEBGL_compressed_texture_s3tc' ) || gl.getExtension( 'WEBKIT_WEBGL_compressed_texture_s3tc' );
					break;

				case 'WEBGL_compressed_texture_pvrtc':
					extension = gl.getExtension( 'WEBGL_compressed_texture_pvrtc' ) || gl.getExtension( 'WEBKIT_WEBGL_compressed_texture_pvrtc' );
					break;

				default:
					extension = gl.getExtension( name );

			}

			extensions[ name ] = extension;

			return extension;

		}

		return {

			has: function ( name ) {

				return getExtension( name ) !== null;

			},

			init: function ( capabilities ) {

				if ( capabilities.isWebGL2 ) {

					getExtension( 'EXT_color_buffer_float' );
					getExtension( 'WEBGL_clip_cull_distance' );

				} else {

					getExtension( 'WEBGL_depth_texture' );
					getExtension( 'OES_texture_float' );
					getExtension( 'OES_texture_half_float' );
					getExtension( 'OES_texture_half_float_linear' );
					getExtension( 'OES_standard_derivatives' );
					getExtension( 'OES_element_index_uint' );
					getExtension( 'OES_vertex_array_object' );
					getExtension( 'ANGLE_instanced_arrays' );

				}

				getExtension( 'OES_texture_float_linear' );
				getExtension( 'EXT_color_buffer_half_float' );
				getExtension( 'WEBGL_multisampled_render_to_texture' );

			},

			get: function ( name ) {

				const extension = getExtension( name );

				if ( extension === null ) {

					console.warn( 'THREE.WebGLRenderer: ' + name + ' extension not supported.' );

				}

				return extension;

			}

		};

	}

	function WebGLGeometries( gl, attributes, info, bindingStates ) {

		const geometries = {};
		const wireframeAttributes = new WeakMap();

		function onGeometryDispose( event ) {

			const geometry = event.target;

			if ( geometry.index !== null ) {

				attributes.remove( geometry.index );

			}

			for ( const name in geometry.attributes ) {

				attributes.remove( geometry.attributes[ name ] );

			}

			for ( const name in geometry.morphAttributes ) {

				const array = geometry.morphAttributes[ name ];

				for ( let i = 0, l = array.length; i < l; i ++ ) {

					attributes.remove( array[ i ] );

				}

			}

			geometry.removeEventListener( 'dispose', onGeometryDispose );

			delete geometries[ geometry.id ];

			const attribute = wireframeAttributes.get( geometry );

			if ( attribute ) {

				attributes.remove( attribute );
				wireframeAttributes.delete( geometry );

			}

			bindingStates.releaseStatesOfGeometry( geometry );

			if ( geometry.isInstancedBufferGeometry === true ) {

				delete geometry._maxInstanceCount;

			}

			//

			info.memory.geometries --;

		}

		function get( object, geometry ) {

			if ( geometries[ geometry.id ] === true ) return geometry;

			geometry.addEventListener( 'dispose', onGeometryDispose );

			geometries[ geometry.id ] = true;

			info.memory.geometries ++;

			return geometry;

		}

		function update( geometry ) {

			const geometryAttributes = geometry.attributes;

			// Updating index buffer in VAO now. See WebGLBindingStates.

			for ( const name in geometryAttributes ) {

				attributes.update( geometryAttributes[ name ], gl.ARRAY_BUFFER );

			}

			// morph targets

			const morphAttributes = geometry.morphAttributes;

			for ( const name in morphAttributes ) {

				const array = morphAttributes[ name ];

				for ( let i = 0, l = array.length; i < l; i ++ ) {

					attributes.update( array[ i ], gl.ARRAY_BUFFER );

				}

			}

		}

		function updateWireframeAttribute( geometry ) {

			const indices = [];

			const geometryIndex = geometry.index;
			const geometryPosition = geometry.attributes.position;
			let version = 0;

			if ( geometryIndex !== null ) {

				const array = geometryIndex.array;
				version = geometryIndex.version;

				for ( let i = 0, l = array.length; i < l; i += 3 ) {

					const a = array[ i + 0 ];
					const b = array[ i + 1 ];
					const c = array[ i + 2 ];

					indices.push( a, b, b, c, c, a );

				}

			} else if ( geometryPosition !== undefined ) {

				const array = geometryPosition.array;
				version = geometryPosition.version;

				for ( let i = 0, l = ( array.length / 3 ) - 1; i < l; i += 3 ) {

					const a = i + 0;
					const b = i + 1;
					const c = i + 2;

					indices.push( a, b, b, c, c, a );

				}

			} else {

				return;

			}

			const attribute = new ( three_1.arrayNeedsUint32( indices ) ? three_1.Uint32BufferAttribute : three_1.Uint16BufferAttribute )( indices, 1 );
			attribute.version = version;

			// Updating index buffer in VAO now. See WebGLBindingStates

			//

			const previousAttribute = wireframeAttributes.get( geometry );

			if ( previousAttribute ) attributes.remove( previousAttribute );

			//

			wireframeAttributes.set( geometry, attribute );

		}

		function getWireframeAttribute( geometry ) {

			const currentAttribute = wireframeAttributes.get( geometry );

			if ( currentAttribute ) {

				const geometryIndex = geometry.index;

				if ( geometryIndex !== null ) {

					// if the attribute is obsolete, create a new one

					if ( currentAttribute.version < geometryIndex.version ) {

						updateWireframeAttribute( geometry );

					}

				}

			} else {

				updateWireframeAttribute( geometry );

			}

			return wireframeAttributes.get( geometry );

		}

		return {

			get: get,
			update: update,

			getWireframeAttribute: getWireframeAttribute

		};

	}

	function WebGLIndexedBufferRenderer( gl, extensions, info, capabilities ) {

		const isWebGL2 = capabilities.isWebGL2;

		let mode;

		function setMode( value ) {

			mode = value;

		}

		let type, bytesPerElement;

		function setIndex( value ) {

			type = value.type;
			bytesPerElement = value.bytesPerElement;

		}

		function render( start, count ) {

			gl.drawElements( mode, count, type, start * bytesPerElement );

			info.update( count, mode, 1 );

		}

		function renderInstances( start, count, primcount ) {

			if ( primcount === 0 ) return;

			let extension, methodName;

			if ( isWebGL2 ) {

				extension = gl;
				methodName = 'drawElementsInstanced';

			} else {

				extension = extensions.get( 'ANGLE_instanced_arrays' );
				methodName = 'drawElementsInstancedANGLE';

				if ( extension === null ) {

					console.error( 'THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.' );
					return;

				}

			}

			extension[ methodName ]( mode, count, type, start * bytesPerElement, primcount );

			info.update( count, mode, primcount );

		}

		function renderMultiDraw( starts, counts, drawCount ) {

			if ( drawCount === 0 ) return;

			const extension = extensions.get( 'WEBGL_multi_draw' );
			if ( extension === null ) {

				for ( let i = 0; i < drawCount; i ++ ) {

					this.render( starts[ i ] / bytesPerElement, counts[ i ] );

				}

			} else {

				extension.multiDrawElementsWEBGL( mode, counts, 0, type, starts, 0, drawCount );

				let elementCount = 0;
				for ( let i = 0; i < drawCount; i ++ ) {

					elementCount += counts[ i ];

				}

				info.update( elementCount, mode, 1 );

			}

		}

		//

		this.setMode = setMode;
		this.setIndex = setIndex;
		this.render = render;
		this.renderInstances = renderInstances;
		this.renderMultiDraw = renderMultiDraw;

	}

	function WebGLInfo( gl ) {

		const memory = {
			geometries: 0,
			textures: 0
		};

		const render = {
			frame: 0,
			calls: 0,
			triangles: 0,
			points: 0,
			lines: 0
		};

		function update( count, mode, instanceCount ) {

			render.calls ++;

			switch ( mode ) {

				case gl.TRIANGLES:
					render.triangles += instanceCount * ( count / 3 );
					break;

				case gl.LINES:
					render.lines += instanceCount * ( count / 2 );
					break;

				case gl.LINE_STRIP:
					render.lines += instanceCount * ( count - 1 );
					break;

				case gl.LINE_LOOP:
					render.lines += instanceCount * count;
					break;

				case gl.POINTS:
					render.points += instanceCount * count;
					break;

				default:
					console.error( 'THREE.WebGLInfo: Unknown draw mode:', mode );
					break;

			}

		}

		function reset() {

			render.calls = 0;
			render.triangles = 0;
			render.points = 0;
			render.lines = 0;

		}

		return {
			memory: memory,
			render: render,
			programs: null,
			autoReset: true,
			reset: reset,
			update: update
		};

	}

	function numericalSort( a, b ) {

		return a[ 0 ] - b[ 0 ];

	}

	function absNumericalSort( a, b ) {

		return Math.abs( b[ 1 ] ) - Math.abs( a[ 1 ] );

	}

	function WebGLMorphtargets( gl, capabilities, textures ) {

		const influencesList = {};
		const morphInfluences = new Float32Array( 8 );
		const morphTextures = new WeakMap();
		const morph = new three_1.Vector4();

		const workInfluences = [];

		for ( let i = 0; i < 8; i ++ ) {

			workInfluences[ i ] = [ i, 0 ];

		}

		function update( object, geometry, program ) {

			const objectInfluences = object.morphTargetInfluences;

			if ( capabilities.isWebGL2 === true ) {

				// instead of using attributes, the WebGL 2 code path encodes morph targets
				// into an array of data textures. Each layer represents a single morph target.

				const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
				const morphTargetsCount = ( morphAttribute !== undefined ) ? morphAttribute.length : 0;

				let entry = morphTextures.get( geometry );

				if ( entry === undefined || entry.count !== morphTargetsCount ) {

					if ( entry !== undefined ) entry.texture.dispose();

					const hasMorphPosition = geometry.morphAttributes.position !== undefined;
					const hasMorphNormals = geometry.morphAttributes.normal !== undefined;
					const hasMorphColors = geometry.morphAttributes.color !== undefined;

					const morphTargets = geometry.morphAttributes.position || [];
					const morphNormals = geometry.morphAttributes.normal || [];
					const morphColors = geometry.morphAttributes.color || [];

					let vertexDataCount = 0;

					if ( hasMorphPosition === true ) vertexDataCount = 1;
					if ( hasMorphNormals === true ) vertexDataCount = 2;
					if ( hasMorphColors === true ) vertexDataCount = 3;

					let width = geometry.attributes.position.count * vertexDataCount;
					let height = 1;

					if ( width > capabilities.maxTextureSize ) {

						height = Math.ceil( width / capabilities.maxTextureSize );
						width = capabilities.maxTextureSize;

					}

					const buffer = new Float32Array( width * height * 4 * morphTargetsCount );

					const texture = new three_1.DataArrayTexture( buffer, width, height, morphTargetsCount );
					texture.type = three_1.FloatType;
					texture.needsUpdate = true;

					// fill buffer

					const vertexDataStride = vertexDataCount * 4;

					for ( let i = 0; i < morphTargetsCount; i ++ ) {

						const morphTarget = morphTargets[ i ];
						const morphNormal = morphNormals[ i ];
						const morphColor = morphColors[ i ];

						const offset = width * height * 4 * i;

						for ( let j = 0; j < morphTarget.count; j ++ ) {

							const stride = j * vertexDataStride;

							if ( hasMorphPosition === true ) {

								morph.fromBufferAttribute( morphTarget, j );

								buffer[ offset + stride + 0 ] = morph.x;
								buffer[ offset + stride + 1 ] = morph.y;
								buffer[ offset + stride + 2 ] = morph.z;
								buffer[ offset + stride + 3 ] = 0;

							}

							if ( hasMorphNormals === true ) {

								morph.fromBufferAttribute( morphNormal, j );

								buffer[ offset + stride + 4 ] = morph.x;
								buffer[ offset + stride + 5 ] = morph.y;
								buffer[ offset + stride + 6 ] = morph.z;
								buffer[ offset + stride + 7 ] = 0;

							}

							if ( hasMorphColors === true ) {

								morph.fromBufferAttribute( morphColor, j );

								buffer[ offset + stride + 8 ] = morph.x;
								buffer[ offset + stride + 9 ] = morph.y;
								buffer[ offset + stride + 10 ] = morph.z;
								buffer[ offset + stride + 11 ] = ( morphColor.itemSize === 4 ) ? morph.w : 1;

							}

						}

					}

					entry = {
						count: morphTargetsCount,
						texture: texture,
						size: new three_1.Vector2( width, height )
					};

					morphTextures.set( geometry, entry );

					function disposeTexture() {

						texture.dispose();

						morphTextures.delete( geometry );

						geometry.removeEventListener( 'dispose', disposeTexture );

					}

					geometry.addEventListener( 'dispose', disposeTexture );

				}

				//

				let morphInfluencesSum = 0;

				for ( let i = 0; i < objectInfluences.length; i ++ ) {

					morphInfluencesSum += objectInfluences[ i ];

				}

				const morphBaseInfluence = geometry.morphTargetsRelative ? 1 : 1 - morphInfluencesSum;

				program.getUniforms().setValue( gl, 'morphTargetBaseInfluence', morphBaseInfluence );
				program.getUniforms().setValue( gl, 'morphTargetInfluences', objectInfluences );

				program.getUniforms().setValue( gl, 'morphTargetsTexture', entry.texture, textures );
				program.getUniforms().setValue( gl, 'morphTargetsTextureSize', entry.size );


			} else {

				// When object doesn't have morph target influences defined, we treat it as a 0-length array
				// This is important to make sure we set up morphTargetBaseInfluence / morphTargetInfluences

				const length = objectInfluences === undefined ? 0 : objectInfluences.length;

				let influences = influencesList[ geometry.id ];

				if ( influences === undefined || influences.length !== length ) {

					// initialise list

					influences = [];

					for ( let i = 0; i < length; i ++ ) {

						influences[ i ] = [ i, 0 ];

					}

					influencesList[ geometry.id ] = influences;

				}

				// Collect influences

				for ( let i = 0; i < length; i ++ ) {

					const influence = influences[ i ];

					influence[ 0 ] = i;
					influence[ 1 ] = objectInfluences[ i ];

				}

				influences.sort( absNumericalSort );

				for ( let i = 0; i < 8; i ++ ) {

					if ( i < length && influences[ i ][ 1 ] ) {

						workInfluences[ i ][ 0 ] = influences[ i ][ 0 ];
						workInfluences[ i ][ 1 ] = influences[ i ][ 1 ];

					} else {

						workInfluences[ i ][ 0 ] = Number.MAX_SAFE_INTEGER;
						workInfluences[ i ][ 1 ] = 0;

					}

				}

				workInfluences.sort( numericalSort );

				const morphTargets = geometry.morphAttributes.position;
				const morphNormals = geometry.morphAttributes.normal;

				let morphInfluencesSum = 0;

				for ( let i = 0; i < 8; i ++ ) {

					const influence = workInfluences[ i ];
					const index = influence[ 0 ];
					const value = influence[ 1 ];

					if ( index !== Number.MAX_SAFE_INTEGER && value ) {

						if ( morphTargets && geometry.getAttribute( 'morphTarget' + i ) !== morphTargets[ index ] ) {

							geometry.setAttribute( 'morphTarget' + i, morphTargets[ index ] );

						}

						if ( morphNormals && geometry.getAttribute( 'morphNormal' + i ) !== morphNormals[ index ] ) {

							geometry.setAttribute( 'morphNormal' + i, morphNormals[ index ] );

						}

						morphInfluences[ i ] = value;
						morphInfluencesSum += value;

					} else {

						if ( morphTargets && geometry.hasAttribute( 'morphTarget' + i ) === true ) {

							geometry.deleteAttribute( 'morphTarget' + i );

						}

						if ( morphNormals && geometry.hasAttribute( 'morphNormal' + i ) === true ) {

							geometry.deleteAttribute( 'morphNormal' + i );

						}

						morphInfluences[ i ] = 0;

					}

				}

				// GLSL shader uses formula baseinfluence * base + sum(target * influence)
				// This allows us to switch between absolute morphs and relative morphs without changing shader code
				// When baseinfluence = 1 - sum(influence), the above is equivalent to sum((target - base) * influence)
				const morphBaseInfluence = geometry.morphTargetsRelative ? 1 : 1 - morphInfluencesSum;

				program.getUniforms().setValue( gl, 'morphTargetBaseInfluence', morphBaseInfluence );
				program.getUniforms().setValue( gl, 'morphTargetInfluences', morphInfluences );

			}

		}

		return {

			update: update

		};

	}

	function WebGLObjects( gl, geometries, attributes, info ) {

		let updateMap = new WeakMap();

		function update( object ) {

			const frame = info.render.frame;

			const geometry = object.geometry;
			const buffergeometry = geometries.get( object, geometry );

			// Update once per frame

			if ( updateMap.get( buffergeometry ) !== frame ) {

				geometries.update( buffergeometry );

				updateMap.set( buffergeometry, frame );

			}

			if ( object.isInstancedMesh ) {

				if ( object.hasEventListener( 'dispose', onInstancedMeshDispose ) === false ) {

					object.addEventListener( 'dispose', onInstancedMeshDispose );

				}

				if ( updateMap.get( object ) !== frame ) {

					attributes.update( object.instanceMatrix, gl.ARRAY_BUFFER );

					if ( object.instanceColor !== null ) {

						attributes.update( object.instanceColor, gl.ARRAY_BUFFER );

					}

					updateMap.set( object, frame );

				}

			}

			if ( object.isSkinnedMesh ) {

				const skeleton = object.skeleton;

				if ( updateMap.get( skeleton ) !== frame ) {

					skeleton.update();

					updateMap.set( skeleton, frame );

				}

			}

			return buffergeometry;

		}

		function dispose() {

			updateMap = new WeakMap();

		}

		function onInstancedMeshDispose( event ) {

			const instancedMesh = event.target;

			instancedMesh.removeEventListener( 'dispose', onInstancedMeshDispose );

			attributes.remove( instancedMesh.instanceMatrix );

			if ( instancedMesh.instanceColor !== null ) attributes.remove( instancedMesh.instanceColor );

		}

		return {

			update: update,
			dispose: dispose

		};

	}

	class DepthTexture extends three_1.Texture {

		constructor( width, height, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, format ) {

			format = format !== undefined ? format : three_1.DepthFormat;

			if ( format !== three_1.DepthFormat && format !== three_1.DepthStencilFormat ) {

				throw new Error( 'DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat' );

			}

			if ( type === undefined && format === three_1.DepthFormat ) type = three_1.UnsignedIntType;
			if ( type === undefined && format === three_1.DepthStencilFormat ) type = three_1.UnsignedInt248Type;

			super( null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

			this.isDepthTexture = true;

			this.image = { width: width, height: height };

			this.magFilter = magFilter !== undefined ? magFilter : three_1.NearestFilter;
			this.minFilter = minFilter !== undefined ? minFilter : three_1.NearestFilter;

			this.flipY = false;
			this.generateMipmaps = false;

			this.compareFunction = null;

		}


		copy( source ) {

			super.copy( source );

			this.compareFunction = source.compareFunction;

			return this;

		}

		toJSON( meta ) {

			const data = super.toJSON( meta );

			if ( this.compareFunction !== null ) data.compareFunction = this.compareFunction;

			return data;

		}

	}

	/**
	 * Uniforms of a program.
	 * Those form a tree structure with a special top-level container for the root,
	 * which you get by calling 'new WebGLUniforms( gl, program )'.
	 *
	 *
	 * Properties of inner nodes including the top-level container:
	 *
	 * .seq - array of nested uniforms
	 * .map - nested uniforms by name
	 *
	 *
	 * Methods of all nodes except the top-level container:
	 *
	 * .setValue( gl, value, [textures] )
	 *
	 * 		uploads a uniform value(s)
	 *  	the 'textures' parameter is needed for sampler uniforms
	 *
	 *
	 * Static methods of the top-level container (textures factorizations):
	 *
	 * .upload( gl, seq, values, textures )
	 *
	 * 		sets uniforms in 'seq' to 'values[id].value'
	 *
	 * .seqWithValue( seq, values ) : filteredSeq
	 *
	 * 		filters 'seq' entries with corresponding entry in values
	 *
	 *
	 * Methods of the top-level container (textures factorizations):
	 *
	 * .setValue( gl, name, value, textures )
	 *
	 * 		sets uniform with  name 'name' to 'value'
	 *
	 * .setOptional( gl, obj, prop )
	 *
	 * 		like .set for an optional property of the object
	 *
	 */


	const emptyTexture = /*@__PURE__*/ new three_1.Texture();

	const emptyShadowTexture = /*@__PURE__*/ new DepthTexture( 1, 1 );
	emptyShadowTexture.compareFunction = three_1.LessEqualCompare;

	const emptyArrayTexture = /*@__PURE__*/ new three_1.DataArrayTexture();
	const empty3dTexture = /*@__PURE__*/ new three_1.Data3DTexture();
	const emptyCubeTexture = /*@__PURE__*/ new three_2.CubeTexture();

	// --- Utilities ---

	// Array Caches (provide typed arrays for temporary by size)

	const arrayCacheF32 = [];
	const arrayCacheI32 = [];

	// Float32Array caches used for uploading Matrix uniforms

	const mat4array = new Float32Array( 16 );
	const mat3array = new Float32Array( 9 );
	const mat2array = new Float32Array( 4 );

	// Flattening for arrays of vectors and matrices

	function flatten( array, nBlocks, blockSize ) {

		const firstElem = array[ 0 ];

		if ( firstElem <= 0 || firstElem > 0 ) return array;
		// unoptimized: ! isNaN( firstElem )
		// see http://jacksondunstan.com/articles/983

		const n = nBlocks * blockSize;
		let r = arrayCacheF32[ n ];

		if ( r === undefined ) {

			r = new Float32Array( n );
			arrayCacheF32[ n ] = r;

		}

		if ( nBlocks !== 0 ) {

			firstElem.toArray( r, 0 );

			for ( let i = 1, offset = 0; i !== nBlocks; ++ i ) {

				offset += blockSize;
				array[ i ].toArray( r, offset );

			}

		}

		return r;

	}

	function arraysEqual( a, b ) {

		if ( a.length !== b.length ) return false;

		for ( let i = 0, l = a.length; i < l; i ++ ) {

			if ( a[ i ] !== b[ i ] ) return false;

		}

		return true;

	}

	function copyArray( a, b ) {

		for ( let i = 0, l = b.length; i < l; i ++ ) {

			a[ i ] = b[ i ];

		}

	}

	// Texture unit allocation

	function allocTexUnits( textures, n ) {

		let r = arrayCacheI32[ n ];

		if ( r === undefined ) {

			r = new Int32Array( n );
			arrayCacheI32[ n ] = r;

		}

		for ( let i = 0; i !== n; ++ i ) {

			r[ i ] = textures.allocateTextureUnit();

		}

		return r;

	}

	// --- Setters ---

	// Note: Defining these methods externally, because they come in a bunch
	// and this way their names minify.

	// Single scalar

	function setValueV1f( gl, v ) {

		const cache = this.cache;

		if ( cache[ 0 ] === v ) return;

		gl.uniform1f( this.addr, v );

		cache[ 0 ] = v;

	}

	// Single float vector (from flat array or THREE.VectorN)

	function setValueV2f( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y ) {

				gl.uniform2f( this.addr, v.x, v.y );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform2fv( this.addr, v );

			copyArray( cache, v );

		}

	}

	function setValueV3f( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z ) {

				gl.uniform3f( this.addr, v.x, v.y, v.z );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;
				cache[ 2 ] = v.z;

			}

		} else if ( v.r !== undefined ) {

			if ( cache[ 0 ] !== v.r || cache[ 1 ] !== v.g || cache[ 2 ] !== v.b ) {

				gl.uniform3f( this.addr, v.r, v.g, v.b );

				cache[ 0 ] = v.r;
				cache[ 1 ] = v.g;
				cache[ 2 ] = v.b;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform3fv( this.addr, v );

			copyArray( cache, v );

		}

	}

	function setValueV4f( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z || cache[ 3 ] !== v.w ) {

				gl.uniform4f( this.addr, v.x, v.y, v.z, v.w );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;
				cache[ 2 ] = v.z;
				cache[ 3 ] = v.w;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform4fv( this.addr, v );

			copyArray( cache, v );

		}

	}

	// Single matrix (from flat array or THREE.MatrixN)

	function setValueM2( gl, v ) {

		const cache = this.cache;
		const elements = v.elements;

		if ( elements === undefined ) {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniformMatrix2fv( this.addr, false, v );

			copyArray( cache, v );

		} else {

			if ( arraysEqual( cache, elements ) ) return;

			mat2array.set( elements );

			gl.uniformMatrix2fv( this.addr, false, mat2array );

			copyArray( cache, elements );

		}

	}

	function setValueM3( gl, v ) {

		const cache = this.cache;
		const elements = v.elements;

		if ( elements === undefined ) {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniformMatrix3fv( this.addr, false, v );

			copyArray( cache, v );

		} else {

			if ( arraysEqual( cache, elements ) ) return;

			mat3array.set( elements );

			gl.uniformMatrix3fv( this.addr, false, mat3array );

			copyArray( cache, elements );

		}

	}

	function setValueM4( gl, v ) {

		const cache = this.cache;
		const elements = v.elements;

		if ( elements === undefined ) {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniformMatrix4fv( this.addr, false, v );

			copyArray( cache, v );

		} else {

			if ( arraysEqual( cache, elements ) ) return;

			mat4array.set( elements );

			gl.uniformMatrix4fv( this.addr, false, mat4array );

			copyArray( cache, elements );

		}

	}

	// Single integer / boolean

	function setValueV1i( gl, v ) {

		const cache = this.cache;

		if ( cache[ 0 ] === v ) return;

		gl.uniform1i( this.addr, v );

		cache[ 0 ] = v;

	}

	// Single integer / boolean vector (from flat array or THREE.VectorN)

	function setValueV2i( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y ) {

				gl.uniform2i( this.addr, v.x, v.y );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform2iv( this.addr, v );

			copyArray( cache, v );

		}

	}

	function setValueV3i( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z ) {

				gl.uniform3i( this.addr, v.x, v.y, v.z );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;
				cache[ 2 ] = v.z;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform3iv( this.addr, v );

			copyArray( cache, v );

		}

	}

	function setValueV4i( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z || cache[ 3 ] !== v.w ) {

				gl.uniform4i( this.addr, v.x, v.y, v.z, v.w );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;
				cache[ 2 ] = v.z;
				cache[ 3 ] = v.w;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform4iv( this.addr, v );

			copyArray( cache, v );

		}

	}

	// Single unsigned integer

	function setValueV1ui( gl, v ) {

		const cache = this.cache;

		if ( cache[ 0 ] === v ) return;

		gl.uniform1ui( this.addr, v );

		cache[ 0 ] = v;

	}

	// Single unsigned integer vector (from flat array or THREE.VectorN)

	function setValueV2ui( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y ) {

				gl.uniform2ui( this.addr, v.x, v.y );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform2uiv( this.addr, v );

			copyArray( cache, v );

		}

	}

	function setValueV3ui( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z ) {

				gl.uniform3ui( this.addr, v.x, v.y, v.z );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;
				cache[ 2 ] = v.z;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform3uiv( this.addr, v );

			copyArray( cache, v );

		}

	}

	function setValueV4ui( gl, v ) {

		const cache = this.cache;

		if ( v.x !== undefined ) {

			if ( cache[ 0 ] !== v.x || cache[ 1 ] !== v.y || cache[ 2 ] !== v.z || cache[ 3 ] !== v.w ) {

				gl.uniform4ui( this.addr, v.x, v.y, v.z, v.w );

				cache[ 0 ] = v.x;
				cache[ 1 ] = v.y;
				cache[ 2 ] = v.z;
				cache[ 3 ] = v.w;

			}

		} else {

			if ( arraysEqual( cache, v ) ) return;

			gl.uniform4uiv( this.addr, v );

			copyArray( cache, v );

		}

	}


	// Single texture (2D / Cube)

	function setValueT1( gl, v, textures ) {

		const cache = this.cache;
		const unit = textures.allocateTextureUnit();

		if ( cache[ 0 ] !== unit ) {

			gl.uniform1i( this.addr, unit );
			cache[ 0 ] = unit;

		}

		const emptyTexture2D = ( this.type === gl.SAMPLER_2D_SHADOW ) ? emptyShadowTexture : emptyTexture;

		textures.setTexture2D( v || emptyTexture2D, unit );

	}

	function setValueT3D1( gl, v, textures ) {

		const cache = this.cache;
		const unit = textures.allocateTextureUnit();

		if ( cache[ 0 ] !== unit ) {

			gl.uniform1i( this.addr, unit );
			cache[ 0 ] = unit;

		}

		textures.setTexture3D( v || empty3dTexture, unit );

	}

	function setValueT6( gl, v, textures ) {

		const cache = this.cache;
		const unit = textures.allocateTextureUnit();

		if ( cache[ 0 ] !== unit ) {

			gl.uniform1i( this.addr, unit );
			cache[ 0 ] = unit;

		}

		textures.setTextureCube( v || emptyCubeTexture, unit );

	}

	function setValueT2DArray1( gl, v, textures ) {

		const cache = this.cache;
		const unit = textures.allocateTextureUnit();

		if ( cache[ 0 ] !== unit ) {

			gl.uniform1i( this.addr, unit );
			cache[ 0 ] = unit;

		}

		textures.setTexture2DArray( v || emptyArrayTexture, unit );

	}

	// Helper to pick the right setter for the singular case

	function getSingularSetter( type ) {

		switch ( type ) {

			case 0x1406: return setValueV1f; // FLOAT
			case 0x8b50: return setValueV2f; // _VEC2
			case 0x8b51: return setValueV3f; // _VEC3
			case 0x8b52: return setValueV4f; // _VEC4

			case 0x8b5a: return setValueM2; // _MAT2
			case 0x8b5b: return setValueM3; // _MAT3
			case 0x8b5c: return setValueM4; // _MAT4

			case 0x1404: case 0x8b56: return setValueV1i; // INT, BOOL
			case 0x8b53: case 0x8b57: return setValueV2i; // _VEC2
			case 0x8b54: case 0x8b58: return setValueV3i; // _VEC3
			case 0x8b55: case 0x8b59: return setValueV4i; // _VEC4

			case 0x1405: return setValueV1ui; // UINT
			case 0x8dc6: return setValueV2ui; // _VEC2
			case 0x8dc7: return setValueV3ui; // _VEC3
			case 0x8dc8: return setValueV4ui; // _VEC4

			case 0x8b5e: // SAMPLER_2D
			case 0x8d66: // SAMPLER_EXTERNAL_OES
			case 0x8dca: // INT_SAMPLER_2D
			case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
			case 0x8b62: // SAMPLER_2D_SHADOW
				return setValueT1;

			case 0x8b5f: // SAMPLER_3D
			case 0x8dcb: // INT_SAMPLER_3D
			case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
				return setValueT3D1;

			case 0x8b60: // SAMPLER_CUBE
			case 0x8dcc: // INT_SAMPLER_CUBE
			case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
			case 0x8dc5: // SAMPLER_CUBE_SHADOW
				return setValueT6;

			case 0x8dc1: // SAMPLER_2D_ARRAY
			case 0x8dcf: // INT_SAMPLER_2D_ARRAY
			case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
			case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
				return setValueT2DArray1;

		}

	}


	// Array of scalars

	function setValueV1fArray( gl, v ) {

		gl.uniform1fv( this.addr, v );

	}

	// Array of vectors (from flat array or array of THREE.VectorN)

	function setValueV2fArray( gl, v ) {

		const data = flatten( v, this.size, 2 );

		gl.uniform2fv( this.addr, data );

	}

	function setValueV3fArray( gl, v ) {

		const data = flatten( v, this.size, 3 );

		gl.uniform3fv( this.addr, data );

	}

	function setValueV4fArray( gl, v ) {

		const data = flatten( v, this.size, 4 );

		gl.uniform4fv( this.addr, data );

	}

	// Array of matrices (from flat array or array of THREE.MatrixN)

	function setValueM2Array( gl, v ) {

		const data = flatten( v, this.size, 4 );

		gl.uniformMatrix2fv( this.addr, false, data );

	}

	function setValueM3Array( gl, v ) {

		const data = flatten( v, this.size, 9 );

		gl.uniformMatrix3fv( this.addr, false, data );

	}

	function setValueM4Array( gl, v ) {

		const data = flatten( v, this.size, 16 );

		gl.uniformMatrix4fv( this.addr, false, data );

	}

	// Array of integer / boolean

	function setValueV1iArray( gl, v ) {

		gl.uniform1iv( this.addr, v );

	}

	// Array of integer / boolean vectors (from flat array)

	function setValueV2iArray( gl, v ) {

		gl.uniform2iv( this.addr, v );

	}

	function setValueV3iArray( gl, v ) {

		gl.uniform3iv( this.addr, v );

	}

	function setValueV4iArray( gl, v ) {

		gl.uniform4iv( this.addr, v );

	}

	// Array of unsigned integer

	function setValueV1uiArray( gl, v ) {

		gl.uniform1uiv( this.addr, v );

	}

	// Array of unsigned integer vectors (from flat array)

	function setValueV2uiArray( gl, v ) {

		gl.uniform2uiv( this.addr, v );

	}

	function setValueV3uiArray( gl, v ) {

		gl.uniform3uiv( this.addr, v );

	}

	function setValueV4uiArray( gl, v ) {

		gl.uniform4uiv( this.addr, v );

	}


	// Array of textures (2D / 3D / Cube / 2DArray)

	function setValueT1Array( gl, v, textures ) {

		const cache = this.cache;

		const n = v.length;

		const units = allocTexUnits( textures, n );

		if ( ! arraysEqual( cache, units ) ) {

			gl.uniform1iv( this.addr, units );

			copyArray( cache, units );

		}

		for ( let i = 0; i !== n; ++ i ) {

			textures.setTexture2D( v[ i ] || emptyTexture, units[ i ] );

		}

	}

	function setValueT3DArray( gl, v, textures ) {

		const cache = this.cache;

		const n = v.length;

		const units = allocTexUnits( textures, n );

		if ( ! arraysEqual( cache, units ) ) {

			gl.uniform1iv( this.addr, units );

			copyArray( cache, units );

		}

		for ( let i = 0; i !== n; ++ i ) {

			textures.setTexture3D( v[ i ] || empty3dTexture, units[ i ] );

		}

	}

	function setValueT6Array( gl, v, textures ) {

		const cache = this.cache;

		const n = v.length;

		const units = allocTexUnits( textures, n );

		if ( ! arraysEqual( cache, units ) ) {

			gl.uniform1iv( this.addr, units );

			copyArray( cache, units );

		}

		for ( let i = 0; i !== n; ++ i ) {

			textures.setTextureCube( v[ i ] || emptyCubeTexture, units[ i ] );

		}

	}

	function setValueT2DArrayArray( gl, v, textures ) {

		const cache = this.cache;

		const n = v.length;

		const units = allocTexUnits( textures, n );

		if ( ! arraysEqual( cache, units ) ) {

			gl.uniform1iv( this.addr, units );

			copyArray( cache, units );

		}

		for ( let i = 0; i !== n; ++ i ) {

			textures.setTexture2DArray( v[ i ] || emptyArrayTexture, units[ i ] );

		}

	}


	// Helper to pick the right setter for a pure (bottom-level) array

	function getPureArraySetter( type ) {

		switch ( type ) {

			case 0x1406: return setValueV1fArray; // FLOAT
			case 0x8b50: return setValueV2fArray; // _VEC2
			case 0x8b51: return setValueV3fArray; // _VEC3
			case 0x8b52: return setValueV4fArray; // _VEC4

			case 0x8b5a: return setValueM2Array; // _MAT2
			case 0x8b5b: return setValueM3Array; // _MAT3
			case 0x8b5c: return setValueM4Array; // _MAT4

			case 0x1404: case 0x8b56: return setValueV1iArray; // INT, BOOL
			case 0x8b53: case 0x8b57: return setValueV2iArray; // _VEC2
			case 0x8b54: case 0x8b58: return setValueV3iArray; // _VEC3
			case 0x8b55: case 0x8b59: return setValueV4iArray; // _VEC4

			case 0x1405: return setValueV1uiArray; // UINT
			case 0x8dc6: return setValueV2uiArray; // _VEC2
			case 0x8dc7: return setValueV3uiArray; // _VEC3
			case 0x8dc8: return setValueV4uiArray; // _VEC4

			case 0x8b5e: // SAMPLER_2D
			case 0x8d66: // SAMPLER_EXTERNAL_OES
			case 0x8dca: // INT_SAMPLER_2D
			case 0x8dd2: // UNSIGNED_INT_SAMPLER_2D
			case 0x8b62: // SAMPLER_2D_SHADOW
				return setValueT1Array;

			case 0x8b5f: // SAMPLER_3D
			case 0x8dcb: // INT_SAMPLER_3D
			case 0x8dd3: // UNSIGNED_INT_SAMPLER_3D
				return setValueT3DArray;

			case 0x8b60: // SAMPLER_CUBE
			case 0x8dcc: // INT_SAMPLER_CUBE
			case 0x8dd4: // UNSIGNED_INT_SAMPLER_CUBE
			case 0x8dc5: // SAMPLER_CUBE_SHADOW
				return setValueT6Array;

			case 0x8dc1: // SAMPLER_2D_ARRAY
			case 0x8dcf: // INT_SAMPLER_2D_ARRAY
			case 0x8dd7: // UNSIGNED_INT_SAMPLER_2D_ARRAY
			case 0x8dc4: // SAMPLER_2D_ARRAY_SHADOW
				return setValueT2DArrayArray;

		}

	}

	// --- Uniform Classes ---

	class SingleUniform {

		constructor( id, activeInfo, addr ) {

			this.id = id;
			this.addr = addr;
			this.cache = [];
			this.type = activeInfo.type;
			this.setValue = getSingularSetter( activeInfo.type );

			// this.path = activeInfo.name; // DEBUG

		}

	}

	class PureArrayUniform {

		constructor( id, activeInfo, addr ) {

			this.id = id;
			this.addr = addr;
			this.cache = [];
			this.type = activeInfo.type;
			this.size = activeInfo.size;
			this.setValue = getPureArraySetter( activeInfo.type );

			// this.path = activeInfo.name; // DEBUG

		}

	}

	class StructuredUniform {

		constructor( id ) {

			this.id = id;

			this.seq = [];
			this.map = {};

		}

		setValue( gl, value, textures ) {

			const seq = this.seq;

			for ( let i = 0, n = seq.length; i !== n; ++ i ) {

				const u = seq[ i ];
				u.setValue( gl, value[ u.id ], textures );

			}

		}

	}

	// --- Top-level ---

	// Parser - builds up the property tree from the path strings

	const RePathPart = /(\w+)(\])?(\[|\.)?/g;

	// extracts
	// 	- the identifier (member name or array index)
	//  - followed by an optional right bracket (found when array index)
	//  - followed by an optional left bracket or dot (type of subscript)
	//
	// Note: These portions can be read in a non-overlapping fashion and
	// allow straightforward parsing of the hierarchy that WebGL encodes
	// in the uniform names.

	function addUniform( container, uniformObject ) {

		container.seq.push( uniformObject );
		container.map[ uniformObject.id ] = uniformObject;

	}

	function parseUniform( activeInfo, addr, container ) {

		const path = activeInfo.name,
			pathLength = path.length;

		// reset RegExp object, because of the early exit of a previous run
		RePathPart.lastIndex = 0;

		while ( true ) {

			const match = RePathPart.exec( path ),
				matchEnd = RePathPart.lastIndex;

			let id = match[ 1 ];
			const idIsIndex = match[ 2 ] === ']',
				subscript = match[ 3 ];

			if ( idIsIndex ) id = id | 0; // convert to integer

			if ( subscript === undefined || subscript === '[' && matchEnd + 2 === pathLength ) {

				// bare name or "pure" bottom-level array "[0]" suffix

				addUniform( container, subscript === undefined ?
					new SingleUniform( id, activeInfo, addr ) :
					new PureArrayUniform( id, activeInfo, addr ) );

				break;

			} else {

				// step into inner node / create it in case it doesn't exist

				const map = container.map;
				let next = map[ id ];

				if ( next === undefined ) {

					next = new StructuredUniform( id );
					addUniform( container, next );

				}

				container = next;

			}

		}

	}

	// Root Container

	class WebGLUniforms {

		constructor( gl, program ) {

			this.seq = [];
			this.map = {};

			const n = gl.getProgramParameter( program, gl.ACTIVE_UNIFORMS );

			for ( let i = 0; i < n; ++ i ) {

				const info = gl.getActiveUniform( program, i ),
					addr = gl.getUniformLocation( program, info.name );

				parseUniform( info, addr, this );

			}

		}

		setValue( gl, name, value, textures ) {

			const u = this.map[ name ];

			if ( u !== undefined ) u.setValue( gl, value, textures );

		}

		setOptional( gl, object, name ) {

			const v = object[ name ];

			if ( v !== undefined ) this.setValue( gl, name, v );

		}

		static upload( gl, seq, values, textures ) {

			for ( let i = 0, n = seq.length; i !== n; ++ i ) {

				const u = seq[ i ],
					v = values[ u.id ];

				if ( v.needsUpdate !== false ) {

					// note: always updating when .needsUpdate is undefined
					u.setValue( gl, v.value, textures );

				}

			}

		}

		static seqWithValue( seq, values ) {

			const r = [];

			for ( let i = 0, n = seq.length; i !== n; ++ i ) {

				const u = seq[ i ];
				if ( u.id in values ) r.push( u );

			}

			return r;

		}

	}

	function WebGLShader( gl, type, string ) {

		const shader = gl.createShader( type );

		gl.shaderSource( shader, string );
		gl.compileShader( shader );

		return shader;

	}

	// From https://www.khronos.org/registry/webgl/extensions/KHR_parallel_shader_compile/
	const COMPLETION_STATUS_KHR = 0x91B1;

	let programIdCount = 0;

	function handleSource( string, errorLine ) {

		const lines = string.split( '\n' );
		const lines2 = [];

		const from = Math.max( errorLine - 6, 0 );
		const to = Math.min( errorLine + 6, lines.length );

		for ( let i = from; i < to; i ++ ) {

			const line = i + 1;
			lines2.push( `${line === errorLine ? '>' : ' '} ${line}: ${lines[ i ]}` );

		}

		return lines2.join( '\n' );

	}

	function getEncodingComponents( colorSpace ) {

		const workingPrimaries = three_1.ColorManagement.getPrimaries( three_1.ColorManagement.workingColorSpace );
		const encodingPrimaries = three_1.ColorManagement.getPrimaries( colorSpace );

		let gamutMapping;

		if ( workingPrimaries === encodingPrimaries ) {

			gamutMapping = '';

		} else if ( workingPrimaries === three_1.P3Primaries && encodingPrimaries === three_1.Rec709Primaries ) {

			gamutMapping = 'LinearDisplayP3ToLinearSRGB';

		} else if ( workingPrimaries === three_1.Rec709Primaries && encodingPrimaries === three_1.P3Primaries ) {

			gamutMapping = 'LinearSRGBToLinearDisplayP3';

		}

		switch ( colorSpace ) {

			case three_1.LinearSRGBColorSpace:
			case three_1.LinearDisplayP3ColorSpace:
				return [ gamutMapping, 'LinearTransferOETF' ];

			case three_1.SRGBColorSpace:
			case three_1.DisplayP3ColorSpace:
				return [ gamutMapping, 'sRGBTransferOETF' ];

			default:
				console.warn( 'THREE.WebGLProgram: Unsupported color space:', colorSpace );
				return [ gamutMapping, 'LinearTransferOETF' ];

		}

	}

	function getShaderErrors( gl, shader, type ) {

		const status = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
		const errors = gl.getShaderInfoLog( shader ).trim();

		if ( status && errors === '' ) return '';

		const errorMatches = /ERROR: 0:(\d+)/.exec( errors );
		if ( errorMatches ) {

			// --enable-privileged-webgl-extension
			// console.log( '**' + type + '**', gl.getExtension( 'WEBGL_debug_shaders' ).getTranslatedShaderSource( shader ) );

			const errorLine = parseInt( errorMatches[ 1 ] );
			return type.toUpperCase() + '\n\n' + errors + '\n\n' + handleSource( gl.getShaderSource( shader ), errorLine );

		} else {

			return errors;

		}

	}

	function getTexelEncodingFunction( functionName, colorSpace ) {

		const components = getEncodingComponents( colorSpace );
		return `vec4 ${functionName}( vec4 value ) { return ${components[ 0 ]}( ${components[ 1 ]}( value ) ); }`;

	}

	function getToneMappingFunction( functionName, toneMapping ) {

		let toneMappingName;

		switch ( toneMapping ) {

			case three_1.LinearToneMapping:
				toneMappingName = 'Linear';
				break;

			case three_1.ReinhardToneMapping:
				toneMappingName = 'Reinhard';
				break;

			case three_1.CineonToneMapping:
				toneMappingName = 'OptimizedCineon';
				break;

			case three_1.ACESFilmicToneMapping:
				toneMappingName = 'ACESFilmic';
				break;

			case three_1.AgXToneMapping:
				toneMappingName = 'AgX';
				break;

			case three_1.CustomToneMapping:
				toneMappingName = 'Custom';
				break;

			default:
				console.warn( 'THREE.WebGLProgram: Unsupported toneMapping:', toneMapping );
				toneMappingName = 'Linear';

		}

		return 'vec3 ' + functionName + '( vec3 color ) { return ' + toneMappingName + 'ToneMapping( color ); }';

	}

	function generateExtensions( parameters ) {

		const chunks = [
			( parameters.extensionDerivatives || !! parameters.envMapCubeUVHeight || parameters.bumpMap || parameters.normalMapTangentSpace || parameters.clearcoatNormalMap || parameters.flatShading || parameters.shaderID === 'physical' ) ? '#extension GL_OES_standard_derivatives : enable' : '',
			( parameters.extensionFragDepth || parameters.logarithmicDepthBuffer ) && parameters.rendererExtensionFragDepth ? '#extension GL_EXT_frag_depth : enable' : '',
			( parameters.extensionDrawBuffers && parameters.rendererExtensionDrawBuffers ) ? '#extension GL_EXT_draw_buffers : require' : '',
			( parameters.extensionShaderTextureLOD || parameters.envMap || parameters.transmission ) && parameters.rendererExtensionShaderTextureLod ? '#extension GL_EXT_shader_texture_lod : enable' : ''
		];

		return chunks.filter( filterEmptyLine ).join( '\n' );

	}

	function generateVertexExtensions( parameters ) {

		const chunks = [
			parameters.extensionClipCullDistance ? '#extension GL_ANGLE_clip_cull_distance : require' : ''
		];

		return chunks.filter( filterEmptyLine ).join( '\n' );

	}

	function generateDefines( defines ) {

		const chunks = [];

		for ( const name in defines ) {

			const value = defines[ name ];

			if ( value === false ) continue;

			chunks.push( '#define ' + name + ' ' + value );

		}

		return chunks.join( '\n' );

	}

	function fetchAttributeLocations( gl, program ) {

		const attributes = {};

		const n = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES );

		for ( let i = 0; i < n; i ++ ) {

			const info = gl.getActiveAttrib( program, i );
			const name = info.name;

			let locationSize = 1;
			if ( info.type === gl.FLOAT_MAT2 ) locationSize = 2;
			if ( info.type === gl.FLOAT_MAT3 ) locationSize = 3;
			if ( info.type === gl.FLOAT_MAT4 ) locationSize = 4;

			// console.log( 'THREE.WebGLProgram: ACTIVE VERTEX ATTRIBUTE:', name, i );

			attributes[ name ] = {
				type: info.type,
				location: gl.getAttribLocation( program, name ),
				locationSize: locationSize
			};

		}

		return attributes;

	}

	function filterEmptyLine( string ) {

		return string !== '';

	}

	function replaceLightNums( string, parameters ) {

		const numSpotLightCoords = parameters.numSpotLightShadows + parameters.numSpotLightMaps - parameters.numSpotLightShadowsWithMaps;

		return string
			.replace( /NUM_DIR_LIGHTS/g, parameters.numDirLights )
			.replace( /NUM_SPOT_LIGHTS/g, parameters.numSpotLights )
			.replace( /NUM_SPOT_LIGHT_MAPS/g, parameters.numSpotLightMaps )
			.replace( /NUM_SPOT_LIGHT_COORDS/g, numSpotLightCoords )
			.replace( /NUM_RECT_AREA_LIGHTS/g, parameters.numRectAreaLights )
			.replace( /NUM_POINT_LIGHTS/g, parameters.numPointLights )
			.replace( /NUM_HEMI_LIGHTS/g, parameters.numHemiLights )
			.replace( /NUM_DIR_LIGHT_SHADOWS/g, parameters.numDirLightShadows )
			.replace( /NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, parameters.numSpotLightShadowsWithMaps )
			.replace( /NUM_SPOT_LIGHT_SHADOWS/g, parameters.numSpotLightShadows )
			.replace( /NUM_POINT_LIGHT_SHADOWS/g, parameters.numPointLightShadows );

	}

	function replaceClippingPlaneNums( string, parameters ) {

		return string
			.replace( /NUM_CLIPPING_PLANES/g, parameters.numClippingPlanes )
			.replace( /UNION_CLIPPING_PLANES/g, ( parameters.numClippingPlanes - parameters.numClipIntersection ) );

	}

	// Resolve Includes

	const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

	function resolveIncludes( string ) {

		return string.replace( includePattern, includeReplacer );

	}

	const shaderChunkMap = new Map( [
		[ 'encodings_fragment', 'colorspace_fragment' ], // @deprecated, r154
		[ 'encodings_pars_fragment', 'colorspace_pars_fragment' ], // @deprecated, r154
		[ 'output_fragment', 'opaque_fragment' ], // @deprecated, r154
	] );

	function includeReplacer( match, include ) {

		let string = ShaderChunk[ include ];

		if ( string === undefined ) {

			const newInclude = shaderChunkMap.get( include );

			if ( newInclude !== undefined ) {

				string = ShaderChunk[ newInclude ];
				console.warn( 'THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.', include, newInclude );

			} else {

				throw new Error( 'Can not resolve #include <' + include + '>' );

			}

		}

		return resolveIncludes( string );

	}

	// Unroll Loops

	const unrollLoopPattern = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;

	function unrollLoops( string ) {

		return string.replace( unrollLoopPattern, loopReplacer );

	}

	function loopReplacer( match, start, end, snippet ) {

		let string = '';

		for ( let i = parseInt( start ); i < parseInt( end ); i ++ ) {

			string += snippet
				.replace( /\[\s*i\s*\]/g, '[ ' + i + ' ]' )
				.replace( /UNROLLED_LOOP_INDEX/g, i );

		}

		return string;

	}

	//

	function generatePrecision( parameters ) {

		let precisionstring = 'precision ' + parameters.precision + ' float;\nprecision ' + parameters.precision + ' int;';

		if ( parameters.precision === 'highp' ) {

			precisionstring += '\n#define HIGH_PRECISION';

		} else if ( parameters.precision === 'mediump' ) {

			precisionstring += '\n#define MEDIUM_PRECISION';

		} else if ( parameters.precision === 'lowp' ) {

			precisionstring += '\n#define LOW_PRECISION';

		}

		return precisionstring;

	}

	function generateShadowMapTypeDefine( parameters ) {

		let shadowMapTypeDefine = 'SHADOWMAP_TYPE_BASIC';

		if ( parameters.shadowMapType === three_1.PCFShadowMap ) {

			shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF';

		} else if ( parameters.shadowMapType === three_1.PCFSoftShadowMap ) {

			shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF_SOFT';

		} else if ( parameters.shadowMapType === three_1.VSMShadowMap ) {

			shadowMapTypeDefine = 'SHADOWMAP_TYPE_VSM';

		}

		return shadowMapTypeDefine;

	}

	function generateEnvMapTypeDefine( parameters ) {

		let envMapTypeDefine = 'ENVMAP_TYPE_CUBE';

		if ( parameters.envMap ) {

			switch ( parameters.envMapMode ) {

				case three_1.CubeReflectionMapping:
				case three_1.CubeRefractionMapping:
					envMapTypeDefine = 'ENVMAP_TYPE_CUBE';
					break;

				case three_1.CubeUVReflectionMapping:
					envMapTypeDefine = 'ENVMAP_TYPE_CUBE_UV';
					break;

			}

		}

		return envMapTypeDefine;

	}

	function generateEnvMapModeDefine( parameters ) {

		let envMapModeDefine = 'ENVMAP_MODE_REFLECTION';

		if ( parameters.envMap ) {

			switch ( parameters.envMapMode ) {

				case three_1.CubeRefractionMapping:

					envMapModeDefine = 'ENVMAP_MODE_REFRACTION';
					break;

			}

		}

		return envMapModeDefine;

	}

	function generateEnvMapBlendingDefine( parameters ) {

		let envMapBlendingDefine = 'ENVMAP_BLENDING_NONE';

		if ( parameters.envMap ) {

			switch ( parameters.combine ) {

				case three_1.MultiplyOperation:
					envMapBlendingDefine = 'ENVMAP_BLENDING_MULTIPLY';
					break;

				case three_1.MixOperation:
					envMapBlendingDefine = 'ENVMAP_BLENDING_MIX';
					break;

				case three_1.AddOperation:
					envMapBlendingDefine = 'ENVMAP_BLENDING_ADD';
					break;

			}

		}

		return envMapBlendingDefine;

	}

	function generateCubeUVSize( parameters ) {

		const imageHeight = parameters.envMapCubeUVHeight;

		if ( imageHeight === null ) return null;

		const maxMip = Math.log2( imageHeight ) - 2;

		const texelHeight = 1.0 / imageHeight;

		const texelWidth = 1.0 / ( 3 * Math.max( Math.pow( 2, maxMip ), 7 * 16 ) );

		return { texelWidth, texelHeight, maxMip };

	}

	function WebGLProgram( renderer, cacheKey, parameters, bindingStates ) {

		// TODO Send this event to Three.js DevTools
		// console.log( 'WebGLProgram', cacheKey );

		const gl = renderer.getContext();

		const defines = parameters.defines;

		let vertexShader = parameters.vertexShader;
		let fragmentShader = parameters.fragmentShader;

		const shadowMapTypeDefine = generateShadowMapTypeDefine( parameters );
		const envMapTypeDefine = generateEnvMapTypeDefine( parameters );
		const envMapModeDefine = generateEnvMapModeDefine( parameters );
		const envMapBlendingDefine = generateEnvMapBlendingDefine( parameters );
		const envMapCubeUVSize = generateCubeUVSize( parameters );

		const customExtensions = parameters.isWebGL2 ? '' : generateExtensions( parameters );

		const customVertexExtensions = generateVertexExtensions( parameters );

		const customDefines = generateDefines( defines );

		const program = gl.createProgram();

		let prefixVertex, prefixFragment;
		let versionString = parameters.glslVersion ? '#version ' + parameters.glslVersion + '\n' : '';

		if ( parameters.isRawShaderMaterial ) {

			prefixVertex = [

				'#define SHADER_TYPE ' + parameters.shaderType,
				'#define SHADER_NAME ' + parameters.shaderName,

				customDefines

			].filter( filterEmptyLine ).join( '\n' );

			if ( prefixVertex.length > 0 ) {

				prefixVertex += '\n';

			}

			prefixFragment = [

				customExtensions,

				'#define SHADER_TYPE ' + parameters.shaderType,
				'#define SHADER_NAME ' + parameters.shaderName,

				customDefines

			].filter( filterEmptyLine ).join( '\n' );

			if ( prefixFragment.length > 0 ) {

				prefixFragment += '\n';

			}

		} else {

			prefixVertex = [

				generatePrecision( parameters ),

				'#define SHADER_TYPE ' + parameters.shaderType,
				'#define SHADER_NAME ' + parameters.shaderName,

				customDefines,

				parameters.extensionClipCullDistance ? '#define USE_CLIP_DISTANCE' : '',
				parameters.batching ? '#define USE_BATCHING' : '',
				parameters.instancing ? '#define USE_INSTANCING' : '',
				parameters.instancingColor ? '#define USE_INSTANCING_COLOR' : '',

				parameters.useFog && parameters.fog ? '#define USE_FOG' : '',
				parameters.useFog && parameters.fogExp2 ? '#define FOG_EXP2' : '',

				parameters.map ? '#define USE_MAP' : '',
				parameters.envMap ? '#define USE_ENVMAP' : '',
				parameters.envMap ? '#define ' + envMapModeDefine : '',
				parameters.lightMap ? '#define USE_LIGHTMAP' : '',
				parameters.aoMap ? '#define USE_AOMAP' : '',
				parameters.bumpMap ? '#define USE_BUMPMAP' : '',
				parameters.normalMap ? '#define USE_NORMALMAP' : '',
				parameters.normalMapObjectSpace ? '#define USE_NORMALMAP_OBJECTSPACE' : '',
				parameters.normalMapTangentSpace ? '#define USE_NORMALMAP_TANGENTSPACE' : '',
				parameters.displacementMap ? '#define USE_DISPLACEMENTMAP' : '',
				parameters.emissiveMap ? '#define USE_EMISSIVEMAP' : '',

				parameters.anisotropy ? '#define USE_ANISOTROPY' : '',
				parameters.anisotropyMap ? '#define USE_ANISOTROPYMAP' : '',

				parameters.clearcoatMap ? '#define USE_CLEARCOATMAP' : '',
				parameters.clearcoatRoughnessMap ? '#define USE_CLEARCOAT_ROUGHNESSMAP' : '',
				parameters.clearcoatNormalMap ? '#define USE_CLEARCOAT_NORMALMAP' : '',

				parameters.iridescenceMap ? '#define USE_IRIDESCENCEMAP' : '',
				parameters.iridescenceThicknessMap ? '#define USE_IRIDESCENCE_THICKNESSMAP' : '',

				parameters.specularMap ? '#define USE_SPECULARMAP' : '',
				parameters.specularColorMap ? '#define USE_SPECULAR_COLORMAP' : '',
				parameters.specularIntensityMap ? '#define USE_SPECULAR_INTENSITYMAP' : '',

				parameters.roughnessMap ? '#define USE_ROUGHNESSMAP' : '',
				parameters.metalnessMap ? '#define USE_METALNESSMAP' : '',
				parameters.alphaMap ? '#define USE_ALPHAMAP' : '',
				parameters.alphaHash ? '#define USE_ALPHAHASH' : '',

				parameters.transmission ? '#define USE_TRANSMISSION' : '',
				parameters.transmissionMap ? '#define USE_TRANSMISSIONMAP' : '',
				parameters.thicknessMap ? '#define USE_THICKNESSMAP' : '',

				parameters.sheenColorMap ? '#define USE_SHEEN_COLORMAP' : '',
				parameters.sheenRoughnessMap ? '#define USE_SHEEN_ROUGHNESSMAP' : '',

				//

				parameters.mapUv ? '#define MAP_UV ' + parameters.mapUv : '',
				parameters.alphaMapUv ? '#define ALPHAMAP_UV ' + parameters.alphaMapUv : '',
				parameters.lightMapUv ? '#define LIGHTMAP_UV ' + parameters.lightMapUv : '',
				parameters.aoMapUv ? '#define AOMAP_UV ' + parameters.aoMapUv : '',
				parameters.emissiveMapUv ? '#define EMISSIVEMAP_UV ' + parameters.emissiveMapUv : '',
				parameters.bumpMapUv ? '#define BUMPMAP_UV ' + parameters.bumpMapUv : '',
				parameters.normalMapUv ? '#define NORMALMAP_UV ' + parameters.normalMapUv : '',
				parameters.displacementMapUv ? '#define DISPLACEMENTMAP_UV ' + parameters.displacementMapUv : '',

				parameters.metalnessMapUv ? '#define METALNESSMAP_UV ' + parameters.metalnessMapUv : '',
				parameters.roughnessMapUv ? '#define ROUGHNESSMAP_UV ' + parameters.roughnessMapUv : '',

				parameters.anisotropyMapUv ? '#define ANISOTROPYMAP_UV ' + parameters.anisotropyMapUv : '',

				parameters.clearcoatMapUv ? '#define CLEARCOATMAP_UV ' + parameters.clearcoatMapUv : '',
				parameters.clearcoatNormalMapUv ? '#define CLEARCOAT_NORMALMAP_UV ' + parameters.clearcoatNormalMapUv : '',
				parameters.clearcoatRoughnessMapUv ? '#define CLEARCOAT_ROUGHNESSMAP_UV ' + parameters.clearcoatRoughnessMapUv : '',

				parameters.iridescenceMapUv ? '#define IRIDESCENCEMAP_UV ' + parameters.iridescenceMapUv : '',
				parameters.iridescenceThicknessMapUv ? '#define IRIDESCENCE_THICKNESSMAP_UV ' + parameters.iridescenceThicknessMapUv : '',

				parameters.sheenColorMapUv ? '#define SHEEN_COLORMAP_UV ' + parameters.sheenColorMapUv : '',
				parameters.sheenRoughnessMapUv ? '#define SHEEN_ROUGHNESSMAP_UV ' + parameters.sheenRoughnessMapUv : '',

				parameters.specularMapUv ? '#define SPECULARMAP_UV ' + parameters.specularMapUv : '',
				parameters.specularColorMapUv ? '#define SPECULAR_COLORMAP_UV ' + parameters.specularColorMapUv : '',
				parameters.specularIntensityMapUv ? '#define SPECULAR_INTENSITYMAP_UV ' + parameters.specularIntensityMapUv : '',

				parameters.transmissionMapUv ? '#define TRANSMISSIONMAP_UV ' + parameters.transmissionMapUv : '',
				parameters.thicknessMapUv ? '#define THICKNESSMAP_UV ' + parameters.thicknessMapUv : '',

				//

				parameters.vertexTangents && parameters.flatShading === false ? '#define USE_TANGENT' : '',
				parameters.vertexColors ? '#define USE_COLOR' : '',
				parameters.vertexAlphas ? '#define USE_COLOR_ALPHA' : '',
				parameters.vertexUv1s ? '#define USE_UV1' : '',
				parameters.vertexUv2s ? '#define USE_UV2' : '',
				parameters.vertexUv3s ? '#define USE_UV3' : '',

				parameters.pointsUvs ? '#define USE_POINTS_UV' : '',

				parameters.flatShading ? '#define FLAT_SHADED' : '',

				parameters.skinning ? '#define USE_SKINNING' : '',

				parameters.morphTargets ? '#define USE_MORPHTARGETS' : '',
				parameters.morphNormals && parameters.flatShading === false ? '#define USE_MORPHNORMALS' : '',
				( parameters.morphColors && parameters.isWebGL2 ) ? '#define USE_MORPHCOLORS' : '',
				( parameters.morphTargetsCount > 0 && parameters.isWebGL2 ) ? '#define MORPHTARGETS_TEXTURE' : '',
				( parameters.morphTargetsCount > 0 && parameters.isWebGL2 ) ? '#define MORPHTARGETS_TEXTURE_STRIDE ' + parameters.morphTextureStride : '',
				( parameters.morphTargetsCount > 0 && parameters.isWebGL2 ) ? '#define MORPHTARGETS_COUNT ' + parameters.morphTargetsCount : '',
				parameters.doubleSided ? '#define DOUBLE_SIDED' : '',
				parameters.flipSided ? '#define FLIP_SIDED' : '',

				parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',
				parameters.shadowMapEnabled ? '#define ' + shadowMapTypeDefine : '',

				parameters.sizeAttenuation ? '#define USE_SIZEATTENUATION' : '',

				parameters.numLightProbes > 0 ? '#define USE_LIGHT_PROBES' : '',

				parameters.useLegacyLights ? '#define LEGACY_LIGHTS' : '',

				parameters.logarithmicDepthBuffer ? '#define USE_LOGDEPTHBUF' : '',
				( parameters.logarithmicDepthBuffer && parameters.rendererExtensionFragDepth ) ? '#define USE_LOGDEPTHBUF_EXT' : '',

				'uniform mat4 modelMatrix;',
				'uniform mat4 modelViewMatrix;',
				'uniform mat4 projectionMatrix;',
				'uniform mat4 viewMatrix;',
				'uniform mat3 normalMatrix;',
				'uniform vec3 cameraPosition;',
				'uniform bool isOrthographic;',

				'#ifdef USE_INSTANCING',

				'	attribute mat4 instanceMatrix;',

				'#endif',

				'#ifdef USE_INSTANCING_COLOR',

				'	attribute vec3 instanceColor;',

				'#endif',

				'attribute vec3 position;',
				'attribute vec3 normal;',
				'attribute vec2 uv;',

				'#ifdef USE_UV1',

				'	attribute vec2 uv1;',

				'#endif',

				'#ifdef USE_UV2',

				'	attribute vec2 uv2;',

				'#endif',

				'#ifdef USE_UV3',

				'	attribute vec2 uv3;',

				'#endif',

				'#ifdef USE_TANGENT',

				'	attribute vec4 tangent;',

				'#endif',

				'#if defined( USE_COLOR_ALPHA )',

				'	attribute vec4 color;',

				'#elif defined( USE_COLOR )',

				'	attribute vec3 color;',

				'#endif',

				'#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )',

				'	attribute vec3 morphTarget0;',
				'	attribute vec3 morphTarget1;',
				'	attribute vec3 morphTarget2;',
				'	attribute vec3 morphTarget3;',

				'	#ifdef USE_MORPHNORMALS',

				'		attribute vec3 morphNormal0;',
				'		attribute vec3 morphNormal1;',
				'		attribute vec3 morphNormal2;',
				'		attribute vec3 morphNormal3;',

				'	#else',

				'		attribute vec3 morphTarget4;',
				'		attribute vec3 morphTarget5;',
				'		attribute vec3 morphTarget6;',
				'		attribute vec3 morphTarget7;',

				'	#endif',

				'#endif',

				'#ifdef USE_SKINNING',

				'	attribute vec4 skinIndex;',
				'	attribute vec4 skinWeight;',

				'#endif',

				'\n'

			].filter( filterEmptyLine ).join( '\n' );

			prefixFragment = [

				customExtensions,

				generatePrecision( parameters ),

				'#define SHADER_TYPE ' + parameters.shaderType,
				'#define SHADER_NAME ' + parameters.shaderName,

				customDefines,

				parameters.useFog && parameters.fog ? '#define USE_FOG' : '',
				parameters.useFog && parameters.fogExp2 ? '#define FOG_EXP2' : '',

				parameters.map ? '#define USE_MAP' : '',
				parameters.matcap ? '#define USE_MATCAP' : '',
				parameters.envMap ? '#define USE_ENVMAP' : '',
				parameters.envMap ? '#define ' + envMapTypeDefine : '',
				parameters.envMap ? '#define ' + envMapModeDefine : '',
				parameters.envMap ? '#define ' + envMapBlendingDefine : '',
				envMapCubeUVSize ? '#define CUBEUV_TEXEL_WIDTH ' + envMapCubeUVSize.texelWidth : '',
				envMapCubeUVSize ? '#define CUBEUV_TEXEL_HEIGHT ' + envMapCubeUVSize.texelHeight : '',
				envMapCubeUVSize ? '#define CUBEUV_MAX_MIP ' + envMapCubeUVSize.maxMip + '.0' : '',
				parameters.lightMap ? '#define USE_LIGHTMAP' : '',
				parameters.aoMap ? '#define USE_AOMAP' : '',
				parameters.bumpMap ? '#define USE_BUMPMAP' : '',
				parameters.normalMap ? '#define USE_NORMALMAP' : '',
				parameters.normalMapObjectSpace ? '#define USE_NORMALMAP_OBJECTSPACE' : '',
				parameters.normalMapTangentSpace ? '#define USE_NORMALMAP_TANGENTSPACE' : '',
				parameters.emissiveMap ? '#define USE_EMISSIVEMAP' : '',

				parameters.anisotropy ? '#define USE_ANISOTROPY' : '',
				parameters.anisotropyMap ? '#define USE_ANISOTROPYMAP' : '',

				parameters.clearcoat ? '#define USE_CLEARCOAT' : '',
				parameters.clearcoatMap ? '#define USE_CLEARCOATMAP' : '',
				parameters.clearcoatRoughnessMap ? '#define USE_CLEARCOAT_ROUGHNESSMAP' : '',
				parameters.clearcoatNormalMap ? '#define USE_CLEARCOAT_NORMALMAP' : '',

				parameters.iridescence ? '#define USE_IRIDESCENCE' : '',
				parameters.iridescenceMap ? '#define USE_IRIDESCENCEMAP' : '',
				parameters.iridescenceThicknessMap ? '#define USE_IRIDESCENCE_THICKNESSMAP' : '',

				parameters.specularMap ? '#define USE_SPECULARMAP' : '',
				parameters.specularColorMap ? '#define USE_SPECULAR_COLORMAP' : '',
				parameters.specularIntensityMap ? '#define USE_SPECULAR_INTENSITYMAP' : '',

				parameters.roughnessMap ? '#define USE_ROUGHNESSMAP' : '',
				parameters.metalnessMap ? '#define USE_METALNESSMAP' : '',

				parameters.alphaMap ? '#define USE_ALPHAMAP' : '',
				parameters.alphaTest ? '#define USE_ALPHATEST' : '',
				parameters.alphaHash ? '#define USE_ALPHAHASH' : '',

				parameters.sheen ? '#define USE_SHEEN' : '',
				parameters.sheenColorMap ? '#define USE_SHEEN_COLORMAP' : '',
				parameters.sheenRoughnessMap ? '#define USE_SHEEN_ROUGHNESSMAP' : '',

				parameters.transmission ? '#define USE_TRANSMISSION' : '',
				parameters.transmissionMap ? '#define USE_TRANSMISSIONMAP' : '',
				parameters.thicknessMap ? '#define USE_THICKNESSMAP' : '',

				parameters.vertexTangents && parameters.flatShading === false ? '#define USE_TANGENT' : '',
				parameters.vertexColors || parameters.instancingColor ? '#define USE_COLOR' : '',
				parameters.vertexAlphas ? '#define USE_COLOR_ALPHA' : '',
				parameters.vertexUv1s ? '#define USE_UV1' : '',
				parameters.vertexUv2s ? '#define USE_UV2' : '',
				parameters.vertexUv3s ? '#define USE_UV3' : '',

				parameters.pointsUvs ? '#define USE_POINTS_UV' : '',

				parameters.gradientMap ? '#define USE_GRADIENTMAP' : '',

				parameters.flatShading ? '#define FLAT_SHADED' : '',

				parameters.doubleSided ? '#define DOUBLE_SIDED' : '',
				parameters.flipSided ? '#define FLIP_SIDED' : '',

				parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',
				parameters.shadowMapEnabled ? '#define ' + shadowMapTypeDefine : '',

				parameters.premultipliedAlpha ? '#define PREMULTIPLIED_ALPHA' : '',

				parameters.numLightProbes > 0 ? '#define USE_LIGHT_PROBES' : '',

				parameters.useLegacyLights ? '#define LEGACY_LIGHTS' : '',

				parameters.decodeVideoTexture ? '#define DECODE_VIDEO_TEXTURE' : '',

				parameters.logarithmicDepthBuffer ? '#define USE_LOGDEPTHBUF' : '',
				( parameters.logarithmicDepthBuffer && parameters.rendererExtensionFragDepth ) ? '#define USE_LOGDEPTHBUF_EXT' : '',

				'uniform mat4 viewMatrix;',
				'uniform vec3 cameraPosition;',
				'uniform bool isOrthographic;',

				( parameters.toneMapping !== three_1.NoToneMapping ) ? '#define TONE_MAPPING' : '',
				( parameters.toneMapping !== three_1.NoToneMapping ) ? ShaderChunk[ 'tonemapping_pars_fragment' ] : '', // this code is required here because it is used by the toneMapping() function defined below
				( parameters.toneMapping !== three_1.NoToneMapping ) ? getToneMappingFunction( 'toneMapping', parameters.toneMapping ) : '',

				parameters.dithering ? '#define DITHERING' : '',
				parameters.opaque ? '#define OPAQUE' : '',

				ShaderChunk[ 'colorspace_pars_fragment' ], // this code is required here because it is used by the various encoding/decoding function defined below
				getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputColorSpace ),

				parameters.useDepthPacking ? '#define DEPTH_PACKING ' + parameters.depthPacking : '',

				'\n'

			].filter( filterEmptyLine ).join( '\n' );

		}

		vertexShader = resolveIncludes( vertexShader );
		vertexShader = replaceLightNums( vertexShader, parameters );
		vertexShader = replaceClippingPlaneNums( vertexShader, parameters );

		fragmentShader = resolveIncludes( fragmentShader );
		fragmentShader = replaceLightNums( fragmentShader, parameters );
		fragmentShader = replaceClippingPlaneNums( fragmentShader, parameters );

		vertexShader = unrollLoops( vertexShader );
		fragmentShader = unrollLoops( fragmentShader );

		if ( parameters.isWebGL2 && parameters.isRawShaderMaterial !== true ) {

			// GLSL 3.0 conversion for built-in materials and ShaderMaterial

			versionString = '#version 300 es\n';

			prefixVertex = [
				customVertexExtensions,
				'precision mediump sampler2DArray;',
				'#define attribute in',
				'#define varying out',
				'#define texture2D texture'
			].join( '\n' ) + '\n' + prefixVertex;

			prefixFragment = [
				'precision mediump sampler2DArray;',
				'#define varying in',
				( parameters.glslVersion === three_1.GLSL3 ) ? '' : 'layout(location = 0) out highp vec4 pc_fragColor;',
				( parameters.glslVersion === three_1.GLSL3 ) ? '' : '#define gl_FragColor pc_fragColor',
				'#define gl_FragDepthEXT gl_FragDepth',
				'#define texture2D texture',
				'#define textureCube texture',
				'#define texture2DProj textureProj',
				'#define texture2DLodEXT textureLod',
				'#define texture2DProjLodEXT textureProjLod',
				'#define textureCubeLodEXT textureLod',
				'#define texture2DGradEXT textureGrad',
				'#define texture2DProjGradEXT textureProjGrad',
				'#define textureCubeGradEXT textureGrad'
			].join( '\n' ) + '\n' + prefixFragment;

		}

		const vertexGlsl = versionString + prefixVertex + vertexShader;
		const fragmentGlsl = versionString + prefixFragment + fragmentShader;

		// console.log( '*VERTEX*', vertexGlsl );
		// console.log( '*FRAGMENT*', fragmentGlsl );

		const glVertexShader = WebGLShader( gl, gl.VERTEX_SHADER, vertexGlsl );
		const glFragmentShader = WebGLShader( gl, gl.FRAGMENT_SHADER, fragmentGlsl );

		gl.attachShader( program, glVertexShader );
		gl.attachShader( program, glFragmentShader );

		// Force a particular attribute to index 0.

		if ( parameters.index0AttributeName !== undefined ) {

			gl.bindAttribLocation( program, 0, parameters.index0AttributeName );

		} else if ( parameters.morphTargets === true ) {

			// programs with morphTargets displace position out of attribute 0
			gl.bindAttribLocation( program, 0, 'position' );

		}

		gl.linkProgram( program );

		function onFirstUse( self ) {

			// check for link errors
			if ( renderer.debug.checkShaderErrors ) {

				const programLog = gl.getProgramInfoLog( program ).trim();
				const vertexLog = gl.getShaderInfoLog( glVertexShader ).trim();
				const fragmentLog = gl.getShaderInfoLog( glFragmentShader ).trim();

				let runnable = true;
				let haveDiagnostics = true;

				if ( gl.getProgramParameter( program, gl.LINK_STATUS ) === false ) {

					runnable = false;

					if ( typeof renderer.debug.onShaderError === 'function' ) {

						renderer.debug.onShaderError( gl, program, glVertexShader, glFragmentShader );

					} else {

						// default error reporting

						const vertexErrors = getShaderErrors( gl, glVertexShader, 'vertex' );
						const fragmentErrors = getShaderErrors( gl, glFragmentShader, 'fragment' );

						console.error(
							'THREE.WebGLProgram: Shader Error ' + gl.getError() + ' - ' +
							'VALIDATE_STATUS ' + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + '\n\n' +
							'Program Info Log: ' + programLog + '\n' +
							vertexErrors + '\n' +
							fragmentErrors
						);

					}

				} else if ( programLog !== '' ) {

					console.warn( 'THREE.WebGLProgram: Program Info Log:', programLog );

				} else if ( vertexLog === '' || fragmentLog === '' ) {

					haveDiagnostics = false;

				}

				if ( haveDiagnostics ) {

					self.diagnostics = {

						runnable: runnable,

						programLog: programLog,

						vertexShader: {

							log: vertexLog,
							prefix: prefixVertex

						},

						fragmentShader: {

							log: fragmentLog,
							prefix: prefixFragment

						}

					};

				}

			}

			// Clean up

			// Crashes in iOS9 and iOS10. #18402
			// gl.detachShader( program, glVertexShader );
			// gl.detachShader( program, glFragmentShader );

			gl.deleteShader( glVertexShader );
			gl.deleteShader( glFragmentShader );

			cachedUniforms = new WebGLUniforms( gl, program );
			cachedAttributes = fetchAttributeLocations( gl, program );

		}

		// set up caching for uniform locations

		let cachedUniforms;

		this.getUniforms = function () {

			if ( cachedUniforms === undefined ) {

				// Populates cachedUniforms and cachedAttributes
				onFirstUse( this );

			}

			return cachedUniforms;

		};

		// set up caching for attribute locations

		let cachedAttributes;

		this.getAttributes = function () {

			if ( cachedAttributes === undefined ) {

				// Populates cachedAttributes and cachedUniforms
				onFirstUse( this );

			}

			return cachedAttributes;

		};

		// indicate when the program is ready to be used. if the KHR_parallel_shader_compile extension isn't supported,
		// flag the program as ready immediately. It may cause a stall when it's first used.

		let programReady = ( parameters.rendererExtensionParallelShaderCompile === false );

		this.isReady = function () {

			if ( programReady === false ) {

				programReady = gl.getProgramParameter( program, COMPLETION_STATUS_KHR );

			}

			return programReady;

		};

		// free resource

		this.destroy = function () {

			bindingStates.releaseStatesOfProgram( this );

			gl.deleteProgram( program );
			this.program = undefined;

		};

		//

		this.type = parameters.shaderType;
		this.name = parameters.shaderName;
		this.id = programIdCount ++;
		this.cacheKey = cacheKey;
		this.usedTimes = 1;
		this.program = program;
		this.vertexShader = glVertexShader;
		this.fragmentShader = glFragmentShader;

		return this;

	}

	let _id = 0;

	class WebGLShaderCache {

		constructor() {

			this.shaderCache = new Map();
			this.materialCache = new Map();

		}

		update( material ) {

			const vertexShader = material.vertexShader;
			const fragmentShader = material.fragmentShader;

			const vertexShaderStage = this._getShaderStage( vertexShader );
			const fragmentShaderStage = this._getShaderStage( fragmentShader );

			const materialShaders = this._getShaderCacheForMaterial( material );

			if ( materialShaders.has( vertexShaderStage ) === false ) {

				materialShaders.add( vertexShaderStage );
				vertexShaderStage.usedTimes ++;

			}

			if ( materialShaders.has( fragmentShaderStage ) === false ) {

				materialShaders.add( fragmentShaderStage );
				fragmentShaderStage.usedTimes ++;

			}

			return this;

		}

		remove( material ) {

			const materialShaders = this.materialCache.get( material );

			for ( const shaderStage of materialShaders ) {

				shaderStage.usedTimes --;

				if ( shaderStage.usedTimes === 0 ) this.shaderCache.delete( shaderStage.code );

			}

			this.materialCache.delete( material );

			return this;

		}

		getVertexShaderID( material ) {

			return this._getShaderStage( material.vertexShader ).id;

		}

		getFragmentShaderID( material ) {

			return this._getShaderStage( material.fragmentShader ).id;

		}

		dispose() {

			this.shaderCache.clear();
			this.materialCache.clear();

		}

		_getShaderCacheForMaterial( material ) {

			const cache = this.materialCache;
			let set = cache.get( material );

			if ( set === undefined ) {

				set = new Set();
				cache.set( material, set );

			}

			return set;

		}

		_getShaderStage( code ) {

			const cache = this.shaderCache;
			let stage = cache.get( code );

			if ( stage === undefined ) {

				stage = new WebGLShaderStage( code );
				cache.set( code, stage );

			}

			return stage;

		}

	}

	class WebGLShaderStage {

		constructor( code ) {

			this.id = _id ++;

			this.code = code;
			this.usedTimes = 0;

		}

	}

	function WebGLPrograms( renderer, cubemaps, cubeuvmaps, extensions, capabilities, bindingStates, clipping ) {

		const _programLayers = new three_1.Layers();
		const _customShaders = new WebGLShaderCache();
		const programs = [];

		const IS_WEBGL2 = capabilities.isWebGL2;
		const logarithmicDepthBuffer = capabilities.logarithmicDepthBuffer;
		const SUPPORTS_VERTEX_TEXTURES = capabilities.vertexTextures;

		let precision = capabilities.precision;

		const shaderIDs = {
			MeshDepthMaterial: 'depth',
			MeshDistanceMaterial: 'distanceRGBA',
			MeshNormalMaterial: 'normal',
			MeshBasicMaterial: 'basic',
			MeshLambertMaterial: 'lambert',
			MeshPhongMaterial: 'phong',
			MeshToonMaterial: 'toon',
			MeshStandardMaterial: 'physical',
			MeshPhysicalMaterial: 'physical',
			MeshMatcapMaterial: 'matcap',
			LineBasicMaterial: 'basic',
			LineDashedMaterial: 'dashed',
			PointsMaterial: 'points',
			ShadowMaterial: 'shadow',
			SpriteMaterial: 'sprite'
		};

		function getChannel( value ) {

			if ( value === 0 ) return 'uv';

			return `uv${ value }`;

		}

		function getParameters( material, lights, shadows, scene, object ) {

			const fog = scene.fog;
			const geometry = object.geometry;
			const environment = material.isMeshStandardMaterial ? scene.environment : null;

			const envMap = ( material.isMeshStandardMaterial ? cubeuvmaps : cubemaps ).get( material.envMap || environment );
			const envMapCubeUVHeight = ( !! envMap ) && ( envMap.mapping === three_1.CubeUVReflectionMapping ) ? envMap.image.height : null;

			const shaderID = shaderIDs[ material.type ];

			// heuristics to create shader parameters according to lights in the scene
			// (not to blow over maxLights budget)

			if ( material.precision !== null ) {

				precision = capabilities.getMaxPrecision( material.precision );

				if ( precision !== material.precision ) {

					console.warn( 'THREE.WebGLProgram.getParameters:', material.precision, 'not supported, using', precision, 'instead.' );

				}

			}

			//

			const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
			const morphTargetsCount = ( morphAttribute !== undefined ) ? morphAttribute.length : 0;

			let morphTextureStride = 0;

			if ( geometry.morphAttributes.position !== undefined ) morphTextureStride = 1;
			if ( geometry.morphAttributes.normal !== undefined ) morphTextureStride = 2;
			if ( geometry.morphAttributes.color !== undefined ) morphTextureStride = 3;

			//

			let vertexShader, fragmentShader;
			let customVertexShaderID, customFragmentShaderID;

			if ( shaderID ) {

				const shader = ShaderLib[ shaderID ];

				vertexShader = shader.vertexShader;
				fragmentShader = shader.fragmentShader;

			} else {

				vertexShader = material.vertexShader;
				fragmentShader = material.fragmentShader;

				_customShaders.update( material );

				customVertexShaderID = _customShaders.getVertexShaderID( material );
				customFragmentShaderID = _customShaders.getFragmentShaderID( material );

			}

			const currentRenderTarget = renderer.getRenderTarget();

			const IS_INSTANCEDMESH = object.isInstancedMesh === true;
			const IS_BATCHEDMESH = object.isBatchedMesh === true;

			const HAS_MAP = !! material.map;
			const HAS_MATCAP = !! material.matcap;
			const HAS_ENVMAP = !! envMap;
			const HAS_AOMAP = !! material.aoMap;
			const HAS_LIGHTMAP = !! material.lightMap;
			const HAS_BUMPMAP = !! material.bumpMap;
			const HAS_NORMALMAP = !! material.normalMap;
			const HAS_DISPLACEMENTMAP = !! material.displacementMap;
			const HAS_EMISSIVEMAP = !! material.emissiveMap;

			const HAS_METALNESSMAP = !! material.metalnessMap;
			const HAS_ROUGHNESSMAP = !! material.roughnessMap;

			const HAS_ANISOTROPY = material.anisotropy > 0;
			const HAS_CLEARCOAT = material.clearcoat > 0;
			const HAS_IRIDESCENCE = material.iridescence > 0;
			const HAS_SHEEN = material.sheen > 0;
			const HAS_TRANSMISSION = material.transmission > 0;

			const HAS_ANISOTROPYMAP = HAS_ANISOTROPY && !! material.anisotropyMap;

			const HAS_CLEARCOATMAP = HAS_CLEARCOAT && !! material.clearcoatMap;
			const HAS_CLEARCOAT_NORMALMAP = HAS_CLEARCOAT && !! material.clearcoatNormalMap;
			const HAS_CLEARCOAT_ROUGHNESSMAP = HAS_CLEARCOAT && !! material.clearcoatRoughnessMap;

			const HAS_IRIDESCENCEMAP = HAS_IRIDESCENCE && !! material.iridescenceMap;
			const HAS_IRIDESCENCE_THICKNESSMAP = HAS_IRIDESCENCE && !! material.iridescenceThicknessMap;

			const HAS_SHEEN_COLORMAP = HAS_SHEEN && !! material.sheenColorMap;
			const HAS_SHEEN_ROUGHNESSMAP = HAS_SHEEN && !! material.sheenRoughnessMap;

			const HAS_SPECULARMAP = !! material.specularMap;
			const HAS_SPECULAR_COLORMAP = !! material.specularColorMap;
			const HAS_SPECULAR_INTENSITYMAP = !! material.specularIntensityMap;

			const HAS_TRANSMISSIONMAP = HAS_TRANSMISSION && !! material.transmissionMap;
			const HAS_THICKNESSMAP = HAS_TRANSMISSION && !! material.thicknessMap;

			const HAS_GRADIENTMAP = !! material.gradientMap;

			const HAS_ALPHAMAP = !! material.alphaMap;

			const HAS_ALPHATEST = material.alphaTest > 0;

			const HAS_ALPHAHASH = !! material.alphaHash;

			const HAS_EXTENSIONS = !! material.extensions;

			const HAS_ATTRIBUTE_UV1 = !! geometry.attributes.uv1;
			const HAS_ATTRIBUTE_UV2 = !! geometry.attributes.uv2;
			const HAS_ATTRIBUTE_UV3 = !! geometry.attributes.uv3;

			let toneMapping = three_1.NoToneMapping;

			if ( material.toneMapped ) {

				if ( currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true ) {

					toneMapping = renderer.toneMapping;

				}

			}

			const parameters = {

				isWebGL2: IS_WEBGL2,

				shaderID: shaderID,
				shaderType: material.type,
				shaderName: material.name,

				vertexShader: vertexShader,
				fragmentShader: fragmentShader,
				defines: material.defines,

				customVertexShaderID: customVertexShaderID,
				customFragmentShaderID: customFragmentShaderID,

				isRawShaderMaterial: material.isRawShaderMaterial === true,
				glslVersion: material.glslVersion,

				precision: precision,

				batching: IS_BATCHEDMESH,
				instancing: IS_INSTANCEDMESH,
				instancingColor: IS_INSTANCEDMESH && object.instanceColor !== null,

				supportsVertexTextures: SUPPORTS_VERTEX_TEXTURES,
				outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : three_1.LinearSRGBColorSpace ),

				map: HAS_MAP,
				matcap: HAS_MATCAP,
				envMap: HAS_ENVMAP,
				envMapMode: HAS_ENVMAP && envMap.mapping,
				envMapCubeUVHeight: envMapCubeUVHeight,
				aoMap: HAS_AOMAP,
				lightMap: HAS_LIGHTMAP,
				bumpMap: HAS_BUMPMAP,
				normalMap: HAS_NORMALMAP,
				displacementMap: SUPPORTS_VERTEX_TEXTURES && HAS_DISPLACEMENTMAP,
				emissiveMap: HAS_EMISSIVEMAP,

				normalMapObjectSpace: HAS_NORMALMAP && material.normalMapType === three_1.ObjectSpaceNormalMap,
				normalMapTangentSpace: HAS_NORMALMAP && material.normalMapType === three_1.TangentSpaceNormalMap,

				metalnessMap: HAS_METALNESSMAP,
				roughnessMap: HAS_ROUGHNESSMAP,

				anisotropy: HAS_ANISOTROPY,
				anisotropyMap: HAS_ANISOTROPYMAP,

				clearcoat: HAS_CLEARCOAT,
				clearcoatMap: HAS_CLEARCOATMAP,
				clearcoatNormalMap: HAS_CLEARCOAT_NORMALMAP,
				clearcoatRoughnessMap: HAS_CLEARCOAT_ROUGHNESSMAP,

				iridescence: HAS_IRIDESCENCE,
				iridescenceMap: HAS_IRIDESCENCEMAP,
				iridescenceThicknessMap: HAS_IRIDESCENCE_THICKNESSMAP,

				sheen: HAS_SHEEN,
				sheenColorMap: HAS_SHEEN_COLORMAP,
				sheenRoughnessMap: HAS_SHEEN_ROUGHNESSMAP,

				specularMap: HAS_SPECULARMAP,
				specularColorMap: HAS_SPECULAR_COLORMAP,
				specularIntensityMap: HAS_SPECULAR_INTENSITYMAP,

				transmission: HAS_TRANSMISSION,
				transmissionMap: HAS_TRANSMISSIONMAP,
				thicknessMap: HAS_THICKNESSMAP,

				gradientMap: HAS_GRADIENTMAP,

				opaque: material.transparent === false && material.blending === three_1.NormalBlending,

				alphaMap: HAS_ALPHAMAP,
				alphaTest: HAS_ALPHATEST,
				alphaHash: HAS_ALPHAHASH,

				combine: material.combine,

				//

				mapUv: HAS_MAP && getChannel( material.map.channel ),
				aoMapUv: HAS_AOMAP && getChannel( material.aoMap.channel ),
				lightMapUv: HAS_LIGHTMAP && getChannel( material.lightMap.channel ),
				bumpMapUv: HAS_BUMPMAP && getChannel( material.bumpMap.channel ),
				normalMapUv: HAS_NORMALMAP && getChannel( material.normalMap.channel ),
				displacementMapUv: HAS_DISPLACEMENTMAP && getChannel( material.displacementMap.channel ),
				emissiveMapUv: HAS_EMISSIVEMAP && getChannel( material.emissiveMap.channel ),

				metalnessMapUv: HAS_METALNESSMAP && getChannel( material.metalnessMap.channel ),
				roughnessMapUv: HAS_ROUGHNESSMAP && getChannel( material.roughnessMap.channel ),

				anisotropyMapUv: HAS_ANISOTROPYMAP && getChannel( material.anisotropyMap.channel ),

				clearcoatMapUv: HAS_CLEARCOATMAP && getChannel( material.clearcoatMap.channel ),
				clearcoatNormalMapUv: HAS_CLEARCOAT_NORMALMAP && getChannel( material.clearcoatNormalMap.channel ),
				clearcoatRoughnessMapUv: HAS_CLEARCOAT_ROUGHNESSMAP && getChannel( material.clearcoatRoughnessMap.channel ),

				iridescenceMapUv: HAS_IRIDESCENCEMAP && getChannel( material.iridescenceMap.channel ),
				iridescenceThicknessMapUv: HAS_IRIDESCENCE_THICKNESSMAP && getChannel( material.iridescenceThicknessMap.channel ),

				sheenColorMapUv: HAS_SHEEN_COLORMAP && getChannel( material.sheenColorMap.channel ),
				sheenRoughnessMapUv: HAS_SHEEN_ROUGHNESSMAP && getChannel( material.sheenRoughnessMap.channel ),

				specularMapUv: HAS_SPECULARMAP && getChannel( material.specularMap.channel ),
				specularColorMapUv: HAS_SPECULAR_COLORMAP && getChannel( material.specularColorMap.channel ),
				specularIntensityMapUv: HAS_SPECULAR_INTENSITYMAP && getChannel( material.specularIntensityMap.channel ),

				transmissionMapUv: HAS_TRANSMISSIONMAP && getChannel( material.transmissionMap.channel ),
				thicknessMapUv: HAS_THICKNESSMAP && getChannel( material.thicknessMap.channel ),

				alphaMapUv: HAS_ALPHAMAP && getChannel( material.alphaMap.channel ),

				//

				vertexTangents: !! geometry.attributes.tangent && ( HAS_NORMALMAP || HAS_ANISOTROPY ),
				vertexColors: material.vertexColors,
				vertexAlphas: material.vertexColors === true && !! geometry.attributes.color && geometry.attributes.color.itemSize === 4,
				vertexUv1s: HAS_ATTRIBUTE_UV1,
				vertexUv2s: HAS_ATTRIBUTE_UV2,
				vertexUv3s: HAS_ATTRIBUTE_UV3,

				pointsUvs: object.isPoints === true && !! geometry.attributes.uv && ( HAS_MAP || HAS_ALPHAMAP ),

				fog: !! fog,
				useFog: material.fog === true,
				fogExp2: ( fog && fog.isFogExp2 ),

				flatShading: material.flatShading === true,

				sizeAttenuation: material.sizeAttenuation === true,
				logarithmicDepthBuffer: logarithmicDepthBuffer,

				skinning: object.isSkinnedMesh === true,

				morphTargets: geometry.morphAttributes.position !== undefined,
				morphNormals: geometry.morphAttributes.normal !== undefined,
				morphColors: geometry.morphAttributes.color !== undefined,
				morphTargetsCount: morphTargetsCount,
				morphTextureStride: morphTextureStride,

				numDirLights: lights.directional.length,
				numPointLights: lights.point.length,
				numSpotLights: lights.spot.length,
				numSpotLightMaps: lights.spotLightMap.length,
				numRectAreaLights: lights.rectArea.length,
				numHemiLights: lights.hemi.length,

				numDirLightShadows: lights.directionalShadowMap.length,
				numPointLightShadows: lights.pointShadowMap.length,
				numSpotLightShadows: lights.spotShadowMap.length,
				numSpotLightShadowsWithMaps: lights.numSpotLightShadowsWithMaps,

				numLightProbes: lights.numLightProbes,

				numClippingPlanes: clipping.numPlanes,
				numClipIntersection: clipping.numIntersection,

				dithering: material.dithering,

				shadowMapEnabled: renderer.shadowMap.enabled && shadows.length > 0,
				shadowMapType: renderer.shadowMap.type,

				toneMapping: toneMapping,
				useLegacyLights: renderer._useLegacyLights,

				decodeVideoTexture: HAS_MAP && ( material.map.isVideoTexture === true ) && ( three_1.ColorManagement.getTransfer( material.map.colorSpace ) === three_1.SRGBTransfer ),

				premultipliedAlpha: material.premultipliedAlpha,

				doubleSided: material.side === three_1.DoubleSide,
				flipSided: material.side === three_1.BackSide,

				useDepthPacking: material.depthPacking >= 0,
				depthPacking: material.depthPacking || 0,

				index0AttributeName: material.index0AttributeName,

				extensionDerivatives: HAS_EXTENSIONS && material.extensions.derivatives === true,
				extensionFragDepth: HAS_EXTENSIONS && material.extensions.fragDepth === true,
				extensionDrawBuffers: HAS_EXTENSIONS && material.extensions.drawBuffers === true,
				extensionShaderTextureLOD: HAS_EXTENSIONS && material.extensions.shaderTextureLOD === true,
				extensionClipCullDistance: HAS_EXTENSIONS && material.extensions.clipCullDistance && extensions.has( 'WEBGL_clip_cull_distance' ),

				rendererExtensionFragDepth: IS_WEBGL2 || extensions.has( 'EXT_frag_depth' ),
				rendererExtensionDrawBuffers: IS_WEBGL2 || extensions.has( 'WEBGL_draw_buffers' ),
				rendererExtensionShaderTextureLod: IS_WEBGL2 || extensions.has( 'EXT_shader_texture_lod' ),
				rendererExtensionParallelShaderCompile: extensions.has( 'KHR_parallel_shader_compile' ),

				customProgramCacheKey: material.customProgramCacheKey()

			};

			return parameters;

		}

		function getProgramCacheKey( parameters ) {

			const array = [];

			if ( parameters.shaderID ) {

				array.push( parameters.shaderID );

			} else {

				array.push( parameters.customVertexShaderID );
				array.push( parameters.customFragmentShaderID );

			}

			if ( parameters.defines !== undefined ) {

				for ( const name in parameters.defines ) {

					array.push( name );
					array.push( parameters.defines[ name ] );

				}

			}

			if ( parameters.isRawShaderMaterial === false ) {

				getProgramCacheKeyParameters( array, parameters );
				getProgramCacheKeyBooleans( array, parameters );
				array.push( renderer.outputColorSpace );

			}

			array.push( parameters.customProgramCacheKey );

			return array.join();

		}

		function getProgramCacheKeyParameters( array, parameters ) {

			array.push( parameters.precision );
			array.push( parameters.outputColorSpace );
			array.push( parameters.envMapMode );
			array.push( parameters.envMapCubeUVHeight );
			array.push( parameters.mapUv );
			array.push( parameters.alphaMapUv );
			array.push( parameters.lightMapUv );
			array.push( parameters.aoMapUv );
			array.push( parameters.bumpMapUv );
			array.push( parameters.normalMapUv );
			array.push( parameters.displacementMapUv );
			array.push( parameters.emissiveMapUv );
			array.push( parameters.metalnessMapUv );
			array.push( parameters.roughnessMapUv );
			array.push( parameters.anisotropyMapUv );
			array.push( parameters.clearcoatMapUv );
			array.push( parameters.clearcoatNormalMapUv );
			array.push( parameters.clearcoatRoughnessMapUv );
			array.push( parameters.iridescenceMapUv );
			array.push( parameters.iridescenceThicknessMapUv );
			array.push( parameters.sheenColorMapUv );
			array.push( parameters.sheenRoughnessMapUv );
			array.push( parameters.specularMapUv );
			array.push( parameters.specularColorMapUv );
			array.push( parameters.specularIntensityMapUv );
			array.push( parameters.transmissionMapUv );
			array.push( parameters.thicknessMapUv );
			array.push( parameters.combine );
			array.push( parameters.fogExp2 );
			array.push( parameters.sizeAttenuation );
			array.push( parameters.morphTargetsCount );
			array.push( parameters.morphAttributeCount );
			array.push( parameters.numDirLights );
			array.push( parameters.numPointLights );
			array.push( parameters.numSpotLights );
			array.push( parameters.numSpotLightMaps );
			array.push( parameters.numHemiLights );
			array.push( parameters.numRectAreaLights );
			array.push( parameters.numDirLightShadows );
			array.push( parameters.numPointLightShadows );
			array.push( parameters.numSpotLightShadows );
			array.push( parameters.numSpotLightShadowsWithMaps );
			array.push( parameters.numLightProbes );
			array.push( parameters.shadowMapType );
			array.push( parameters.toneMapping );
			array.push( parameters.numClippingPlanes );
			array.push( parameters.numClipIntersection );
			array.push( parameters.depthPacking );

		}

		function getProgramCacheKeyBooleans( array, parameters ) {

			_programLayers.disableAll();

			if ( parameters.isWebGL2 )
				_programLayers.enable( 0 );
			if ( parameters.supportsVertexTextures )
				_programLayers.enable( 1 );
			if ( parameters.instancing )
				_programLayers.enable( 2 );
			if ( parameters.instancingColor )
				_programLayers.enable( 3 );
			if ( parameters.matcap )
				_programLayers.enable( 4 );
			if ( parameters.envMap )
				_programLayers.enable( 5 );
			if ( parameters.normalMapObjectSpace )
				_programLayers.enable( 6 );
			if ( parameters.normalMapTangentSpace )
				_programLayers.enable( 7 );
			if ( parameters.clearcoat )
				_programLayers.enable( 8 );
			if ( parameters.iridescence )
				_programLayers.enable( 9 );
			if ( parameters.alphaTest )
				_programLayers.enable( 10 );
			if ( parameters.vertexColors )
				_programLayers.enable( 11 );
			if ( parameters.vertexAlphas )
				_programLayers.enable( 12 );
			if ( parameters.vertexUv1s )
				_programLayers.enable( 13 );
			if ( parameters.vertexUv2s )
				_programLayers.enable( 14 );
			if ( parameters.vertexUv3s )
				_programLayers.enable( 15 );
			if ( parameters.vertexTangents )
				_programLayers.enable( 16 );
			if ( parameters.anisotropy )
				_programLayers.enable( 17 );
			if ( parameters.alphaHash )
				_programLayers.enable( 18 );
			if ( parameters.batching )
				_programLayers.enable( 19 );

			array.push( _programLayers.mask );
			_programLayers.disableAll();

			if ( parameters.fog )
				_programLayers.enable( 0 );
			if ( parameters.useFog )
				_programLayers.enable( 1 );
			if ( parameters.flatShading )
				_programLayers.enable( 2 );
			if ( parameters.logarithmicDepthBuffer )
				_programLayers.enable( 3 );
			if ( parameters.skinning )
				_programLayers.enable( 4 );
			if ( parameters.morphTargets )
				_programLayers.enable( 5 );
			if ( parameters.morphNormals )
				_programLayers.enable( 6 );
			if ( parameters.morphColors )
				_programLayers.enable( 7 );
			if ( parameters.premultipliedAlpha )
				_programLayers.enable( 8 );
			if ( parameters.shadowMapEnabled )
				_programLayers.enable( 9 );
			if ( parameters.useLegacyLights )
				_programLayers.enable( 10 );
			if ( parameters.doubleSided )
				_programLayers.enable( 11 );
			if ( parameters.flipSided )
				_programLayers.enable( 12 );
			if ( parameters.useDepthPacking )
				_programLayers.enable( 13 );
			if ( parameters.dithering )
				_programLayers.enable( 14 );
			if ( parameters.transmission )
				_programLayers.enable( 15 );
			if ( parameters.sheen )
				_programLayers.enable( 16 );
			if ( parameters.opaque )
				_programLayers.enable( 17 );
			if ( parameters.pointsUvs )
				_programLayers.enable( 18 );
			if ( parameters.decodeVideoTexture )
				_programLayers.enable( 19 );

			array.push( _programLayers.mask );

		}

		function getUniforms( material ) {

			const shaderID = shaderIDs[ material.type ];
			let uniforms;

			if ( shaderID ) {

				const shader = ShaderLib[ shaderID ];
				uniforms = three_2.UniformsUtils.clone( shader.uniforms );

			} else {

				uniforms = material.uniforms;

			}

			return uniforms;

		}

		function acquireProgram( parameters, cacheKey ) {

			let program;

			// Check if code has been already compiled
			for ( let p = 0, pl = programs.length; p < pl; p ++ ) {

				const preexistingProgram = programs[ p ];

				if ( preexistingProgram.cacheKey === cacheKey ) {

					program = preexistingProgram;
					++ program.usedTimes;

					break;

				}

			}

			if ( program === undefined ) {

				program = new WebGLProgram( renderer, cacheKey, parameters, bindingStates );
				programs.push( program );

			}

			return program;

		}

		function releaseProgram( program ) {

			if ( -- program.usedTimes === 0 ) {

				// Remove from unordered set
				const i = programs.indexOf( program );
				programs[ i ] = programs[ programs.length - 1 ];
				programs.pop();

				// Free WebGL resources
				program.destroy();

			}

		}

		function releaseShaderCache( material ) {

			_customShaders.remove( material );

		}

		function dispose() {

			_customShaders.dispose();

		}

		return {
			getParameters: getParameters,
			getProgramCacheKey: getProgramCacheKey,
			getUniforms: getUniforms,
			acquireProgram: acquireProgram,
			releaseProgram: releaseProgram,
			releaseShaderCache: releaseShaderCache,
			// Exposed for resource monitoring & error feedback via renderer.info:
			programs: programs,
			dispose: dispose
		};

	}

	function WebGLProperties() {

		let properties = new WeakMap();

		function get( object ) {

			let map = properties.get( object );

			if ( map === undefined ) {

				map = {};
				properties.set( object, map );

			}

			return map;

		}

		function remove( object ) {

			properties.delete( object );

		}

		function update( object, key, value ) {

			properties.get( object )[ key ] = value;

		}

		function dispose() {

			properties = new WeakMap();

		}

		return {
			get: get,
			remove: remove,
			update: update,
			dispose: dispose
		};

	}

	function painterSortStable( a, b ) {

		if ( a.groupOrder !== b.groupOrder ) {

			return a.groupOrder - b.groupOrder;

		} else if ( a.renderOrder !== b.renderOrder ) {

			return a.renderOrder - b.renderOrder;

		} else if ( a.material.id !== b.material.id ) {

			return a.material.id - b.material.id;

		} else if ( a.z !== b.z ) {

			return a.z - b.z;

		} else {

			return a.id - b.id;

		}

	}

	function reversePainterSortStable( a, b ) {

		if ( a.groupOrder !== b.groupOrder ) {

			return a.groupOrder - b.groupOrder;

		} else if ( a.renderOrder !== b.renderOrder ) {

			return a.renderOrder - b.renderOrder;

		} else if ( a.z !== b.z ) {

			return b.z - a.z;

		} else {

			return a.id - b.id;

		}

	}


	function WebGLRenderList() {

		const renderItems = [];
		let renderItemsIndex = 0;

		const opaque = [];
		const transmissive = [];
		const transparent = [];

		function init() {

			renderItemsIndex = 0;

			opaque.length = 0;
			transmissive.length = 0;
			transparent.length = 0;

		}

		function getNextRenderItem( object, geometry, material, groupOrder, z, group ) {

			let renderItem = renderItems[ renderItemsIndex ];

			if ( renderItem === undefined ) {

				renderItem = {
					id: object.id,
					object: object,
					geometry: geometry,
					material: material,
					groupOrder: groupOrder,
					renderOrder: object.renderOrder,
					z: z,
					group: group
				};

				renderItems[ renderItemsIndex ] = renderItem;

			} else {

				renderItem.id = object.id;
				renderItem.object = object;
				renderItem.geometry = geometry;
				renderItem.material = material;
				renderItem.groupOrder = groupOrder;
				renderItem.renderOrder = object.renderOrder;
				renderItem.z = z;
				renderItem.group = group;

			}

			renderItemsIndex ++;

			return renderItem;

		}

		function push( object, geometry, material, groupOrder, z, group ) {

			const renderItem = getNextRenderItem( object, geometry, material, groupOrder, z, group );

			if ( material.transmission > 0.0 ) {

				transmissive.push( renderItem );

			} else if ( material.transparent === true ) {

				transparent.push( renderItem );

			} else {

				opaque.push( renderItem );

			}

		}

		function unshift( object, geometry, material, groupOrder, z, group ) {

			const renderItem = getNextRenderItem( object, geometry, material, groupOrder, z, group );

			if ( material.transmission > 0.0 ) {

				transmissive.unshift( renderItem );

			} else if ( material.transparent === true ) {

				transparent.unshift( renderItem );

			} else {

				opaque.unshift( renderItem );

			}

		}

		function sort( customOpaqueSort, customTransparentSort ) {

			if ( opaque.length > 1 ) opaque.sort( customOpaqueSort || painterSortStable );
			if ( transmissive.length > 1 ) transmissive.sort( customTransparentSort || reversePainterSortStable );
			if ( transparent.length > 1 ) transparent.sort( customTransparentSort || reversePainterSortStable );

		}

		function finish() {

			// Clear references from inactive renderItems in the list

			for ( let i = renderItemsIndex, il = renderItems.length; i < il; i ++ ) {

				const renderItem = renderItems[ i ];

				if ( renderItem.id === null ) break;

				renderItem.id = null;
				renderItem.object = null;
				renderItem.geometry = null;
				renderItem.material = null;
				renderItem.group = null;

			}

		}

		return {

			opaque: opaque,
			transmissive: transmissive,
			transparent: transparent,

			init: init,
			push: push,
			unshift: unshift,
			finish: finish,

			sort: sort
		};

	}

	function WebGLRenderLists() {

		let lists = new WeakMap();

		function get( scene, renderCallDepth ) {

			const listArray = lists.get( scene );
			let list;

			if ( listArray === undefined ) {

				list = new WebGLRenderList();
				lists.set( scene, [ list ] );

			} else {

				if ( renderCallDepth >= listArray.length ) {

					list = new WebGLRenderList();
					listArray.push( list );

				} else {

					list = listArray[ renderCallDepth ];

				}

			}

			return list;

		}

		function dispose() {

			lists = new WeakMap();

		}

		return {
			get: get,
			dispose: dispose
		};

	}

	function UniformsCache() {

		const lights = {};

		return {

			get: function ( light ) {

				if ( lights[ light.id ] !== undefined ) {

					return lights[ light.id ];

				}

				let uniforms;

				switch ( light.type ) {

					case 'DirectionalLight':
						uniforms = {
							direction: new three_1.Vector3(),
							color: new three_1.Color()
						};
						break;

					case 'SpotLight':
						uniforms = {
							position: new three_1.Vector3(),
							direction: new three_1.Vector3(),
							color: new three_1.Color(),
							distance: 0,
							coneCos: 0,
							penumbraCos: 0,
							decay: 0
						};
						break;

					case 'PointLight':
						uniforms = {
							position: new three_1.Vector3(),
							color: new three_1.Color(),
							distance: 0,
							decay: 0
						};
						break;

					case 'HemisphereLight':
						uniforms = {
							direction: new three_1.Vector3(),
							skyColor: new three_1.Color(),
							groundColor: new three_1.Color()
						};
						break;

					case 'RectAreaLight':
						uniforms = {
							color: new three_1.Color(),
							position: new three_1.Vector3(),
							halfWidth: new three_1.Vector3(),
							halfHeight: new three_1.Vector3()
						};
						break;

				}

				lights[ light.id ] = uniforms;

				return uniforms;

			}

		};

	}

	function ShadowUniformsCache() {

		const lights = {};

		return {

			get: function ( light ) {

				if ( lights[ light.id ] !== undefined ) {

					return lights[ light.id ];

				}

				let uniforms;

				switch ( light.type ) {

					case 'DirectionalLight':
						uniforms = {
							shadowBias: 0,
							shadowNormalBias: 0,
							shadowRadius: 1,
							shadowMapSize: new three_1.Vector2()
						};
						break;

					case 'SpotLight':
						uniforms = {
							shadowBias: 0,
							shadowNormalBias: 0,
							shadowRadius: 1,
							shadowMapSize: new three_1.Vector2()
						};
						break;

					case 'PointLight':
						uniforms = {
							shadowBias: 0,
							shadowNormalBias: 0,
							shadowRadius: 1,
							shadowMapSize: new three_1.Vector2(),
							shadowCameraNear: 1,
							shadowCameraFar: 1000
						};
						break;

					// TODO (abelnation): set RectAreaLight shadow uniforms

				}

				lights[ light.id ] = uniforms;

				return uniforms;

			}

		};

	}



	let nextVersion = 0;

	function shadowCastingAndTexturingLightsFirst( lightA, lightB ) {

		return ( lightB.castShadow ? 2 : 0 ) - ( lightA.castShadow ? 2 : 0 ) + ( lightB.map ? 1 : 0 ) - ( lightA.map ? 1 : 0 );

	}

	function WebGLLights( extensions, capabilities ) {

		const cache = new UniformsCache();

		const shadowCache = ShadowUniformsCache();

		const state = {

			version: 0,

			hash: {
				directionalLength: -1,
				pointLength: -1,
				spotLength: -1,
				rectAreaLength: -1,
				hemiLength: -1,

				numDirectionalShadows: -1,
				numPointShadows: -1,
				numSpotShadows: -1,
				numSpotMaps: -1,

				numLightProbes: -1
			},

			ambient: [ 0, 0, 0 ],
			probe: [],
			directional: [],
			directionalShadow: [],
			directionalShadowMap: [],
			directionalShadowMatrix: [],
			spot: [],
			spotLightMap: [],
			spotShadow: [],
			spotShadowMap: [],
			spotLightMatrix: [],
			rectArea: [],
			rectAreaLTC1: null,
			rectAreaLTC2: null,
			point: [],
			pointShadow: [],
			pointShadowMap: [],
			pointShadowMatrix: [],
			hemi: [],
			numSpotLightShadowsWithMaps: 0,
			numLightProbes: 0

		};

		for ( let i = 0; i < 9; i ++ ) state.probe.push( new three_1.Vector3() );

		const vector3 = new three_1.Vector3();
		const matrix4 = new three_1.Matrix4();
		const matrix42 = new three_1.Matrix4();

		function setup( lights, useLegacyLights ) {

			let r = 0, g = 0, b = 0;

			for ( let i = 0; i < 9; i ++ ) state.probe[ i ].set( 0, 0, 0 );

			let directionalLength = 0;
			let pointLength = 0;
			let spotLength = 0;
			let rectAreaLength = 0;
			let hemiLength = 0;

			let numDirectionalShadows = 0;
			let numPointShadows = 0;
			let numSpotShadows = 0;
			let numSpotMaps = 0;
			let numSpotShadowsWithMaps = 0;

			let numLightProbes = 0;

			// ordering : [shadow casting + map texturing, map texturing, shadow casting, none ]
			lights.sort( shadowCastingAndTexturingLightsFirst );

			// artist-friendly light intensity scaling factor
			const scaleFactor = ( useLegacyLights === true ) ? Math.PI : 1;

			for ( let i = 0, l = lights.length; i < l; i ++ ) {

				const light = lights[ i ];

				const color = light.color;
				const intensity = light.intensity;
				const distance = light.distance;

				const shadowMap = ( light.shadow && light.shadow.map ) ? light.shadow.map.texture : null;

				if ( light.isAmbientLight ) {

					r += color.r * intensity * scaleFactor;
					g += color.g * intensity * scaleFactor;
					b += color.b * intensity * scaleFactor;

				} else if ( light.isLightProbe ) {

					for ( let j = 0; j < 9; j ++ ) {

						state.probe[ j ].addScaledVector( light.sh.coefficients[ j ], intensity );

					}

					numLightProbes ++;

				} else if ( light.isDirectionalLight ) {

					const uniforms = cache.get( light );

					uniforms.color.copy( light.color ).multiplyScalar( light.intensity * scaleFactor );

					if ( light.castShadow ) {

						const shadow = light.shadow;

						const shadowUniforms = shadowCache.get( light );

						shadowUniforms.shadowBias = shadow.bias;
						shadowUniforms.shadowNormalBias = shadow.normalBias;
						shadowUniforms.shadowRadius = shadow.radius;
						shadowUniforms.shadowMapSize = shadow.mapSize;

						state.directionalShadow[ directionalLength ] = shadowUniforms;
						state.directionalShadowMap[ directionalLength ] = shadowMap;
						state.directionalShadowMatrix[ directionalLength ] = light.shadow.matrix;

						numDirectionalShadows ++;

					}

					state.directional[ directionalLength ] = uniforms;

					directionalLength ++;

				} else if ( light.isSpotLight ) {

					const uniforms = cache.get( light );

					uniforms.position.setFromMatrixPosition( light.matrixWorld );

					uniforms.color.copy( color ).multiplyScalar( intensity * scaleFactor );
					uniforms.distance = distance;

					uniforms.coneCos = Math.cos( light.angle );
					uniforms.penumbraCos = Math.cos( light.angle * ( 1 - light.penumbra ) );
					uniforms.decay = light.decay;

					state.spot[ spotLength ] = uniforms;

					const shadow = light.shadow;

					if ( light.map ) {

						state.spotLightMap[ numSpotMaps ] = light.map;
						numSpotMaps ++;

						// make sure the lightMatrix is up to date
						// TODO : do it if required only
						shadow.updateMatrices( light );

						if ( light.castShadow ) numSpotShadowsWithMaps ++;

					}

					state.spotLightMatrix[ spotLength ] = shadow.matrix;

					if ( light.castShadow ) {

						const shadowUniforms = shadowCache.get( light );

						shadowUniforms.shadowBias = shadow.bias;
						shadowUniforms.shadowNormalBias = shadow.normalBias;
						shadowUniforms.shadowRadius = shadow.radius;
						shadowUniforms.shadowMapSize = shadow.mapSize;

						state.spotShadow[ spotLength ] = shadowUniforms;
						state.spotShadowMap[ spotLength ] = shadowMap;

						numSpotShadows ++;

					}

					spotLength ++;

				} else if ( light.isRectAreaLight ) {

					const uniforms = cache.get( light );

					uniforms.color.copy( color ).multiplyScalar( intensity );

					uniforms.halfWidth.set( light.width * 0.5, 0.0, 0.0 );
					uniforms.halfHeight.set( 0.0, light.height * 0.5, 0.0 );

					state.rectArea[ rectAreaLength ] = uniforms;

					rectAreaLength ++;

				} else if ( light.isPointLight ) {

					const uniforms = cache.get( light );

					uniforms.color.copy( light.color ).multiplyScalar( light.intensity * scaleFactor );
					uniforms.distance = light.distance;
					uniforms.decay = light.decay;

					if ( light.castShadow ) {

						const shadow = light.shadow;

						const shadowUniforms = shadowCache.get( light );

						shadowUniforms.shadowBias = shadow.bias;
						shadowUniforms.shadowNormalBias = shadow.normalBias;
						shadowUniforms.shadowRadius = shadow.radius;
						shadowUniforms.shadowMapSize = shadow.mapSize;
						shadowUniforms.shadowCameraNear = shadow.camera.near;
						shadowUniforms.shadowCameraFar = shadow.camera.far;

						state.pointShadow[ pointLength ] = shadowUniforms;
						state.pointShadowMap[ pointLength ] = shadowMap;
						state.pointShadowMatrix[ pointLength ] = light.shadow.matrix;

						numPointShadows ++;

					}

					state.point[ pointLength ] = uniforms;

					pointLength ++;

				} else if ( light.isHemisphereLight ) {

					const uniforms = cache.get( light );

					uniforms.skyColor.copy( light.color ).multiplyScalar( intensity * scaleFactor );
					uniforms.groundColor.copy( light.groundColor ).multiplyScalar( intensity * scaleFactor );

					state.hemi[ hemiLength ] = uniforms;

					hemiLength ++;

				}

			}

			if ( rectAreaLength > 0 ) {

				if ( capabilities.isWebGL2 ) {

					// WebGL 2

					if ( extensions.has( 'OES_texture_float_linear' ) === true ) {

						state.rectAreaLTC1 = UniformsLib.LTC_FLOAT_1;
						state.rectAreaLTC2 = UniformsLib.LTC_FLOAT_2;

					} else {

						state.rectAreaLTC1 = UniformsLib.LTC_HALF_1;
						state.rectAreaLTC2 = UniformsLib.LTC_HALF_2;

					}

				} else {

					// WebGL 1

					if ( extensions.has( 'OES_texture_float_linear' ) === true ) {

						state.rectAreaLTC1 = UniformsLib.LTC_FLOAT_1;
						state.rectAreaLTC2 = UniformsLib.LTC_FLOAT_2;

					} else if ( extensions.has( 'OES_texture_half_float_linear' ) === true ) {

						state.rectAreaLTC1 = UniformsLib.LTC_HALF_1;
						state.rectAreaLTC2 = UniformsLib.LTC_HALF_2;

					} else {

						console.error( 'THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.' );

					}

				}

			}

			state.ambient[ 0 ] = r;
			state.ambient[ 1 ] = g;
			state.ambient[ 2 ] = b;

			const hash = state.hash;

			if ( hash.directionalLength !== directionalLength ||
				hash.pointLength !== pointLength ||
				hash.spotLength !== spotLength ||
				hash.rectAreaLength !== rectAreaLength ||
				hash.hemiLength !== hemiLength ||
				hash.numDirectionalShadows !== numDirectionalShadows ||
				hash.numPointShadows !== numPointShadows ||
				hash.numSpotShadows !== numSpotShadows ||
				hash.numSpotMaps !== numSpotMaps ||
				hash.numLightProbes !== numLightProbes ) {

				state.directional.length = directionalLength;
				state.spot.length = spotLength;
				state.rectArea.length = rectAreaLength;
				state.point.length = pointLength;
				state.hemi.length = hemiLength;

				state.directionalShadow.length = numDirectionalShadows;
				state.directionalShadowMap.length = numDirectionalShadows;
				state.pointShadow.length = numPointShadows;
				state.pointShadowMap.length = numPointShadows;
				state.spotShadow.length = numSpotShadows;
				state.spotShadowMap.length = numSpotShadows;
				state.directionalShadowMatrix.length = numDirectionalShadows;
				state.pointShadowMatrix.length = numPointShadows;
				state.spotLightMatrix.length = numSpotShadows + numSpotMaps - numSpotShadowsWithMaps;
				state.spotLightMap.length = numSpotMaps;
				state.numSpotLightShadowsWithMaps = numSpotShadowsWithMaps;
				state.numLightProbes = numLightProbes;

				hash.directionalLength = directionalLength;
				hash.pointLength = pointLength;
				hash.spotLength = spotLength;
				hash.rectAreaLength = rectAreaLength;
				hash.hemiLength = hemiLength;

				hash.numDirectionalShadows = numDirectionalShadows;
				hash.numPointShadows = numPointShadows;
				hash.numSpotShadows = numSpotShadows;
				hash.numSpotMaps = numSpotMaps;

				hash.numLightProbes = numLightProbes;

				state.version = nextVersion ++;

			}

		}

		function setupView( lights, camera ) {

			let directionalLength = 0;
			let pointLength = 0;
			let spotLength = 0;
			let rectAreaLength = 0;
			let hemiLength = 0;

			const viewMatrix = camera.matrixWorldInverse;

			for ( let i = 0, l = lights.length; i < l; i ++ ) {

				const light = lights[ i ];

				if ( light.isDirectionalLight ) {

					const uniforms = state.directional[ directionalLength ];

					uniforms.direction.setFromMatrixPosition( light.matrixWorld );
					vector3.setFromMatrixPosition( light.target.matrixWorld );
					uniforms.direction.sub( vector3 );
					uniforms.direction.transformDirection( viewMatrix );

					directionalLength ++;

				} else if ( light.isSpotLight ) {

					const uniforms = state.spot[ spotLength ];

					uniforms.position.setFromMatrixPosition( light.matrixWorld );
					uniforms.position.applyMatrix4( viewMatrix );

					uniforms.direction.setFromMatrixPosition( light.matrixWorld );
					vector3.setFromMatrixPosition( light.target.matrixWorld );
					uniforms.direction.sub( vector3 );
					uniforms.direction.transformDirection( viewMatrix );

					spotLength ++;

				} else if ( light.isRectAreaLight ) {

					const uniforms = state.rectArea[ rectAreaLength ];

					uniforms.position.setFromMatrixPosition( light.matrixWorld );
					uniforms.position.applyMatrix4( viewMatrix );

					// extract local rotation of light to derive width/height half vectors
					matrix42.identity();
					matrix4.copy( light.matrixWorld );
					matrix4.premultiply( viewMatrix );
					matrix42.extractRotation( matrix4 );

					uniforms.halfWidth.set( light.width * 0.5, 0.0, 0.0 );
					uniforms.halfHeight.set( 0.0, light.height * 0.5, 0.0 );

					uniforms.halfWidth.applyMatrix4( matrix42 );
					uniforms.halfHeight.applyMatrix4( matrix42 );

					rectAreaLength ++;

				} else if ( light.isPointLight ) {

					const uniforms = state.point[ pointLength ];

					uniforms.position.setFromMatrixPosition( light.matrixWorld );
					uniforms.position.applyMatrix4( viewMatrix );

					pointLength ++;

				} else if ( light.isHemisphereLight ) {

					const uniforms = state.hemi[ hemiLength ];

					uniforms.direction.setFromMatrixPosition( light.matrixWorld );
					uniforms.direction.transformDirection( viewMatrix );

					hemiLength ++;

				}

			}

		}

		return {
			setup: setup,
			setupView: setupView,
			state: state
		};

	}

	function WebGLRenderState( extensions, capabilities ) {

		const lights = new WebGLLights( extensions, capabilities );

		const lightsArray = [];
		const shadowsArray = [];

		function init() {

			lightsArray.length = 0;
			shadowsArray.length = 0;

		}

		function pushLight( light ) {

			lightsArray.push( light );

		}

		function pushShadow( shadowLight ) {

			shadowsArray.push( shadowLight );

		}

		function setupLights( useLegacyLights ) {

			lights.setup( lightsArray, useLegacyLights );

		}

		function setupLightsView( camera ) {

			lights.setupView( lightsArray, camera );

		}

		const state = {
			lightsArray: lightsArray,
			shadowsArray: shadowsArray,

			lights: lights
		};

		return {
			init: init,
			state: state,
			setupLights: setupLights,
			setupLightsView: setupLightsView,

			pushLight: pushLight,
			pushShadow: pushShadow
		};

	}

	function WebGLRenderStates( extensions, capabilities ) {

		let renderStates = new WeakMap();

		function get( scene, renderCallDepth = 0 ) {

			const renderStateArray = renderStates.get( scene );
			let renderState;

			if ( renderStateArray === undefined ) {

				renderState = new WebGLRenderState( extensions, capabilities );
				renderStates.set( scene, [ renderState ] );

			} else {

				if ( renderCallDepth >= renderStateArray.length ) {

					renderState = new WebGLRenderState( extensions, capabilities );
					renderStateArray.push( renderState );

				} else {

					renderState = renderStateArray[ renderCallDepth ];

				}

			}

			return renderState;

		}

		function dispose() {

			renderStates = new WeakMap();

		}

		return {
			get: get,
			dispose: dispose
		};

	}

	class MeshDepthMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshDepthMaterial = true;

			this.type = 'MeshDepthMaterial';

			this.depthPacking = three_1.BasicDepthPacking;

			this.map = null;

			this.alphaMap = null;

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.wireframe = false;
			this.wireframeLinewidth = 1;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.depthPacking = source.depthPacking;

			this.map = source.map;

			this.alphaMap = source.alphaMap;

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			this.wireframe = source.wireframe;
			this.wireframeLinewidth = source.wireframeLinewidth;

			return this;

		}

	}

	class MeshDistanceMaterial extends three_1.Material {

		constructor( parameters ) {

			super();

			this.isMeshDistanceMaterial = true;

			this.type = 'MeshDistanceMaterial';

			this.map = null;

			this.alphaMap = null;

			this.displacementMap = null;
			this.displacementScale = 1;
			this.displacementBias = 0;

			this.setValues( parameters );

		}

		copy( source ) {

			super.copy( source );

			this.map = source.map;

			this.alphaMap = source.alphaMap;

			this.displacementMap = source.displacementMap;
			this.displacementScale = source.displacementScale;
			this.displacementBias = source.displacementBias;

			return this;

		}

	}

	const vertex = /* glsl */`
void main() {

	gl_Position = vec4( position, 1.0 );

}
`;

	const fragment = /* glsl */`
uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;

#include <packing>

void main() {

	const float samples = float( VSM_SAMPLES );

	float mean = 0.0;
	float squared_mean = 0.0;

	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {

		float uvOffset = uvStart + i * uvStride;

		#ifdef HORIZONTAL_PASS

			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;

		#else

			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;

		#endif

	}

	mean = mean / samples;
	squared_mean = squared_mean / samples;

	float std_dev = sqrt( squared_mean - mean * mean );

	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );

}
`;

	function WebGLShadowMap( _renderer, _objects, _capabilities ) {

		let _frustum = new three_2.Frustum();

		const _shadowMapSize = new three_1.Vector2(),
			_viewportSize = new three_1.Vector2(),

			_viewport = new three_1.Vector4(),

			_depthMaterial = new MeshDepthMaterial( { depthPacking: three_1.RGBADepthPacking } ),
			_distanceMaterial = new MeshDistanceMaterial(),

			_materialCache = {},

			_maxTextureSize = _capabilities.maxTextureSize;

		const shadowSide = { [ three_1.FrontSide ]: three_1.BackSide, [ three_1.BackSide ]: three_1.FrontSide, [ three_1.DoubleSide ]: three_1.DoubleSide };

		const shadowMaterialVertical = new three_2.ShaderMaterial( {
			defines: {
				VSM_SAMPLES: 8
			},
			uniforms: {
				shadow_pass: { value: null },
				resolution: { value: new three_1.Vector2() },
				radius: { value: 4.0 }
			},

			vertexShader: vertex,
			fragmentShader: fragment

		} );

		const shadowMaterialHorizontal = shadowMaterialVertical.clone();
		shadowMaterialHorizontal.defines.HORIZONTAL_PASS = 1;

		const fullScreenTri = new three_2.BufferGeometry();
		fullScreenTri.setAttribute(
			'position',
			new three_1.BufferAttribute(
				new Float32Array( [ -1, -1, 0.5, 3, -1, 0.5, -1, 3, 0.5 ] ),
				3
			)
		);

		const fullScreenMesh = new three_2.Mesh( fullScreenTri, shadowMaterialVertical );

		const scope = this;

		this.enabled = false;

		this.autoUpdate = true;
		this.needsUpdate = false;

		this.type = three_1.PCFShadowMap;
		let _previousType = this.type;

		this.render = function ( lights, scene, camera ) {

			if ( scope.enabled === false ) return;
			if ( scope.autoUpdate === false && scope.needsUpdate === false ) return;

			if ( lights.length === 0 ) return;

			const currentRenderTarget = _renderer.getRenderTarget();
			const activeCubeFace = _renderer.getActiveCubeFace();
			const activeMipmapLevel = _renderer.getActiveMipmapLevel();

			const _state = _renderer.state;

			// Set GL state for depth map.
			_state.setBlending( three_1.NoBlending );
			_state.buffers.color.setClear( 1, 1, 1, 1 );
			_state.buffers.depth.setTest( true );
			_state.setScissorTest( false );

			// check for shadow map type changes

			const toVSM = ( _previousType !== three_1.VSMShadowMap && this.type === three_1.VSMShadowMap );
			const fromVSM = ( _previousType === three_1.VSMShadowMap && this.type !== three_1.VSMShadowMap );

			// render depth map

			for ( let i = 0, il = lights.length; i < il; i ++ ) {

				const light = lights[ i ];
				const shadow = light.shadow;

				if ( shadow === undefined ) {

					console.warn( 'THREE.WebGLShadowMap:', light, 'has no shadow.' );
					continue;

				}

				if ( shadow.autoUpdate === false && shadow.needsUpdate === false ) continue;

				_shadowMapSize.copy( shadow.mapSize );

				const shadowFrameExtents = shadow.getFrameExtents();

				_shadowMapSize.multiply( shadowFrameExtents );

				_viewportSize.copy( shadow.mapSize );

				if ( _shadowMapSize.x > _maxTextureSize || _shadowMapSize.y > _maxTextureSize ) {

					if ( _shadowMapSize.x > _maxTextureSize ) {

						_viewportSize.x = Math.floor( _maxTextureSize / shadowFrameExtents.x );
						_shadowMapSize.x = _viewportSize.x * shadowFrameExtents.x;
						shadow.mapSize.x = _viewportSize.x;

					}

					if ( _shadowMapSize.y > _maxTextureSize ) {

						_viewportSize.y = Math.floor( _maxTextureSize / shadowFrameExtents.y );
						_shadowMapSize.y = _viewportSize.y * shadowFrameExtents.y;
						shadow.mapSize.y = _viewportSize.y;

					}

				}

				if ( shadow.map === null || toVSM === true || fromVSM === true ) {

					const pars = ( this.type !== three_1.VSMShadowMap ) ? { minFilter: three_1.NearestFilter, magFilter: three_1.NearestFilter } : {};

					if ( shadow.map !== null ) {

						shadow.map.dispose();

					}

					shadow.map = new three_1.WebGLRenderTarget( _shadowMapSize.x, _shadowMapSize.y, pars );
					shadow.map.texture.name = light.name + '.shadowMap';

					shadow.camera.updateProjectionMatrix();

				}

				_renderer.setRenderTarget( shadow.map );
				_renderer.clear();

				const viewportCount = shadow.getViewportCount();

				for ( let vp = 0; vp < viewportCount; vp ++ ) {

					const viewport = shadow.getViewport( vp );

					_viewport.set(
						_viewportSize.x * viewport.x,
						_viewportSize.y * viewport.y,
						_viewportSize.x * viewport.z,
						_viewportSize.y * viewport.w
					);

					_state.viewport( _viewport );

					shadow.updateMatrices( light, vp );

					_frustum = shadow.getFrustum();

					renderObject( scene, camera, shadow.camera, light, this.type );

				}

				// do blur pass for VSM

				if ( shadow.isPointLightShadow !== true && this.type === three_1.VSMShadowMap ) {

					VSMPass( shadow, camera );

				}

				shadow.needsUpdate = false;

			}

			_previousType = this.type;

			scope.needsUpdate = false;

			_renderer.setRenderTarget( currentRenderTarget, activeCubeFace, activeMipmapLevel );

		};

		function VSMPass( shadow, camera ) {

			const geometry = _objects.update( fullScreenMesh );

			if ( shadowMaterialVertical.defines.VSM_SAMPLES !== shadow.blurSamples ) {

				shadowMaterialVertical.defines.VSM_SAMPLES = shadow.blurSamples;
				shadowMaterialHorizontal.defines.VSM_SAMPLES = shadow.blurSamples;

				shadowMaterialVertical.needsUpdate = true;
				shadowMaterialHorizontal.needsUpdate = true;

			}

			if ( shadow.mapPass === null ) {

				shadow.mapPass = new three_1.WebGLRenderTarget( _shadowMapSize.x, _shadowMapSize.y );

			}

			// vertical pass

			shadowMaterialVertical.uniforms.shadow_pass.value = shadow.map.texture;
			shadowMaterialVertical.uniforms.resolution.value = shadow.mapSize;
			shadowMaterialVertical.uniforms.radius.value = shadow.radius;
			_renderer.setRenderTarget( shadow.mapPass );
			_renderer.clear();
			_renderer.renderBufferDirect( camera, null, geometry, shadowMaterialVertical, fullScreenMesh, null );

			// horizontal pass

			shadowMaterialHorizontal.uniforms.shadow_pass.value = shadow.mapPass.texture;
			shadowMaterialHorizontal.uniforms.resolution.value = shadow.mapSize;
			shadowMaterialHorizontal.uniforms.radius.value = shadow.radius;
			_renderer.setRenderTarget( shadow.map );
			_renderer.clear();
			_renderer.renderBufferDirect( camera, null, geometry, shadowMaterialHorizontal, fullScreenMesh, null );

		}

		function getDepthMaterial( object, material, light, type ) {

			let result = null;

			const customMaterial = ( light.isPointLight === true ) ? object.customDistanceMaterial : object.customDepthMaterial;

			if ( customMaterial !== undefined ) {

				result = customMaterial;

			} else {

				result = ( light.isPointLight === true ) ? _distanceMaterial : _depthMaterial;

				if ( ( _renderer.localClippingEnabled && material.clipShadows === true && Array.isArray( material.clippingPlanes ) && material.clippingPlanes.length !== 0 ) ||
					( material.displacementMap && material.displacementScale !== 0 ) ||
					( material.alphaMap && material.alphaTest > 0 ) ||
					( material.map && material.alphaTest > 0 ) ) {

					// in this case we need a unique material instance reflecting the
					// appropriate state

					const keyA = result.uuid, keyB = material.uuid;

					let materialsForVariant = _materialCache[ keyA ];

					if ( materialsForVariant === undefined ) {

						materialsForVariant = {};
						_materialCache[ keyA ] = materialsForVariant;

					}

					let cachedMaterial = materialsForVariant[ keyB ];

					if ( cachedMaterial === undefined ) {

						cachedMaterial = result.clone();
						materialsForVariant[ keyB ] = cachedMaterial;
						material.addEventListener( 'dispose', onMaterialDispose );

					}

					result = cachedMaterial;

				}

			}

			result.visible = material.visible;
			result.wireframe = material.wireframe;

			if ( type === three_1.VSMShadowMap ) {

				result.side = ( material.shadowSide !== null ) ? material.shadowSide : material.side;

			} else {

				result.side = ( material.shadowSide !== null ) ? material.shadowSide : shadowSide[ material.side ];

			}

			result.alphaMap = material.alphaMap;
			result.alphaTest = material.alphaTest;
			result.map = material.map;

			result.clipShadows = material.clipShadows;
			result.clippingPlanes = material.clippingPlanes;
			result.clipIntersection = material.clipIntersection;

			result.displacementMap = material.displacementMap;
			result.displacementScale = material.displacementScale;
			result.displacementBias = material.displacementBias;

			result.wireframeLinewidth = material.wireframeLinewidth;
			result.linewidth = material.linewidth;

			if ( light.isPointLight === true && result.isMeshDistanceMaterial === true ) {

				const materialProperties = _renderer.properties.get( result );
				materialProperties.light = light;

			}

			return result;

		}

		function renderObject( object, camera, shadowCamera, light, type ) {

			if ( object.visible === false ) return;

			const visible = object.layers.test( camera.layers );

			if ( visible && ( object.isMesh || object.isLine || object.isPoints ) ) {

				if ( ( object.castShadow || ( object.receiveShadow && type === three_1.VSMShadowMap ) ) && ( ! object.frustumCulled || _frustum.intersectsObject( object ) ) ) {

					object.modelViewMatrix.multiplyMatrices( shadowCamera.matrixWorldInverse, object.matrixWorld );

					const geometry = _objects.update( object );
					const material = object.material;

					if ( Array.isArray( material ) ) {

						const groups = geometry.groups;

						for ( let k = 0, kl = groups.length; k < kl; k ++ ) {

							const group = groups[ k ];
							const groupMaterial = material[ group.materialIndex ];

							if ( groupMaterial && groupMaterial.visible ) {

								const depthMaterial = getDepthMaterial( object, groupMaterial, light, type );

								object.onBeforeShadow( _renderer, object, camera, shadowCamera, geometry, depthMaterial, group );

								_renderer.renderBufferDirect( shadowCamera, null, geometry, depthMaterial, object, group );

								object.onAfterShadow( _renderer, object, camera, shadowCamera, geometry, depthMaterial, group );

							}

						}

					} else if ( material.visible ) {

						const depthMaterial = getDepthMaterial( object, material, light, type );

						object.onBeforeShadow( _renderer, object, camera, shadowCamera, geometry, depthMaterial, null );

						_renderer.renderBufferDirect( shadowCamera, null, geometry, depthMaterial, object, null );

						object.onAfterShadow( _renderer, object, camera, shadowCamera, geometry, depthMaterial, null );

					}

				}

			}

			const children = object.children;

			for ( let i = 0, l = children.length; i < l; i ++ ) {

				renderObject( children[ i ], camera, shadowCamera, light, type );

			}

		}

		function onMaterialDispose( event ) {

			const material = event.target;

			material.removeEventListener( 'dispose', onMaterialDispose );

			// make sure to remove the unique distance/depth materials used for shadow map rendering

			for ( const id in _materialCache ) {

				const cache = _materialCache[ id ];

				const uuid = event.target.uuid;

				if ( uuid in cache ) {

					const shadowMaterial = cache[ uuid ];
					shadowMaterial.dispose();
					delete cache[ uuid ];

				}

			}

		}

	}

	exports.DepthTexture = DepthTexture;
	exports.MeshDepthMaterial = MeshDepthMaterial;
	exports.MeshDistanceMaterial = MeshDistanceMaterial;
	exports.OrthographicCamera = OrthographicCamera;
	exports.PMREMGenerator = PMREMGenerator;
	exports.ShaderChunk = ShaderChunk;
	exports.ShaderLib = ShaderLib;
	exports.UniformsLib = UniformsLib;
	exports.WebGLBackground = WebGLBackground;
	exports.WebGLBindingStates = WebGLBindingStates;
	exports.WebGLBufferRenderer = WebGLBufferRenderer;
	exports.WebGLCapabilities = WebGLCapabilities;
	exports.WebGLClipping = WebGLClipping;
	exports.WebGLCubeMaps = WebGLCubeMaps;
	exports.WebGLCubeUVMaps = WebGLCubeUVMaps;
	exports.WebGLExtensions = WebGLExtensions;
	exports.WebGLGeometries = WebGLGeometries;
	exports.WebGLIndexedBufferRenderer = WebGLIndexedBufferRenderer;
	exports.WebGLInfo = WebGLInfo;
	exports.WebGLMorphtargets = WebGLMorphtargets;
	exports.WebGLObjects = WebGLObjects;
	exports.WebGLPrograms = WebGLPrograms;
	exports.WebGLProperties = WebGLProperties;
	exports.WebGLRenderLists = WebGLRenderLists;
	exports.WebGLRenderStates = WebGLRenderStates;
	exports.WebGLShadowMap = WebGLShadowMap;
	exports.WebGLUniforms = WebGLUniforms;

}));
