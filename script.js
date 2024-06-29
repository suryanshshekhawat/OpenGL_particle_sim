// Import Modules
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Set up Scene
const scene = new THREE.Scene();

// Set up Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth * 0.8 / window.innerHeight, 0.1, 1000);

// Set up Renderer
const renderer = new THREE.WebGLRenderer();

// Set up Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Set up Lights
const light = new THREE.DirectionalLight(0xFFFFFF, 1.5); // Increase intensity to 1.5 or any desired value
light.position.set(5, 5, 5).normalize();
scene.add(light);

// Get numbers from input
function getFormData() {
    const params = new URLSearchParams(window.location.search);
    return params.get('numbers') ? JSON.parse(params.get('numbers')) : [];
}

const numbers = getFormData();
console.log('Numbers:', numbers);

// Set up right div DOM
const rightDiv = document.querySelector('.right');
renderer.setSize(rightDiv.clientWidth, window.innerHeight);
// Add renderer element to the right div
rightDiv.appendChild(renderer.domElement);

// Environment Variables
let l = 12;
const density = 3 / (4 * Math.PI); 

// Set up variables from DOM
const slider_csl = document.getElementById('rangeSlider_csl');

// Set up Camera location
camera.position.set(18, 12, 15);
controls.update();
camera.lookAt(0, 0, 0);
controls.update();

let currentCube = null;
let currentEdges = null;

let initialized = false;

let MASSES = [];
let RADII = [];
let POSITIONS = [];
let VELOCITIES = [];
let SPHERES = [];

// Function to initialize spheres and the scene
function initializeScene() {
    if (initialized) return;
    initialized = true;

    // Making box
    makeBox(l);

    // Setting up spheres initial parameters
    MASSES = numbers;

    // Matrix for radii
    RADII = [];
    for (let i = 0; i < numbers.length; i++) {
        RADII.push(Math.cbrt((3 * MASSES[i]) / (4 * Math.PI * density)));
    }

    // Matrix for position vectors
    POSITIONS = [];
    for (let i = 0; i < numbers.length; i++) {
        POSITIONS.push(new THREE.Vector3(get_random_float(RADII[i], l), get_random_float(RADII[i], l), get_random_float(RADII[i], l)));
    }

    // Matrix for velocity vectors
    VELOCITIES = [];
    for (let i = 0; i < numbers.length; i++) {
        VELOCITIES.push(new THREE.Vector3((Math.random() - 0.5)/500, (Math.random() - 0.5)/500, (Math.random() - 0.5)/500));
    }

    // Matrix of sphere objects (meshed)
    SPHERES = [];
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff]; // Example colors array

    for (let i = 0; i < numbers.length; i++) {
        const geometry = new THREE.SphereGeometry(RADII[i], 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: colors[i % colors.length] }); // Assign different color to each sphere
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(POSITIONS[i]); // Set initial position
        scene.add(sphere); // Add sphere to scene
        SPHERES.push(sphere); // Store sphere object in SPHERES array
    }
}

// Animate function using the updated arrays
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Updating position
    for (let i = 0; i < numbers.length; i++) {
        SPHERES[i].position.add(VELOCITIES[i]);
        // Detect particle wall collisions
        let wall_particle_C_code = detect_wall_particle_collision(SPHERES[i], RADII[i], l);
        
        // Respond to particle wall collisions
        if (wall_particle_C_code) {
            if (wall_particle_C_code == 1 || wall_particle_C_code == 3) {
                VELOCITIES[i].y = -VELOCITIES[i].y;
            } else if (wall_particle_C_code == 2 || wall_particle_C_code == 6) {
                VELOCITIES[i].x = -VELOCITIES[i].x;
            } else if (wall_particle_C_code == 4 || wall_particle_C_code == 5) {
                VELOCITIES[i].z = -VELOCITIES[i].z;
            }

            // Adjust position to ensure it's within bounds
            if (SPHERES[i].position.x + RADII[i] > l / 2) {
                SPHERES[i].position.x = l / 2 - RADII[i];
            } else if (SPHERES[i].position.x - RADII[i] < -l / 2) {
                SPHERES[i].position.x = -l / 2 + RADII[i];
            }

            if (SPHERES[i].position.y + RADII[i] > l / 2) {
                SPHERES[i].position.y = l / 2 - RADII[i];
            } else if (SPHERES[i].position.y - RADII[i] < -l / 2) {
                SPHERES[i].position.y = -l / 2 + RADII[i];
            }

            if (SPHERES[i].position.z + RADII[i] > l / 2) {
                SPHERES[i].position.z = l / 2 - RADII[i];
            } else if (SPHERES[i].position.z - RADII[i] < -l / 2) {
                SPHERES[i].position.z = -l / 2 + RADII[i];
            }
        }
    }

    // detect particle-particle collisions
    for (let i = 0 ; i < numbers.length - 1; i ++) {
        for (let j = i + 1 ; j < numbers.length ; j ++) {
            // pairwise comparison of every particle
            if (detect_particle_particle_collision(SPHERES[i],SPHERES[j],RADII[i],RADII[j])) {
                // collision response.
                console.log("Collision happened!");
                
                // Reverse velocities upon collision
                VELOCITIES[i].negate();
                VELOCITIES[j].negate();
            }
        }
    }
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Call initializeScene once
initializeScene();

// Function to make a box
function makeBox(length) {
    // Remove previous box and edges
    if (currentCube) scene.remove(currentCube);
    if (currentEdges) scene.remove(currentEdges);

    // Create new box
    const geometry = new THREE.BoxGeometry(length, length, length);
    // Transparent Material
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 });
    currentCube = new THREE.Mesh(geometry, material);
    scene.add(currentCube);

    // Edges
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    currentEdges = new THREE.LineSegments(edges, lineMaterial);
    scene.add(currentEdges);
}

// Function to return random float in range (radius-l, l-radius)
function get_random_float(radius, l) {
    return ((Math.random() * (l - radius * 2)) - (l - radius * 2) / 2);
}

// Detect wall-particle collision
function detect_wall_particle_collision(sphere, radius, l) {
    /* Returns code based on which wall made contact
              *-------* 
             /| 1(t) /|  5 (back)
            *-|-----* |  6 (right)
   (left) 2 | *-----|-* 
            |/ 3(b) |/ 4 (front)
            *-------*
    */
    if (sphere.position.x + radius > l / 2) {
        // right face
        return 6;
    } else if (sphere.position.x - radius < -l / 2) {
        // left face
        return 2;
    } else if (sphere.position.y + radius > l / 2) {
        // top face
        return 1;
    } else if (sphere.position.y - radius < -l / 2) {
        // bottom face
        return 3;
    } else if (sphere.position.z + radius > l / 2) {
        // back face
        return 5;
    } else if (sphere.position.z - radius < -l / 2) {
        // front face
        return 4;
    }
    return 0;
}

// Detect particle-particle collision
function detect_particle_particle_collision(sphere1, sphere2, radius1, radius2) {
    const distance = sphere1.position.distanceTo(sphere2.position);
    if (distance < (radius1 + radius2)) {
        return true;
    }
    return false;
}

// Add event listener to the slider
slider_csl.addEventListener('input', (event) => {
    l = parseFloat(event.target.value);
    makeBox(l);
});

// Initialize the box size with the initial slider value
l = parseFloat(slider_csl.value);
makeBox(l);
