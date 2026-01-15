import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initPhysicsWorld, createRigidBodyForBone } from '/src/mikurig/js/physics.js';

export function InitializeRender(){
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,                // FOV
      window.innerWidth / window.innerHeight,  // Aspect ratio
      0.01,               // near
      1000               // far
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.setClearColor(0xffffff, 1); // Color blanco, opacidad 1 (total)

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Opcional: sombras suaves

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 0.1;
    controls.maxDistance = 100;
    controls.update();

    // Crear un cubo de prueba
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    //scene.add(cube);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    light.castShadow = true; // 🔴 HABILITAR sombras

    // Opcional: ajustar calidad de sombra
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;

    scene.add(light);

    camera.position.z = 5;
    LoadModel(scene);

    const floor = createFloor();
    scene.add(floor);

    // Animación
    function animate() {
      requestAnimationFrame(animate);

      //cube.rotation.x += 0.01;
      //cube.rotation.y += 0.01;

      controls.update();

      renderer.render(scene, camera);
    }
    animate();

    // Hacer responsive el canvas
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Actualiza tamaño del renderer
      renderer.setSize(width, height);

      // Actualiza aspecto de la cámara
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });

}

export async function InitializePhysics(){
    const physicsWorld = await initPhysicsWorld();

    // Ejemplo: crear una esfera física en (0,5,0) con radio 1 y masa 1
    const radius = 1;
    const shape = new Ammo.btSphereShape(radius);
    const body = createRigidBody(new THREE.Vector3(0, 5, 0), shape, 1);

    // En tu loop de animación:
    function animate(time) {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        updatePhysics(delta);

        // Aquí sincronizarías la posición de Three.js con Ammo.js

        renderer.render(scene, camera);
    }

  animate();
}

function LoadModel(scene){
    const gltfLoader = new GLTFLoader();
    
    gltfLoader.load('/mikurig/models/miku/scene.gltf', function (gltf) {
        const model = gltf.scene;
        scene.add(model);

        model.position.set(0, 0, 0); // Opcional: ajustar posición
        model.scale.set(100, 100, 100)

        viewModelContents(model);
    }, undefined, function (error) {
        console.error('Error al cargar GLB:', error);
    });

    const loader = new FBXLoader();

    /*loader.load('/mikurig/models/fbx/miku/miku.fbx', function (model) {
        scene.add(model);
        model.scale.set(0.01, 0.01, 0.01);
        viewModelContents(model);
    }, undefined, function (error) {
        console.error('Error al cargar FBX:', error);
    });*/
}

function viewModelContents(model){

    const objectToDelete = [
        'pPlane1', 'pSphere1'
    ];

    const modelsToDelete = [];

    model.traverse((child) => {
        if (child.isMesh) {
            console.log(child.name); // Útil para saber qué eliminar
        
            if(objectToDelete.includes(child.name)){
                modelsToDelete.push(child);
            }

            child.castShadow = true;   // proyecta sombra
            child.receiveShadow = false; // por si acaso
        }
    });

    /*modelsToDelete.forEach(child => {
        if(child.parent){
            child.parent.remove(child);
        }
    });*/
}

function createFloor(){
    const floorGeometry = new THREE.PlaneGeometry(100, 100); // ancho y largo
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        side: THREE.DoubleSide // para que se vea desde ambos lados
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // gira el plano para que quede horizontal
    floor.position.y = 0; // altura del suelo

    floor.receiveShadow = true; // si estás usando sombras
    return floor;
}