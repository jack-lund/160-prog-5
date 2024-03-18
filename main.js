import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'dat.gui'

// Planets from https://www.solarsystemscope.com/textures/

let mode = 'heller';
let child;
let controls;
let renderer;
let scene;
let gui
let doraObjects = [];
let doragltf = undefined;
let camera;

let settings = {
  doras: 55,
  connectLoop: false,
  speed: 0.0005,
  drawPoints: false,
  drawLines: false,
};

let p3 = {x: 0, y: 0, z: 0}
let p2 = {x: 0, y: 0, z: 0}

const options = {
  moonSpawnEnabled: true
};

function updateDoras() {
  doraObjects.forEach(dora => {
      scene.remove(dora.dora);
  });
  doraObjects = [];
  for (let i = 0; i < settings.doras; i++) {
      const doraInstance = doragltf.clone();
      doraInstance.scale.set(0.1, 0.1, 0.1);
      doraInstance.position.set(i * 2, 0, 0);
      doraObjects.push({i: i, dora: doraInstance, offset: (i * (1 / settings.doras))});
      scene.add(doraInstance);
  }
}

function changeAdv(newmode) {
  if (newmode == 'space') {
    options.moonSpawnEnabled = true;
  } else if (newmode == 'heller') {
    options.moonSpawnEnabled = false;
  }
  const parent = document.getElementsByClassName("dg ac");
  parent[0].removeChild(gui.domElement);
  renderer.dispose();
  document.body.removeChild(child);
  controls.dispose();
  mode = newmode;
  display();
}

function killDora() {
    const random = Math.floor(Math.random() * doraObjects.length);
    scene.remove(doraObjects[random].dora);
}


// Initial Points
let controlPoints;

function colinear(p0, p1) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  return {x: p1.x + dx, y: p1.y + dy, z: p1.z + dz};
}

let spheres = [];
let lines = [];
const sphereGeometry = new THREE.SphereGeometry(0.5, 10, 10);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const selectedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
let selectedSphere = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

document.addEventListener('mousedown', onMouseDown);

function onMouseDown(event) {

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const allspheres = spheres.flatMap(curve => curve);
  const intersects = raycaster.intersectObjects(allspheres);
  if (intersects.length > 0) {
    if (selectedSphere == intersects[0].object) {
      selectedSphere.material = sphereMaterial;
      selectedSphere = null;
    } else if (selectedSphere) {
      selectedSphere.material = sphereMaterial;
      selectedSphere = intersects[0].object
      selectedSphere.material = selectedMaterial;
    } else {
      selectedSphere = intersects[0].object
      selectedSphere.material = selectedMaterial;
    }
  }
}

function movePoint(v, a) {
  if (selectedSphere) {
    selectedSphere.position[v] += a;
    drawLines();
    controlPoints = [];
    for (const sphereset of spheres) {
      const newset = [];
      for (const sphere of sphereset) {
        newset.push({x: sphere.position.x, y: sphere.position.y, z: sphere.position.z})
      }
      controlPoints.push(newset);
    }
    console.log(JSON.stringify(controlPoints));
  }
}

const lineMaterial = new THREE.LineBasicMaterial( { color: 0x0000ff } );

function drawLines() {
  if (lines.length != 0) {
    for (const line of lines) {
      scene.remove(line);
    }
  }
  if (settings.drawLines) {
    for (const set of spheres) {
      const points = [];
      points.push(set[0].position);
      points.push(set[1].position);
      points.push(set[3].position);
      points.push(set[2].position);
      points.push(set[0].position);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
      const line = new THREE.Line( lineGeometry, lineMaterial );
      lines.push(line);
      scene.add( line );
    }
  }
}

function plotPoints() {
  if (spheres.length != 0) {
    scene.remove(spheres[0][0]);
    for (const sphereset of spheres) {
      for (let i = 1; i < 4; i++) {
          scene.remove(sphereset[i]);
      }
    }
  }

  spheres = [];
  let refpoint = undefined;
  for (const curve of controlPoints) {
    const set = []
    let sphere;
    if (refpoint == undefined) {
      sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(new THREE.Vector3(curve[0].x, curve[0].y, curve[0].z));
      if (settings.drawPoints) {
        scene.add(sphere);
      }
    } else {
      sphere = refpoint;
    }
    set.push(sphere);

    for (let i = 1; i < 4; i++) {
      sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(new THREE.Vector3(curve[i].x, curve[i].y, curve[i].z));
      if (settings.drawPoints) {
        scene.add(sphere);
      }
      set.push(sphere);
    }
    refpoint = sphere;
    spheres.push(set);
    drawLines();
  }
}

function addPointGUI() {
  controlPoints = [];
  for (const sphereset of spheres) {
    const newset = [];
    for (const sphere of sphereset) {
      newset.push({x: sphere.position.x, y: sphere.position.y, z: sphere.position.z})
    }
    controlPoints.push(newset);
  }

  if (settings.connectLoop == true) {
    for (let i = 1; i < 4; i++) {
      scene.remove(spheres[spheres.length - 1][i]);
    }
    spheres.pop();
    controlPoints.pop();

    controlPoints.push([
      controlPoints[controlPoints.length - 1][3],
      colinear(controlPoints[controlPoints.length - 1][2], controlPoints[controlPoints.length - 1][3]),
      {x: p2.x, y: p2.y, z: p2.z},
      {x: p3.x, y: p3.y, z: p3.z},
    ]);

    controlPoints.push([
      controlPoints[controlPoints.length - 1][3],
      colinear(controlPoints[controlPoints.length - 1][2], controlPoints[controlPoints.length - 1][3]),
      colinear(controlPoints[0][1], controlPoints[0][0]),
      controlPoints[0][0],
    ])

  } else {
    controlPoints.push([
      controlPoints[controlPoints.length - 1][3],
      colinear(controlPoints[controlPoints.length - 1][2], controlPoints[controlPoints.length - 1][3]),
      {x: p2.x, y: p2.y, z: p2.z},
      {x: p3.x, y: p3.y, z: p3.z},
    ]);
  }
  plotPoints();
}

function loopChange() {
  controlPoints = [];
  for (const sphereset of spheres) {
    const newset = [];
    for (const sphere of sphereset) {
      newset.push({x: sphere.position.x, y: sphere.position.y, z: sphere.position.z})
    }
    controlPoints.push(newset);
  }
  if (settings.connectLoop == true) {
    controlPoints.push([
      controlPoints[controlPoints.length - 1][3],
      colinear(controlPoints[controlPoints.length - 1][2], controlPoints[controlPoints.length - 1][3]),
      colinear(controlPoints[0][1], controlPoints[0][0]),
      controlPoints[0][0],
    ])
    plotPoints();
  } else {
    for (let i = 1; i < 4; i++) {
      scene.remove(spheres[spheres.length - 1][i]);
      scene.remove(lines[lines.length - 1]);
    }
    spheres.pop();
    controlPoints.pop();
    lines.pop();
  }
}

function piecewiseCubicBezier(t, CP) {

  t = t % 1;
  var relativeIndex = Math.floor(t * (controlPoints.length));
  var relativeT = (t * (controlPoints.length)) % 1;

  var p0 = spheres[relativeIndex][0].position;
  var p1 = spheres[relativeIndex][1].position;
  var p2 = spheres[relativeIndex][2].position;
  var p3 = spheres[relativeIndex][3].position;


  var x = (1 - relativeT) ** 3 * p0.x + 3 * (1 - relativeT) ** 2 * relativeT * p1.x + 3 * (1 - relativeT) * relativeT ** 2 * p2.x + relativeT ** 3 * p3.x;
  var y = (1 - relativeT) ** 3 * p0.y + 3 * (1 - relativeT) ** 2 * relativeT * p1.y + 3 * (1 - relativeT) * relativeT ** 2 * p2.y + relativeT ** 3 * p3.y;
  var z = (1 - relativeT) ** 3 * p0.z + 3 * (1 - relativeT) ** 2 * relativeT * p1.z + 3 * (1 - relativeT) * relativeT ** 2 * p2.z + relativeT ** 3 * p3.z;

  return {x: x, y: y, z: z};
}

display();

function display() {
  if (mode == 'space') {

    controlPoints = [[{"x":5,"y":5,"z":5},{"x":7,"y":13,"z":7},{"x":7,"y":-13,"z":7},{"x":5,"y":-5,"z":5}],[{"x":5,"y":-5,"z":5},{"x":3,"y":3,"z":3},{"x":-7,"y":-13,"z":5},{"x":-5,"y":-5,"z":-5}],[{"x":-5,"y":-5,"z":-5},{"x":-2,"y":3,"z":-15},{"x":-10,"y":-17,"z":-11},{"x":-10,"y":-10,"z":-10}],[{"x":-10,"y":-10,"z":-10},{"x":-10,"y":-3,"z":-9},{"x":-10,"y":20,"z":-11},{"x":8,"y":0,"z":-10}]];
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, .01, 1000);

    renderer = new THREE.WebGLRenderer();
    child = renderer.domElement;
    document.body.appendChild(child);

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    renderer.render(scene, camera);

    const mouse = new THREE.Vector2(); //normalized position of cursor
    const intersectionPoint = new THREE.Vector3(); //holds cord of mouse click
    const planeNormal = new THREE.Vector3(); // normal vector that gives plane direction
    const plane = new THREE.Plane(); //plane thats create when cursor position changes
    const raycaster = new THREE.Raycaster(); // ray between camera and cursor

    const moonTexture = new THREE.TextureLoader().load('/moon.jpeg');
    const normalTexture = new THREE.TextureLoader().load('/normal.jpg');

    gui = new GUI();

    settings = {
      doras: 55,
      connectLoop: false,
      speed: 0.0005,
      drawPoints: false,
      drawLines: false,
    };

    p3 = {x: 0, y: 0, z: 0}
    p2 = {x: 0, y: 0, z: 0}

    var adventureFolder = gui.addFolder('Adventure');
    var settingsFolder = gui.addFolder('Values');
    var pointFolder = gui.addFolder('Points');
    var movePointFolder = gui.addFolder('Move Point');
    var funFolder = gui.addFolder('Fun!');

    settingsFolder.add(settings, 'doras', 1, 300).step(1).onChange(updateDoras).name('Doras');
    settingsFolder.add(settings, 'speed', 0, 0.02).step(0.0001).name('Speed');
    settingsFolder.add(settings, 'connectLoop').onChange(loopChange).name('Connect to Start');
    settingsFolder.add(settings, 'drawPoints').onChange(plotPoints).name('Toggle Points');
    settingsFolder.add(settings, 'drawLines').onChange(drawLines).name('Toggle Lines');

    pointFolder.add(p2, 'x').name('p2 - X');
    pointFolder.add(p2, 'y').name('p2 - Y');
    pointFolder.add(p2, 'z').name('p2 - Z');

    pointFolder.add(p3, 'x').name('p3 - X');
    pointFolder.add(p3, 'y').name('p3 - Y');
    pointFolder.add(p3, 'z').name('p3 - Z');
    pointFolder.add({ addPoint: addPointGUI }, 'addPoint').name('Add Point');

    movePointFolder.add({ movePoint: () => movePoint('x', 1) }, 'movePoint').name('+ X');
    movePointFolder.add({ movePoint: () => movePoint('x', -1) }, 'movePoint').name('- X');
    movePointFolder.add({ movePoint: () => movePoint('y', 1) }, 'movePoint').name('+ Y');
    movePointFolder.add({ movePoint: () => movePoint('y', -1) }, 'movePoint').name('- Y');
    movePointFolder.add({ movePoint: () => movePoint('z', 1) }, 'movePoint').name('+ Z');
    movePointFolder.add({ movePoint: () => movePoint('z', -1) }, 'movePoint').name('- Z');

    funFolder.add({ killDora: killDora }, 'killDora').name('Kill Dora');

    adventureFolder.add({ changeAdv: () => changeAdv('heller')}, 'changeAdv').name('Swap Adventure');

    const moonControl = settingsFolder.add(options, 'moonSpawnEnabled');
    controls = new OrbitControls(camera, renderer.domElement);
    
    adventureFolder.open();
    settingsFolder.open();
    pointFolder.open();
    movePointFolder.open();


    window.addEventListener('mousemove', function(e){
      mouse.x = (e.clientX / this.window.innerWidth) * 2 -1;
      mouse.y = -(e.clientY / this.window.innerHeight)* 2 +1; //keep track of mouse position(normalized)
      planeNormal.copy(camera.position).normalize(); //keep track of plane normal
      plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position); //create plane
      raycaster.setFromCamera(mouse, camera); //create ray between mouse and camera
      raycaster.ray.intersectPlane(plane, intersectionPoint); //location of plane stored in intersection point
    })

    moonControl.onChange(function(value) {
      options.moonSpawnEnabled = value;
    });

    window.addEventListener('click', function(e) {
      if (options.moonSpawnEnabled){
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(2.5,40,40),
          new THREE.MeshStandardMaterial({
            map: moonTexture,
            normalMap: normalTexture,
          })
        );
        scene.add(moon);
        moon.position.copy(intersectionPoint) //place moon at mouse location
      }
    });

    const pointLight = new THREE.PointLight(0xffffff)
    pointLight.position.set(5,5,5)
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    const earthTexture = new THREE.TextureLoader().load('/earth.jpg');
    const earthNormal = new THREE.TextureLoader().load('/earthnormal.jpeg');
    const earthSpecular = new THREE.TextureLoader().load('/earthspecular.jpeg');

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(5,40,40),
      new THREE.MeshPhongMaterial({
        bumpMap: earthNormal,
        bumpScale: 1.5,
        displacementMap: earthSpecular,
        displacementScale: 0.2,
        map: earthTexture,
      })
    );
    scene.add(earth);

    function addStar() {
      const geometry = new THREE.SphereGeometry(.25, 25, 25)
      const material = new THREE.MeshStandardMaterial({color: 0xffffff})
      const star = new THREE.Mesh(geometry, material);

      const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100)); //create random points for stars

      star.position.set(x, y , z);
      scene.add(star)   
    }

    Array(200).fill().forEach(addStar) //add stars

    const spaceTexture = new THREE.TextureLoader().load('/space.jpeg')
    scene.background = spaceTexture

    const otterTexture = new THREE.TextureLoader().load('/otter2.png');
    const otter = new THREE.Mesh(
      new THREE.BoxGeometry(3,3,3),
      new THREE.MeshBasicMaterial({map: otterTexture})
    );
    otter.position.x = 20;
    otter.position.z = 20;

    scene.add(otter)

    const gltfloader = new GLTFLoader();
    // https://sketchfab.com/3d-models/dora-the-explorer-a53cb146ee4e43f2a24e93363c93858e#download
    doraObjects = [];
    doragltf = undefined;
    gltfloader.load( '/dora_the_explorer/scene.gltf', function ( gltf ) {
        doragltf = gltf.scene.children[0]
        for (let i = 0; i < settings.doras; i++) {
            const doraInstance = doragltf.clone();
            doraInstance.scale.set(0.1, 0.1, 0.1);
            doraInstance.position.set(i * 2, 0, 0);
            doraObjects.push({i: i, dora: doraInstance, offset: (i * (1 / settings.doras))});
            scene.add(doraInstance);
        }
    }, undefined, function ( error ) {
      console.error( error );
    });

    plotPoints();

    let t = 0;
    function animate() {
      if (mode != 'space') { return; }
      requestAnimationFrame(animate);
      t += settings.speed;
      for (const doraObject of doraObjects) {
        const {x, y, z} = piecewiseCubicBezier((t + doraObject.offset) % 1, controlPoints);
        doraObject.dora.position.x = x;
        doraObject.dora.position.z = z;
        doraObject.dora.position.y = y;

        doraObject.dora.rotation.x = x/10 * 3;
        doraObject.dora.rotation.y = z/10 * 3;
    }
      controls.update();

      const speed = 0.0001;
      camera.position.x = Math.sin(speed * Date.now()) * 30;
      camera.position.z = Math.cos(speed * Date.now()) * 30;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();
  } else {
    // Renderer
    controlPoints = [
      [{"x":0,"y":0,"z":0},{"x":0,"y":-5,"z":15},{"x":12,"y":16,"z":62},{"x":11,"y":-15,"z":33}],
      [{"x":11,"y":-15,"z":33},{"x":10,"y":-46,"z":4},{"x":0,"y":-32,"z":0},{"x":-17,"y":-15,"z":0}],
      [{"x":-17,"y":-15,"z":0},{"x":-34,"y":2,"z":0},{"x":-17,"y":-30,"z":-46},{"x":-7,"y":-13,"z":-42}]
    ];

    renderer = new THREE.WebGLRenderer();

    renderer.setSize( window.innerWidth, window.innerHeight);
    child = renderer.domElement;
    document.body.appendChild(child);

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set(10, 10, 10);

    scene = new THREE.Scene();

    const ambient = new THREE.AmbientLight( 0xffffff, 0.25);
    scene.add(ambient);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    gui = new GUI();

    settings = {
      doras: 55,
      connectLoop: false,
      speed: 0.0014,
      drawPoints: false,
      drawLines: false,
    };

    p3 = {x: 0, y: 0, z: 0}
    p2 = {x: 0, y: 0, z: 0}

    var adventureFolder = gui.addFolder('Adventure');
    var settingsFolder = gui.addFolder('Values');
    var pointFolder = gui.addFolder('Points');
    var movePointFolder = gui.addFolder('Move Point');
    var funFolder = gui.addFolder('Fun!');

    settingsFolder.add(settings, 'doras', 1, 300).step(1).onChange(updateDoras).name('Doras');
    settingsFolder.add(settings, 'speed', 0, 0.02).step(0.0001).name('Speed');
    settingsFolder.add(settings, 'connectLoop').onChange(loopChange).name('Connect to Start');
    settingsFolder.add(settings, 'drawPoints').onChange(plotPoints).name('Toggle Points');
    settingsFolder.add(settings, 'drawLines').onChange(drawLines).name('Toggle Lines');

    pointFolder.add(p2, 'x').name('p2 - X');
    pointFolder.add(p2, 'y').name('p2 - Y');
    pointFolder.add(p2, 'z').name('p2 - Z');

    pointFolder.add(p3, 'x').name('p3 - X');
    pointFolder.add(p3, 'y').name('p3 - Y');
    pointFolder.add(p3, 'z').name('p3 - Z');
    pointFolder.add({ addPoint: addPointGUI }, 'addPoint').name('Add Point');

    movePointFolder.add({ movePoint: () => movePoint('x', 1) }, 'movePoint').name('+ X');
    movePointFolder.add({ movePoint: () => movePoint('x', -1) }, 'movePoint').name('- X');
    movePointFolder.add({ movePoint: () => movePoint('y', 1) }, 'movePoint').name('+ Y');
    movePointFolder.add({ movePoint: () => movePoint('y', -1) }, 'movePoint').name('- Y');
    movePointFolder.add({ movePoint: () => movePoint('z', 1) }, 'movePoint').name('+ Z');
    movePointFolder.add({ movePoint: () => movePoint('z', -1) }, 'movePoint').name('- Z');

    adventureFolder.add({ changeAdv: () => changeAdv('space')}, 'changeAdv').name('Swap Adventure');

    funFolder.add({ killDora: killDora }, 'killDora').name('Kill Dora');

    adventureFolder.open();
    settingsFolder.open();
    pointFolder.open();
    movePointFolder.open();

    const gltfloader = new GLTFLoader();

    // https://sketchfab.com/3d-models/wooden-table-acd1cef307b94803846d624b251a4e63#download
    gltfloader.load( '/wooden_table/scene.gltf', function ( gltf ) {
        const tableObject = gltf.scene.children[0];
        tableObject.scale.set(1, 1, 1);
        tableObject.position.set(0, -19, 0);
      scene.add( gltf.scene );
    }, undefined, function ( error ) {
      console.error( error );
    } );

    // https://sketchfab.com/3d-models/dora-the-explorer-a53cb146ee4e43f2a24e93363c93858e#download
    doraObjects = [];
    doragltf = undefined;
    gltfloader.load( '/dora_the_explorer/scene.gltf', function ( gltf ) {
        doragltf = gltf.scene.children[0]
        for (let i = 0; i < settings.doras; i++) {
            const doraInstance = doragltf.clone();
            doraInstance.scale.set(0.1, 0.1, 0.1);
            doraInstance.position.set(i * 2, 0, 0);
            doraObjects.push({i: i, dora: doraInstance, offset: (i * (1 / settings.doras))});
            scene.add(doraInstance);
        }
    }, undefined, function ( error ) {
      console.error( error );
    } );

    plotPoints();

    // Heller Drive
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        '/posx.png',
        '/negx.png',
        '/posy.png',
        '/negy.png',
        '/posz.png',
        '/negz.png',
    ]);
    scene.background = texture;

    // Old Circular Position Function
    function findPosRot(t) {
        let x = 10 * Math.cos(t);
        let z = 10 * Math.sin(t);
        return {x: x, z: z};
    }

    let t = 0;
    function animate() {
      if (mode != 'heller') { return; }
      requestAnimationFrame( animate );
      t += settings.speed;
      for (const doraObject of doraObjects) {
        const {x, y, z} = piecewiseCubicBezier((t + doraObject.offset) % 1, controlPoints);
        doraObject.dora.position.x = x;
        doraObject.dora.position.z = z;
        doraObject.dora.position.y = y;

        doraObject.dora.rotation.x = x/10 * 3;
        doraObject.dora.rotation.y = z/10 * 3;
      }
      renderer.render( scene, camera ); 
    }
    animate();
  }
}