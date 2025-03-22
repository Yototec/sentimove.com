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

// Handle mouse movement for desktop
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    // Map mouse position to rotation, with reduced sensitivity for telescope-like precision
    targetRotationY = mouseX * Math.PI * 0.3;
    targetRotationX = mouseY * Math.PI * 0.2;
});

// Handle touch events for mobile
document.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) {
        isTouching = true;
        lastTouchX = event.touches[0].clientX;
        lastTouchY = event.touches[0].clientY;
    }
}, { passive: true });

document.addEventListener('touchmove', (event) => {
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

// Add pinch zoom support for mobile
let initialPinchDistance = 0;

document.addEventListener('touchstart', (event) => {
    if (event.touches.length === 2) {
        initialPinchDistance = getPinchDistance(event);
    }
}, { passive: true });

document.addEventListener('touchmove', (event) => {
    if (event.touches.length === 2) {
        const currentDistance = getPinchDistance(event);
        const delta = currentDistance - initialPinchDistance;
        
        // Update camera distance with pinch
        cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance - delta * 0.1));
        
        // Update initial distance for next move event
        initialPinchDistance = currentDistance;
        
        // Update camera position
        updateCameraPosition();
        
        // Prevent default to avoid zooming the page
        event.preventDefault();
    }
}, { passive: false });

// Helper function to calculate distance between two touch points
function getPinchDistance(event) {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Handle window resize
window.addEventListener('resize', () => {
    // Update mobile detection
    const wasMobile = isMobileView;
    isMobileView = window.innerWidth < 768;
    
    if (wasMobile !== isMobileView) {
        console.log("Mobile state changed:", isMobileView, "Width:", window.innerWidth);
    }
    
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
    
    // Adjust camera distance for mobile
    if (isMobileView) {
        cameraDistance *= 0.7;
    }
    
    cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance));

    // Update camera position
    updateCameraPosition();
    
    // Update cluster labels position
    updateClusterLabelsPosition();
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
blockNavUI.style.bottom = '40px';
blockNavUI.style.width = '100%';
blockNavUI.style.textAlign = 'center';
blockNavUI.style.color = 'white';
blockNavUI.style.fontFamily = 'Arial, sans-serif';
blockNavUI.style.zIndex = '20';
document.body.appendChild(blockNavUI);

// Create a container for cluster labels
const clusterLabelsContainer = document.createElement('div');
clusterLabelsContainer.style.position = 'absolute';
clusterLabelsContainer.style.bottom = '100px'; // Position above the slider
clusterLabelsContainer.style.left = '0';
clusterLabelsContainer.style.width = '100%';
clusterLabelsContainer.style.textAlign = 'center';
clusterLabelsContainer.style.display = 'none'; // Hide by default (for desktop)
clusterLabelsContainer.style.flexWrap = 'nowrap'; // Don't wrap items
clusterLabelsContainer.style.justifyContent = 'flex-start'; // Align to start
clusterLabelsContainer.style.flexDirection = 'column'; // Stack labels vertically
clusterLabelsContainer.style.padding = '10px';
clusterLabelsContainer.style.zIndex = '20';
clusterLabelsContainer.style.maxHeight = '80px';
clusterLabelsContainer.style.overflowY = 'auto'; // Enable vertical scrolling
clusterLabelsContainer.style.overflowX = 'hidden'; // Prevent horizontal scrolling
clusterLabelsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
clusterLabelsContainer.style.backdropFilter = 'blur(2px)';
document.body.appendChild(clusterLabelsContainer);

// Set up animation controls
const animationControlsUI = document.createElement('div');
animationControlsUI.style.position = 'absolute';
animationControlsUI.style.bottom = '70px';
animationControlsUI.style.width = '100%';
animationControlsUI.style.textAlign = 'center';
animationControlsUI.style.zIndex = '20';
document.body.appendChild(animationControlsUI);

// Create a slider container
const sliderContainer = document.createElement('div');
sliderContainer.style.width = window.innerWidth < 768 ? '80%' : '50%'; // Mobile responsive width
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
speedIndicator.textContent = 'x5.0'; // Will be updated when speed is known
sliderContainer.appendChild(speedIndicator);

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
blockLabel.textContent = 'Block 0↗';
blockLabel.href = 'https://sentichain.com/app?tab=BlockExplorer#';
blockLabel.target = '_blank'; // Open in new tab
document.body.appendChild(blockLabel);

// Create timestamp label
const timestampLabel = document.createElement('div');
timestampLabel.style.position = 'absolute';
timestampLabel.style.top = '50px'; // Position below the block label
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

// Cache for block timestamps
const timestampCache = {};

// Function to fetch and update timestamp
async function updateTimestamp(blockNumber) {
    // Check cache first
    if (timestampCache[blockNumber]) {
        timestampLabel.textContent = `${timestampCache[blockNumber]}`;
        return;
    }
    
    // Show loading state
    timestampLabel.textContent = '...';
    
    try {
        const response = await fetch(`https://api.sentichain.com/blockchain/get_timestamp_from_block_number?network=mainnet&block_number=${blockNumber}`);
        const data = await response.json();
        
        if (data && data.timestamp) {
            // Convert UTC to local time
            const utcDate = new Date(data.timestamp);
            const localTimeString = utcDate.toLocaleString();
            
            // Cache the result
            timestampCache[blockNumber] = localTimeString;
            
            // Update the label
            timestampLabel.textContent = `${localTimeString}`;
        } else {
            timestampLabel.textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error fetching timestamp:', error);
        timestampLabel.textContent = 'N/A';
    }
}

let isAutoPlaying = true;
const fastAutoplaySpeed = 400; // 0.4 seconds for first 75% of blocks
const normalAutoplaySpeed = 2000; // 2 seconds for last 25% and after first playthrough
let currentAutoplaySpeed = fastAutoplaySpeed; // Start with fast speed
let autoplayTimer = null;

// Update the slider when blockNumbers are loaded
function updateSlider() {
    if (blockNumbers.length > 0) {
        slider.max = blockNumbers.length - 1;
        slider.value = targetBlockIndex;
        updateBlockLabel();
    }
}

// Update the block label based on the current slider value
function updateBlockLabel() {
    if (blockNumbers.length > 0) {
        const blockNumber = blockNumbers[slider.value];
        blockLabel.textContent = `Block ${blockNumber}↗`;
        blockLabel.href = `https://sentichain.com/app?tab=BlockExplorer#`;
        
        // Also update timestamp when block changes
        updateTimestamp(blockNumber);
    }
}

// Add event listeners for the slider
slider.addEventListener('input', function () {
    if (!isTransitioning) {
        const newIndex = parseInt(this.value);
        if (targetBlockIndex !== newIndex) {
            // Check if the target block has data before transitioning
            const targetBlockNumber = blockNumbers[newIndex];
            if (!blockData[targetBlockNumber] || blockData[targetBlockNumber].length === 0) {
                console.warn(`Block ${targetBlockNumber} has no data, skipping transition`);
                return;
            }
            
            targetBlockIndex = newIndex;
            transitionProgress = 0;
            isTransitioning = true;
            updateBlockLabel();
        }
    }
});

// Function to update block navigation UI - now just updates the slider
function updateBlockNavUI() {
    updateSlider();
}

// Update toggle button appearance
function updateToggleButton() {
    toggleButton.style.backgroundColor = isAutoPlaying ? '#4CAF50' : '#FF5252'; // Green for play, red for pause
    
    // Always calculate and set the speed text, but control visibility with opacity
    const speedMultiplier = Math.round(1000 / currentAutoplaySpeed);
    speedIndicator.textContent = `x${speedMultiplier}`;
    
    // Show speed indicator only when playing (green dot)
    speedIndicator.style.opacity = isAutoPlaying ? '1' : '0';
    
    // Disable slider when playing (green dot), enable when paused (red dot)
    slider.disabled = isAutoPlaying;
    
    // Update slider appearance based on state
    slider.style.opacity = isAutoPlaying ? '0.5' : '1';
    slider.style.cursor = isAutoPlaying ? 'not-allowed' : 'pointer';
}

// Function to determine the correct autoplay speed based on current position
function getAutoplaySpeed() {
    // If not first playthrough or user clicked toggle, always use normal speed
    if (!isFirstPlaythrough) {
        return normalAutoplaySpeed;
    }
    
    // Calculate the threshold for switching to normal speed (75% of blocks)
    const speedChangeThreshold = Math.floor(blockNumbers.length * 0.75);
    
    // Use fast speed for first 90% of blocks, normal speed for last 25%
    return (targetBlockIndex < speedChangeThreshold) ? fastAutoplaySpeed : normalAutoplaySpeed;
}

// Update speed indicator immediately when initialized
function updateSpeedIndicator() {
    const speedMultiplier = Math.round(1000 / currentAutoplaySpeed);
    speedIndicator.textContent = `x${speedMultiplier}`;
}

// Start autoplay timer immediately since isAutoPlaying is true
function startAutoplayTimer() {
    clearInterval(autoplayTimer); // Clear any existing timer
    
    // Get the appropriate speed
    currentAutoplaySpeed = getAutoplaySpeed();
    
    // Update speed indicator
    updateSpeedIndicator();
    
    autoplayTimer = setInterval(() => {
        if (!isTransitioning) {
            // Check if we're at the last block and this is the first playthrough
            const nextBlockIndex = (targetBlockIndex + 1) % blockNumbers.length;
            
            // If we're at the last block and this is the first playthrough, stop
            if (nextBlockIndex === 0 && isFirstPlaythrough) {
                isAutoPlaying = false;
                updateToggleButton();
                clearInterval(autoplayTimer);
                return;
            }
            
            // Find next valid block index
            let validNextIndex = nextBlockIndex;
            let attempts = 0;
            const maxAttempts = blockNumbers.length;
            
            // Keep trying different blocks until we find one with data or exhaust all options
            while (attempts < maxAttempts) {
                const nextBlockNumber = blockNumbers[validNextIndex];
                if (blockData[nextBlockNumber] && blockData[nextBlockNumber].length > 0) {
                    break; // Found a valid block
                }
                validNextIndex = (validNextIndex + 1) % blockNumbers.length;
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                console.error('No valid blocks found for transition');
                return;
            }
            
            targetBlockIndex = validNextIndex;
            slider.value = targetBlockIndex;
            isTransitioning = true;
            transitionProgress = 0;
            updateBlockLabel();
            
            // After moving to the next block, check if we need to adjust the speed
            const newSpeed = getAutoplaySpeed();
            if (newSpeed !== currentAutoplaySpeed) {
                currentAutoplaySpeed = newSpeed;
                // Update speed indicator
                updateSpeedIndicator();
                // Restart the timer with the new speed
                startAutoplayTimer();
            }
        }
    }, currentAutoplaySpeed);
}

// Add event listener for toggle button
toggleButton.addEventListener('click', () => {
    isAutoPlaying = !isAutoPlaying;
    updateToggleButton();
    isFirstPlaythrough = false; // User has clicked the toggle, so disable first playthrough behavior

    if (isAutoPlaying) {
        currentAutoplaySpeed = normalAutoplaySpeed; // Always use normal speed after user interaction
        updateSpeedIndicator(); // Update speed indicator when speed changes
        startAutoplayTimer();
    } else {
        clearInterval(autoplayTimer);
    }
});

// Fetch data from API and create stars
fetch('https://api.sentichain.com/mapper/get_max_block_number')
    .then(response => response.json())
    .then(data => {
        const maxBlockNumber = data.max_block_number;
        const startBlock = maxBlockNumber - 10;
        const endBlock = maxBlockNumber;

        // Now fetch the points using the calculated blocks
        return fetch(`https://api.sentichain.com/mapper/get_points_by_block_range_no_embedding?start_block=${startBlock}&end_block=${endBlock}&api_key=abc123`);
    })
    .then(response => response.json())
    .then(data => {
        const points = data.points;

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
        currentBlockIndex = 0;
        targetBlockIndex = 0;

        // Create initial stars and constellations
        createStarsForBlock(blockNumbers[currentBlockIndex]);

        // Update slider for block navigation
        updateSlider();

        // Initialize toggle button state
        updateToggleButton();
        
        // Initialize speed indicator
        updateSpeedIndicator();

        // Start autoplay timer immediately since isAutoPlaying is true
        startAutoplayTimer();

        // Add CSS2D renderer for labels
        labelRenderer = new THREE.CSS2DRenderer();
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(labelRenderer.domElement);

        // Start animation
        animate();
        
        // Set a timer to check if stars were created successfully
        setTimeout(() => {
            if (starObjects.length === 0) {
                console.warn("No stars created after fetch, using emergency fallback");
                createEmergencyFallbackStars();
            }
        }, 3000);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        // Fallback to original 3 stars if fetch fails
        createFallbackStars();
    });

// Function to create stars and constellations for a specific block
function createStarsForBlock(blockNumber) {
    console.log("Creating stars for block", blockNumber, "Mobile view:", isMobileView);
    
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
        labelObjects = []; // Clear label objects array
    }

    // Clear cluster labels container
    clusterLabelsContainer.innerHTML = '';

    starObjects = [];
    constellationLines = [];

    if (!blockData[blockNumber]) {
        console.warn("No data for block", blockNumber);
        return;
    }

    const points = blockData[blockNumber];
    console.log(`Creating ${points.length} stars, mobile: ${isMobileView}`);
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

        // Calculate star color based on cluster group - same calculation as used for constellation lines
        const hue = (parseInt(clusterGroup) * 50) % 360;
        const starColor = new THREE.Color(`hsl(${hue}, 100%, 90%)`);

        // Use a larger star size on mobile for better visibility
        const starSize = isMobileView ? 1.2 : 0.5; // Much bigger stars on mobile
        const mobileStarGeometry = new THREE.SphereGeometry(starSize, isMobileView ? 16 : 32, isMobileView ? 16 : 32);

        const star = new THREE.Mesh(mobileStarGeometry, new THREE.MeshBasicMaterial({
            color: starColor,
            emissive: starColor,
            emissiveIntensity: isMobileView ? 1.0 : 0.5 // Full brightness on mobile
        }));

        // Position stars on the inside of a sphere
        star.position.set(starX, starY, starZ);
        star.userData.clusterGroup = clusterGroup; // Store cluster group in user data
        star.userData.title = point[8]; // Store title for later use in cluster labels
        scene.add(star);
        stars.push(star);
        starObjects.push(star);
    });

    console.log(`Created ${stars.length} stars`);

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

    // Track unique clusters to create labels
    const uniqueClusters = new Set();
    const clusterColors = {};
    const clusterTitles = {};

    // Connect stars within the same cluster group and add cluster labels
    Object.keys(clusterGroups).forEach(groupId => {
        const groupStars = clusterGroups[groupId];

        // Use different colors for different cluster groups
        const hue = (parseInt(groupId) * 50) % 360;
        const color = new THREE.Color(`hsl(${hue}, 100%, 70%)`);
        
        // Store cluster information for labels
        uniqueClusters.add(groupId);
        clusterColors[groupId] = `hsl(${hue}, 100%, 70%)`;
        clusterTitles[groupId] = groupStars[0].userData.title;

        // Add a label for the cluster group
        // Get the title from the first star in the group
        const clusterTitle = groupStars[0].userData.title;

        // Skip label creation on mobile view
        if (!isMobileView) {
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
                label.userData.clusterGroup = groupId; // Store cluster group id for tracking
                label.userData.title = clusterTitle; // Store the title

                // Create a line from the star to the label
                const linePoints = [starPosition, labelPosition];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0xCCCCCC,
                    opacity: 0.2,
                    transparent: true,
                    linewidth: 0.2
                });
                const labelLine = new THREE.Line(lineGeometry, lineMaterial);

                // Store references for animation updates
                labelLine.userData.startPoint = starPosition;
                labelLine.userData.endPoint = labelPosition;
                labelLine.userData.isLabelLine = true;

                // Add label and line to scene
                scene.add(label);
                scene.add(labelLine);
                constellationLines.push(labelLine);
                labelObjects.push(label); // Track the label
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
                label.userData.clusterGroup = groupId; // Store cluster group id for tracking
                label.userData.title = clusterTitle; // Store the title

                // Create a line from the center of mass to the label
                const linePoints = [centerOfMass, labelPosition];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: 0xCCCCCC,
                    opacity: 0.2,
                    transparent: true,
                    linewidth: 0.2
                });
                const labelLine = new THREE.Line(lineGeometry, lineMaterial);

                // Store references for animation updates
                labelLine.userData.startPoint = centerOfMass;
                labelLine.userData.endPoint = labelPosition;
                labelLine.userData.isLabelLine = true;

                // Add label and line to scene
                scene.add(label);
                scene.add(labelLine);
                constellationLines.push(labelLine);
                labelObjects.push(label); // Track the label
            }
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
                opacity: isMobileView ? 0.7 : 0.2, // More visible lines on mobile
                transparent: true,
                linewidth: isMobileView ? 1.0 : 0.2 // Much thicker lines on mobile
            });
            const constellationLine = new THREE.Line(constellationLineGeo, constellationLineMat);
            scene.add(constellationLine);
            constellationLines.push(constellationLine);

            // Store references to connected stars for updating lines during zoom
            constellationLine.userData = {
                fromStar: fromStar,
                toStar: toStar
            };
        }
    });
    
    console.log(`Created ${constellationLines.length} constellation lines`);
    
    // Create bullet-point labels at the bottom
    uniqueClusters.forEach(groupId => {
        const labelContainer = document.createElement('div');
        labelContainer.style.display = 'flex';
        labelContainer.style.alignItems = 'center';
        labelContainer.style.margin = '2px 10px';
        labelContainer.style.padding = '4px 0';
        labelContainer.style.width = 'calc(100% - 20px)'; // Account for margin
        labelContainer.style.minWidth = '0'; // Allow shrinking below content size
        
        // Create colored bullet point
        const bullet = document.createElement('span');
        bullet.style.display = 'inline-block';
        bullet.style.width = isMobileView ? '10px' : '12px';
        bullet.style.height = isMobileView ? '10px' : '12px';
        bullet.style.borderRadius = '50%';
        bullet.style.backgroundColor = clusterColors[groupId];
        bullet.style.marginRight = '8px';
        bullet.style.boxShadow = '0 0 3px rgba(255, 255, 255, 0.5)';
        bullet.style.flexShrink = '0'; // Prevent bullet from shrinking
        
        // Create text label
        const text = document.createElement('span');
        text.style.color = 'white';
        text.style.fontSize = '12px';
        text.style.overflow = 'hidden';
        text.style.textOverflow = 'ellipsis';
        text.style.whiteSpace = 'nowrap';
        text.textContent = clusterTitles[groupId];
        text.style.flexGrow = '1'; // Allow text to take remaining space
        text.style.flexShrink = '1'; // Allow text to shrink if needed
        text.style.minWidth = '0'; // Allow shrinking below content size
        
        // Add to container
        labelContainer.appendChild(bullet);
        labelContainer.appendChild(text);
        clusterLabelsContainer.appendChild(labelContainer);
    });
}

// Function to transition between blocks
function updateStarPositions() {
    if (!isTransitioning) return;

    // Update transition progress
    transitionProgress += transitionSpeed;

    if (transitionProgress >= 1.0) {
        // Transition complete
        transitionProgress = 1.0;
        isTransitioning = false;
        currentBlockIndex = targetBlockIndex;

        // Clean up first - remove all existing objects
        starObjects.forEach(star => scene.remove(star));
        constellationLines.forEach(line => scene.remove(line));
        labelObjects.forEach(label => scene.remove(label));
        
        starObjects = [];
        constellationLines = [];
        labelObjects = [];

        // Update with final positions
        createStarsForBlock(blockNumbers[currentBlockIndex]);
    } else {
        // During transition - update positions without removing labels
        
        // Remove constellation lines
        constellationLines.forEach(line => scene.remove(line));
        constellationLines = [];

        // Keep existing stars but update their positions
        const currentBlock = blockData[blockNumbers[currentBlockIndex]];
        const targetBlock = blockData[blockNumbers[targetBlockIndex]];

        // Safety check - if either block is missing data, abort transition
        if (!currentBlock || !targetBlock || currentBlock.length === 0 || targetBlock.length === 0) {
            console.error('Missing data in current or target block, aborting transition');
            transitionProgress = 1.0; // Force transition to complete
            isTransitioning = false;
            return;
        }

        // Map stars by cluster group for easier matching
        const currentStarsByCluster = {};
        const targetStarsByCluster = {};

        currentBlock.forEach(point => {
            const clusterGroup = point[5];
            if (!currentStarsByCluster[clusterGroup]) {
                currentStarsByCluster[clusterGroup] = [];
            }
            currentStarsByCluster[clusterGroup].push(point);
        });

        targetBlock.forEach(point => {
            const clusterGroup = point[5];
            if (!targetStarsByCluster[clusterGroup]) {
                targetStarsByCluster[clusterGroup] = [];
            }
            targetStarsByCluster[clusterGroup].push(point);
        });

        // For each star object, find the corresponding position in target block
        starObjects.forEach((star, index) => {
            const clusterGroup = star.userData.clusterGroup;

            // Get corresponding points from current and target blocks
            const currentPoints = currentStarsByCluster[clusterGroup];
            const targetPoints = targetStarsByCluster[clusterGroup];

            if (!currentPoints || !targetPoints) return;

            // Match the star with corresponding point in current block
            let matchIndex = Math.min(index % currentPoints.length, currentPoints.length - 1);
            let currentPoint = currentPoints[matchIndex];

            // Find corresponding point in target block
            let targetMatchIndex = Math.min(matchIndex, targetPoints.length - 1);
            let targetPoint = targetPoints[targetMatchIndex];

            // Get current coordinates
            const currentX = currentPoint[3];
            const currentY = currentPoint[4];

            // Get target coordinates
            const targetX = targetPoint[3];
            const targetY = targetPoint[4];

            // Interpolate between coordinates
            const interpX = currentX + (targetX - currentX) * transitionProgress;
            const interpY = currentY + (targetY - currentY) * transitionProgress;

            // Convert interpolated coordinates to 3D position
            const longitude = interpX * Math.PI - Math.PI / 2;
            const latitude = interpY * Math.PI / 3;

            // Update star position
            const newX = sphereRadius * Math.cos(latitude) * Math.sin(longitude);
            const newY = sphereRadius * Math.sin(latitude);
            const newZ = sphereRadius * Math.cos(latitude) * Math.cos(longitude);

            star.position.set(newX, newY, newZ);
        });

        // During transitions, we'll let the lines update naturally in the animate loop
        // and let the labels be completely recreated at the end of transition
    }
}

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

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation transition with telescope-like dampening
    currentRotationX += (targetRotationX - currentRotationX) * 0.03;
    currentRotationY += (targetRotationY - currentRotationY) * 0.03;

    // Update camera position based on rotation
    updateCameraPosition();

    // Update star positions for block transition
    updateStarPositions();

    // Update constellation lines
    scene.traverse(object => {
        if (object instanceof THREE.Line) {
            if (object.userData.fromStar && object.userData.toStar) {
                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    object.userData.fromStar.position,
                    object.userData.toStar.position
                ]);
                object.geometry.dispose();
                object.geometry = lineGeo;
            } else if (object.userData.isLabelLine && object.userData.startPoint && object.userData.endPoint) {
                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    object.userData.startPoint,
                    object.userData.endPoint
                ]);
                object.geometry.dispose();
                object.geometry = lineGeo;
            } else if (object.userData.stars) {
                const points = object.userData.stars.map(star => star.position);
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                object.geometry.dispose();
                object.geometry = lineGeo;
            }
        }
    });

    renderer.render(scene, camera);
    if (labelRenderer) {
        labelRenderer.render(scene, camera);
    }
}

// Function to update slider container width and handle mobile view changes
function updateSliderContainerWidth() {
    // Update mobile flag
    const wasMobile = isMobileView;
    isMobileView = window.innerWidth < 768;
    sliderContainer.style.width = isMobileView ? '100%' : '50%';
    
    // Update cluster labels position
    updateClusterLabelsPosition();
    
    if (wasMobile !== isMobileView) {
        console.log("Mobile state changed in updateSliderContainerWidth:", isMobileView, "Width:", window.innerWidth);
        
        // Recreate stars after a delay to ensure proper screen measurements
        setTimeout(() => {
            if (currentBlockIndex >= 0 && blockNumbers.length > 0) {
                createStarsForBlock(blockNumbers[currentBlockIndex]);
            } else {
                // If no blocks are loaded, use emergency fallback
                createEmergencyFallbackStars();
            }
        }, 500);
    } else {
        // If we're not in a transition, recreate stars with or without labels
        if (!isTransitioning && currentBlockIndex >= 0 && blockNumbers.length > 0) {
            createStarsForBlock(blockNumbers[currentBlockIndex]);
        }
    }
}

// Debugging function - call this if no stars are visible
function debugVisibility() {
    console.log("Debug visibility called");
    console.log("Mobile view:", isMobileView, "Window width:", window.innerWidth);
    console.log("Camera position:", camera.position.x, camera.position.y, camera.position.z);
    console.log("Camera distance:", cameraDistance);
    console.log("Star objects:", starObjects.length);
    console.log("Constellation lines:", constellationLines.length);
    
    // Force recreation of stars with extreme visibility settings
    if (starObjects.length === 0 && blockNumbers.length > 0) {
        console.log("No stars found, forcing creation");
        createStarsForBlock(blockNumbers[currentBlockIndex]);
    }
}

// Call debug visibility after a short delay to check if stars are created
setTimeout(debugVisibility, 5000);

// Add resize event listener to handle screen size changes
window.addEventListener('resize', updateSliderContainerWidth);

// Emergency fallback function to ensure stars are visible on mobile
function createEmergencyFallbackStars() {
    console.log("Creating emergency fallback stars for mobile");
    
    // Remove any existing objects
    starObjects.forEach(star => scene.remove(star));
    constellationLines.forEach(line => scene.remove(line));
    labelObjects.forEach(label => scene.remove(label));
    
    // Clear cluster labels container
    clusterLabelsContainer.innerHTML = '';
    
    starObjects = [];
    constellationLines = [];
    labelObjects = [];
    
    // Create some guaranteed visible stars
    const numStars = 20;
    const colors = [
        0xFF5555, // Red
        0x55FF55, // Green
        0x5555FF, // Blue
        0xFFFF55, // Yellow
        0xFF55FF  // Purple
    ];
    
    // Create stars in a more visible pattern for guaranteed visibility
    for (let i = 0; i < numStars; i++) {
        // Calculate position in a spiral pattern
        const angle = 0.5 * i;
        const radius = 2 + (i * 4);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 30; // Place closer to camera for visibility
        
        // Large, bright stars for visibility
        const starSize = isMobileView ? 3.0 : 1.5;
        const starGeom = new THREE.SphereGeometry(starSize, 16, 16);
        
        // Use a variety of bright colors
        const color = colors[i % colors.length];
        const starMat = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.0
        });
        
        const star = new THREE.Mesh(starGeom, starMat);
        star.position.set(x, y, z);
        
        scene.add(star);
        starObjects.push(star);
        
        // Add a point light at the star position for additional visibility
        if (i < 5) { // Only add a few lights to avoid performance issues
            const light = new THREE.PointLight(color, 1, 100);
            light.position.copy(star.position);
            scene.add(light);
        }
    }
    
    // Create connections between stars
    for (let i = 0; i < starObjects.length - 1; i++) {
        const fromStar = starObjects[i];
        const toStar = starObjects[i + 1];
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            fromStar.position,
            toStar.position
        ]);
        
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xFFFFFF,
            opacity: 1.0,
            transparent: false,
            linewidth: 2.0
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        constellationLines.push(line);
        
        line.userData = {
            fromStar: fromStar,
            toStar: toStar
        };
    }
    
    // Add some special highlight stars
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const z = 10 + Math.random() * 30;
        
        // Create a very large, bright highlight star
        const highlightStarSize = 4.0;
        const highlightStarGeom = new THREE.SphereGeometry(highlightStarSize, 32, 32);
        const highlightStarMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 1.0
        });
        
        const highlightStar = new THREE.Mesh(highlightStarGeom, highlightStarMat);
        highlightStar.position.set(x, y, z);
        
        scene.add(highlightStar);
        starObjects.push(highlightStar);
    }
    
    console.log(`Created ${starObjects.length} emergency stars and ${constellationLines.length} lines`);
    
    // Move camera closer for emergency stars
    cameraDistance = 50;
    updateCameraPosition();
    
    // Create some emergency labels
    const emergencyClusterNames = ["Alpha Cluster", "Beta Cluster", "Gamma Cluster", "Delta Cluster", "Omega Cluster"];
    const emergencyColors = [
        0xFF5555, // Red
        0x55FF55, // Green
        0x5555FF, // Blue
        0xFFFF55, // Yellow
        0xFF55FF  // Purple
    ];
    
    // Add emergency cluster labels
    emergencyColors.forEach((color, index) => {
        if (index < emergencyClusterNames.length) {
            const labelContainer = document.createElement('div');
            labelContainer.style.display = 'flex';
            labelContainer.style.alignItems = 'center';
            labelContainer.style.margin = '0 10px';
            labelContainer.style.padding = isMobileView ? '4px 0' : '2px 0';
            labelContainer.style.width = '100%'; // Full width for one label per row
            
            // Create colored bullet point
            const bullet = document.createElement('span');
            bullet.style.display = 'inline-block';
            bullet.style.width = isMobileView ? '10px' : '12px';
            bullet.style.height = isMobileView ? '10px' : '12px';
            bullet.style.borderRadius = '50%';
            bullet.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
            bullet.style.marginRight = '5px';
            bullet.style.boxShadow = '0 0 3px rgba(255, 255, 255, 0.5)';
            bullet.style.flexShrink = '0'; // Prevent bullet from shrinking
            
            // Create text label
            const text = document.createElement('span');
            text.style.color = 'white';
            text.style.fontSize = isMobileView ? '12px' : '14px';
            text.style.maxWidth = isMobileView ? '100%' : '150px'; // Use full width on mobile
            text.style.overflow = 'hidden';
            text.style.textOverflow = 'ellipsis';
            text.style.whiteSpace = 'nowrap';
            text.textContent = emergencyClusterNames[index];
            text.style.flexGrow = '1'; // Allow text to take remaining space
            
            // Add to container
            labelContainer.appendChild(bullet);
            labelContainer.appendChild(text);
            clusterLabelsContainer.appendChild(labelContainer);
        }
    });
}

// Add a mobile-specific forced visibility check
if (isMobileView) {
    // For mobile devices, force visibility checks at specific intervals
    // This is a safeguard to ensure something is always visible
    const checkVisibilityIntervals = [1000, 3000, 7000];
    
    checkVisibilityIntervals.forEach(interval => {
        setTimeout(() => {
            if (starObjects.length === 0) {
                console.warn(`No stars visible after ${interval}ms, forcing emergency stars`);
                createEmergencyFallbackStars();
            } else {
                console.log(`Visibility check at ${interval}ms: ${starObjects.length} stars present`);
            }
        }, interval);
    });
}

// When document is fully loaded, force a visibility check
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, checking visibility");
    
    // Force recreation after DOM is loaded to ensure proper rendering on mobile
    setTimeout(() => {
        if (starObjects.length === 0 && blockNumbers.length > 0) {
            console.log("DOM loaded but no stars, recreating");
            createStarsForBlock(blockNumbers[currentBlockIndex]);
        } else if (starObjects.length === 0) {
            console.log("DOM loaded but no stars or blocks, using emergency fallback");
            createEmergencyFallbackStars();
        }
    }, 1500);
});

// Function to update cluster labels position based on mobile view
function updateClusterLabelsPosition() {
    // Show on mobile, hide on desktop
    clusterLabelsContainer.style.display = isMobileView ? 'flex' : 'none';
    
    // Adjust position and height for mobile
    clusterLabelsContainer.style.bottom = isMobileView ? '80px' : '100px';
    clusterLabelsContainer.style.maxHeight = isMobileView ? '100px' : '80px'; // Give more room on mobile
}

// Initialize labels position based on current view
updateClusterLabelsPosition();