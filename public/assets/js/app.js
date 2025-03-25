// SentiMove Frontend Application
// This file contains the client-side logic that communicates with our backend server

// API Service for communicating with our backend
const apiService = {
  // Base URL for API calls - automatically detects environment
  baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : '/api',
  
  // Get the maximum block number
  async getMaxBlockNumber() {
    try {
      const response = await fetch(`${this.baseUrl}/blocks/max`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching max block number:', error);
      return { max_block_number: 0 }; // Fallback value
    }
  },
  
  // Get points by block range
  async getPointsByBlockRange(startBlock, endBlock) {
    try {
      const response = await fetch(
        `${this.baseUrl}/blocks/range?start_block=${startBlock}&end_block=${endBlock}`
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching points by block range:', error);
      return { points: [] }; // Return empty points array as fallback
    }
  },
  
  // Get timestamp for a specific block
  async getTimestampFromBlockNumber(blockNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/blocks/timestamp/${blockNumber}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching timestamp:', error);
      return { timestamp: 'N/A' };
    }
  }
};

// Initialize the scene
const scene = new THREE.Scene();

// Mobile detection
let isMobileView = window.innerWidth < 768;
console.log("Initial mobile detection:", isMobileView, "Width:", window.innerWidth);

// Create a virtual sphere for star placement
const sphereRadius = 100;

// Set up camera with wider FOV for mobile
const camera = new THREE.PerspectiveCamera(
    isMobileView ? 45 : 30, // Higher FOV on mobile for wider view
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

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
// Mobile devices need to be closer to see stars better
if (isMobileView) {
    cameraDistance *= 0.7; // Move camera much closer on mobile
}
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
const starGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

// Set up mouse rotation for telescope aiming
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = targetRotationX;
let currentRotationY = targetRotationY;
let lastTouchX = 0;
let lastTouchY = 0;
let isTouching = false;
let isMouseDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Handle mouse drag for desktop (replacing mouse movement)
document.addEventListener('mousedown', (event) => {
    isMouseDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    document.body.style.cursor = 'grabbing'; // Change cursor to indicate dragging
});

document.addEventListener('mousemove', (event) => {
    if (isMouseDragging) {
        // Calculate mouse delta
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const deltaX = mouseX - lastMouseX;
        const deltaY = mouseY - lastMouseY;
        
        // Update last mouse position
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        
        // Adjust rotation based on mouse movement with similar sensitivity to touch
        targetRotationY -= deltaX * 0.01;
        targetRotationX -= deltaY * 0.01;
    }
});

document.addEventListener('mouseup', () => {
    isMouseDragging = false;
    document.body.style.cursor = 'grab'; // Change cursor back to indicate grabbable
});

document.addEventListener('mouseleave', () => {
    if (isMouseDragging) {
        isMouseDragging = false;
        document.body.style.cursor = 'grab'; // Ensure cursor reverts if mouse leaves window
    }
});

// Initialize cursor style
document.addEventListener('DOMContentLoaded', () => {
    if (!isMobileView) {
        document.body.style.cursor = 'grab'; // Set initial cursor style for desktop
    }
});

// Handle touch events for mobile
document.addEventListener('touchstart', (event) => {
    // Skip if the touch is on the cluster labels container
    if (event.target.closest('.cluster-labels-container')) return;
    
    if (event.touches.length === 1) {
        isTouching = true;
        lastTouchX = event.touches[0].clientX;
        lastTouchY = event.touches[0].clientY;
    }
}, { passive: true });

document.addEventListener('touchmove', (event) => {
    // Skip if the touch is on the cluster labels container
    if (event.target.closest('.cluster-labels-container')) return;
    
    if (isTouching && event.touches.length === 1) {
        // Calculate touch delta
        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        const deltaX = touchX - lastTouchX;
        const deltaY = touchY - lastTouchY;
        
        // Update last touch position
        lastTouchX = touchX;
        lastTouchY = touchY;
        
        // Adjust rotation based on touch movement with increased sensitivity for mobile
        targetRotationY -= deltaX * 0.01;
        targetRotationX -= deltaY * 0.01;
        
        // Prevent scrolling while interacting with the visualization
        event.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    isTouching = false;
}, { passive: true });

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

// Variables for animation between blocks
let starObjects = [];
let constellationLines = [];
let labelObjects = []; // Add array to track label objects
let blockData = {};
let currentBlockIndex = 0;
let targetBlockIndex = 0;
let transitionProgress = 1.0; // Start at 1.0 to immediately show first block
let transitionSpeed = 0.02; // Speed of transition between blocks
let isTransitioning = false;
let blockNumbers = [];
let isFirstPlaythrough = true; // Flag to track if this is the first automatic playthrough

// Add UI for block navigation
const blockNavUI = document.createElement('div');
blockNavUI.style.position = 'absolute';
blockNavUI.style.bottom = isMobileView ? '60px' : '40px';
blockNavUI.style.width = '100%';
blockNavUI.style.textAlign = 'center';
blockNavUI.style.color = 'white';
blockNavUI.style.fontFamily = 'Arial, sans-serif';
blockNavUI.style.zIndex = '20';
document.body.appendChild(blockNavUI);

// Create a container for cluster labels
const clusterLabelsContainer = document.createElement('div');
clusterLabelsContainer.className = 'cluster-labels-container';
clusterLabelsContainer.style.position = 'absolute';
clusterLabelsContainer.style.bottom = '100px'; 
clusterLabelsContainer.style.left = '0';
clusterLabelsContainer.style.width = '100%';
clusterLabelsContainer.style.textAlign = 'left';
clusterLabelsContainer.style.display = 'none';
clusterLabelsContainer.style.flexWrap = 'nowrap';
clusterLabelsContainer.style.justifyContent = 'flex-start';
clusterLabelsContainer.style.flexDirection = 'column';
clusterLabelsContainer.style.padding = '10px 15px';
clusterLabelsContainer.style.zIndex = '20';
clusterLabelsContainer.style.maxHeight = '80px';
clusterLabelsContainer.style.overflowY = 'auto';
clusterLabelsContainer.style.overflowX = 'hidden';
clusterLabelsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
clusterLabelsContainer.style.backdropFilter = 'blur(2px)';
document.body.appendChild(clusterLabelsContainer);

// Create a slider container
const sliderContainer = document.createElement('div');
sliderContainer.style.width = window.innerWidth < 768 ? '80%' : '50%';
sliderContainer.style.margin = '0 auto';
sliderContainer.style.position = 'relative';
sliderContainer.style.padding = '0 10px';
sliderContainer.style.display = 'flex';
sliderContainer.style.alignItems = 'center';
sliderContainer.style.justifyContent = 'center';
blockNavUI.appendChild(sliderContainer);

// Create a slider input
const slider = document.createElement('input');
slider.type = 'range';
slider.min = '0';
slider.max = '100';
slider.value = '0';
slider.step = '1';
slider.style.width = '95%';
slider.style.height = '5px';
slider.style.backgroundColor = '#555';
slider.style.outline = 'none';
slider.style.borderRadius = '5px';
slider.style.appearance = 'none';
slider.style.webkitAppearance = 'none';
slider.style.cursor = 'pointer';
sliderContainer.appendChild(slider);

// Create block number label
const blockLabel = document.createElement('a');
blockLabel.style.position = 'absolute';
blockLabel.style.top = '20px';
blockLabel.style.right = '30px';
blockLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
blockLabel.style.padding = '5px 12px';
blockLabel.style.borderRadius = '4px';
blockLabel.style.fontSize = '14px';
blockLabel.style.color = '#00FFC8';
blockLabel.style.zIndex = '20';
blockLabel.style.fontFamily = 'Arial, sans-serif';
blockLabel.style.textDecoration = 'none';
blockLabel.style.cursor = 'pointer';
blockLabel.innerHTML = 'Block 0 <span>↗</span>';
blockLabel.href = 'https://sentichain.com/app?tab=BlockExplorer#';
blockLabel.target = '_blank';
document.body.appendChild(blockLabel);

// Create timestamp label
const timestampLabel = document.createElement('div');
timestampLabel.style.position = 'absolute';
timestampLabel.style.top = '50px';
timestampLabel.style.right = '30px';
timestampLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
timestampLabel.style.padding = '5px 12px';
timestampLabel.style.borderRadius = '4px';
timestampLabel.style.fontSize = '14px';
timestampLabel.style.color = '#fff';
timestampLabel.style.zIndex = '20';
timestampLabel.style.fontFamily = 'Arial, sans-serif';
timestampLabel.textContent = '--';
document.body.appendChild(timestampLabel);

// Create play/pause toggle button
const toggleButton = document.createElement('div');
toggleButton.className = 'toggle-button';
toggleButton.style.width = '16px';
toggleButton.style.height = '16px';
toggleButton.style.borderRadius = '50%';
toggleButton.style.backgroundColor = '#4CAF50'; // Start with green (play)
toggleButton.style.cursor = 'pointer';
toggleButton.style.marginLeft = '15px';
toggleButton.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.5)';
toggleButton.style.transition = 'background-color 0.3s';
sliderContainer.appendChild(toggleButton);

// Create speed indicator element
const speedIndicator = document.createElement('div');
speedIndicator.style.marginLeft = '10px';
speedIndicator.style.color = '#fff';
speedIndicator.style.fontSize = '14px';
speedIndicator.style.fontFamily = 'Arial, sans-serif';
speedIndicator.textContent = 'x5.0';
sliderContainer.appendChild(speedIndicator);

// Cache for block timestamps
const timestampCache = {};

// Function to fetch and update timestamp
async function updateTimestamp(blockNumber) {
    // Show loading state
    timestampLabel.textContent = '...';
    
    try {
        const data = await apiService.getTimestampFromBlockNumber(blockNumber);
        
        if (data && data.timestamp) {
            // Convert UTC to local time
            const utcDate = new Date(data.timestamp);
            const localTimeString = utcDate.toLocaleString();
            
            // Update the label
            timestampLabel.textContent = localTimeString;
        } else {
            timestampLabel.textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error fetching timestamp:', error);
        timestampLabel.textContent = 'N/A';
    }
}

// Initialize and load data
async function initialize() {
    try {
        // Get max block number
        const maxBlockData = await apiService.getMaxBlockNumber();
        const maxBlockNumber = maxBlockData.max_block_number;
        
        // Calculate range of blocks to fetch (last 10 blocks)
        const startBlock = Math.max(0, maxBlockNumber - 10);
        const endBlock = maxBlockNumber;
        
        // Fetch points data for these blocks
        const pointsData = await apiService.getPointsByBlockRange(startBlock, endBlock);
        const points = pointsData.points || [];
        
        // Organize points by block number
        points.forEach(point => {
            const blockNumber = point[0]; // 1st item is block number
            if (!blockData[blockNumber]) {
                blockData[blockNumber] = [];
                blockNumbers.push(blockNumber);
            }
            blockData[blockNumber].push(point);
        });
        
        // Sort block numbers for sequential animation
        blockNumbers.sort((a, b) => a - b);
        
        // Initialize with the first block
        if (blockNumbers.length > 0) {
            currentBlockIndex = 0;
            targetBlockIndex = 0;
            
            // Create initial stars and constellations
            createStarsForBlock(blockNumbers[currentBlockIndex]);
            
            // Update slider range based on block count
            slider.max = blockNumbers.length - 1;
            updateBlockLabel();
            
            // Add CSS2D renderer for labels
            labelRenderer = new THREE.CSS2DRenderer();
            labelRenderer.setSize(window.innerWidth, window.innerHeight);
            labelRenderer.domElement.style.position = 'absolute';
            labelRenderer.domElement.style.top = '0';
            labelRenderer.domElement.style.pointerEvents = 'none';
            document.body.appendChild(labelRenderer.domElement);
            
            // Start animation loop
            animate();
        } else {
            console.warn("No block data available");
            createFallbackStars();
        }
    } catch (error) {
        console.error("Error initializing visualization:", error);
        createFallbackStars();
    }
}

// Update the block label based on the current slider value
function updateBlockLabel() {
    if (blockNumbers.length > 0) {
        const blockNumber = blockNumbers[slider.value];
        blockLabel.innerHTML = `Block ${blockNumber} <span>↗</span>`;
        blockLabel.href = `https://sentichain.com/app?tab=BlockExplorer#`;
        
        // Also update timestamp when block changes
        updateTimestamp(blockNumber);
    }
}

// Function to create stars and constellations for a specific block
function createStarsForBlock(blockNumber) {
    console.log("Creating stars for block", blockNumber);
    
    // Clear existing star objects and lines
    starObjects.forEach(star => scene.remove(star));
    constellationLines.forEach(line => scene.remove(line));
    
    // Also remove any existing labels if we're not transitioning
    if (!isTransitioning) {
        scene.traverse(object => {
            if (object instanceof THREE.CSS2DObject) {
                scene.remove(object);
            }
        });
        labelObjects = [];
    }
    
    // Clear cluster labels container
    clusterLabelsContainer.innerHTML = '';
    
    starObjects = [];
    constellationLines = [];
    
    if (!blockData[blockNumber] || blockData[blockNumber].length === 0) {
        console.warn("No data for block", blockNumber);
        return;
    }
    
    const points = blockData[blockNumber];
    
    // Create individual stars (implementation details same as before)
    // This is where you'd implement the 3D star visualization...
    
    // As a simplified implementation for now:
    points.forEach(point => {
        const x = point[3]; // 4th item is x
        const y = point[4]; // 5th item is y
        const clusterGroup = point[5]; // 6th item is cluster group
        
        // Convert the 2D coordinates to 3D spherical coordinates
        const longitude = x * Math.PI - Math.PI / 2;
        const latitude = y * Math.PI / 3;
        
        // Convert spherical coordinates to Cartesian (x,y,z)
        const starX = sphereRadius * Math.cos(latitude) * Math.sin(longitude);
        const starY = sphereRadius * Math.sin(latitude);
        const starZ = sphereRadius * Math.cos(latitude) * Math.cos(longitude);
        
        // Calculate star color based on cluster group
        const hue = (parseInt(clusterGroup) * 50) % 360;
        const starColor = new THREE.Color(`hsl(${hue}, 100%, 90%)`);
        
        // Create a star with appropriate material
        const starSize = isMobileView ? 0.8 : 0.5;
        const starGeometry = new THREE.SphereGeometry(starSize, isMobileView ? 16 : 32, isMobileView ? 16 : 32);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: starColor,
            emissive: starColor,
            emissiveIntensity: isMobileView ? 10.0 : 0.5
        });
        
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(starX, starY, starZ);
        star.userData.clusterGroup = clusterGroup;
        star.userData.title = point[8];
        
        scene.add(star);
        starObjects.push(star);
    });
}

// Create fallback stars if data loading fails
function createFallbackStars() {
    console.log("Creating fallback stars");
    
    // Create three basic stars as fallback
    const star1 = new THREE.Mesh(starGeometry, starMaterial);
    const star2 = new THREE.Mesh(starGeometry, starMaterial);
    const star3 = new THREE.Mesh(starGeometry, starMaterial);
    
    // Position stars in a visible triangle
    star1.position.set(-sphereRadius / 4, sphereRadius / 5, sphereRadius / 2);
    star2.position.set(sphereRadius / 4, sphereRadius / 5, sphereRadius / 2);
    star3.position.set(0, -sphereRadius / 5, sphereRadius / 2);
    
    // Add stars to scene
    scene.add(star1);
    scene.add(star2);
    scene.add(star3);
    
    starObjects = [star1, star2, star3];
    
    // Connect stars with lines
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
    constellationLines = [line];
}

// Animation loop function
function animate() {
    requestAnimationFrame(animate);
    
    // Smooth rotation transition with telescope-like dampening
    currentRotationX += (targetRotationX - currentRotationX) * 0.03;
    currentRotationY += (targetRotationY - currentRotationY) * 0.03;
    
    // Update camera position based on rotation
    updateCameraPosition();
    
    // Render the scene
    renderer.render(scene, camera);
    if (labelRenderer) {
        labelRenderer.render(scene, camera);
    }
}

// Add event listeners for window resize
window.addEventListener('resize', () => {
    // Update mobile detection
    isMobileView = window.innerWidth < 768;
    
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (labelRenderer) {
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Update UI elements
    sliderContainer.style.width = isMobileView ? '80%' : '50%';
    blockNavUI.style.bottom = isMobileView ? '60px' : '40px';
});

// Start initialization when page loads
window.addEventListener('load', initialize); 