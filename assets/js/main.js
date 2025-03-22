// Initialize the scene
const scene = new THREE.Scene();

// Create a virtual sphere for star placement
const sphereRadius = 100;

// Set up camera
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);

// Camera distance controls
// Calculate optimal distance to view the entire sphere
const fovRadians = camera.fov * (Math.PI / 180);
// Calculate horizontal FOV based on aspect ratio
const aspectRatio = window.innerWidth / window.innerHeight;
const horizontalFovRadians = 2 * Math.atan(Math.tan(fovRadians / 2) * aspectRatio);
// Use the smaller of the two FOVs to ensure the sphere fits in both dimensions
const effectiveFovRadians = Math.min(fovRadians, horizontalFovRadians);
const safetyMargin = 1.2; // 20% extra margin to ensure all stars are visible
let cameraDistance = (sphereRadius / Math.sin(effectiveFovRadians / 2)) * safetyMargin * 1.2;
const minDistance = cameraDistance * 0.8;
const maxDistance = cameraDistance * 1.2;

// Position camera at the calculated distance
camera.position.z = cameraDistance;
camera.position.y = 0;
camera.position.x = 0;
camera.lookAt(0, 0, 0); // Look at the center of the sphere

// Set up renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create telescope vignette effect
const vignetteContainer = document.createElement('div');
vignetteContainer.style.position = 'absolute';
vignetteContainer.style.top = '0';
vignetteContainer.style.left = '0';
vignetteContainer.style.width = '100%';
vignetteContainer.style.height = '100%';
vignetteContainer.style.pointerEvents = 'none';
vignetteContainer.style.borderRadius = '50%';
vignetteContainer.style.boxShadow = 'inset 0 0 150px 150px rgba(0, 0, 0, 0.95)';
vignetteContainer.style.zIndex = '10';
document.body.appendChild(vignetteContainer);

// Create star material and geometry
const starGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

// Set up mouse rotation for telescope aiming
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = targetRotationX;
let currentRotationY = targetRotationY;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    // Map mouse position to rotation, with reduced sensitivity for telescope-like precision
    targetRotationY = mouseX * Math.PI * 0.3;
    targetRotationX = mouseY * Math.PI * 0.2;
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (labelRenderer) {
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Recalculate optimal camera distance for new aspect ratio
    const newAspectRatio = window.innerWidth / window.innerHeight;
    const newHorizontalFovRadians = 2 * Math.atan(Math.tan(fovRadians / 2) * newAspectRatio);
    const newEffectiveFovRadians = Math.min(fovRadians, newHorizontalFovRadians);
    cameraDistance = (sphereRadius / Math.sin(newEffectiveFovRadians / 2)) * safetyMargin;
    cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance));

    // Update camera position
    updateCameraPosition();
});

// Add mouse wheel for zooming
document.addEventListener('wheel', (event) => {
    // Determine zoom direction (in or out)
    const zoomAmount = event.deltaY * 0.1;

    // Update camera distance
    cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance + zoomAmount));

    // Update camera position while maintaining direction
    updateCameraPosition();
});

// Function to update camera position based on current rotation and distance
function updateCameraPosition() {
    // Create rotation matrix from current rotation values
    const rotationMatrix = new THREE.Matrix4().makeRotationY(currentRotationY);
    rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(currentRotationX));

    // Apply rotation to the base direction vector (0,0,-1 means looking forward along negative z-axis)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyMatrix4(rotationMatrix);

    // Position camera at the appropriate distance from center along this direction
    camera.position.set(
        direction.x * -cameraDistance,
        direction.y * -cameraDistance,
        direction.z * -cameraDistance
    );

    // Look at center of star sphere
    camera.lookAt(0, 0, 0);
}

let labelRenderer;

// Fetch data from API and create stars
fetch('https://api.sentichain.com/mapper/get_points_by_block_no_embedding?block_number=20&api_key=abc123')
    .then(response => response.json())
    .then(data => {
        const points = data.points;
        const stars = [];

        // Create stars at each position and place them on a sphere
        points.forEach(point => {
            const x = point[3]; // 4th item is x
            const y = point[4]; // 5th item is y
            const clusterGroup = point[5]; // 6th item is cluster group

            // Convert the 2D coordinates to 3D spherical coordinates
            // Adjust mapping to place most stars in front of the camera (positive Z)
            // Map x to longitude but center around 0 (front) instead of wrapping fully
            // Map y to latitude but limit range for better visibility
            const longitude = x * Math.PI - Math.PI / 2; // Shift to center stars in front
            const latitude = y * Math.PI / 3; // Reduce vertical spread

            // Convert spherical coordinates to Cartesian (x,y,z)
            const starX = sphereRadius * Math.cos(latitude) * Math.sin(longitude);
            const starY = sphereRadius * Math.sin(latitude);
            const starZ = sphereRadius * Math.cos(latitude) * Math.cos(longitude);

            const star = new THREE.Mesh(starGeometry, new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                emissive: 0x888888,
                emissiveIntensity: 1
            }));

            // Position stars on the inside of a sphere
            star.position.set(starX, starY, starZ);
            star.userData.clusterGroup = clusterGroup; // Store cluster group in user data
            star.userData.title = point[8]; // Store title for later use in cluster labels
            scene.add(star);
            stars.push(star);
        });

        // Connect stars within the same cluster group
        const clusterGroups = {};

        // Initialize cluster groups
        stars.forEach(star => {
            const group = star.userData.clusterGroup;
            if (!clusterGroups[group]) {
                clusterGroups[group] = [];
            }
            clusterGroups[group].push(star);
        });

        // Connect stars within the same cluster group and add cluster labels
        Object.keys(clusterGroups).forEach(groupId => {
            const groupStars = clusterGroups[groupId];

            // Use different colors for different cluster groups
            const hue = (parseInt(groupId) * 50) % 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 70%)`);

            // Add a label for the cluster group
            // Get the title from the first star in the group
            const clusterTitle = groupStars[0].userData.title;

            if (groupStars.length <= 1) {
                // If only one star in the group, add label outside the star
                const starPosition = groupStars[0].position;

                // Create a label object
                const div = document.createElement('div');
                div.className = 'label';
                div.textContent = clusterTitle;
                div.style.color = 'white';
                div.style.fontSize = '1.0em';
                div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                div.style.padding = '3px 6px';
                div.style.borderRadius = '3px';
                div.style.maxWidth = '150px';
                div.style.wordWrap = 'break-word';
                div.style.textAlign = 'center';

                // Calculate position outside the sphere
                const labelOffset = 1.5; // Position labels 100% outside the sphere
                const labelPosition = starPosition.clone().normalize().multiplyScalar(sphereRadius * labelOffset);
                
                const label = new THREE.CSS2DObject(div);
                label.position.copy(labelPosition);

                // Create a line from the star to the label
                const linePoints = [starPosition, labelPosition];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0xCCCCCC, 
                    opacity: 0.4,
                    transparent: true
                });
                const labelLine = new THREE.Line(lineGeometry, lineMaterial);
                
                // Store references for animation updates
                labelLine.userData.startPoint = starPosition;
                labelLine.userData.endPoint = labelPosition;
                labelLine.userData.isLabelLine = true;

                // Add label and line to scene
                scene.add(label);
                scene.add(labelLine);
            } else {
                // Calculate center of mass for the cluster
                const centerOfMass = new THREE.Vector3();
                groupStars.forEach(star => {
                    centerOfMass.add(star.position);
                });
                centerOfMass.divideScalar(groupStars.length);

                // Create a label object
                const div = document.createElement('div');
                div.className = 'label';
                div.textContent = clusterTitle;
                div.style.color = 'white';
                div.style.fontSize = '1.0em';
                div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                div.style.padding = '3px 6px';
                div.style.borderRadius = '3px';
                div.style.maxWidth = '150px';
                div.style.wordWrap = 'break-word';
                div.style.textAlign = 'center';

                // Calculate position outside the sphere
                const labelOffset = 1.5; // Position labels 100% outside the sphere
                const labelPosition = centerOfMass.clone().normalize().multiplyScalar(sphereRadius * labelOffset);
                
                const label = new THREE.CSS2DObject(div);
                label.position.copy(labelPosition);

                // Create a line from the center of mass to the label
                const linePoints = [centerOfMass, labelPosition];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                    color: 0xCCCCCC, 
                    opacity: 0.4,
                    transparent: true
                });
                const labelLine = new THREE.Line(lineGeometry, lineMaterial);
                
                // Store references for animation updates
                labelLine.userData.startPoint = centerOfMass;
                labelLine.userData.endPoint = labelPosition;
                labelLine.userData.isLabelLine = true;

                // Add label and line to scene
                scene.add(label);
                scene.add(labelLine);
            }

            // Skip creating connections if there's only 1 star in the group
            if (groupStars.length <= 1) return;

            // Create a constellation-like pattern using a simple minimum spanning tree algorithm
            // First, calculate all possible edges and their distances
            const edges = [];
            for (let i = 0; i < groupStars.length; i++) {
                for (let j = i + 1; j < groupStars.length; j++) {
                    const distance = groupStars[i].position.distanceTo(groupStars[j].position);
                    edges.push({
                        from: i,
                        to: j,
                        distance: distance
                    });
                }
            }

            // Sort edges by distance (shortest first)
            edges.sort((a, b) => a.distance - b.distance);

            // Create a disjoint-set data structure for Kruskal's algorithm
            const parent = {};
            for (let i = 0; i < groupStars.length; i++) {
                parent[i] = i;
            }

            // Find function for disjoint-set
            const find = (i) => {
                if (parent[i] !== i) {
                    parent[i] = find(parent[i]);
                }
                return parent[i];
            };

            // Union function for disjoint-set
            const union = (i, j) => {
                parent[find(i)] = find(j);
            };

            // Apply Kruskal's algorithm to find minimum spanning tree
            const mstEdges = [];
            for (const edge of edges) {
                const fromRoot = find(edge.from);
                const toRoot = find(edge.to);

                // If including this edge doesn't create a cycle
                if (fromRoot !== toRoot) {
                    mstEdges.push(edge);
                    union(edge.from, edge.to);

                    // If we've added enough edges to form a spanning tree, stop
                    if (mstEdges.length === groupStars.length - 1) {
                        break;
                    }
                }
            }

            // Create the constellation lines using the minimum spanning tree
            for (const edge of mstEdges) {
                const fromStar = groupStars[edge.from];
                const toStar = groupStars[edge.to];

                // Create a line between the two stars
                const constellationLineGeo = new THREE.BufferGeometry().setFromPoints([
                    fromStar.position,
                    toStar.position
                ]);
                const constellationLineMat = new THREE.LineBasicMaterial({
                    color: color,
                    opacity: 0.7,
                    transparent: true
                });
                const constellationLine = new THREE.Line(constellationLineGeo, constellationLineMat);
                scene.add(constellationLine);

                // Store references to connected stars for updating lines during zoom
                constellationLine.userData = {
                    fromStar: fromStar,
                    toStar: toStar
                };
            }
        });

        // Add CSS2D renderer for labels
        labelRenderer = new THREE.CSS2DRenderer();
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(labelRenderer.domElement);

        // Update animation loop to include label renderer
        animate = function () {
            requestAnimationFrame(animate);

            // Smooth rotation transition with telescope-like dampening
            currentRotationX += (targetRotationX - currentRotationX) * 0.03;
            currentRotationY += (targetRotationY - currentRotationY) * 0.03;

            // Update camera position based on rotation
            updateCameraPosition();

            // Update constellation lines
            scene.traverse(object => {
                if (object instanceof THREE.Line) {
                    if (object.userData.fromStar) {
                        const lineGeo = new THREE.BufferGeometry().setFromPoints([
                            object.userData.fromStar.position,
                            object.userData.toStar.position
                        ]);
                        object.geometry.dispose();
                        object.geometry = lineGeo;
                    } else if (object.userData.isLabelLine) {
                        const lineGeo = new THREE.BufferGeometry().setFromPoints([
                            object.userData.startPoint,
                            object.userData.endPoint
                        ]);
                        object.geometry.dispose();
                        object.geometry = lineGeo;
                    }
                }
            });

            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        };

        animate();
    })
    .catch(error => {
        console.error('Error fetching data:', error);

        // Fallback to original 3 stars if fetch fails
        createFallbackStars();
    });

function createFallbackStars() {
    // Create three stars (fallback if API fails)
    const star1 = new THREE.Mesh(starGeometry, starMaterial);
    const star2 = new THREE.Mesh(starGeometry, starMaterial);
    const star3 = new THREE.Mesh(starGeometry, starMaterial);

    // Position the stars in front of the camera for better visibility
    star1.position.set(-sphereRadius / 4, sphereRadius / 5, sphereRadius / 2);
    star2.position.set(sphereRadius / 4, sphereRadius / 5, sphereRadius / 2);
    star3.position.set(0, -sphereRadius / 5, sphereRadius / 2);

    // Add stars to the scene
    scene.add(star1);
    scene.add(star2);
    scene.add(star3);

    // Create a line connecting the stars
    const lineGeometry = new THREE.BufferGeometry();
    const points = [
        star1.position,
        star2.position,
        star3.position,
        star1.position
    ];
    lineGeometry.setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);

    // Store references to stars for updating lines during zoom
    line.userData = {
        stars: [star1, star2, star3, star1]
    };

    // Start animation
    animate = function () {
        requestAnimationFrame(animate);

        // Smooth rotation transition with telescope-like dampening
        currentRotationX += (targetRotationX - currentRotationX) * 0.03;
        currentRotationY += (targetRotationY - currentRotationY) * 0.03;

        // Update camera position based on rotation
        updateCameraPosition();

        // Update line points if we've zoomed
        if (line.userData.stars) {
            const points = line.userData.stars.map(star => star.position);
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            line.geometry.dispose();
            line.geometry = lineGeo;
        }

        renderer.render(scene, camera);
    };

    animate();
}

// Animation loop (will be redefined when data is loaded)
function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation transition with telescope-like dampening
    currentRotationX += (targetRotationX - currentRotationX) * 0.03;
    currentRotationY += (targetRotationY - currentRotationY) * 0.03;

    // Update camera position based on rotation
    updateCameraPosition();

    renderer.render(scene, camera);
}