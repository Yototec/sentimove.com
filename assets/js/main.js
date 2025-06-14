const scene = new THREE.Scene();

let isMobileView = window.innerWidth < 768;
console.log("Initial mobile detection:", isMobileView, "Width:", window.innerWidth);

// Add ambient light to improve star visibility, especially on mobile
const ambientLight = new THREE.AmbientLight(0xffffff, isMobileView ? 0.3 : 0.1);
scene.add(ambientLight);

const sphereRadius = 100;

const camera = new THREE.PerspectiveCamera(
    isMobileView ? 45 : 30, // Higher FOV on mobile for wider view
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const fovRadians = camera.fov * (Math.PI / 180);
const aspectRatio = window.innerWidth / window.innerHeight;
const horizontalFovRadians = 2 * Math.atan(Math.tan(fovRadians / 2) * aspectRatio);
const effectiveFovRadians = Math.min(fovRadians, horizontalFovRadians);
const safetyMargin = 1.2; // 20% extra margin to ensure all stars are visible
let cameraDistance = (sphereRadius / Math.sin(effectiveFovRadians / 2)) * safetyMargin * 1.2;
if (isMobileView) {
    cameraDistance *= 0.7; // Move camera much closer on mobile
}
const minDistance = cameraDistance * 0.8;
const maxDistance = cameraDistance * 1.2;

// Add variables for star and constellation line blinking
let blinkFactor = 0;
const blinkSpeed = 0.03;
let blinkDirection = 1;
const minBlinkIntensity = 0.6;
const maxBlinkIntensity = 1.4;

// Add variables for constellation line animation
let constellationLineAnimations = [];
const lineGrowthSpeed = 0.03; // Speed of line growth animation
const lineRevealDelay = 150; // Milliseconds between line reveals

// Modify these variables for faster parallel animation
const lineGrowthSpeedFast = 0.08; // Increased speed for faster animation
const lineRevealIntraClusterDelay = 40; // Much shorter delay between lines in same cluster
const lineRevealInterClusterDelay = 100; // Delay between different clusters starting

// Variables for sphere hover redirect feature
let isRedirecting = false;
let redirectHoverTimer = null;
let redirectTransitionTimer = null;
let lastMouseMoveTime = Date.now();
let mouseHasMovedRecently = true;
const HOVER_DELAY = 500; // 0.5 second hover delay (reduced from 1000)
const REDIRECT_TRANSITION_DURATION = 1500; // 1.5 second transition (reduced from 2000)
let redirectOverlay = null;
let redirectSpinner = null;
let redirectText = null;

// Variables for touch-based redirect on mobile
let touchRedirectTimer = null;
let touchStartTime = 0;
let isTouchingForRedirect = false;
let touchStartX = 0;
let touchStartY = 0;
const TOUCH_MOVE_THRESHOLD = 10; // pixels - how much movement cancels the redirect

// Raycaster for detecting sphere hover
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Create redirect overlay elements
function createRedirectOverlay() {
    // Create overlay container
    redirectOverlay = document.createElement('div');
    redirectOverlay.style.position = 'fixed';
    redirectOverlay.style.top = '0';
    redirectOverlay.style.left = '0';
    redirectOverlay.style.width = '100%';
    redirectOverlay.style.height = '100%';
    redirectOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    redirectOverlay.style.transition = 'background-color 1.5s ease-in-out'; // Changed from 2s to 1.5s
    redirectOverlay.style.pointerEvents = 'none';
    redirectOverlay.style.zIndex = '1000';
    redirectOverlay.style.display = 'none';
    
    // Create spinner container
    const spinnerContainer = document.createElement('div');
    spinnerContainer.style.position = 'absolute';
    spinnerContainer.style.top = '50%';
    spinnerContainer.style.left = '50%';
    spinnerContainer.style.transform = 'translate(-50%, -50%)';
    spinnerContainer.style.textAlign = 'center';
    spinnerContainer.style.opacity = '0';
    spinnerContainer.style.transition = 'opacity 0.5s ease-in-out';
    
    // Create spinner (similar to intelligence page)
    redirectSpinner = document.createElement('div');
    redirectSpinner.style.border = '4px solid rgba(255, 255, 255, 0.1)';
    redirectSpinner.style.borderTop = '4px solid #ffffff';
    redirectSpinner.style.borderRadius = '50%';
    redirectSpinner.style.width = '50px';
    redirectSpinner.style.height = '50px';
    redirectSpinner.style.margin = '0 auto 20px';
    redirectSpinner.style.animation = 'spin 1s linear infinite';
    
    // Create text
    redirectText = document.createElement('p');
    redirectText.style.color = '#ffffff';
    redirectText.style.fontSize = '1.2rem';
    redirectText.style.fontFamily = 'Arial, sans-serif';
    redirectText.textContent = 'Redirecting to Intelligence';
    
    // Add spinner animation if not already defined
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Assemble elements
    spinnerContainer.appendChild(redirectSpinner);
    spinnerContainer.appendChild(redirectText);
    redirectOverlay.appendChild(spinnerContainer);
    document.body.appendChild(redirectOverlay);
}

// Check if mouse is over the sphere
function isMouseOverSphere(event) {
    // Don't check on mobile or if already redirecting
    if (isMobileView || isRedirecting) return false;
    
    // Update mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Create an invisible sphere at origin to test intersection
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMesh = new THREE.Mesh(sphereGeometry);
    sphereMesh.position.set(0, 0, 0);
    
    // Check intersection
    const intersects = raycaster.intersectObject(sphereMesh);
    
    // Clean up
    sphereGeometry.dispose();
    
    return intersects.length > 0;
}

// Check if touch point is over the sphere
function isTouchOverSphere(touch) {
    // Don't check if already redirecting
    if (isRedirecting) return false;
    
    // Update mouse coordinates from touch
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Create an invisible sphere at origin to test intersection
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMesh = new THREE.Mesh(sphereGeometry);
    sphereMesh.position.set(0, 0, 0);
    
    // Check intersection
    const intersects = raycaster.intersectObject(sphereMesh);
    
    // Clean up
    sphereGeometry.dispose();
    
    return intersects.length > 0;
}

// Start redirect process
function startRedirect() {
    if (isRedirecting) return;
    
    isRedirecting = true;
    redirectOverlay.style.display = 'block';
    
    // Start transition after a brief delay
    setTimeout(() => {
        redirectOverlay.style.backgroundColor = 'rgba(0, 0, 0, 1)';
        redirectOverlay.querySelector('div').style.opacity = '1';
    }, 50);
    
    // Set timer for actual redirect
    redirectTransitionTimer = setTimeout(() => {
        window.location.href = 'intelligence.html';
    }, REDIRECT_TRANSITION_DURATION);
}

// Cancel redirect process
function cancelRedirect() {
    if (!isRedirecting) return;
    
    isRedirecting = false;
    
    // Clear timers
    if (redirectHoverTimer) {
        clearTimeout(redirectHoverTimer);
        redirectHoverTimer = null;
    }
    
    if (redirectTransitionTimer) {
        clearTimeout(redirectTransitionTimer);
        redirectTransitionTimer = null;
    }
    
    // Fade out overlay
    redirectOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    redirectOverlay.querySelector('div').style.opacity = '0';
    
    // Hide overlay after transition
    setTimeout(() => {
        redirectOverlay.style.display = 'none';
    }, 500);
}

// Initialize redirect overlay on DOM load
document.addEventListener('DOMContentLoaded', () => {
    if (!isMobileView) {
        document.body.style.cursor = 'grab'; // Set initial cursor style for desktop
    }
    createRedirectOverlay(); // Initialize redirect overlay
});

camera.position.z = cameraDistance;
camera.position.y = 0;
camera.position.x = 0;
camera.lookAt(0, 0, 0); // Look at the center of the sphere

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const vignetteContainer = document.createElement('div');
vignetteContainer.style.position = 'absolute';
vignetteContainer.style.top = '0';
vignetteContainer.style.left = '0';
vignetteContainer.style.width = '100%';
vignetteContainer.style.height = '100%';
vignetteContainer.style.pointerEvents = 'none';
vignetteContainer.style.borderRadius = '50%';
// Reduce vignette intensity on mobile for better star visibility
vignetteContainer.style.boxShadow = isMobileView ? 
    'inset 0 0 80px 80px rgba(0, 0, 0, 0.7)' : 
    'inset 0 0 150px 150px rgba(0, 0, 0, 0.95)';
vignetteContainer.style.zIndex = '10';
document.body.appendChild(vignetteContainer);

const starGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 2.0 });

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

document.addEventListener('mousedown', (event) => {
    if (event.target.closest('.toggle-button') || event.target === slider || event.target.closest('#sliderContainer')) return;

    isMouseDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    document.body.style.cursor = 'grabbing'; // Change cursor to indicate dragging
});

document.addEventListener('mousemove', (event) => {
    // Track mouse movement time
    lastMouseMoveTime = Date.now();
    mouseHasMovedRecently = true;
    
    // Cancel any ongoing redirect if mouse moves
    if (isRedirecting) {
        cancelRedirect();
    }
    
    // Clear hover timer if mouse moves
    if (redirectHoverTimer) {
        clearTimeout(redirectHoverTimer);
        redirectHoverTimer = null;
    }
    
    // Handle dragging
    if (isMouseDragging) {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const deltaX = mouseX - lastMouseX;
        const deltaY = mouseY - lastMouseY;

        lastMouseX = mouseX;
        lastMouseY = mouseY;

        targetRotationY -= deltaX * 0.01;
        targetRotationX -= deltaY * 0.01;
    } else if (!isMobileView) {
        // Check if hovering over sphere when not dragging (works during transitions too)
        if (isMouseOverSphere(event)) {
            // Start hover timer
            redirectHoverTimer = setTimeout(() => {
                // Check if mouse is still over sphere and hasn't moved
                const timeSinceLastMove = Date.now() - lastMouseMoveTime;
                if (timeSinceLastMove >= HOVER_DELAY - 50 && isMouseOverSphere(event)) {
                    startRedirect();
                }
            }, HOVER_DELAY);
            
            // Change cursor to indicate interactive area
            document.body.style.cursor = 'pointer';
        } else {
            // Reset cursor when not over sphere
            document.body.style.cursor = 'grab';
        }
    }
});

document.addEventListener('mouseup', (event) => {
    isMouseDragging = false;
    
    // Check if we're over the sphere to set appropriate cursor
    if (!isMobileView && !isTransitioning && isMouseOverSphere(event)) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'grab';
    }
});

document.addEventListener('mouseleave', () => {
    if (isMouseDragging) {
        isMouseDragging = false;
        document.body.style.cursor = 'grab'; // Ensure cursor reverts if mouse leaves window
    }
    
    // Cancel redirect if mouse leaves window
    if (redirectHoverTimer) {
        clearTimeout(redirectHoverTimer);
        redirectHoverTimer = null;
    }
    
    if (isRedirecting) {
        cancelRedirect();
    }
});

document.addEventListener('touchstart', (event) => {
    if (event.target.closest('.cluster-labels-container') ||
        event.target.closest('.toggle-button') ||
        event.target === slider ||
        event.target.closest('#sliderContainer')) return;

    if (event.touches.length === 1) {
        const touch = event.touches[0];
        isTouching = true;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        
        // For mobile redirect: check if touching the sphere
        if (isMobileView && isTouchOverSphere(touch)) {
            // Prevent iOS context menu
            event.preventDefault();
            
            // Start tracking for redirect
            isTouchingForRedirect = true;
            touchStartTime = Date.now();
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            // Clear any existing timer
            if (touchRedirectTimer) {
                clearTimeout(touchRedirectTimer);
            }
            
            // Start the 1-second timer for redirect
            touchRedirectTimer = setTimeout(() => {
                // Check if still touching and on sphere
                if (isTouchingForRedirect && event.touches.length === 1) {
                    const currentTouch = event.touches[0];
                    const moveDistance = Math.sqrt(
                        Math.pow(currentTouch.clientX - touchStartX, 2) + 
                        Math.pow(currentTouch.clientY - touchStartY, 2)
                    );
                    
                    // If hasn't moved much and still on sphere
                    if (moveDistance < TOUCH_MOVE_THRESHOLD && isTouchOverSphere(currentTouch)) {
                        startRedirect();
                    }
                }
            }, HOVER_DELAY);
        }
    }
}, { passive: false }); // Changed to non-passive to allow preventDefault

document.addEventListener('touchmove', (event) => {
    if (event.target.closest('.cluster-labels-container') ||
        event.target.closest('.toggle-button') ||
        event.target === slider ||
        event.target.closest('#sliderContainer')) return;

    if (isTouching && event.touches.length === 1) {
        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;
        const deltaX = touchX - lastTouchX;
        const deltaY = touchY - lastTouchY;
        lastTouchX = touchX;
        lastTouchY = touchY;
        targetRotationY -= deltaX * 0.01;
        targetRotationX -= deltaY * 0.01;
        event.preventDefault();
        
        // Check if we need to cancel redirect
        if (isTouchingForRedirect) {
            const moveDistance = Math.sqrt(
                Math.pow(touchX - touchStartX, 2) + 
                Math.pow(touchY - touchStartY, 2)
            );
            
            // Cancel if moved too much or no longer on sphere
            if (moveDistance > TOUCH_MOVE_THRESHOLD || !isTouchOverSphere(event.touches[0])) {
                isTouchingForRedirect = false;
                if (touchRedirectTimer) {
                    clearTimeout(touchRedirectTimer);
                    touchRedirectTimer = null;
                }
                if (isRedirecting) {
                    cancelRedirect();
                }
            }
        }
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    isTouching = false;
    
    // Cancel redirect if touch ends
    if (isTouchingForRedirect) {
        isTouchingForRedirect = false;
        if (touchRedirectTimer) {
            clearTimeout(touchRedirectTimer);
            touchRedirectTimer = null;
        }
        if (isRedirecting) {
            cancelRedirect();
        }
    }
}, { passive: true });

// Handle touch cancel (e.g., incoming call, browser interrupt)
document.addEventListener('touchcancel', () => {
    isTouching = false;
    
    // Cancel redirect if touch is cancelled
    if (isTouchingForRedirect) {
        isTouchingForRedirect = false;
        if (touchRedirectTimer) {
            clearTimeout(touchRedirectTimer);
            touchRedirectTimer = null;
        }
        if (isRedirecting) {
            cancelRedirect();
        }
    }
}, { passive: true });

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

        cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance - delta * 0.1));

        initialPinchDistance = currentDistance;

        updateCameraPosition();

        event.preventDefault();
    }
}, { passive: false });

function getPinchDistance(event) {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

window.addEventListener('resize', () => {
    const wasMobile = isMobileView;
    isMobileView = window.innerWidth < 768;
    if (wasMobile !== isMobileView) {
        console.log("Mobile state changed:", isMobileView, "Width:", window.innerWidth);
        blockNavUI.style.bottom = isMobileView ? '60px' : '40px';
        
        // Update vignette intensity based on mobile/desktop
        vignetteContainer.style.boxShadow = isMobileView ? 
            'inset 0 0 80px 80px rgba(0, 0, 0, 0.7)' : 
            'inset 0 0 150px 150px rgba(0, 0, 0, 0.95)';
    }
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (labelRenderer) {
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    const newAspectRatio = window.innerWidth / window.innerHeight;
    const newHorizontalFovRadians = 2 * Math.atan(Math.tan(fovRadians / 2) * newAspectRatio);
    const newEffectiveFovRadians = Math.min(fovRadians, newHorizontalFovRadians);
    cameraDistance = (sphereRadius / Math.sin(newEffectiveFovRadians / 2)) * safetyMargin;
    if (isMobileView) {
        cameraDistance *= 0.7;
    }
    cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance));
    updateCameraPosition();
    updateClusterLabelsPosition();
});

document.addEventListener('wheel', (event) => {
    const zoomAmount = event.deltaY * 0.1;
    cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance + zoomAmount));
    updateCameraPosition();
});

function updateCameraPosition() {
    const rotationMatrix = new THREE.Matrix4().makeRotationY(currentRotationY);
    rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(currentRotationX));
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyMatrix4(rotationMatrix);
    camera.position.set(
        direction.x * -cameraDistance,
        direction.y * -cameraDistance,
        direction.z * -cameraDistance
    );
    camera.lookAt(0, 0, 0);
}

let labelRenderer;

let starObjects = [];
let constellationLines = [];
let labelObjects = []; // Add array to track label objects
let blockData = {};
let currentBlockIndex = 0;
let targetBlockIndex = 0;
let transitionProgress = 1.0; // Start at 1.0 to immediately show first block
let transitionSpeed = 0.015; // Reduced from 0.02 for smoother transitions
let isTransitioning = false;
let blockNumbers = [];
let isFirstPlaythrough = true; // Flag to track if this is the first automatic playthrough
let lastTransitionTime = 0;
let constellationLinesVisible = false;
let constellationLineDelay = 1000; // 1 second delay for showing lines
let lineAnimationStarted = false; // Track if line animation has started

const easing = {
    easeInOutCubic: function (t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeInOutQuad: function (t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
};

const blockNavUI = document.createElement('div');
blockNavUI.style.position = 'absolute';
blockNavUI.style.bottom = isMobileView ? '60px' : '40px';
blockNavUI.style.width = '100%';
blockNavUI.style.textAlign = 'center';
blockNavUI.style.color = 'white';
blockNavUI.style.fontFamily = 'Arial, sans-serif';
blockNavUI.style.zIndex = '20';
document.body.appendChild(blockNavUI);

const clusterLabelsContainer = document.createElement('div');
clusterLabelsContainer.className = 'cluster-labels-container';
clusterLabelsContainer.style.position = 'absolute';
clusterLabelsContainer.style.bottom = '100px'; // Position above the slider
clusterLabelsContainer.style.left = '0';
clusterLabelsContainer.style.width = '100%';
clusterLabelsContainer.style.textAlign = 'left'; // Align to left instead of center
clusterLabelsContainer.style.display = 'none'; // Hide by default (for desktop)
clusterLabelsContainer.style.flexWrap = 'nowrap'; // Don't wrap items
clusterLabelsContainer.style.justifyContent = 'flex-start'; // Align to start
clusterLabelsContainer.style.flexDirection = 'column'; // Stack labels vertically
clusterLabelsContainer.style.padding = '10px 15px'; // Add more left padding
clusterLabelsContainer.style.zIndex = '20';
clusterLabelsContainer.style.maxHeight = '80px';
clusterLabelsContainer.style.overflowY = 'auto'; // Enable vertical scrolling
clusterLabelsContainer.style.overflowX = 'hidden'; // Prevent horizontal scrolling
clusterLabelsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
clusterLabelsContainer.style.backdropFilter = 'blur(2px)';

function updateScrollbarStyle() {
    if (isMobileView) {
        clusterLabelsContainer.style.scrollbarWidth = 'thin'; // For Firefox
        clusterLabelsContainer.style.scrollbarColor = '#00FFC8 rgba(0,0,0,0.3)'; // For Firefox
        let scrollbarStyle = document.getElementById('mobile-scrollbar-style');
        if (!scrollbarStyle) {
            scrollbarStyle = document.createElement('style');
            scrollbarStyle.id = 'mobile-scrollbar-style';
            scrollbarStyle.textContent = `
                .cluster-labels-container::-webkit-scrollbar {
                    width: 12px;
                    background: rgba(0,0,0,0.3);
                }
                .cluster-labels-container::-webkit-scrollbar-thumb {
                    background: #00FFC8;
                    border-radius: 6px;
                    border: 2px solid rgba(0,0,0,0.3);
                    min-height: 40px;
                }
                .cluster-labels-container::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.1);
                    border-radius: 6px;
                }
            `;
            document.head.appendChild(scrollbarStyle);
        }
    }
}

document.body.appendChild(clusterLabelsContainer);

clusterLabelsContainer.addEventListener('touchstart', (event) => {
    event.stopPropagation();
}, { passive: false });

clusterLabelsContainer.addEventListener('touchmove', (event) => {
    event.stopPropagation();
}, { passive: true });

clusterLabelsContainer.addEventListener('touchend', (event) => {
    event.stopPropagation();
}, { passive: false });

const animationControlsUI = document.createElement('div');
animationControlsUI.style.position = 'absolute';
animationControlsUI.style.bottom = '70px';
animationControlsUI.style.width = '100%';
animationControlsUI.style.textAlign = 'center';
animationControlsUI.style.zIndex = '20';
document.body.appendChild(animationControlsUI);

const sliderContainer = document.createElement('div');
sliderContainer.id = 'sliderContainer'; // Add ID for event handling
sliderContainer.style.width = window.innerWidth < 768 ? '80%' : '50%'; // Mobile responsive width
sliderContainer.style.margin = '0 auto';
sliderContainer.style.position = 'relative';
sliderContainer.style.padding = '0 10px';
sliderContainer.style.display = 'flex';
sliderContainer.style.alignItems = 'center';
sliderContainer.style.justifyContent = 'center';
blockNavUI.appendChild(sliderContainer);

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

const speedIndicator = document.createElement('div');
speedIndicator.style.marginLeft = '10px';
speedIndicator.style.color = '#fff';
speedIndicator.style.fontSize = '14px';
speedIndicator.style.fontFamily = 'Arial, sans-serif';
speedIndicator.textContent = 'x5.0'; // Will be updated when speed is known
sliderContainer.appendChild(speedIndicator);

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
blockLabel.target = '_blank'; // Open in new tab
document.body.appendChild(blockLabel);

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

const timestampCache = {};

async function updateTimestamp(blockNumber) {
    if (timestampCache[blockNumber]) {
        timestampLabel.textContent = `${timestampCache[blockNumber]}`;
        return;
    }
    timestampLabel.textContent = '...';
    try {
        const response = await fetch(`https://api.sentichain.com/blockchain/get_timestamp_from_block_number?network=mainnet&block_number=${blockNumber}`);
        const data = await response.json();
        if (data && data.timestamp) {
            const utcDate = new Date(data.timestamp);
            const localTimeString = utcDate.toLocaleString();
            timestampCache[blockNumber] = localTimeString;
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

function updateSlider() {
    if (blockNumbers.length > 0) {
        slider.max = blockNumbers.length - 1;
        slider.value = targetBlockIndex;
        updateBlockLabel();
    }
}

function updateBlockLabel() {
    if (blockNumbers.length > 0) {
        const blockNumber = blockNumbers[slider.value];
        blockLabel.innerHTML = `Block ${blockNumber} <span>↗</span>`;
        blockLabel.href = `https://sentichain.com/app?tab=BlockExplorer#`;
        updateTimestamp(blockNumber);
    }
}

slider.addEventListener('input', function () {
    if (!isTransitioning) {
        const newIndex = parseInt(this.value);
        if (targetBlockIndex !== newIndex) {
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

function updateBlockNavUI() {
    updateSlider();
}

function updateToggleButton() {
    toggleButton.style.backgroundColor = isAutoPlaying ? '#4CAF50' : '#FF5252'; // Green for play, red for pause
    const speedMultiplier = Math.round(1000 / currentAutoplaySpeed);
    speedIndicator.textContent = `x${speedMultiplier}`;
    speedIndicator.style.opacity = isAutoPlaying ? '1' : '0';
    slider.disabled = isAutoPlaying;
    slider.style.opacity = isAutoPlaying ? '0.5' : '1';
    slider.style.cursor = isAutoPlaying ? 'not-allowed' : 'pointer';
}

function getAutoplaySpeed() {
    if (!isFirstPlaythrough) {
        return normalAutoplaySpeed;
    }
    const speedChangeThreshold = Math.floor(blockNumbers.length * 0.75);
    return (targetBlockIndex < speedChangeThreshold) ? fastAutoplaySpeed : normalAutoplaySpeed;
}

function updateSpeedIndicator() {
    const speedMultiplier = Math.round(1000 / currentAutoplaySpeed);
    speedIndicator.textContent = `x${speedMultiplier}`;
}

function startAutoplayTimer() {
    clearInterval(autoplayTimer); // Clear any existing timer
    currentAutoplaySpeed = getAutoplaySpeed();
    updateSpeedIndicator();
    autoplayTimer = setInterval(() => {
        if (!isTransitioning) {
            const nextBlockIndex = (targetBlockIndex + 1) % blockNumbers.length;
            if (nextBlockIndex === 0 && isFirstPlaythrough) {
                isAutoPlaying = false;
                updateToggleButton();
                clearInterval(autoplayTimer);
                return;
            }
            let validNextIndex = nextBlockIndex;
            let attempts = 0;
            const maxAttempts = blockNumbers.length;
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

            const newSpeed = getAutoplaySpeed();
            if (newSpeed !== currentAutoplaySpeed) {
                currentAutoplaySpeed = newSpeed;
                updateSpeedIndicator();
                startAutoplayTimer();
            }
        }
    }, currentAutoplaySpeed);
}

toggleButton.addEventListener('click', () => {
    isAutoPlaying = !isAutoPlaying;
    updateToggleButton();
    isFirstPlaythrough = false; // User has clicked the toggle, so disable first playthrough behavior

    if (isAutoPlaying) {
        // Start from current slider position instead of continuing from previous position
        targetBlockIndex = parseInt(slider.value);
        currentBlockIndex = targetBlockIndex;
        currentAutoplaySpeed = normalAutoplaySpeed; // Always use normal speed after user interaction
        updateSpeedIndicator(); // Update speed indicator when speed changes
        startAutoplayTimer();
    } else {
        clearInterval(autoplayTimer);
    }
});

fetch('https://api.sentichain.com/mapper/get_max_block_number')
    .then(response => response.json())
    .then(data => {
        const maxBlockNumber = data.max_block_number;
        const startBlock = maxBlockNumber - 10;
        const endBlock = maxBlockNumber;
        return fetch(`https://api.sentichain.com/mapper/get_points_by_block_range_no_embedding?start_block=${startBlock}&end_block=${endBlock}&api_key=abc123`);
    })
    .then(response => response.json())
    .then(data => {
        const points = data.points;

        points.forEach(point => {
            const blockNumber = point[0]; // 1st item is block number
            if (!blockData[blockNumber]) {
                blockData[blockNumber] = [];
                blockNumbers.push(blockNumber);
            }
            blockData[blockNumber].push(point);
        });
        blockNumbers.sort((a, b) => a - b);
        currentBlockIndex = 0;
        targetBlockIndex = 0;
        createStarsForBlock(blockNumbers[currentBlockIndex]);
        lastTransitionTime = Date.now();
        constellationLinesVisible = false;
        updateSlider();
        updateToggleButton();
        updateSpeedIndicator();
        startAutoplayTimer();
        labelRenderer = new THREE.CSS2DRenderer();
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(labelRenderer.domElement);

        animate();

        setTimeout(() => {
            if (starObjects.length === 0) {
                console.warn("No stars created after fetch, using emergency fallback");
                createEmergencyFallbackStars();
            }
        }, 3000);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        createFallbackStars();
    });

function createStarsForBlock(blockNumber) {
    console.log("Creating stars for block", blockNumber, "Mobile view:", isMobileView);
    starObjects.forEach(star => scene.remove(star));
    constellationLines.forEach(line => scene.remove(line));
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

    // 1) Compute average x,y
    let sumX = 0;
    let sumY = 0;
    points.forEach(point => {
        sumX += point[3];  // the x coordinate from your data
        sumY += point[4];  // the y coordinate from your data
    });
    const count = points.length;
    const avgX = sumX / count;
    const avgY = sumY / count;

    // 2) Decide what "front center" means. We want (0.5, 0.0) to be the center:
    const targetX = 0.5;
    const targetY = 0.0;

    // 3) Calculate how far off the average is from that front-center
    const offsetX = avgX - targetX;
    const offsetY = avgY - targetY;

    console.log("Avg x,y =", avgX, avgY, " => offsetX =", offsetX, "offsetY =", offsetY);

    // Create stars at each position and place them on a sphere
    points.forEach(point => {
        const x = point[3]; // 4th item is x
        const y = point[4]; // 5th item is y
        const clusterGroup = point[5]; // 6th item is cluster group

        // Instead of using x,y directly,
        // we shift x,y so the average is forced to front/center:
        const adjX = x - offsetX;  // shifted x
        const adjY = y - offsetY;  // shifted y

        // Then compute longitude & latitude from these adjusted coords:
        const longitude = adjX * Math.PI - Math.PI / 2;
        const latitude = adjY * Math.PI / 3;

        // Convert spherical coordinates to Cartesian (x,y,z)
        const starX = sphereRadius * Math.cos(latitude) * Math.sin(longitude);
        const starY = sphereRadius * Math.sin(latitude);
        const starZ = sphereRadius * Math.cos(latitude) * Math.cos(longitude);

        // Calculate star color based on cluster group - same calculation as used for constellation lines
        const hue = (parseInt(clusterGroup) * 50) % 360;
        // Use 100% saturation and high lightness for more vibrant stars
        const starColor = new THREE.Color(`hsl(${hue}, 100%, 80%)`);

        // Make stars significantly larger and brighter on mobile
        const starSize = isMobileView ? 2.0 : 1.0; // Much larger on mobile
        const mobileStarGeometry = new THREE.SphereGeometry(starSize, isMobileView ? 16 : 32, isMobileView ? 16 : 32);

        const baseEmissiveIntensity = isMobileView ? 25.0 : 5.0; // Much higher brightness on mobile

        const star = new THREE.Mesh(mobileStarGeometry, new THREE.MeshBasicMaterial({
            color: starColor,
            emissive: starColor,
            emissiveIntensity: baseEmissiveIntensity
        }));

        // Store base emissive intensity for blinking effect
        star.userData.baseEmissiveIntensity = baseEmissiveIntensity;

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
                labelLine.userData.baseOpacity = 0.2; // Store base opacity for blinking

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
                labelLine.userData.startPoint = centerOfMass;
                labelLine.userData.endPoint = labelPosition;
                labelLine.userData.isLabelLine = true;
                labelLine.userData.baseOpacity = 0.2; // Store base opacity for blinking
                scene.add(label);
                scene.add(labelLine);
                constellationLines.push(labelLine);
                labelObjects.push(label); // Track the label
            }
        }
        if (groupStars.length <= 1) return;
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
        edges.sort((a, b) => a.distance - b.distance);
        const parent = {};
        for (let i = 0; i < groupStars.length; i++) {
            parent[i] = i;
        }
        const find = (i) => {
            if (parent[i] !== i) {
                parent[i] = find(parent[i]);
            }
            return parent[i];
        };
        const union = (i, j) => {
            parent[find(i)] = find(j);
        };
        const mstEdges = [];
        for (const edge of edges) {
            const fromRoot = find(edge.from);
            const toRoot = find(edge.to);
            if (fromRoot !== toRoot) {
                mstEdges.push(edge);
                union(edge.from, edge.to);
                if (mstEdges.length === groupStars.length - 1) {
                    break;
                }
            }
        }
        for (const edge of mstEdges) {
            const fromStar = groupStars[edge.from];
            const toStar = groupStars[edge.to];
            const constellationLineGeo = new THREE.BufferGeometry().setFromPoints([
                fromStar.position,
                toStar.position
            ]);

            const baseOpacity = isMobileView ? 1.0 : 0.8;
            const constellationLineMat = new THREE.LineBasicMaterial({
                color: new THREE.Color(`hsl(${hue}, 100%, 80%)`), // Brighter color for mobile
                opacity: baseOpacity,
                transparent: true,
                linewidth: isMobileView ? 5.0 : 2.0 // Much thicker lines on mobile
            });
            const constellationLine = new THREE.Line(constellationLineGeo, constellationLineMat);
            scene.add(constellationLine);
            constellationLines.push(constellationLine);

            // Store references to connected stars for updating lines during zoom
            constellationLine.userData = {
                fromStar: fromStar,
                toStar: toStar,
                baseOpacity: baseOpacity, // Store base opacity for blinking
                progress: 0, // Initialize progress for animation
                animated: false, // Track if this line has been animated
                startTime: null, // Will be set when animation starts
                clusterGroup: groupId // Add cluster group ID for parallel animation
            };

            // Initially hide the constellation line until delay has passed and animation begins
            constellationLine.visible = false;
        }
    });

    console.log(`Created ${constellationLines.length} constellation lines`);

    // Create bullet-point labels at the bottom
    uniqueClusters.forEach(groupId => {
        const labelContainer = document.createElement('div');
        labelContainer.style.display = 'flex';
        labelContainer.style.alignItems = 'center';
        labelContainer.style.margin = '2px 0'; // Remove horizontal margin for left alignment
        labelContainer.style.padding = '4px 0';
        labelContainer.style.width = '100%';
        labelContainer.style.minWidth = '0'; // Allow shrinking below content size

        // Create colored bullet point
        const bullet = document.createElement('span');
        bullet.style.display = 'inline-block';
        bullet.style.width = '12px';
        bullet.style.height = '12px';
        bullet.style.borderRadius = '50%';
        bullet.style.backgroundColor = clusterColors[groupId];
        bullet.style.marginRight = '10px'; // Increase spacing between bullet and text
        bullet.style.boxShadow = '0 0 3px rgba(255, 255, 255, 0.5)';
        bullet.style.flexShrink = '0'; // Prevent bullet from shrinking

        // Create text label
        const text = document.createElement('span');
        text.style.color = 'white';
        text.style.fontSize = '14px'; // Increase font size
        text.style.fontWeight = '500'; // Make slightly bolder
        text.style.overflow = 'hidden';
        text.style.flexGrow = '1'; // Allow text to take remaining space

        // Use different text wrapping properties based on view
        if (isMobileView) {
            // Allow text to wrap on mobile
            text.style.whiteSpace = 'normal';
            text.style.wordBreak = 'break-word';
            text.style.lineHeight = '1.3';
        } else {
            // Keep as ellipsis on desktop
            text.style.textOverflow = 'ellipsis';
            text.style.whiteSpace = 'nowrap';
        }

        text.textContent = clusterTitles[groupId];

        // Add to container
        labelContainer.appendChild(bullet);
        labelContainer.appendChild(text);
        clusterLabelsContainer.appendChild(labelContainer);
    });
}

function updateStarPositions() {
    if (!isTransitioning) return;
    transitionProgress += transitionSpeed;
    if (transitionProgress >= 1.0) {
        transitionProgress = 1.0;
        isTransitioning = false;
        currentBlockIndex = targetBlockIndex;
        starObjects.forEach(star => scene.remove(star));
        constellationLines.forEach(line => scene.remove(line));
        labelObjects.forEach(label => scene.remove(label));
        starObjects = [];
        constellationLines = [];
        labelObjects = [];
        createStarsForBlock(blockNumbers[currentBlockIndex]);
        lastTransitionTime = Date.now();
        constellationLinesVisible = false;
        lineAnimationStarted = false;
        constellationLines.forEach(line => {
            line.visible = false;
        });
    } else {
        constellationLines.forEach(line => scene.remove(line));
        constellationLines = [];
        const currentBlock = blockData[blockNumbers[currentBlockIndex]];
        const targetBlock = blockData[blockNumbers[targetBlockIndex]];
        if (!currentBlock || !targetBlock || currentBlock.length === 0 || targetBlock.length === 0) {
            console.error('Missing data in current or target block, aborting transition');
            transitionProgress = 1.0;
            isTransitioning = false;
            return;
        }

        const easedProgress = easing.easeInOutCubic(transitionProgress);

        let currentSumX = 0, currentSumY = 0;
        currentBlock.forEach(point => {
            currentSumX += point[3];
            currentSumY += point[4];
        });
        const currentCount = currentBlock.length;
        const currentAvgX = currentSumX / currentCount;
        const currentAvgY = currentSumY / currentCount;
        const currentOffsetX = currentAvgX - 0.5; // Target is 0.5 for center
        const currentOffsetY = currentAvgY - 0.0; // Target is 0.0 for center

        let targetSumX = 0, targetSumY = 0;
        targetBlock.forEach(point => {
            targetSumX += point[3];
            targetSumY += point[4];
        });
        const targetCount = targetBlock.length;
        const targetAvgX = targetSumX / targetCount;
        const targetAvgY = targetSumY / targetCount;
        const targetOffsetX = targetAvgX - 0.5; // Target is 0.5 for center
        const targetOffsetY = targetAvgY - 0.0; // Target is 0.0 for center

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

        starObjects.forEach((star, index) => {
            const clusterGroup = star.userData.clusterGroup;

            const currentPoints = currentStarsByCluster[clusterGroup];
            const targetPoints = targetStarsByCluster[clusterGroup];

            if (!currentPoints || !targetPoints) return;

            let matchIndex = Math.min(index % currentPoints.length, currentPoints.length - 1);
            let currentPoint = currentPoints[matchIndex];

            let targetMatchIndex = Math.min(matchIndex, targetPoints.length - 1);
            let targetPoint = targetPoints[targetMatchIndex];

            const currentX = currentPoint[3] - currentOffsetX;
            const currentY = currentPoint[4] - currentOffsetY;

            const targetX = targetPoint[3] - targetOffsetX;
            const targetY = targetPoint[4] - targetOffsetY;

            const interpX = currentX + (targetX - currentX) * easedProgress;
            const interpY = currentY + (targetY - currentY) * easedProgress;

            const longitude = interpX * Math.PI - Math.PI / 2;
            const latitude = interpY * Math.PI / 3;

            const newX = sphereRadius * Math.cos(latitude) * Math.sin(longitude);
            const newY = sphereRadius * Math.sin(latitude);
            const newZ = sphereRadius * Math.cos(latitude) * Math.cos(longitude);

            star.position.set(newX, newY, newZ);

            if (currentPoint[5] !== targetPoint[5]) {
                const currentHue = (parseInt(currentPoint[5]) * 50) % 360;
                const targetHue = (parseInt(targetPoint[5]) * 50) % 360;

                let interpHue = currentHue + (targetHue - currentHue) * easedProgress;
                if (Math.abs(targetHue - currentHue) > 180) {
                    if (currentHue < targetHue) {
                        currentHue += 360;
                    } else {
                        targetHue += 360;
                    }
                    interpHue = currentHue + (targetHue - currentHue) * easedProgress;
                    interpHue %= 360;
                }

                const interpColor = new THREE.Color(`hsl(${interpHue}, 100%, 80%)`);
                star.material.color.copy(interpColor);
                star.material.emissive.copy(interpColor);

                const pulseMultiplier = 1.0 + 0.15 * Math.sin(easedProgress * Math.PI);
                const starSize = isMobileView ? 1.2 : 0.8;
                star.scale.set(pulseMultiplier, pulseMultiplier, pulseMultiplier);
            }
        });
    }
}

function createFallbackStars() {
    const star1 = new THREE.Mesh(starGeometry, starMaterial);
    const star2 = new THREE.Mesh(starGeometry, starMaterial);
    const star3 = new THREE.Mesh(starGeometry, starMaterial);
    star1.position.set(-sphereRadius / 4, sphereRadius / 5, sphereRadius / 2);
    star2.position.set(sphereRadius / 4, sphereRadius / 5, sphereRadius / 2);
    star3.position.set(0, -sphereRadius / 5, sphereRadius / 2);
    scene.add(star1);
    scene.add(star2);
    scene.add(star3);
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
    line.userData = {
        stars: [star1, star2, star3, star1]
    };
    animate = function () {
        requestAnimationFrame(animate);
        currentRotationX += (targetRotationX - currentRotationX) * 0.03;
        currentRotationY += (targetRotationY - currentRotationY) * 0.03;
        updateCameraPosition();
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

function animate() {
    requestAnimationFrame(animate);
    currentRotationX += (targetRotationX - currentRotationX) * 0.03;
    currentRotationY += (targetRotationY - currentRotationY) * 0.03;
    updateCameraPosition();
    updateStarPositions();

    blinkFactor += blinkSpeed * blinkDirection;
    if (blinkFactor >= 1) {
        blinkDirection = -1;
    } else if (blinkFactor <= 0) {
        blinkDirection = 1;
    }
    const currentBlinkIntensity = minBlinkIntensity + blinkFactor * (maxBlinkIntensity - minBlinkIntensity);

    // Update star brightness
    starObjects.forEach(star => {
        if (star.material) {
            star.material.emissiveIntensity = star.userData.baseEmissiveIntensity
                ? star.userData.baseEmissiveIntensity * currentBlinkIntensity
                : (isMobileView ? 25.0 : 5.0) * currentBlinkIntensity; // Updated to match new values
        }
    });

    // Update line brightness for visible lines
    constellationLines.forEach(line => {
        if (line.material && line.visible) {
            line.material.opacity = line.userData.baseOpacity
                ? line.userData.baseOpacity * currentBlinkIntensity
                : (isMobileView ? 1.0 : 0.8) * currentBlinkIntensity;
        }
    });

    // Check if it's time to start constellation line animation
    if (!lineAnimationStarted && !isTransitioning && Date.now() - lastTransitionTime >= constellationLineDelay) {
        lineAnimationStarted = true;
        constellationLinesVisible = true;

        // Set up animation for each line with staggered start times grouped by cluster
        const clusterGroups = {};

        // Group lines by cluster
        constellationLines.forEach(line => {
            if (line.userData.isLabelLine) return; // Skip label lines

            const groupId = line.userData.clusterGroup;
            if (!groupId) return;

            if (!clusterGroups[groupId]) {
                clusterGroups[groupId] = [];
            }
            clusterGroups[groupId].push(line);
        });

        // Set animation timing by cluster (parallel between clusters)
        let clusterIndex = 0;
        Object.keys(clusterGroups).forEach(groupId => {
            const clusterLines = clusterGroups[groupId];
            const clusterStartTime = Date.now() + clusterIndex * lineRevealInterClusterDelay;

            // Assign start times to lines within this cluster
            clusterLines.forEach((line, lineIndex) => {
                line.userData.startTime = clusterStartTime + lineIndex * lineRevealIntraClusterDelay;
                line.userData.animated = false;
                line.userData.progress = 0;
                line.visible = false; // Will be made visible when animation starts
            });

            clusterIndex++;
        });

        // Handle any lines without cluster assignment (fallback)
        constellationLines.forEach(line => {
            if (line.userData.isLabelLine) {
                // Make label lines visible immediately
                line.visible = true;
            } else if (!line.userData.startTime) {
                // If a line doesn't have a start time yet, assign one
                line.userData.startTime = Date.now() + clusterIndex * lineRevealInterClusterDelay;
                line.userData.animated = false;
                line.userData.progress = 0;
                line.visible = false;
            }
        });
    }

    // Animate constellation lines
    if (lineAnimationStarted) {
        const currentTime = Date.now();
        let allLinesAnimated = true;

        constellationLines.forEach(line => {
            if (line.userData.isLabelLine) return; // Skip label lines

            if (!line.userData.animated) {
                if (line.userData.startTime && currentTime >= line.userData.startTime) {
                    // Start animation for this line
                    line.visible = true;

                    // Update line progress with faster speed
                    line.userData.progress += lineGrowthSpeedFast;

                    if (line.userData.progress >= 1) {
                        line.userData.progress = 1;
                        line.userData.animated = true;
                    } else {
                        allLinesAnimated = false;
                    }

                    // Animate line by growing it from start to end
                    if (line.userData.fromStar && line.userData.toStar) {
                        const start = line.userData.fromStar.position;
                        const end = line.userData.toStar.position;
                        const middle = new THREE.Vector3().lerpVectors(
                            start, end, line.userData.progress
                        );

                        // Create a new line geometry that grows from start to current point
                        const lineGeo = new THREE.BufferGeometry().setFromPoints([
                            start, middle
                        ]);
                        line.geometry.dispose();
                        line.geometry = lineGeo;
                    }
                } else {
                    allLinesAnimated = false;
                }
            }
        });
    }

    scene.traverse(object => {
        if (object instanceof THREE.Line) {
            if (constellationLinesVisible && object.visible) {
                // Update label lines and fully animated constellation lines
                if (object.userData.isLabelLine && object.userData.startPoint && object.userData.endPoint) {
                    const lineGeo = new THREE.BufferGeometry().setFromPoints([
                        object.userData.startPoint,
                        object.userData.endPoint
                    ]);
                    object.geometry.dispose();
                    object.geometry = lineGeo;
                } else if (object.userData.animated && object.userData.fromStar && object.userData.toStar) {
                    // This is a fully animated constellation line - update its full length
                    const lineGeo = new THREE.BufferGeometry().setFromPoints([
                        object.userData.fromStar.position,
                        object.userData.toStar.position
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
        }
    });

    renderer.render(scene, camera);
    if (labelRenderer) {
        labelRenderer.render(scene, camera);
    }
}

function updateSliderContainerWidth() {
    const wasMobile = isMobileView;
    isMobileView = window.innerWidth < 768;
    sliderContainer.style.width = isMobileView ? '100%' : '50%';
    updateClusterLabelsPosition();
    if (wasMobile !== isMobileView) {
        console.log("Mobile state changed in updateSliderContainerWidth:", isMobileView, "Width:", window.innerWidth);
        setTimeout(() => {
            if (currentBlockIndex >= 0 && blockNumbers.length > 0) {
                createStarsForBlock(blockNumbers[currentBlockIndex]);
            } else {
                createEmergencyFallbackStars();
            }
        }, 500);
    } else {
        if (!isTransitioning && currentBlockIndex >= 0 && blockNumbers.length > 0) {
            createStarsForBlock(blockNumbers[currentBlockIndex]);
        }
    }
}

function debugVisibility() {
    console.log("Debug visibility called");
    console.log("Mobile view:", isMobileView, "Window width:", window.innerWidth);
    console.log("Camera position:", camera.position.x, camera.position.y, camera.position.z);
    console.log("Camera distance:", cameraDistance);
    console.log("Star objects:", starObjects.length);
    console.log("Constellation lines:", constellationLines.length);
    if (starObjects.length === 0 && blockNumbers.length > 0) {
        console.log("No stars found, forcing creation");
        createStarsForBlock(blockNumbers[currentBlockIndex]);
    }
}

setTimeout(debugVisibility, 5000);

window.addEventListener('resize', updateSliderContainerWidth);

function createEmergencyFallbackStars() {
    console.log("Creating emergency fallback stars for mobile");
    starObjects.forEach(star => scene.remove(star));
    constellationLines.forEach(line => scene.remove(line));
    labelObjects.forEach(label => scene.remove(label));
    clusterLabelsContainer.innerHTML = '';
    starObjects = [];
    constellationLines = [];
    labelObjects = [];
    const numStars = 20;
    const colors = [
        0xFF3333, // Bright Red
        0x33FF33, // Bright Green
        0x3333FF, // Bright Blue
        0xFFFF33, // Bright Yellow
        0xFF33FF, // Bright Magenta
        0x33FFFF, // Bright Cyan
        0xFF6600, // Bright Orange
        0x9900FF  // Bright Purple
    ];

    // Create stars in a more visible pattern for guaranteed visibility
    for (let i = 0; i < numStars; i++) {
        // Calculate position in a spiral pattern
        const angle = 0.5 * i;
        const radius = 2 + (i * 4);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 30; // Place closer to camera for visibility

        // Bigger and brighter stars for visibility
        const starSize = isMobileView ? 4.0 : 2.5; // Even larger for mobile emergency stars
        const starGeom = new THREE.SphereGeometry(starSize, 16, 16);

        // Use a variety of bright colors
        const color = colors[i % colors.length];
        const baseEmissiveIntensity = isMobileView ? 30.0 : 6.0; // Even brighter for emergency stars

        const starMat = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: baseEmissiveIntensity
        });

        const star = new THREE.Mesh(starGeom, starMat);
        star.position.set(x, y, z);
        star.userData.baseEmissiveIntensity = baseEmissiveIntensity; // Store for blinking effect

        scene.add(star);
        starObjects.push(star);

        // Add a point light at the star position for additional visibility
        if (i < 8) { // Increased number of lights for more brightness
            const light = new THREE.PointLight(color, 2, 100); // Doubled light intensity
            light.position.copy(star.position);
            scene.add(light);
        }
    }

    // Create connections between stars with more vibrant colors
    for (let i = 0; i < starObjects.length - 1; i++) {
        const fromStar = starObjects[i];
        const toStar = starObjects[i + 1];

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            fromStar.position,
            toStar.position
        ]);
        const starColor = fromStar.material.color.clone();
        const baseOpacity = 1.0;
        const lineMaterial = new THREE.LineBasicMaterial({
            color: starColor,
            opacity: baseOpacity,
            transparent: true,
            linewidth: 2.0
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        constellationLines.push(line);
        line.userData = {
            fromStar: fromStar,
            toStar: toStar,
            baseOpacity: baseOpacity // Store base opacity for blinking
        };
    }

    console.log(`Created ${starObjects.length} emergency stars and ${constellationLines.length} lines`);
    cameraDistance = 50;
    updateCameraPosition();
    const emergencyClusterNames = ["Alpha Cluster", "Beta Cluster", "Gamma Cluster", "Delta Cluster", "Omega Cluster"];
    const emergencyColors = [
        0xFF3333, // Bright Red
        0x33FF33, // Bright Green
        0x3333FF, // Bright Blue
        0xFFFF33, // Bright Yellow
        0xFF33FF  // Bright Magenta
    ];

    emergencyColors.forEach((color, index) => {
        if (index < emergencyClusterNames.length) {
            const labelContainer = document.createElement('div');
            labelContainer.style.display = 'flex';
            labelContainer.style.alignItems = 'center';
            labelContainer.style.margin = '2px 0'; // Remove horizontal margin for left alignment
            labelContainer.style.padding = '4px 0';
            labelContainer.style.width = '100%';
            const bullet = document.createElement('span');
            bullet.style.display = 'inline-block';
            bullet.style.width = '12px';
            bullet.style.height = '12px';
            bullet.style.borderRadius = '50%';
            bullet.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
            bullet.style.marginRight = '10px'; // Increase spacing between bullet and text
            bullet.style.boxShadow = '0 0 3px rgba(255, 255, 255, 0.5)';
            bullet.style.flexShrink = '0'; // Prevent bullet from shrinking
            const text = document.createElement('span');
            text.style.color = 'white';
            text.style.fontSize = '14px'; // Increase font size
            text.style.fontWeight = '500'; // Make slightly bolder
            text.style.maxWidth = '100%'; // Use full width on mobile
            text.style.overflow = 'hidden';
            text.style.textOverflow = 'ellipsis';
            text.style.whiteSpace = 'nowrap';
            text.style.flexGrow = '1'; // Allow text to take remaining space
            if (isMobileView) {
                text.style.whiteSpace = 'normal';
                text.style.wordBreak = 'break-word';
                text.style.lineHeight = '1.3';
            } else {
                text.style.textOverflow = 'ellipsis';
                text.style.whiteSpace = 'nowrap';
            }
            text.textContent = emergencyClusterNames[index];
            labelContainer.appendChild(bullet);
            labelContainer.appendChild(text);
            clusterLabelsContainer.appendChild(labelContainer);
        }
    });

    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const z = 10 + Math.random() * 30;
        const highlightStarSize = isMobileView ? 4.0 : 5.0; // Increased size for both
        const highlightStarGeom = new THREE.SphereGeometry(highlightStarSize, 32, 32);
        const highlightStarMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: isMobileView ? 20.0 : 5.0 // Increased brightness for both
        });

        const highlightStar = new THREE.Mesh(highlightStarGeom, highlightStarMat);
        highlightStar.position.set(x, y, z);

        scene.add(highlightStar);
        starObjects.push(highlightStar);
    }
}

if (isMobileView) {
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

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, checking visibility");
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

function updateClusterLabelsPosition() {
    clusterLabelsContainer.style.display = isMobileView ? 'flex' : 'none';
    clusterLabelsContainer.style.bottom = isMobileView ? '110px' : '100px';
    clusterLabelsContainer.style.maxHeight = isMobileView ? '100px' : '80px'; // Give more room on mobile
    if (isMobileView) {
        clusterLabelsContainer.style.width = '75%'; // Slightly smaller width to make room for the scrollbar
        clusterLabelsContainer.style.left = '5%'; // 5% on each side centers it
        clusterLabelsContainer.style.right = 'auto'; // No need to set right when left and width are specified
        clusterLabelsContainer.style.borderRadius = '8px'; // Add rounded corners for better mobile appearance
        clusterLabelsContainer.style.pointerEvents = 'auto'; // Ensure touch events are captured
        clusterLabelsContainer.style.paddingRight = '5px'; // Add padding to the right for the scrollbar
        clusterLabelsContainer.style.borderRight = 'none';
        const dragIndicator = document.getElementById('scroll-drag-indicator');
        if (dragIndicator) {
            dragIndicator.style.display = 'none';
        }

        updateScrollbarStyle();
    } else {
        clusterLabelsContainer.style.width = '100%';
        clusterLabelsContainer.style.left = '0';
        clusterLabelsContainer.style.right = 'auto';
        clusterLabelsContainer.style.borderRight = 'none'; // Remove scrollbar indicator when not on mobile

        const dragIndicator = document.getElementById('scroll-drag-indicator');
        if (dragIndicator) {
            dragIndicator.style.display = 'none';
        }
    }
}

function createOrUpdateScrollDragIndicator() {
    let dragIndicator = document.getElementById('scroll-drag-indicator');

    if (!dragIndicator) {
        dragIndicator = document.createElement('div');
        dragIndicator.id = 'scroll-drag-indicator';
        dragIndicator.innerHTML = '<div></div><div></div><div></div>'; // Three lines to indicate draggable

        dragIndicator.style.position = 'absolute';
        dragIndicator.style.right = '5px';
        dragIndicator.style.top = '50%';
        dragIndicator.style.transform = 'translateY(-50%)';
        dragIndicator.style.width = '16px';
        dragIndicator.style.height = '36px';
        dragIndicator.style.borderRadius = '8px';
        dragIndicator.style.backgroundColor = 'rgba(0, 255, 200, 0.5)';
        dragIndicator.style.display = 'flex';
        dragIndicator.style.flexDirection = 'column';
        dragIndicator.style.justifyContent = 'center';
        dragIndicator.style.alignItems = 'center';
        dragIndicator.style.gap = '3px';
        dragIndicator.style.padding = '2px';
        dragIndicator.style.zIndex = '25';
        dragIndicator.style.pointerEvents = 'none'; // Let touch events pass through to the scrollbar

        for (const div of dragIndicator.children) {
            div.style.width = '8px';
            div.style.height = '2px';
            div.style.backgroundColor = 'white';
            div.style.borderRadius = '1px';
        }

        document.body.appendChild(dragIndicator);
    }
    const containerRect = clusterLabelsContainer.getBoundingClientRect();
    dragIndicator.style.display = 'flex';
    dragIndicator.style.height = Math.min(36, containerRect.height / 2) + 'px';
    dragIndicator.style.top = (containerRect.top + containerRect.height / 2) + 'px';
    dragIndicator.style.right = (window.innerWidth - containerRect.right + 4) + 'px';
}

clusterLabelsContainer.addEventListener('scroll', () => {
    if (isMobileView) {
        requestAnimationFrame(() => {
            const dragIndicator = document.getElementById('scroll-drag-indicator');
            if (dragIndicator) {
                const containerRect = clusterLabelsContainer.getBoundingClientRect();
                const scrollPercent = clusterLabelsContainer.scrollTop /
                    (clusterLabelsContainer.scrollHeight - clusterLabelsContainer.clientHeight);
                const maxOffset = containerRect.height - parseFloat(dragIndicator.style.height) - 10;
                const minOffset = 5;
                const offsetY = minOffset + scrollPercent * maxOffset;

                dragIndicator.style.top = (containerRect.top + offsetY) + 'px';
            }
        });
    }
});

updateClusterLabelsPosition();