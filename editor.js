document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const fileList = document.getElementById('file-list');
    const timelineContainer = document.getElementById('timeline-container');
    const timeline = document.getElementById('timeline');
    const timelineScale = document.getElementById('timeline-scale');
    const timelineTrack = document.getElementById('timeline-track');
    const addTransitionBtn = document.getElementById('add-transition-btn');
    const previewBtn = document.getElementById('preview-btn');
    const transitionsPanel = document.getElementById('transitions-panel');
    const transitionItems = document.querySelectorAll('.transition-item');
    const transitionOptionsForm = document.getElementById('transition-options-form');
    const transitionDuration = document.getElementById('transition-duration');
    const transitionDurationValue = document.getElementById('transition-duration-value');
    const wipeOptions = document.getElementById('wipe-options');
    const slideOptions = document.getElementById('slide-options');
    const applyTransitionBtn = document.getElementById('apply-transition-btn');
    const cancelTransitionBtn = document.getElementById('cancel-transition-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress');
    const statusEl = document.getElementById('status');
    const previewContainer = document.getElementById('preview-container');
    const previewVideo = document.getElementById('preview');
    const downloadBtn = document.getElementById('download-btn');
    const downloadBtnAlt = document.getElementById('download-btn-alt');
    
    // UI Elements for timeline control
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const fitTimelineBtn = document.getElementById('fit-timeline-btn');
    const timelinePosition = document.getElementById('timeline-position');
    const timelineDuration = document.getElementById('timeline-duration');
    const timelineOverview = document.getElementById('timeline-overview');
    const timelineOverviewContent = document.getElementById('timeline-overview-content');
    const timelineOverviewWindow = document.getElementById('timeline-overview-window');
    const timelineCurrentTime = document.getElementById('timeline-current-time');
    
    // New export format control elements
    let exportFormatSelect;
    let exportQualitySelect;
    let exportMetadataInput;
    
    // Helper functions for improved UI
    function addHorizontalScrollControl() {
        const scrollControls = document.createElement('div');
        scrollControls.id = 'timeline-scroll-controls';
        scrollControls.className = 'timeline-scroll-controls';
        scrollControls.innerHTML = `
            <button id="scroll-left-btn" title="Scroll Left">&lt;</button>
            <button id="scroll-right-btn" title="Scroll Right">&gt;</button>
        `;
        
        // Add to DOM - after the timeline element
        const timelineParent = timeline.parentElement;
        if (timelineParent) {
            if (timelineParent.lastChild === timeline) {
                timelineParent.appendChild(scrollControls);
            } else {
                timelineParent.insertBefore(scrollControls, timeline.nextSibling);
            }
        } else {
            document.body.appendChild(scrollControls);
        }
        
        // Add event listeners
        document.getElementById('scroll-left-btn').addEventListener('click', () => {
            timelineScrollPosition = Math.max(0, timelineScrollPosition - timeline.clientWidth / 2);
            renderTimeline();
        });
        
        document.getElementById('scroll-right-btn').addEventListener('click', () => {
            timelineScrollPosition += timeline.clientWidth / 2;
            renderTimeline();
        });
    }

    function updateZoomControlsWithHints() {
        if (zoomInBtn) zoomInBtn.title = "Zoom In (+)";
        if (zoomOutBtn) zoomOutBtn.title = "Zoom Out (-)";
        if (fitTimelineBtn) fitTimelineBtn.title = "Fit All";
    }
    
    // Add export settings to the page
    function createExportSettingsUI() {
        // Create export settings container
        const exportSettings = document.createElement('div');
        exportSettings.id = 'export-settings';
        exportSettings.className = 'export-settings';
        exportSettings.innerHTML = `
            <h3>Export Settings</h3>
            <div class="form-group">
                <label for="export-format">Format:</label>
                <select id="export-format" class="form-control">
                    <option value="video/webm;codecs=vp9">WebM (VP9)</option>
                    <option value="video/webm;codecs=vp8">WebM (VP8)</option>
                    <option value="video/mp4">MP4 (where supported)</option>
                    <option value="retain">Retain original format (when possible)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="export-quality">Quality:</label>
                <select id="export-quality" class="form-control">
                    <option value="high">High (8 Mbps)</option>
                    <option value="medium" selected>Medium (5 Mbps)</option>
                    <option value="low">Low (3 Mbps)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="export-metadata">Video Title (for metadata):</label>
                <input type="text" id="export-metadata" class="form-control" placeholder="My Edited Video">
            </div>
        `;
        
        // Add before the download button in preview container
        const downloadBtnContainer = document.querySelector('.download-btn-container');
        if (downloadBtnContainer) {
            previewContainer.insertBefore(exportSettings, downloadBtnContainer);
        } else {
            previewContainer.appendChild(exportSettings);
        }
        
        // Get the new elements
        exportFormatSelect = document.getElementById('export-format');
        exportQualitySelect = document.getElementById('export-quality');
        exportMetadataInput = document.getElementById('export-metadata');
    }
    
    // State
    let uploadedFiles = [];
    let timelineClips = [];
    let transitions = [];
    let selectedClipIndex = -1;
    let selectedTransitionIndex = -1;
    let selectedTransitionType = null;
    let outputBlob = null;
    let outputMetadata = {};
    let pixelsPerSecond = 100; // Timeline scale
    let timelineScrollPosition = 0;
    let isDraggingClip = false;
    let dragStartX = 0;
    let dragClipIndex = -1;
    let originalClipStart = 0;
    let currentTimePosition = 0; // Current time position in seconds
    let totalDuration = 0; // Total project duration
    let isDraggingTimeOverview = false; // For dragging overview window
    let overviewStartX = 0; // For overview window dragging
    let snapEnabled = true; // Enable/disable snap to grid
    let snapTolerance = 5; // Snap tolerance in pixels
    let playbackActive = false; // Flag for active playback
    let playbackTimer = null; // Timer for playback
    let lastFrameTime = 0; // For accurate frame timing
    let isSpaceDown = false; // For space key detection
    
    // Initialize timeline
    initializeTimeline();
    
    // Create the export settings UI
    createExportSettingsUI();
    
    // Initialize additional UI controls
    updateZoomControlsWithHints();
    addHorizontalScrollControl();
    
    // Handle file selection
    selectFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    // Drag and drop handlers
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('dragover');
    });
    
    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('dragover');
    });
    
    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only process if we have clips and not in an input field
        if (timelineClips.length === 0 || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Spacebar for play/pause
        if (e.code === 'Space' && !isSpaceDown) {
            isSpaceDown = true;
            togglePlayback();
            e.preventDefault();
        }
        
        // Left/right arrow keys for frame-by-frame navigation
        if (e.code === 'ArrowLeft') {
            // Move back 1 frame (assuming 30fps)
            currentTimePosition = Math.max(0, currentTimePosition - 1/30);
            updateCurrentTimeIndicator();
            e.preventDefault();
        }
        
        if (e.code === 'ArrowRight') {
            // Move forward 1 frame (assuming 30fps)
            currentTimePosition = Math.min(totalDuration, currentTimePosition + 1/30);
            updateCurrentTimeIndicator();
            e.preventDefault();
        }
        
        // Home/End keys for start/end of timeline
        if (e.code === 'Home') {
            currentTimePosition = 0;
            updateCurrentTimeIndicator();
            e.preventDefault();
        }
        
        if (e.code === 'End') {
            currentTimePosition = totalDuration;
            updateCurrentTimeIndicator();
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpaceDown = false;
        }
    });
    
    // Play/pause toggle function
    function togglePlayback() {
        if (playbackActive) {
            // Stop playback
            playbackActive = false;
            if (playbackTimer) {
                cancelAnimationFrame(playbackTimer);
                playbackTimer = null;
            }
        } else {
            // Start playback
            playbackActive = true;
            lastFrameTime = performance.now();
            playbackLoop();
        }
    }
    
    // Playback loop function
    function playbackLoop() {
        const now = performance.now();
        const deltaTime = (now - lastFrameTime) / 1000; // Convert to seconds
        lastFrameTime = now;
        
        // Update current time
        currentTimePosition += deltaTime;
        
        // Check if we've reached the end
        if (currentTimePosition >= totalDuration) {
            currentTimePosition = 0; // Loop back to start
            // Or stop playback: playbackActive = false; return;
        }
        
        // Update timeline indicator
        updateCurrentTimeIndicator();
        
        // Continue loop if still playing
        if (playbackActive) {
            playbackTimer = requestAnimationFrame(playbackLoop);
        }
    }
    
    // Handle the files that were selected or dropped
    function handleFiles(files) {
        const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));
        
        if (videoFiles.length === 0) {
            showToast('Please select video files only.', 'error');
            return;
        }
        
        // Process each video file
        const promises = videoFiles.map(file => {
            return new Promise((resolve, reject) => {
                // Extract format info
                const format = file.type;
                
                // Create video element for metadata extraction
                const videoURL = URL.createObjectURL(file);
                const tempVideo = document.createElement('video');
                
                tempVideo.onloadedmetadata = function() {
                    // Extract all available metadata
                    const metadata = {
                        duration: tempVideo.duration,
                        width: tempVideo.videoWidth,
                        height: tempVideo.videoHeight,
                        format: format,
                        originalName: file.name,
                        dateModified: file.lastModified ? new Date(file.lastModified) : null,
                        fps: 30, // Default, will try to detect if possible
                    };
                    
                    // Generate thumbnail
                    tempVideo.currentTime = Math.min(1, tempVideo.duration / 3); // Set to 1 second or 1/3 of duration
                };
                
                tempVideo.onseeked = function() {
                    // Create canvas for thumbnail
                    const canvas = document.createElement('canvas');
                    canvas.width = 160;
                    canvas.height = 90;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw video frame to canvas
                    ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                    
                    // Get thumbnail as data URL
                    const thumbnailURL = canvas.toDataURL('image/jpeg');
                    
                    // Try to detect FPS if possible (just a better estimate, not perfect)
                    let estimatedFps = 30; // Default
                    
                    // Add file to collection with metadata
                    const fileObj = {
                        file: file,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        duration: tempVideo.duration,
                        width: tempVideo.videoWidth,
                        height: tempVideo.videoHeight,
                        thumbnail: thumbnailURL,
                        url: videoURL,
                        fps: estimatedFps,
                        dateModified: file.lastModified ? new Date(file.lastModified) : null,
                    };
                    
                    // Add to uploaded files
                    uploadedFiles.push(fileObj);
                    
                    // Resolve promise
                    resolve();
                };
                
                tempVideo.onerror = function() {
                    console.error(`Error loading video: ${file.name}`);
                    URL.revokeObjectURL(videoURL);
                    showToast(`Could not load video: ${file.name}. The file may be corrupted or in an unsupported format.`, 'error');
                    reject();
                };
                
                // Start loading the video
                tempVideo.src = videoURL;
                tempVideo.preload = 'metadata';
            });
        });
        
        Promise.all(promises)
            .then(() => {
                // Sort videos by name if needed
                uploadedFiles.sort((a, b) => a.name.localeCompare(b.name));
                
                // Update UI
                updateFileList();
                updateTimeline();
                
                // Show timeline if we have videos
                if (uploadedFiles.length > 0) {
                    timelineContainer.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error processing videos:', error);
            });
    }
    
    // Update the file list UI
    function updateFileList() {
        fileList.innerHTML = '';
        
        uploadedFiles.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            
            // Create file details
            let fileDetails = `${index + 1}. ${fileObj.name} (${formatFileSize(fileObj.size)})`;
            if (fileObj.duration) {
                fileDetails += ` - ${formatDuration(fileObj.duration)}`;
            }
            if (fileObj.width && fileObj.height) {
                fileDetails += ` - ${fileObj.width}x${fileObj.height}`;
            }
            if (fileObj.type) {
                fileDetails += ` - ${fileObj.type.split('/')[1].toUpperCase()}`;
            }
            if (fileObj.fps) {
                fileDetails += ` - ${fileObj.fps} FPS`;
            }
            
            fileName.textContent = fileDetails;
            
            const controls = document.createElement('div');
            controls.className = 'file-controls';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '✕';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => removeFile(index));
            controls.appendChild(removeBtn);
            
            fileItem.appendChild(fileName);
            fileItem.appendChild(controls);
            fileList.appendChild(fileItem);
        });
        
        // Show timeline if we have videos
        if (uploadedFiles.length > 0) {
            timelineContainer.style.display = 'block';
        } else {
            timelineContainer.style.display = 'none';
        }
    }
    
    // Initialize timeline clips based on uploaded files
    function updateTimeline() {
        // Clear existing timeline clips
        timelineClips = [];
        transitions = [];
        
        // Set initial start time for first clip
        let currentStartTime = 0;
        
        // Create timeline clips from uploaded files
        uploadedFiles.forEach((fileObj, index) => {
            // Create clip
            const clip = {
                id: `clip-${index}`,
                file: fileObj,
                startTime: currentStartTime,
                duration: fileObj.duration,
                endTime: currentStartTime + fileObj.duration
            };
            
            // Add to clips array
            timelineClips.push(clip);
            
            // Update start time for next clip
            currentStartTime += fileObj.duration;
            
            // Add transition if not the last clip
            if (index < uploadedFiles.length - 1) {
                // Default transition (none)
                const transition = {
                    id: `transition-${index}`,
                    startClipIndex: index,
                    endClipIndex: index + 1,
                    type: 'none',
                    duration: 0,
                    startTime: clip.endTime - 0,
                    endTime: clip.endTime + 0
                };
                
                transitions.push(transition);
            }
        });
        
        // Render timeline
        renderTimeline();
    }
    
    // Initialize timeline - IMPROVED
    function initializeTimeline() {
        // Define the minimum and maximum zoom levels (pixels per second)
        const MIN_PIXELS_PER_SECOND = 5;  // Much lower minimum for better zooming out
        const MAX_PIXELS_PER_SECOND = 400; // Higher maximum for better detail
        
        // Initial zoom level
        pixelsPerSecond = 100;
        
        // Add zoom controls
        zoomInBtn.addEventListener('click', () => {
            pixelsPerSecond = Math.min(MAX_PIXELS_PER_SECOND, pixelsPerSecond * 1.5);
            renderTimeline();
        });
        
        zoomOutBtn.addEventListener('click', () => {
            pixelsPerSecond = Math.max(MIN_PIXELS_PER_SECOND, pixelsPerSecond / 1.5);
            renderTimeline();
        });
        
        fitTimelineBtn.addEventListener('click', () => {
            fitTimelineToContent();
        });
        
        // Add keyboard shortcut for zooming
        document.addEventListener('keydown', (e) => {
            // Only process if we have clips and not in an input field
            if (timelineClips.length === 0 || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.tagName === 'SELECT') {
                return;
            }
            
            // Zoom with + and - keys
            if (e.key === '=' || e.key === '+') {
                pixelsPerSecond = Math.min(MAX_PIXELS_PER_SECOND, pixelsPerSecond * 1.2);
                renderTimeline();
                e.preventDefault();
            }
            
            if (e.key === '-' || e.key === '_') {
                pixelsPerSecond = Math.max(MIN_PIXELS_PER_SECOND, pixelsPerSecond / 1.2);
                renderTimeline();
                e.preventDefault();
            }
        });
        
        // Improved event listeners for timeline scrolling
        timeline.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                // Zoom with Ctrl+wheel
                e.preventDefault();
                const rect = timeline.getBoundingClientRect();
                const mouseX = e.clientX - rect.left + timelineScrollPosition;
                const timeAtMouse = mouseX / pixelsPerSecond;
                
                if (e.deltaY < 0) {
                    // Zoom in
                    pixelsPerSecond = Math.min(MAX_PIXELS_PER_SECOND, pixelsPerSecond * 1.1);
                } else {
                    // Zoom out
                    pixelsPerSecond = Math.max(MIN_PIXELS_PER_SECOND, pixelsPerSecond / 1.1);
                }
                
                // Adjust scroll position to keep the time under mouse cursor stable
                timelineScrollPosition = timeAtMouse * pixelsPerSecond - (e.clientX - rect.left);
                timelineScrollPosition = Math.max(0, timelineScrollPosition);
                
                renderTimeline();
            } else {
                // Normal scroll - horizontal for timeline
                e.preventDefault();
                const scrollAmount = e.deltaY;
                
                // If shift is held, scroll horizontally with vertical wheel
                if (e.shiftKey) {
                    timelineScrollPosition += scrollAmount;
                } else {
                    // Without shift, horizontal wheel scrolls horizontally,
                    // vertical wheel scrolls vertically (which we convert to horizontal)
                    const effectiveAmount = e.deltaX || scrollAmount;
                    timelineScrollPosition += effectiveAmount;
                }
                
                timelineScrollPosition = Math.max(0, timelineScrollPosition);
                timeline.scrollLeft = timelineScrollPosition;
                
                renderTimeline();
            }
        });
        
        // Add horizontal scrolling with middle mouse button drag
        let isDraggingTimeline = false;
        let timelineDragStartX = 0;
        let timelineStartScrollPos = 0;
        
        timeline.addEventListener('mousedown', (e) => {
            // Middle mouse button (button 1) or Alt+left click
            if (e.button === 1 || (e.button === 0 && e.altKey)) {
                e.preventDefault();
                isDraggingTimeline = true;
                timelineDragStartX = e.clientX;
                timelineStartScrollPos = timelineScrollPosition;
                document.body.style.cursor = 'grabbing';
                
                // Add drag event listeners
                document.addEventListener('mousemove', handleTimelineDrag);
                document.addEventListener('mouseup', stopTimelineDrag);
            }
        });
        
        function handleTimelineDrag(e) {
            if (isDraggingTimeline) {
                const dx = e.clientX - timelineDragStartX;
                timelineScrollPosition = Math.max(0, timelineStartScrollPos - dx);
                timeline.scrollLeft = timelineScrollPosition;
                renderTimeline();
            }
        }
        
        function stopTimelineDrag() {
            isDraggingTimeline = false;
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', handleTimelineDrag);
            document.removeEventListener('mouseup', stopTimelineDrag);
        }
        
        // Add event listener for timeline click to set current time
        timeline.addEventListener('click', (e) => {
            if (e.target === timeline || e.target === timelineScale || e.target === timelineTrack) {
                const rect = timeline.getBoundingClientRect();
                const clickPositionX = e.clientX - rect.left + timelineScrollPosition;
                currentTimePosition = clickPositionX / pixelsPerSecond;
                updateCurrentTimeIndicator();
            }
        });
        
        // Add event listener for mousedown on timeline track
        timelineTrack.addEventListener('mousedown', (e) => {
            // Check if clicking on a clip
            if (e.target.classList.contains('timeline-clip') || 
                e.target.parentElement.classList.contains('timeline-clip')) {
                
                // Get clip element
                const clipElement = e.target.classList.contains('timeline-clip') ? 
                                   e.target : e.target.parentElement;
                
                // Get clip index
                dragClipIndex = parseInt(clipElement.dataset.index);
                
                if (dragClipIndex !== -1) {
                    // Start dragging
                    isDraggingClip = true;
                    dragStartX = e.clientX;
                    originalClipStart = timelineClips[dragClipIndex].startTime;
                    
                    // Select this clip
                    selectClip(dragClipIndex);
                    
                    // Add event listeners for mouse movement and release
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                }
            } else if (e.target.classList.contains('timeline-transition')) {
                // Get transition index
                const transitionIndex = parseInt(e.target.dataset.index);
                
                if (transitionIndex !== -1) {
                    // Select this transition
                    selectTransition(transitionIndex);
                }
            }
        });
        
        // Add transition button handler
        addTransitionBtn.addEventListener('click', () => {
            if (selectedClipIndex !== -1 && selectedClipIndex < timelineClips.length - 1) {
                // Find transition between this clip and next
                const transitionIndex = transitions.findIndex(t => 
                    t.startClipIndex === selectedClipIndex && 
                    t.endClipIndex === selectedClipIndex + 1);
                
                if (transitionIndex !== -1) {
                    // Select this transition
                    selectTransition(transitionIndex);
                    // Show transitions panel
                    transitionsPanel.style.display = 'block';
                }
            }
        });
        
        // Set up overview timeline drag and scroll
        timelineOverviewWindow.addEventListener('mousedown', (e) => {
            isDraggingTimeOverview = true;
            overviewStartX = e.clientX;
            document.addEventListener('mousemove', handleOverviewDrag);
            document.addEventListener('mouseup', stopOverviewDrag);
            e.preventDefault();
        });
        
        timelineOverview.addEventListener('click', (e) => {
            if (e.target === timelineOverview || e.target === timelineOverviewContent) {
                const rect = timelineOverview.getBoundingClientRect();
                const clickPositionX = e.clientX - rect.left;
                const overviewScale = rect.width / totalDuration;
                
                // Calculate the center position for the window
                const visibleDuration = timeline.clientWidth / pixelsPerSecond;
                const targetCenter = clickPositionX / overviewScale;
                
                // Set the scroll position so the clicked point is centered
                timelineScrollPosition = Math.max(0, (targetCenter - visibleDuration / 2) * pixelsPerSecond);
                renderTimeline();
            }
        });
        
        // Add keyboard shortcut for toggling snap
        document.addEventListener('keydown', (e) => {
            // Toggle snap with Alt+S key
            if (e.code === 'KeyS' && e.altKey) {
                snapEnabled = !snapEnabled;
                showToast(`Snap to grid ${snapEnabled ? 'enabled' : 'disabled'}`, 'info');
                e.preventDefault();
            }
        });
        
        // Handle mouse movement during clip drag
        function handleMouseMove(e) {
            if (isDraggingClip && dragClipIndex !== -1) {
                // Calculate drag distance in pixels
                const dragDistancePixels = e.clientX - dragStartX;
                
                // Convert to time (seconds)
                const dragDistanceTime = dragDistancePixels / pixelsPerSecond;
                
                // Update clip start time
                let newStartTime = originalClipStart + dragDistanceTime;
                
                // Ensure start time is not negative
                newStartTime = Math.max(0, newStartTime);
                
                // Calculate minimum start time based on previous clip
                let minStartTime = 0;
                if (dragClipIndex > 0) {
                    const prevClip = timelineClips[dragClipIndex - 1];
                    minStartTime = prevClip.startTime + prevClip.duration - (transitions[dragClipIndex - 1]?.duration || 0);
                }
                
                // Ensure start time is not less than minimum
                newStartTime = Math.max(minStartTime, newStartTime);
                
                // Apply snapping if enabled
                if (snapEnabled) {
                    // Snap to previous clip end
                    if (dragClipIndex > 0) {
                        const prevClip = timelineClips[dragClipIndex - 1];
                        const snapPoint = prevClip.endTime;
                        const snapPointPixels = snapPoint * pixelsPerSecond;
                        const newStartTimePixels = newStartTime * pixelsPerSecond;
                        
                        if (Math.abs(snapPointPixels - newStartTimePixels) < snapTolerance) {
                            newStartTime = snapPoint;
                        }
                    }
                    
                    // Snap to zero
                    if (Math.abs(newStartTime * pixelsPerSecond) < snapTolerance) {
                        newStartTime = 0;
                    }
                    
                    // Snap to grid (every 0.5 seconds)
                    const snapGrid = 0.5; // 0.5 second intervals
                    const nearestGrid = Math.round(newStartTime / snapGrid) * snapGrid;
                    const gridDistancePixels = Math.abs((nearestGrid - newStartTime) * pixelsPerSecond);
                    
                    if (gridDistancePixels < snapTolerance) {
                        newStartTime = nearestGrid;
                    }
                }
                
                // Update clip
                const clip = timelineClips[dragClipIndex];
                clip.startTime = newStartTime;
                clip.endTime = newStartTime + clip.duration;
                
                // Update subsequent clips and transitions
                updateSubsequentClips(dragClipIndex);
                
                // Update current time if needed
                currentTimePosition = Math.min(currentTimePosition, totalDuration);
                
                // Render timeline
                renderTimeline();
            }
        }
        
        // Handle mouse up after drag
        function handleMouseUp() {
            isDraggingClip = false;
            dragClipIndex = -1;
            
            // Remove event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        // Handle overview timeline drag
        function handleOverviewDrag(e) {
            if (isDraggingTimeOverview) {
                const overviewRect = timelineOverview.getBoundingClientRect();
                const dragDistancePixels = e.clientX - overviewStartX;
                overviewStartX = e.clientX;
                
                // Calculate the ratio between overview and main timeline
                const overviewToTimelineRatio = overviewRect.width / (timeline.scrollWidth || 1);
                
                // Update scroll position based on drag distance
                timelineScrollPosition += dragDistancePixels / overviewToTimelineRatio;
                timelineScrollPosition = Math.max(0, Math.min(timeline.scrollWidth - timeline.clientWidth, timelineScrollPosition));
                
                renderTimeline();
            }
        }
        
        // Stop overview drag
        function stopOverviewDrag() {
            isDraggingTimeOverview = false;
            document.removeEventListener('mousemove', handleOverviewDrag);
            document.removeEventListener('mouseup', stopOverviewDrag);
        }
        
        // Initial setup for current time indicator
        updateCurrentTimeIndicator();
    }
    
    // Update the current time indicator position
    function updateCurrentTimeIndicator() {
        if (timelineCurrentTime) {
            // Position the time indicator
            const position = currentTimePosition * pixelsPerSecond - timelineScrollPosition;
            timelineCurrentTime.style.left = `${position}px`;
            
            // Update time display
            if (timelinePosition) {
                timelinePosition.textContent = formatTimeMMSS(currentTimePosition);
            }
            
            // Auto-scroll if indicator is out of view
            const timelineRect = timeline.getBoundingClientRect();
            const timelineWidth = timelineRect.width;
            
            if (position < 0) {
                // Indicator is to the left of view
                timelineScrollPosition = Math.max(0, currentTimePosition * pixelsPerSecond - 50);
                renderTimeline();
            } else if (position > timelineWidth) {
                // Indicator is to the right of view
                timelineScrollPosition = currentTimePosition * pixelsPerSecond - timelineWidth + 50;
                renderTimeline();
            }
        }
    }
    
    // Format time as MM:SS.ms
    function formatTimeMMSS(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    
    // Improved: Fit timeline to show all content
    function fitTimelineToContent() {
        if (totalDuration <= 0 || !timeline) return;
        
        // Calculate the available width
        const availableWidth = timeline.clientWidth - 40; // Padding
        
        // Calculate needed pixels per second to fit all content
        const neededPixelsPerSecond = availableWidth / totalDuration;
        
        // Calculate a reasonable zoom level, with a small margin
        pixelsPerSecond = Math.max(5, Math.min(200, neededPixelsPerSecond * 0.9));
        
        // Reset scroll position
        timelineScrollPosition = 0;
        
        // Render timeline
        renderTimeline();
    }
    
    // Update the positions of clips after the specified index
    function updateSubsequentClips(startIndex) {
        for (let i = startIndex + 1; i < timelineClips.length; i++) {
            const prevClip = timelineClips[i - 1];
            const prevTransition = transitions[i - 1] || { duration: 0 };
            const clip = timelineClips[i];
            
            // Calculate new start time based on previous clip
            const newStartTime = prevClip.endTime - prevTransition.duration;
            
            // Update clip
            clip.startTime = newStartTime;
            clip.endTime = newStartTime + clip.duration;
        }
        
        // Update transitions
        for (let i = 0; i < transitions.length; i++) {
            const transition = transitions[i];
            const startClip = timelineClips[transition.startClipIndex];
            const endClip = timelineClips[transition.endClipIndex];
            
            transition.startTime = startClip.endTime - transition.duration;
            transition.endTime = endClip.startTime + transition.duration;
        }
    }
    
    // Improved: Render timeline with current clips and transitions
    function renderTimeline() {
        // Calculate total duration
        totalDuration = timelineClips.length > 0 
            ? timelineClips[timelineClips.length - 1].endTime 
            : 0;
        
        // IMPROVED: Set minimum timeline width based on total duration and zoom level
        const visibleWidth = timeline.parentElement.clientWidth;
        const minWidth = Math.max(totalDuration * pixelsPerSecond, visibleWidth);
        timeline.style.width = `${minWidth}px`;
        
        // Set timeline scroll position with bounds checking
        const maxScroll = Math.max(0, minWidth - visibleWidth);
        timelineScrollPosition = Math.min(maxScroll, Math.max(0, timelineScrollPosition));
        timeline.scrollLeft = timelineScrollPosition;
        
        // Render timeline scale
        renderTimelineScale(totalDuration);
        
        // Clear timeline track
        timelineTrack.innerHTML = '<div class="timeline-track-label">Video</div>';
        
        // Render clips
        timelineClips.forEach((clip, index) => {
            // Create clip element
            const clipElement = document.createElement('div');
            clipElement.className = 'timeline-clip';
            if (index === selectedClipIndex) {
                clipElement.classList.add('active');
            }
            clipElement.dataset.index = index;
            
            // Position clip
            const leftPosition = clip.startTime * pixelsPerSecond;
            const width = clip.duration * pixelsPerSecond;
            
            clipElement.style.left = `${leftPosition}px`;
            clipElement.style.width = `${width}px`;
            
            // Add content
            const clipHeader = document.createElement('div');
            clipHeader.className = 'timeline-clip-header';
            clipHeader.textContent = clip.file.name;
            
            const clipThumbnail = document.createElement('div');
            clipThumbnail.className = 'timeline-clip-thumbnail';
            clipThumbnail.style.backgroundImage = `url(${clip.file.thumbnail})`;
            
            clipElement.appendChild(clipHeader);
            clipElement.appendChild(clipThumbnail);
            
            // Add to timeline track
            timelineTrack.appendChild(clipElement);
        });
        
        // Render transitions
        transitions.forEach((transition, index) => {
            if (transition.type !== 'none') {
                // Create transition element
                const transitionElement = document.createElement('div');
                transitionElement.className = 'timeline-transition';
                if (index === selectedTransitionIndex) {
                    transitionElement.classList.add('active');
                }
                transitionElement.dataset.index = index;
                
                // Position transition
                const leftPosition = transition.startTime * pixelsPerSecond;
                const width = transition.duration * 2 * pixelsPerSecond; // Double width for visibility
                
                transitionElement.style.left = `${leftPosition}px`;
                transitionElement.style.width = `${width}px`;
                
                // Add content
                transitionElement.innerHTML = `
                    <span class="timeline-transition-icon">↔</span>
                    ${transition.type} (${transition.duration.toFixed(1)}s)
                `;
                
                // Add to timeline track
                timelineTrack.appendChild(transitionElement);
            }
        });
        
        // Add current time marker (playhead)
        const playheadElement = document.createElement('div');
        playheadElement.className = 'timeline-playhead';
        playheadElement.style.left = `${currentTimePosition * pixelsPerSecond}px`;
        timelineTrack.appendChild(playheadElement);
        
        // Update current time indicator
        updateCurrentTimeIndicator();
        
        // Update time displays
        if (timelineDuration) {
            timelineDuration.textContent = formatTimeMMSS(totalDuration);
        }
        
        // Render overview timeline
        renderTimelineOverview();
        
        // Update add transition button state
        addTransitionBtn.disabled = selectedClipIndex === -1 || selectedClipIndex >= timelineClips.length - 1;
    }
    
    // Render the timeline overview
    function renderTimelineOverview() {
        // Clear overview content
        timelineOverviewContent.innerHTML = '';
        
        // Calculate scale ratio
        const overviewScale = timelineOverview.clientWidth / (totalDuration || 1);
        
        // Render clips in overview
        timelineClips.forEach((clip, index) => {
            // Create clip element
            const clipElement = document.createElement('div');
            clipElement.className = 'timeline-clip';
            clipElement.style.position = 'absolute';
            clipElement.style.height = '100%';
            clipElement.style.backgroundColor = index === selectedClipIndex ? '#e74c3c' : '#3498db';
            
            // Position clip
            const leftPosition = clip.startTime * overviewScale;
            const width = clip.duration * overviewScale;
            
            clipElement.style.left = `${leftPosition}px`;
            clipElement.style.width = `${width}px`;
            
            // Add to overview
            timelineOverviewContent.appendChild(clipElement);
        });
        
        // Render transitions in overview
        transitions.forEach(transition => {
            if (transition.type !== 'none') {
                // Create transition element
                const transitionElement = document.createElement('div');
                transitionElement.className = 'timeline-transition';
                transitionElement.style.position = 'absolute';
                transitionElement.style.height = '100%';
                transitionElement.style.zIndex = '2';
                transitionElement.style.background = 'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)';
                
                // Position transition
                const leftPosition = transition.startTime * overviewScale;
                const width = transition.duration * 2 * overviewScale;
                
                transitionElement.style.left = `${leftPosition}px`;
                transitionElement.style.width = `${width}px`;
                
                // Add to overview
                timelineOverviewContent.appendChild(transitionElement);
            }
        });
        
        // Add current time marker to overview
        const playheadElement = document.createElement('div');
        playheadElement.className = 'timeline-overview-playhead';
        playheadElement.style.left = `${currentTimePosition * overviewScale}px`;
        timelineOverviewContent.appendChild(playheadElement);
        
        // Position the overview window
        const visibleDuration = timeline.clientWidth / pixelsPerSecond;
        const windowWidth = (visibleDuration / (totalDuration || 1)) * timelineOverview.clientWidth;
        const windowPosition = (timelineScrollPosition / pixelsPerSecond / (totalDuration || 1)) * timelineOverview.clientWidth;
        
        timelineOverviewWindow.style.width = `${windowWidth}px`;
        timelineOverviewWindow.style.left = `${windowPosition}px`;
    }
    
    // Render timeline scale with time markers
    function renderTimelineScale(totalDuration) {
        timelineScale.innerHTML = '';
        
        // Calculate optimal marker intervals based on zoom level
        // Base marker frequency on pixels per second
        let markerInterval = 1; // 1 second
        let minorInterval = 0.2; // 0.2 seconds
        
        if (pixelsPerSecond < 50) {
            markerInterval = 10; // 10 seconds
            minorInterval = 2; // 2 seconds
        } else if (pixelsPerSecond < 100) {
            markerInterval = 5; // 5 seconds
            minorInterval = 1; // 1 second
        } else if (pixelsPerSecond < 200) {
            markerInterval = 1; // 1 second
            minorInterval = 0.2; // 0.2 seconds
        } else {
            markerInterval = 0.5; // 0.5 seconds
            minorInterval = 0.1; // 0.1 seconds
        }
        
        // Adjust based on total duration
        if (totalDuration > 300) {
            markerInterval *= 5;
            minorInterval *= 5;
        } else if (totalDuration > 60) {
            markerInterval *= 2;
            minorInterval *= 2;
        }
        
        // Create minor markers
        for (let time = 0; time <= totalDuration; time += minorInterval) {
            // Skip if this is a major marker position
            if (time % markerInterval < 0.001) continue;
            
            const marker = document.createElement('div');
            marker.className = 'timeline-scale-marker';
            marker.style.left = `${time * pixelsPerSecond}px`;
            marker.style.height = '10px'; // Shorter height for minor markers
            marker.style.top = '15px'; // Position at bottom of scale
            
            timelineScale.appendChild(marker);
        }
        
        // Create major markers with labels
        for (let time = 0; time <= totalDuration; time += markerInterval) {
            const marker = document.createElement('div');
            marker.className = 'timeline-scale-marker major';
            marker.style.left = `${time * pixelsPerSecond}px`;
            
            // Format time
            let timeDisplay = '';
            if (time >= 60) {
                // Format as minutes:seconds
                const minutes = Math.floor(time / 60);
                const seconds = Math.floor(time % 60);
                const ms = Math.floor((time % 1) * 10) * 10;
                
                if (ms === 0) {
                    timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}.${(ms/10).toString()}`;
                }
            } else {
                // Format as seconds with milliseconds if needed
                const seconds = Math.floor(time);
                const ms = Math.floor((time % 1) * 10) * 10;
                
                if (ms === 0) {
                    timeDisplay = `${seconds}s`;
                } else {
                    timeDisplay = `${seconds}.${(ms/10).toString()}s`;
                }
            }
            
            marker.innerHTML = `<span>${timeDisplay}</span>`;
            timelineScale.appendChild(marker);
        }
        
        // Add frame markers if zoom level is high enough
        if (pixelsPerSecond > 250) {
            // Assuming 30fps, add a marker every frame
            const frameInterval = 1/30;
            
            for (let time = 0; time <= totalDuration; time += frameInterval) {
                // Skip if this coincides with an existing marker
                if (time % minorInterval < 0.001) continue;
                
                const marker = document.createElement('div');
                marker.className = 'timeline-scale-marker frame';
                marker.style.left = `${time * pixelsPerSecond}px`;
                marker.style.height = '5px'; // Very short for frame markers
                marker.style.top = '20px'; // Position at bottom of scale
                
                timelineScale.appendChild(marker);
            }
        }
    }
    
    // Select a clip on the timeline
    function selectClip(index) {
        // Deselect current clip
        if (selectedClipIndex !== -1) {
            const currentClipEl = document.querySelector(`.timeline-clip[data-index="${selectedClipIndex}"]`);
            if (currentClipEl) {
                currentClipEl.classList.remove('active');
            }
        }
        
        // Deselect current transition
        if (selectedTransitionIndex !== -1) {
            const currentTransitionEl = document.querySelector(`.timeline-transition[data-index="${selectedTransitionIndex}"]`);
            if (currentTransitionEl) {
                currentTransitionEl.classList.remove('active');
            }
            selectedTransitionIndex = -1;
        }
        
        // Select new clip
        selectedClipIndex = index;
        
        // Update UI
        if (selectedClipIndex !== -1) {
            const clipEl = document.querySelector(`.timeline-clip[data-index="${selectedClipIndex}"]`);
            if (clipEl) {
                clipEl.classList.add('active');
            }
        }
        
        // Hide transitions panel
        transitionsPanel.style.display = 'none';
        
        // Update add transition button state
        addTransitionBtn.disabled = selectedClipIndex === -1 || selectedClipIndex >= timelineClips.length - 1;
    }
    
    // Select a transition on the timeline
    function selectTransition(index) {
        // Deselect current transition
        if (selectedTransitionIndex !== -1) {
            const currentTransitionEl = document.querySelector(`.timeline-transition[data-index="${selectedTransitionIndex}"]`);
            if (currentTransitionEl) {
                currentTransitionEl.classList.remove('active');
            }
        }
        
        // Deselect current clip
        if (selectedClipIndex !== -1) {
            const currentClipEl = document.querySelector(`.timeline-clip[data-index="${selectedClipIndex}"]`);
            if (currentClipEl) {
                currentClipEl.classList.remove('active');
            }
            selectedClipIndex = -1;
        }
        
        // Select new transition
        selectedTransitionIndex = index;
        
        // Update UI
        if (selectedTransitionIndex !== -1) {
            const transitionEl = document.querySelector(`.timeline-transition[data-index="${selectedTransitionIndex}"]`);
            if (transitionEl) {
                transitionEl.classList.add('active');
            }
            
            // Show transitions panel
            transitionsPanel.style.display = 'block';
            
            // Update transition form
            const transition = transitions[selectedTransitionIndex];
            
            // Select correct transition type
            transitionItems.forEach(item => {
                item.classList.remove('selected');
                if (item.dataset.type === transition.type) {
                    item.classList.add('selected');
                }
            });
            
            // Set duration
            transitionDuration.value = transition.duration;
            transitionDurationValue.textContent = `${transition.duration.toFixed(1)}s`;
            
            // Show options form if there's a selected transition type
            if (transition.type !== 'none') {
                transitionOptionsForm.classList.add('active');
                selectedTransitionType = transition.type;
                
                // Show specific options for this transition type
                updateTransitionOptions(transition.type);
            } else {
                transitionOptionsForm.classList.remove('active');
                selectedTransitionType = null;
            }
        } else {
            // Hide transitions panel
            transitionsPanel.style.display = 'none';
        }
    }
    
    // Handle transition type selection
    transitionItems.forEach(item => {
        item.addEventListener('click', () => {
            // Deselect all transition items
            transitionItems.forEach(i => i.classList.remove('selected'));
            
            // Select this item
            item.classList.add('selected');
            
            // Set selected transition type
            selectedTransitionType = item.dataset.type;
            
            // Show options form
            transitionOptionsForm.classList.add('active');
            
            // Update options for this transition type
            updateTransitionOptions(selectedTransitionType);
        });
    });
    
    // Update transition duration display
    transitionDuration.addEventListener('input', () => {
        transitionDurationValue.textContent = `${parseFloat(transitionDuration.value).toFixed(1)}s`;
    });
    
    // Show/hide specific options based on transition type
    function updateTransitionOptions(type) {
        // Hide all specific options
        wipeOptions.style.display = 'none';
        slideOptions.style.display = 'none';
        
        // Show options for this type
        if (type === 'wipe') {
            wipeOptions.style.display = 'block';
        } else if (type === 'slide') {
            slideOptions.style.display = 'block';
        }
    }
    
    // Apply transition button handler
    applyTransitionBtn.addEventListener('click', () => {
        if (selectedTransitionIndex !== -1 && selectedTransitionType) {
            // Get transition
            const transition = transitions[selectedTransitionIndex];
            
            // Update transition properties
            transition.type = selectedTransitionType;
            transition.duration = parseFloat(transitionDuration.value);
            
            // Get additional options based on transition type
            if (selectedTransitionType === 'wipe') {
                transition.direction = document.getElementById('wipe-direction').value;
            } else if (selectedTransitionType === 'slide') {
                transition.direction = document.getElementById('slide-direction').value;
            }
            
            // Update transition timing
            const startClip = timelineClips[transition.startClipIndex];
            const endClip = timelineClips[transition.endClipIndex];
            
            transition.startTime = startClip.endTime - transition.duration;
            transition.endTime = endClip.startTime + transition.duration;
            
            // Update UI
            renderTimeline();
            
            // Hide transitions panel
            transitionsPanel.style.display = 'none';
            
            // Deselect transition
            selectTransition(-1);
            
            showToast('Transition applied successfully!', 'success');
        }
    });
    
    // Cancel transition button handler
    cancelTransitionBtn.addEventListener('click', () => {
        // Hide transitions panel
        transitionsPanel.style.display = 'none';
        
        // Deselect transition
        selectTransition(-1);
    });
    
    // Format file size for display
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Format duration for display
    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Remove a file
    function removeFile(index) {
        uploadedFiles.splice(index, 1);
        updateFileList();
        updateTimeline();
        
        if (uploadedFiles.length === 0) {
            timelineContainer.style.display = 'none';
            transitionsPanel.style.display = 'none';
        }
    }
    
    // Preview button handler
    previewBtn.addEventListener('click', async () => {
        if (timelineClips.length === 0) {
            showToast('Add videos to the timeline first.', 'error');
            return;
        }
        
        // Process the timeline and create preview
        await processTimeline();
    });
    
    // COMPLETELY REWRITTEN: Process timeline and create output video
    async function processTimeline() {
        try {
            // Disable UI
            previewBtn.disabled = true;
            addTransitionBtn.disabled = true;
            
            // Show progress
            progressContainer.style.display = 'block';
            statusEl.innerHTML = '<div class="spinner"></div> Preparing to process videos...';
            progressBar.style.width = '0%';
            
            // Hide preview
            previewContainer.classList.add('hidden');
            
            // Calculate total duration
            const totalDuration = timelineClips.length > 0 
                ? timelineClips[timelineClips.length - 1].endTime 
                : 0;
            
            // Get dimensions from first video
            const firstClip = timelineClips[0];
            const videoWidth = firstClip.file.width;
            const videoHeight = firstClip.file.height;
            
            // Get export format settings
            let mimeType = 'video/webm;codecs=vp9'; // Default
            let videoBitsPerSecond = 5000000; // Default 5 Mbps
            
            if (exportFormatSelect && exportQualitySelect) {
                mimeType = exportFormatSelect.value;
                
                // Set bitrate based on quality selection
                switch (exportQualitySelect.value) {
                    case 'high':
                        videoBitsPerSecond = 8000000; // 8 Mbps
                        break;
                    case 'medium':
                        videoBitsPerSecond = 5000000; // 5 Mbps
                        break;
                    case 'low':
                        videoBitsPerSecond = 3000000; // 3 Mbps
                        break;
                }
                
                // If retain format is selected, try to use the format of the first clip
                if (mimeType === 'retain' && timelineClips.length > 0) {
                    const firstClipFormat = timelineClips[0].file.type;
                    
                    // Check if browser supports this format for MediaRecorder
                    if (MediaRecorder.isTypeSupported(firstClipFormat)) {
                        mimeType = firstClipFormat;
                    } else {
                        // Fall back to WebM
                        mimeType = 'video/webm;codecs=vp9';
                        showToast('Original format not supported for export, using WebM instead.', 'info');
                    }
                }
                
                // Check if browser supports selected format
                if (mimeType !== 'retain' && !MediaRecorder.isTypeSupported(mimeType)) {
                    // Fall back to WebM
                    mimeType = 'video/webm;codecs=vp9';
                    showToast('Selected format not supported by your browser, using WebM instead.', 'info');
                }
            }
            
            // Prepare metadata
            outputMetadata = {
                title: exportMetadataInput ? exportMetadataInput.value : 'Edited Video',
                creator: 'Video Editor',
                date: new Date().toISOString(),
                sourceClips: timelineClips.map(clip => ({
                    filename: clip.file.name,
                    duration: clip.duration,
                    startTime: clip.startTime
                }))
            };
            
            // Load video elements - NOW WITH ASYNC SEEKING
            const videoElements = [];
            const totalClips = timelineClips.length;
            
            // Load all videos first with good progress indication
            for (let i = 0; i < totalClips; i++) {
                statusEl.innerHTML = `<div class="spinner"></div> Loading video ${i+1} of ${totalClips}...`;
                progressBar.style.width = `${(i / totalClips) * 20}%`; // First 20% for loading
                
                const clip = timelineClips[i];
                
                // Create and load video element
                const videoElement = document.createElement('video');
                videoElement.muted = true;
                videoElement.playsInline = true;
                videoElement.preload = 'auto';
                
                // Wait for video metadata to load
                await new Promise((resolve, reject) => {
                    const loadTimeout = setTimeout(() => {
                        reject(new Error(`Timeout loading video metadata: ${clip.file.name}`));
                    }, 20000);
                    
                    videoElement.onloadedmetadata = () => {
                        clearTimeout(loadTimeout);
                        resolve();
                    };
                    
                    videoElement.onerror = () => {
                        clearTimeout(loadTimeout);
                        reject(new Error(`Error loading video: ${clip.file.name}`));
                    };
                    
                    videoElement.src = clip.file.url;
                });
                
                // Store the video element
                videoElements.push({
                    element: videoElement,
                    clip: clip
                });
                
                // We'll keep the video hidden but in the DOM for better performance
                videoElement.style.display = 'none';
                document.body.appendChild(videoElement);
            }
            
            // Create an offscreen canvas for rendering
            const canvas = document.createElement('canvas');
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false for better performance
            
            // ---- COMPLETELY NEW APPROACH TO RENDERING ----
            
            // Instead of using MediaRecorder directly with the canvas stream, we'll
            // manually capture frames at precise intervals, store them, and then
            // create a video from them afterward.
            
            // Constants for rendering
            const TARGET_FPS = 30;
            const FRAME_TIME_MS = 1000 / TARGET_FPS;
            const totalFrames = Math.ceil(totalDuration * TARGET_FPS);
            
            // Prepare array to hold captured frames (as ImageData, then we'll convert to Blob)
            const frames = [];
            
            // Start actual rendering process
            statusEl.innerHTML = '<div class="spinner"></div> Preparing to render frames...';
            
            // Helper function to seek video to exact time with proper awaiting
            const seekVideoToTime = async (videoElement, targetTime) => {
                return new Promise((resolve) => {
                    // If already at the right time (or very close), resolve immediately
                    if (Math.abs(videoElement.currentTime - targetTime) < 0.01) {
                        resolve();
                        return;
                    }
                    
                    // Otherwise, set up listeners and seek
                    const seekHandler = () => {
                        videoElement.removeEventListener('seeked', seekHandler);
                        resolve();
                    };
                    
                    videoElement.addEventListener('seeked', seekHandler);
                    
                    // Also set a safety timeout in case the seek event doesn't fire
                    const seekTimeout = setTimeout(() => {
                        videoElement.removeEventListener('seeked', seekHandler);
                        resolve();
                    }, 200); // 200ms should be plenty for most seek operations
                    
                    // Start the seek operation
                    videoElement.currentTime = targetTime;
                });
            };
            
            // Render frames one by one with precise timing
            let frame = 0;
            while (frame < totalFrames) {
                try {
                    // Calculate the exact time for this frame
                    const frameTime = frame / TARGET_FPS;
                    
                    // Update progress
                    const progress = Math.min(100, 20 + (frame / totalFrames) * 70);
                    progressBar.style.width = `${progress}%`;
                    statusEl.innerHTML = `<div class="spinner"></div> Rendering frame ${frame+1}/${totalFrames} (${Math.round(progress)}%)`;
                    
                    // Find the active clip at this time
                    let activeClipIndex = -1;
                    for (let i = 0; i < timelineClips.length; i++) {
                        const clip = timelineClips[i];
                        if (frameTime >= clip.startTime && frameTime < clip.endTime) {
                            activeClipIndex = i;
                            break;
                        }
                    }
                    
                    // Only proceed if we found an active clip
                    if (activeClipIndex >= 0) {
                        const activeClip = timelineClips[activeClipIndex];
                        const videoElement = videoElements[activeClipIndex].element;
                        const clipTime = frameTime - activeClip.startTime;
                        
                        // Seek the video to the exact time
                        await seekVideoToTime(videoElement, clipTime);
                        
                        // Clear the canvas
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // Draw the video frame
                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                        
                        // Check for active transition
                        const activeTransition = transitions.find(t => 
                            t.type !== 'none' && 
                            frameTime >= t.startTime && 
                            frameTime <= t.endTime);
                        
                        if (activeTransition) {
                            // We have an active transition, handle it
                            const secondClipIndex = activeTransition.endClipIndex;
                            const secondClip = timelineClips[secondClipIndex];
                            const secondVideo = videoElements[secondClipIndex].element;
                            const secondClipTime = frameTime - secondClip.startTime;
                            
                            // Only try to use the second clip if we're actually into its timeline
                            if (secondClipTime >= 0) {
                                // Seek the second video to the right time
                                await seekVideoToTime(secondVideo, secondClipTime);
                                
                                // Calculate transition progress (0 to 1)
                                const transProgress = (frameTime - activeTransition.startTime) / 
                                                     (activeTransition.duration * 2);
                                
                                // Apply transition effect
                                applyTransitionEffect(
                                    ctx, 
                                    videoElement, 
                                    secondVideo, 
                                    activeTransition.type, 
                                    transProgress, 
                                    activeTransition, 
                                    canvas.width, 
                                    canvas.height
                                );
                            }
                        }
                        
                        // Capture the frame - convert to blob for efficiency and to avoid memory issues
                        const frameBlob = await new Promise(resolve => {
                            canvas.toBlob(resolve, 'image/jpeg', 0.95);
                        });
                        
                        frames.push(frameBlob);
                    }
                    
                    // Move to next frame
                    frame++;
                    
                    // Let the UI update - crucial for browser responsiveness
                    await new Promise(resolve => setTimeout(resolve, 0));
                    
                } catch (error) {
                    console.error(`Error processing frame ${frame}:`, error);
                    showToast(`Error rendering frame ${frame}: ${error.message}`, 'error');
                    
                    // We'll still try to continue with the next frame
                    frame++;
                }
            }
            
            // Now that we have all frames, let's create a video from them
            statusEl.innerHTML = '<div class="spinner"></div> Assembling video from frames...';
            progressBar.style.width = '90%';
            
            // Function to create a video from frames using WebCodecs API if available,
            // or falling back to a more traditional approach
            const createVideoFromFrames = async () => {
                try {
                    // Create a new canvas for the final video
                    const finalCanvas = document.createElement('canvas');
                    finalCanvas.width = canvas.width;
                    finalCanvas.height = canvas.height;
                    const finalCtx = finalCanvas.getContext('2d');
                    
                    // Create a MediaRecorder to capture the final video
                    const stream = finalCanvas.captureStream(TARGET_FPS);
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType: mimeType,
                        videoBitsPerSecond: videoBitsPerSecond
                    });
                    
                    const recordedChunks = [];
                    
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            recordedChunks.push(e.data);
                        }
                    };
                    
                    // Return a promise that resolves with the final video blob
                    return new Promise((resolve, reject) => {
                        // Set up the completion handler
                        mediaRecorder.onstop = () => {
                            try {
                                const videoBlob = new Blob(recordedChunks, { type: mimeType.split(';')[0] });
                                resolve(videoBlob);
                            } catch (error) {
                                reject(error);
                            }
                        };
                        
                        // Start recording
                        mediaRecorder.start();
                        
                        // Process each frame at the target framerate
                        let frameIndex = 0;
                        
                        const processNextFrame = async () => {
                            if (frameIndex < frames.length) {
                                try {
                                    // Load the frame blob into an image
                                    const frameBlob = frames[frameIndex];
                                    const img = new Image();
                                    img.src = URL.createObjectURL(frameBlob);
                                    
                                    // Wait for the image to load
                                    await new Promise(resolve => { img.onload = resolve; });
                                    
                                    // Draw the image to the canvas
                                    finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
                                    finalCtx.drawImage(img, 0, 0);
                                    
                                    // Clean up
                                    URL.revokeObjectURL(img.src);
                                    
                                    // Move to next frame
                                    frameIndex++;
                                    
                                    // Update progress
                                    const finalProgress = 90 + (frameIndex / frames.length) * 10;
                                    progressBar.style.width = `${finalProgress}%`;
                                    statusEl.textContent = `Assembling video: ${frameIndex}/${frames.length} (${Math.round(finalProgress)}%)`;
                                    
                                    // Schedule next frame - use precise timing with FRAME_TIME_MS
                                    setTimeout(processNextFrame, FRAME_TIME_MS);
                                    
                                } catch (error) {
                                    reject(error);
                                }
                            } else {
                                // All frames processed, stop recording
                                mediaRecorder.stop();
                            }
                        };
                        
                        // Start processing frames
                        processNextFrame();
                    });
                } catch (error) {
                    throw new Error(`Failed to create video: ${error.message}`);
                }
            };
            
            // Create the video from frames
            outputBlob = await createVideoFromFrames();
            
            // Cleanup
            videoElements.forEach(ve => {
                if (document.body.contains(ve.element)) {
                    document.body.removeChild(ve.element);
                }
            });
            
            // Display the final video
            statusEl.textContent = 'Video processing complete!';
            progressBar.style.width = '100%';
            
            // Create URL and update preview
            const videoURL = URL.createObjectURL(outputBlob);
            previewVideo.src = videoURL;
            previewVideo.onloadeddata = () => {
                previewContainer.classList.remove('hidden');
                document.getElementById('download-section').style.display = 'block';
            };
            
            // Re-enable UI
            previewBtn.disabled = false;
            addTransitionBtn.disabled = selectedClipIndex === -1 || selectedClipIndex >= timelineClips.length - 1;
            
            showToast('Video processing complete!', 'success');
            
        } catch (error) {
            console.error('Error processing timeline:', error);
            statusEl.textContent = 'Error processing video: ' + error.message;
            
            // Re-enable UI
            previewBtn.disabled = false;
            addTransitionBtn.disabled = selectedClipIndex === -1 || selectedClipIndex >= timelineClips.length - 1;
            
            showToast('Error processing video: ' + error.message, 'error');
        }
    }
    
    // Helper function for applying transition effects
    function applyTransitionEffect(ctx, video1, video2, type, progress, transitionData, width, height) {
        // Clamp progress to 0-1
        progress = Math.max(0, Math.min(1, progress));
        
        switch (type) {
            case 'fade':
                // Fade transition
                ctx.globalAlpha = 1 - progress;
                ctx.drawImage(video1, 0, 0, width, height);
                ctx.globalAlpha = progress;
                ctx.drawImage(video2, 0, 0, width, height);
                ctx.globalAlpha = 1;
                break;
                
            case 'wipe':
                // Wipe transition
                const direction = transitionData.direction || 'left-to-right';
                
                // Draw first video
                ctx.drawImage(video1, 0, 0, width, height);
                
                // Draw second video with clip region
                ctx.save();
                if (direction === 'left-to-right') {
                    ctx.beginPath();
                    ctx.rect(0, 0, width * progress, height);
                    ctx.clip();
                } else if (direction === 'right-to-left') {
                    ctx.beginPath();
                    ctx.rect(width * (1 - progress), 0, width * progress, height);
                    ctx.clip();
                } else if (direction === 'top-to-bottom') {
                    ctx.beginPath();
                    ctx.rect(0, 0, width, height * progress);
                    ctx.clip();
                } else if (direction === 'bottom-to-top') {
                    ctx.beginPath();
                    ctx.rect(0, height * (1 - progress), width, height * progress);
                    ctx.clip();
                }
                
                ctx.drawImage(video2, 0, 0, width, height);
                ctx.restore();
                break;
                
            case 'dissolve':
                // Draw first video
                ctx.drawImage(video1, 0, 0, width, height);
                
                // Draw second video with dissolve effect
                ctx.globalAlpha = progress;
                ctx.drawImage(video2, 0, 0, width, height);
                ctx.globalAlpha = 1;
                break;
                
            case 'zoom':
                // Zoom transition
                if (progress < 0.5) {
                    // First half: zoom out first video
                    const scale = 1 + progress;
                    const x = (width - width * scale) / 2;
                    const y = (height - height * scale) / 2;
                    
                    ctx.drawImage(video1, x, y, width * scale, height * scale);
                } else {
                    // Second half: zoom in second video
                    const newProgress = (progress - 0.5) * 2; // Normalize to 0-1
                    const scale = 2 - newProgress;
                    const x = (width - width * scale) / 2;
                    const y = (height - height * scale) / 2;
                    
                    ctx.drawImage(video2, x, y, width * scale, height * scale);
                }
                break;
                
            case 'slide':
                // Slide transition
                const slideDirection = transitionData.direction || 'left';
                
                // Calculate positions
                let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                
                if (slideDirection === 'left') {
                    x1 = width * progress * -1;
                    x2 = width - (width * progress);
                } else if (slideDirection === 'right') {
                    x1 = width * progress;
                    x2 = (width * progress * -1) + width;
                } else if (slideDirection === 'top') {
                    y1 = height * progress * -1;
                    y2 = height - (height * progress);
                } else if (slideDirection === 'bottom') {
                    y1 = height * progress;
                    y2 = (height * progress * -1) + height;
                }
                
                // Draw videos
                ctx.drawImage(video1, x1, y1, width, height);
                ctx.drawImage(video2, x2, y2, width, height);
                break;
                
            default:
                // Default: crossfade
                ctx.globalAlpha = 1 - progress;
                ctx.drawImage(video1, 0, 0, width, height);
                ctx.globalAlpha = progress;
                ctx.drawImage(video2, 0, 0, width, height);
                ctx.globalAlpha = 1;
        }
    }
    
    // Download button handlers
    async function handleDownload() {
        if (!outputBlob) {
            showToast('No video available for download.', 'error');
            return;
        }
        
        try {
            // Determine file extension based on MIME type
            let fileExtension = '.webm'; // Default
            const mimeType = outputBlob.type.split(';')[0];
            
            if (mimeType === 'video/mp4') {
                fileExtension = '.mp4';
            } else if (mimeType === 'video/webm') {
                fileExtension = '.webm';
            } else if (mimeType === 'video/quicktime') {
                fileExtension = '.mov';
            } else if (mimeType === 'video/x-matroska') {
                fileExtension = '.mkv';
            }
            
            // Generate a default filename based on date and time and metadata
            const date = new Date();
            const videoTitle = outputMetadata.title || 'edited_video';
            const cleanTitle = videoTitle.replace(/[^\w\s-]/g, '')
                                          .replace(/\s+/g, '_');
            
            const defaultName = `${cleanTitle}_${date.toISOString().replace(/[:.]/g, '-').slice(0, 19)}${fileExtension}`;
            
            // Show filename dialog
            const filename = await showFilenameDialog(defaultName);
            
            // User cancelled
            if (!filename) return;
            
            // Show download progress
            showDownloadProgress();
            
            // Create and trigger download
            const url = URL.createObjectURL(outputBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            
            // Track download progress (simulate for better UX)
            const fileSize = outputBlob.size;
            simulateDownloadProgress(fileSize);
            
            // Trigger download
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // We don't know exactly when the download finishes,
                // so we use a timeout proportional to file size for UX
                setTimeout(() => {
                    hideDownloadProgress();
                    showToast('Download completed successfully!', 'success');
                }, Math.min(2000, fileSize / 10000));
            }, 100);
            
        } catch (error) {
            console.error('Download error:', error);
            hideDownloadProgress();
            showToast(`Download failed: ${error.message}`, 'error');
        }
    }
    
    // Add event listeners to both download buttons
    downloadBtn.addEventListener('click', handleDownload);
    if (downloadBtnAlt) {
        downloadBtnAlt.addEventListener('click', handleDownload);
    }
    
    // Show modal dialog for filename input
    function showFilenameDialog(defaultName) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'modal-content';
            modal.style.animation = 'fadeIn 0.3s';
            
            // Create modal content
            modal.innerHTML = `
                <h3>Download Video</h3>
                <p>Enter a name for your video file:</p>
                <input type="text" id="filename-input" class="modal-input" value="${defaultName}">
                <div class="modal-buttons">
                    <button id="cancel-btn" class="btn" style="background-color: #95a5a6;">Cancel</button>
                    <button id="save-btn" class="btn" style="background-color: #27ae60;">Download</button>
                </div>
            `;
            
            // Add modal to overlay
            overlay.appendChild(modal);
            
            // Add overlay to body
            document.body.appendChild(overlay);
            
            // Focus input
            setTimeout(() => {
                const input = document.getElementById('filename-input');
                input.focus();
                input.select();
            }, 100);
            
            // Handle button clicks
            document.getElementById('cancel-btn').addEventListener('click', () => {
                modal.style.animation = 'fadeOut 0.3s';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 300);
                resolve(null);
            });
            
            document.getElementById('save-btn').addEventListener('click', () => {
                let filename = document.getElementById('filename-input').value.trim();
                if (!filename) filename = defaultName;
                
                // Get extension from default name
                const defaultExt = defaultName.substring(defaultName.lastIndexOf('.'));
                
                // Ensure correct extension
                if (!filename.toLowerCase().endsWith(defaultExt)) {
                    filename += defaultExt;
                }
                
                modal.style.animation = 'fadeOut 0.3s';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 300);
                
                resolve(filename);
            });
            
            // Handle Enter key
            document.getElementById('filename-input').addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('save-btn').click();
                }
            });
            
            // Handle ESC key
            document.addEventListener('keyup', function escHandler(e) {
                if (e.key === 'Escape') {
                    document.getElementById('cancel-btn').click();
                    document.removeEventListener('keyup', escHandler);
                }
            });
        });
    }
    
    // Show download progress overlay
    function showDownloadProgress() {
        // Create progress overlay
        const overlay = document.createElement('div');
        overlay.id = 'download-progress-overlay';
        overlay.className = 'progress-overlay';
        
        // Create progress container
        const container = document.createElement('div');
        container.className = 'progress-box';
        
        // Create animation and text
        container.innerHTML = `
            <div class="progress-spinner"></div>
            <p id="download-status">Preparing download...</p>
        `;
        
        // Add to DOM
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }
    
    // Simulate download progress for better UX
    function simulateDownloadProgress(fileSize) {
        const statusElement = document.getElementById('download-status');
        if (!statusElement) return;
        
        // Determine simulated download time based on file size (faster for smaller files)
        const totalTime = Math.min(3000, Math.max(500, fileSize / 10000));
        const steps = 10;
        const interval = totalTime / steps;
        
        let progress = 0;
        const updateProgress = setInterval(() => {
            progress += 1;
            
            if (progress <= steps) {
                const percent = Math.floor((progress / steps) * 100);
                statusElement.textContent = `Downloading... ${percent}%`;
            } else {
                statusElement.textContent = 'Download complete!';
                clearInterval(updateProgress);
            }
        }, interval);
    }
    
    // Hide download progress
    function hideDownloadProgress() {
        const overlay = document.getElementById('download-progress-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        }
    }
    
    // Show toast notification
    function showToast(message, type = 'info') {
        // Remove any existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => {
            toast.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        
        // Add icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '✓';
                break;
            case 'error':
                icon = '✕';
                break;
            default:
                icon = 'ℹ';
        }
        
        toast.innerHTML = `
            <strong style="font-size: 1.2em; margin-right: 8px;">${icon}</strong>
            <span>${message}</span>
        `;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.className = `toast toast-${type} fade-out`;
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
});