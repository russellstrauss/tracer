const { Vector3, Clock, MathUtils } = require('three');

module.exports = function() {

	var settings = {
		defaultCameraLocation: {
			x: 500,
			y: 500,
			z: 500
		},
		colors: {
			worldColor: new THREE.Color('#000')
		},
		iOS: {
			particleSize: 8,
			starSize: 3
		}
		
	};
	
	var geometry, origin = new THREE.Vector3(0, 0, 0);
	var initialized = false, frameCount = 0;
	var renderer, scene, camera, controls, clock, dt;
	var black = new THREE.Color('black'), white = new THREE.Color('white'), green = new THREE.Color(0x00ff00), red = new THREE.Color('#ED0000'), blue = new THREE.Color(0x0000ff);
	let interps = [d3.interpolateRainbow, d3.interpolateRgb('#450F66', '#B36002'), d3.interpolateRgb('white', 'red'), d3.interpolateSinebow, d3.interpolateYlOrRd, d3.interpolateYlGnBu,d3.interpolateRdPu, d3.interpolatePuBu, d3.interpolateGnBu, d3.interpolateBuPu, d3.interpolateCubehelixDefault, d3.interpolateCool, d3.interpolateWarm, d3.interpolateCividis, d3.interpolatePlasma, d3.interpolateMagma, d3.interpolateInferno, d3.interpolateViridis, d3.interpolateTurbo, d3.interpolatePurples, d3.interpolateReds, d3.interpolateOranges, d3.interpolateGreys, d3.interpolateGreens, d3.interpolateBlues, d3.interpolateSpectral, d3.interpolateRdYlBu, d3.interpolateRdBu, d3.interpolatePuOr, d3.interpolatePiYG, d3.interpolatePRGn]
	var prevParticlePosition = null;
	
	return {
		
		init: function() {
			this.begin();
		},
		
		begin: function() {
			
			scene = gfx.setUpScene();
			renderer = gfx.setUpRenderer(renderer);
			camera = gfx.setUpCamera(camera);
			scene.background = settings.colors.worldColor;
			clock = new THREE.Clock();
			controls = gfx.enableControls(controls, renderer, camera);
			gfx.resizeRendererOnWindowResize(renderer, camera);
			gfx.setUpLights();
			gfx.setCameraLocation(camera, settings.defaultCameraLocation);
			this.addStars();
			this.addParticles();
			this.firstFrame();
			
			var animate = () => {
				requestAnimationFrame(animate);
				controls.update();
				this.everyFrame();
				renderer.render(scene, camera);
			};
			animate(); 
		},
		
		firstFrame: function() {
			
		},
		
		everyFrame: function() {
			
			if (!initialized) this.firstFrame();
			// this.updateCamera();
			this.updateParticles();
			frameCount++;
		},
		
		createCameraTrajectory: function() {
			
			let prevPt = null;
			
			let truncateSpiral = 0;
			for (let i = truncateSpiral; i < trajectory_iteration_count - 1; i += 2 * Math.PI / trajectory_iteration_count) {
				
				// # Calculate curve point position
				let radius_scale = 1000;
				let a = .0001;
				let k = .25;
				let spiral_x = radius_scale * a * Math.pow(Math.E, k * i) * Math.cos(i);
				let spiral_y = 500;
				let spiral_z = radius_scale * a * Math.pow(Math.E, k * i) * Math.sin(i);
				let spiralPt = new THREE.Vector3(spiral_x, spiral_y, spiral_z);
				
				if (prevPt !== null) {
					
					let showLine = false;
					if (showLine === true && prevPt != new THREE.Vector3(0, 0, 0)) gfx.drawLineFromPoints(prevPt, spiralPt);
					
					curve.push(spiralPt);
				}
				prevPt = spiralPt
			}
			curve.reverse();
			for (let j = curve.length - 1; j >= 0; j--) { // mirror and append the curve
				curve.push(curve[j]);
			}
			this.catmullRomSpline(curve);
		},
		
		updateCamera: function() {
			dt = clock.getDelta();
			clock.start();
	
			let cameraPosition = catmullRomCurve.getPointAt(progress);
			camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
			camera.lookAt(cameraFocalPoint);
			
			
			if (camera.position.distanceTo(origin) < 505) camera_speed = default_camera_speed * (camera.position.distanceTo(origin) - 500) * 100; // prevent spin out at center of log spiral
			else {
				camera_speed = default_camera_speed;
			}
		
			progress += dt * camera_speed;
			if (progress > (1-(dt * camera_speed))) progress = 0;
		},
		
		addStars: function() {
			let geometry = new THREE.BufferGeometry();
			let vertices = [];
			for (let i = 0; i < 10000; i++) {
				vertices.push(THREE.MathUtils.randFloatSpread(4000)); vertices.push(THREE.MathUtils.randFloatSpread(4000)); vertices.push(THREE.MathUtils.randFloatSpread(4000));
			}
			
			let size = 1;
			if (utils.iOS() == true) size = settings.iOS.starSize;
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			let particles = new THREE.Points(geometry, new THREE.PointsMaterial({ 
				color: 0x888888,
				size: size
			}));
			scene.add(particles);
		},
		
		addParticles: function() {
			
			geometry = new THREE.Geometry();
			
			let vertices = [];
			for (let i = 0; i < 10; i++) {
				let min = -10;
				let max =  10;
				let spread = Math.random() * (max - min) + min;
				geometry.vertices.push(new THREE.Vector3(THREE.MathUtils.randFloatSpread(spread), THREE.MathUtils.randFloatSpread(spread), THREE.MathUtils.randFloatSpread(spread)));
				geometry.vertices[i].prevPt = new THREE.Vector3(0, 0, 0);
				geometry.vertices[i].trail = [];
			}
			
			let colors = this.interpolateD3Colors(geometry, interps[5], true);
			
			let size = 10;
			if (utils.iOS() == true) size = settings.iOS.particleSize;
			let particles = new THREE.Points(geometry, new THREE.PointsMaterial({ 
				// vertexColors: THREE.VertexColors,
				color: 0xff0000,
				size: size
			}));
			scene.add(particles);
		},
		
		updateParticles: function() {
			if (geometry) {
				
				for (let i = 0; i < geometry.vertices.length; i++) {
					
					let min = -10; // reset location if out of view
					let max = 10;
					let maxDistance = 1000  + (Math.random() * (max - min) + min);
					if (geometry.vertices[i].distanceTo(origin) > maxDistance) geometry.vertices[i].set(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
					
					let scalar = .02;
					let x = -geometry.vertices[i].y * scalar; // vector field for applying force to particles
					let y = -geometry.vertices[i].z * scalar;
					let z =  - geometry.vertices[i].x * scalar;
					let force =  new THREE.Vector3(x, y, z);
					geometry.vertices[i].set(geometry.vertices[i].x + force.x, geometry.vertices[i].y + force.y, geometry.vertices[i].z + force.z);
					geometry.vertices[i].trail.push(geometry.vertices[i]);
					
					if (typeof geometry.vertices[i].prevPt != new THREE.Vector3(0, 0, 0)) {
						// this.catmullRomSpline(geometry.vertices[i]);
						// gfx.drawLineFromPoints(geometry.vertices[i].prevPt, geometry.vertices[i]);
					}
					
					geometry.vertices[i].prevPt = new THREE.Vector3(geometry.vertices[i].x, geometry.vertices[i].y, geometry.vertices[i].z);
				}
				geometry.verticesNeedUpdate = true;
			}
		},
		
		catmullRomSpline: function(vertex) {
			
			let curveArray =  [
				new THREE.Vector3( -10, 0, 10 ),
				new THREE.Vector3( -5, 5, 5 ),
				new THREE.Vector3( 0, 0, 0 ),
				new THREE.Vector3( 5, -5, 5 ),
				new THREE.Vector3( 10, 0, 10 )
			];
			// curveArray = vertex.trail;
			console.log(vertex.trail)
			let catmullRomCurve = new THREE.CatmullRomCurve3(curveArray);
			const points = catmullRomCurve.getPoints(curveArray.length);
			const bufferGeometry = new THREE.BufferGeometry().setFromPoints( points );
			const material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
			let curveObject = new THREE.Line( bufferGeometry, material );
			scene.remove(curveObject);
			scene.add(curveObject);
		},
		
		interpolateD3Colors: function(geometry, interpolatorFunc, reverse) {
			
			reverse = reverse || false;
			let colors = [];
			
			let vertexCount = geometry.vertices.length;
			for (let i = 0; i < vertexCount; i++) {
				let interpolator = (i/(vertexCount - 1));
				colors[i] = this.rgbStringToColor(interpolatorFunc(interpolator));
				geometry.colors.push(colors[i]);
			}
			if (reverse) colors.reverse();
			return colors;
		},
		
		rgbStringToColor: function(rgbString) {
			rgbString = rgbString.replace('rgb(','').replace(')','').replace(' ','').split(',');
			return new THREE.Color(rgbString[0]/255, rgbString[1]/255, rgbString[2]/255);
		}
	}
}