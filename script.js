const chatArea = document.querySelector('.chat-area');
const chatLog = document.getElementById('chat-log');
const form = document.getElementById('chat-form');
const textarea = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
let sendIconEl;
const ASSET_VER = '2';
const newProjectBtn = document.getElementById('new-project-btn');
const projectListEl = document.getElementById('project-list');
let nextProjectIndex = 1;
let currentProjectId = null;
let projectChatHistory = {}; // Store chat history for each project
let selectedSearchIndex = -1; // For search keyboard navigation
let currentModel = {
  id: 'gpt-4o',
  name: 'GPT-4o',
  icon: 'assets/icon/GPT.png'
}; // Current selected AI model
const sidebar = document.querySelector('.sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebarLogoBtn = document.getElementById('sidebar-logo');
const modalOverlay = document.getElementById('modal-overlay');

function scrollToBottom() {
  if (!chatArea) return;
  setTimeout(() => {
  chatArea.scrollTop = chatArea.scrollHeight;
  }, 100); // Small delay to ensure DOM is updated
}

function autoResize() {
  if (!textarea) return;
  textarea.style.height = '24px';
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

// We keep send icon static (Default), only CSS hover background applies

function initHoverSwap() {
  const imgs = document.querySelectorAll('img.hover-swap');
  imgs.forEach((img) => {
    const defaultSrc = img.getAttribute('data-default-src');
    const hoverSrc = img.getAttribute('data-hover-src');
    if (!defaultSrc || !hoverSrc) return;
    const swapTo = (src) => {
      // keep same size/position; we only swap image source
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    };
    img.addEventListener('mouseenter', () => swapTo(hoverSrc));
    img.addEventListener('mouseleave', () => swapTo(defaultSrc));
    const parentBtn = img.closest('button');
    if (parentBtn) {
      parentBtn.addEventListener('mouseenter', () => swapTo(hoverSrc));
      parentBtn.addEventListener('mouseleave', () => swapTo(defaultSrc));
    }
  });
}

function setupImageFallbacks() {
  const allImages = document.querySelectorAll('img');
  allImages.forEach((img) => {
    const handleError = () => {
      const altText = (img.getAttribute('alt') || '').toLowerCase();
      let fallbackSrc = 'assets/icon/Search.png';
      if (altText.includes('add')) fallbackSrc = 'assets/icon/tab-new.png';
      else if (altText.includes('microphone')) fallbackSrc = 'assets/btn/Microphone_Default.png';
      else if (altText.includes('copy')) fallbackSrc = 'assets/btn/Copy_Default.png';
      else if (altText.includes('share')) fallbackSrc = 'assets/btn/Share_Default-1.png';
      else if (altText.includes('refresh')) fallbackSrc = 'assets/btn/Refresh_Default.png';
      else if (altText.includes('gpt')) fallbackSrc = 'assets/icon/GPT.png';
      else if (altText.includes('dock')) fallbackSrc = 'assets/icon/dock-to-right.png';
      else if (altText.includes('caret')) fallbackSrc = 'assets/icon/Caret-down.png';
      else if (altText.includes('send')) fallbackSrc = 'assets/btn/Send_Default.png';
      else if (altText.includes('hodo') || altText.includes('logo')) fallbackSrc = 'assets/icon/Hodo Icon.png';
      try { console.warn('Image failed to load, applying fallback:', img.src, '->', fallbackSrc); } catch (_) {}
      img.setAttribute('data-src-failed', img.src || '');
      img.src = fallbackSrc;
    };
    img.addEventListener('error', handleError, { once: true });

    // If the image has already attempted to load and is broken, fix it immediately
    if (img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
      handleError();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // No icon swapping; keep default icons. Hover handled by CSS background circle.
  setupImageFallbacks();
  // Send icon changes with input state (Default -> Text), while staying centered and same size
  sendIconEl = document.querySelector('#send .send-icon');
  if (textarea) {
    // Clear any restored value to ensure initial state has no text
    textarea.value = '';
    autoResize();
  }
  updateSendIconByInput();
  if (textarea) {
    textarea.addEventListener('input', () => {
      autoResize();
      updateSendIconByInput();
    });
    
    // Handle Enter key press for sending messages
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Additional handler for better Chinese input support
    textarea.addEventListener('compositionstart', function() {
      textarea.setAttribute('data-composing', 'true');
    });
    
    textarea.addEventListener('compositionend', function() {
      textarea.removeAttribute('data-composing');
    });
  }
  
  // Handle send button click
  if (sendBtn) {
    sendBtn.addEventListener('click', function(e) {
      e.preventDefault();
      sendMessage();
    });
  }
  
  // Handle form submission
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      sendMessage();
    });
  }

  // Initialize Lottie animation
  setTimeout(initListenAnimation, 100); // Initialize animation after a short delay
  
  // Initialize chat search functionality
  initChatSearch();
  
  // Initialize user popup menu
  initUserPopup();
  
  // Initialize settings modal
  initSettingsModal();
  // Initialize change password modal
  initChangePasswordModal();
  


  // Initialize project list with Project 1
  if (projectListEl) {
    projectListEl.innerHTML = '';
    // Create Project 1 by default
    createProject('Project 1');
    // createProject already sets currentProjectId and initializes chat history
    nextProjectIndex = 2; // Next project will be Project 2
  }
  if (newProjectBtn && projectListEl) {
    newProjectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const projectName = `Project ${nextProjectIndex}`;
      createProject(projectName);
      nextProjectIndex += 1;
    });
  }

  // Sidebar collapse/expand
  const toggleSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.toggle('sidebar--collapsed');
  };
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
  }
  if (sidebarLogoBtn) {
    sidebarLogoBtn.addEventListener('click', toggleSidebar);
    sidebarLogoBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSidebar();
      }
    });
  }

  // Close overlays when clicking outside
  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => closeAllModals());
  }

  // File upload functionality
  const addButton = document.querySelector('.add-button');
  const fileInput = document.getElementById('file-upload');
  
  if (addButton && fileInput) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    });
  }

  // Search Project functionality
  const searchInput = document.getElementById('search-project-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchResults = document.getElementById('search-results');
  
  if (searchInput && searchDropdown && searchResults) {
    // Show dropdown on focus
    searchInput.addEventListener('focus', () => {
      updateSearchResults();
      searchDropdown.classList.add('is-open');
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove('is-open');
        selectedSearchIndex = -1;
      }
    });
    
    // Real-time search on input
    searchInput.addEventListener('input', () => {
      selectedSearchIndex = -1;
      updateSearchResults();
      if (!searchDropdown.classList.contains('is-open')) {
        searchDropdown.classList.add('is-open');
      }
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      const resultItems = searchResults.querySelectorAll('.search-result-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSearchIndex = Math.min(selectedSearchIndex + 1, resultItems.length - 1);
        updateSearchSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSearchIndex = Math.max(selectedSearchIndex - 1, -1);
        updateSearchSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSearchIndex >= 0 && resultItems[selectedSearchIndex]) {
          const projectName = resultItems[selectedSearchIndex].textContent;
          navigateToProject(projectName);
        }
      } else if (e.key === 'Escape') {
        searchDropdown.classList.remove('is-open');
        searchInput.blur();
        selectedSearchIndex = -1;
      }
    });
  }

  // Voice dictation functionality
  const microphoneBtn = document.querySelector('.icon-button[aria-label="Microphone"]');
  const voiceInterface = document.getElementById('voice-dictation-interface');
  const voiceCancelBtn = document.getElementById('voice-cancel-btn');
  const voiceConfirmBtn = document.getElementById('voice-confirm-btn');
  const chatInputArea = document.querySelector('.chat-input-area');
  let isListening = false;
  let recognition = null;
  let voiceTranscript = '';
  
  if (microphoneBtn && voiceInterface) {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-TW'; // Traditional Chinese
      
      recognition.onstart = function() {
        isListening = true;
        showVoiceInterface();
      };
      
      recognition.onresult = function(event) {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          voiceTranscript = finalTranscript;
        }
      };
      
      recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        hideVoiceInterface();
      };
      
      recognition.onend = function() {
        isListening = false;
        hideVoiceInterface();
      };
    }
    
    // Microphone button click
    microphoneBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startVoiceRecognition();
    });
    
    // Cancel button click
    voiceCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cancelVoiceRecognition();
    });
    
    // Confirm button click
    voiceConfirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      confirmVoiceRecognition();
    });
  }
  
  function startVoiceRecognition() {
    if (!recognition) {
      alert('語音識別功能不支援此瀏覽器');
      return;
    }
    
    voiceTranscript = '';
    recognition.start();
  }
  
  function cancelVoiceRecognition() {
    if (recognition && isListening) {
      recognition.stop();
    }
    voiceTranscript = '';
    hideVoiceInterface();
  }
  
  function confirmVoiceRecognition() {
    // Change to transcribing state
    showTranscribingState();
    
    // Simulate transcribing delay
    setTimeout(() => {
      if (voiceTranscript) {
        textarea.value = voiceTranscript;
        autoResize();
        updateSendIconByInput();
      }
      
      if (recognition && isListening) {
        recognition.stop();
      }
      hideVoiceInterface();
    }, 1500); // 1.5 second transcribing simulation
  }
  
  // Initialize Lottie animations
  let listenAnimation = null;
  let loadingAnimation = null;
  
  // Debug function to check icon status
  function debugIconStatus() {
    const voiceIcon = document.getElementById('listen-animation');
    const staticIcon = document.getElementById('listen-static-icon');
    console.log('=== Icon Debug Status ===');
    console.log('Voice icon container:', voiceIcon);
    console.log('Static icon element:', staticIcon);
    if (staticIcon) {
      console.log('Static icon display style:', staticIcon.style.display);
      console.log('Static icon computed style:', window.getComputedStyle(staticIcon).display);
    }
    if (voiceIcon) {
      console.log('Voice icon innerHTML:', voiceIcon.innerHTML);
    }
    console.log('Listen animation:', listenAnimation);
    console.log('========================');
  }
  
  function initLoadingAnimation(container) {
    console.log('initLoadingAnimation called with container:', container);
    console.log('Window.lottie available:', !!window.lottie);
    
    if (!container || !window.lottie) {
      console.log('Loading animation: container or lottie not available');
      return null;
    }
    
    try {
      console.log('Creating loading animation...');
      
      // Create a temporary container for the animation, don't clear existing content yet
      const animationDiv = document.createElement('div');
      animationDiv.style.cssText = 'width: 20px; height: 20px; position: absolute; top: 0; left: 0;';
      
      const animation = lottie.loadAnimation({
        container: animationDiv,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/icon/loading.json',
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet'
        }
      });
      
      animation.addEventListener('DOMLoaded', function() {
        console.log('Loading animation DOMLoaded - replacing static image');
        // Only now clear the container and add the animation
        container.innerHTML = '';
        container.appendChild(animationDiv);
      });
      
      animation.addEventListener('data_ready', function() {
        console.log('Loading animation data_ready');
      });
      
      animation.addEventListener('loaded', function() {
        console.log('Loading animation fully loaded');
      });
      
      animation.addEventListener('error', function(error) {
        console.error('Loading animation error - keeping static image:', error);
        // Don't replace the static image on error
      });
      
      // Check animation status after 2 seconds
      setTimeout(() => {
        if (animation && animation.isLoaded) {
          console.log('Loading animation working properly');
        } else {
          console.log('Loading animation failed to load, static image remains');
        }
      }, 2000);
      
      console.log('Loading animation created:', animation);
      return animation;
    } catch (error) {
      console.error('Error creating loading animation:', error);
      return null;
    }
  }

  function initListenAnimation() {
    const animationContainer = document.getElementById('listen-animation');
    const staticIcon = document.getElementById('listen-static-icon');
    
    console.log('Initializing listen animation...');
    console.log('Lottie available:', !!window.lottie);
    console.log('Animation container:', animationContainer);
    console.log('Static icon:', staticIcon);
    
    if (animationContainer && window.lottie) {
      try {
        // Clear any existing animation first
        if (listenAnimation) {
          listenAnimation.destroy();
          listenAnimation = null;
        }
        
        listenAnimation = lottie.loadAnimation({
          container: animationContainer,
          renderer: 'svg',
          loop: true,
          autoplay: false,
          path: 'assets/icon/listen.json',
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet'
          }
        });
        
        listenAnimation.addEventListener('DOMLoaded', function() {
          console.log('Listen animation DOMLoaded');
          if (staticIcon) {
            staticIcon.style.display = 'none';
          }
        });
        
        listenAnimation.addEventListener('data_ready', function() {
          console.log('Listen animation data_ready');
          if (staticIcon) {
            staticIcon.style.display = 'none';
          }
        });
        
        listenAnimation.addEventListener('loaded', function() {
          console.log('Listen animation loaded');
          if (staticIcon) {
            staticIcon.style.display = 'none';
          }
        });
        
        listenAnimation.addEventListener('error', function(error) {
          console.error('Listen animation error:', error);
          if (staticIcon) {
            staticIcon.style.display = 'block';
          }
        });
        
        // Check if animation is working after 2 seconds
        setTimeout(() => {
          if (listenAnimation) {
            console.log('Animation status check:', {
              isLoaded: listenAnimation.isLoaded,
              totalFrames: listenAnimation.totalFrames,
              currentFrame: listenAnimation.currentFrame
            });
            
            if (listenAnimation.isLoaded && staticIcon) {
              staticIcon.style.display = 'none';
            } else if (staticIcon) {
              console.log('Animation not ready, showing static icon');
              staticIcon.style.display = 'block';
            }
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error initializing listen animation:', error);
        if (staticIcon) {
          staticIcon.style.display = 'block';
        }
      }
    } else {
      console.log('Lottie not available or container missing, using static icon');
      if (staticIcon) {
        staticIcon.style.display = 'block';
      }
    }
  }
  
  function showVoiceInterface() {
    chatInputArea.classList.add('voice-active');
    voiceInterface.classList.add('is-active');
    
    // Ensure text is set to "Listening"
    const voiceText = document.querySelector('.voice-text');
    if (voiceText) {
      voiceText.textContent = 'Listening';
    }
    
    // Ensure Done button is normal
    const confirmBtn = document.querySelector('.voice-confirm-btn img');
    if (confirmBtn) {
      confirmBtn.src = 'assets/btn/Done.png';
    }
    
    // Ensure listen icon is visible
    const voiceIcon = document.getElementById('listen-animation');
    const staticIcon = document.getElementById('listen-static-icon');
    
    console.log('showVoiceInterface - voiceIcon:', voiceIcon);
    console.log('showVoiceInterface - staticIcon:', staticIcon);
    
    // Clean up any loading content first
    if (voiceIcon) {
      const loadingIcon = voiceIcon.querySelector('#loading-icon');
      if (loadingIcon) {
        loadingIcon.remove();
        console.log('Removed loading icon from voice interface');
      }
    }
    
    // Show static icon as immediate fallback
    if (staticIcon) {
      staticIcon.style.display = 'block';
      console.log('Static listen icon set to display');
    }
    
    // Debug icon status
    setTimeout(debugIconStatus, 200);
    
    // Try to play animation if available
    if (listenAnimation && typeof listenAnimation.play === 'function') {
      console.log('Playing listen animation');
      setTimeout(() => {
        try {
          listenAnimation.play();
          if (staticIcon) {
            staticIcon.style.display = 'none';
          }
        } catch (e) {
          console.log('Failed to play animation, keeping static icon');
          if (staticIcon) {
            staticIcon.style.display = 'block';
          }
        }
      }, 100);
    } else {
      console.log('Listen animation not available, using static icon');
    }
  }
  
  function hideVoiceInterface() {
    chatInputArea.classList.remove('voice-active');
    voiceInterface.classList.remove('is-active');
    
    // Stop animations
    if (listenAnimation && typeof listenAnimation.stop === 'function') {
      console.log('Stopping listen animation');
      listenAnimation.stop();
    } else {
      console.log('Listen animation not available for stop');
    }
    
    if (loadingAnimation) {
      console.log('Stopping loading animation');
      loadingAnimation.destroy();
      loadingAnimation = null;
    }
    
    // Reset to listening state when hiding
    resetToListeningState();
  }
  
  function showTranscribingState() {
    const voiceText = document.querySelector('.voice-text');
    const voiceIcon = document.getElementById('listen-animation');
    const staticIcon = document.getElementById('listen-static-icon');
    const confirmBtn = document.querySelector('.voice-confirm-btn img');
    
    console.log('showTranscribingState - voiceIcon:', voiceIcon);
    console.log('showTranscribingState - staticIcon:', staticIcon);
    
    // Change text to "Transcribing"
    if (voiceText) {
      voiceText.textContent = 'Transcribing';
    }
    
    // Change icon to loading
    if (voiceIcon) {
      // Stop any listen animation first
      if (listenAnimation && typeof listenAnimation.stop === 'function') {
        listenAnimation.stop();
      }
      
      // Hide static icon if it exists
      if (staticIcon) {
        staticIcon.style.display = 'none';
      }
      
      // Clear any existing content
      const existingLoading = voiceIcon.querySelector('#loading-icon');
      if (existingLoading) {
        existingLoading.remove();
      }
      
      // Create loading animation container
      const loadingContainer = document.createElement('div');
      loadingContainer.id = 'loading-icon';
      loadingContainer.style.cssText = 'width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;';
      voiceIcon.appendChild(loadingContainer);
      
      console.log('Loading container created and added to DOM');
      
      // First show static image immediately as fallback
      loadingContainer.innerHTML = '<img src="assets/icon/loading.png" alt="Loading" style="width: 20px; height: 20px; animation: spin 1s linear infinite;">';
      console.log('Static loading image added as immediate fallback');
      
      // Try to initialize loading animation
      loadingAnimation = initLoadingAnimation(loadingContainer);
      
      // If animation loads successfully, it will replace the static image
      if (loadingAnimation) {
        loadingAnimation.addEventListener('DOMLoaded', function() {
          console.log('Loading animation loaded, replacing static image');
          // The animation will automatically replace the innerHTML
        });
        
        loadingAnimation.addEventListener('error', function() {
          console.log('Loading animation error, keeping static image');
          loadingContainer.innerHTML = '<img src="assets/icon/loading.png" alt="Loading" style="width: 20px; height: 20px; animation: spin 1s linear infinite;">';
        });
      }
    }
    
    // Change Done button to Done_Default
    if (confirmBtn) {
      confirmBtn.src = 'assets/btn/Done_Default.png';
    }
  }
  
  function resetToListeningState() {
    const voiceText = document.querySelector('.voice-text');
    const voiceIcon = document.getElementById('listen-animation');
    const staticIcon = document.getElementById('listen-static-icon');
    const confirmBtn = document.querySelector('.voice-confirm-btn img');
    
    console.log('resetToListeningState - voiceIcon:', voiceIcon);
    console.log('resetToListeningState - staticIcon:', staticIcon);
    
    // Reset text to "Listening"
    if (voiceText) {
      voiceText.textContent = 'Listening';
    }
    
    // Reset icon to listen state
    if (voiceIcon) {
      // Stop and cleanup loading animation
      if (loadingAnimation) {
        loadingAnimation.destroy();
        loadingAnimation = null;
      }
      
      // Remove any loading containers
      const loadingIcon = voiceIcon.querySelector('#loading-icon');
      if (loadingIcon) {
        loadingIcon.remove();
        console.log('Removed loading icon during reset');
      }
      
      // Ensure static icon is visible immediately
      if (staticIcon) {
        staticIcon.style.display = 'block';
        console.log('Static listen icon restored during reset');
      } else {
        console.error('Static listen icon not found during reset!');
      }
      
      // Try to restart animation if available
      if (listenAnimation && typeof listenAnimation.play === 'function') {
        setTimeout(() => {
          try {
            console.log('Attempting to restart listen animation');
            if (staticIcon) {
              staticIcon.style.display = 'none';
            }
            listenAnimation.goToAndPlay(0);
          } catch (e) {
            console.log('Animation restart failed, using static icon:', e);
            if (staticIcon) {
              staticIcon.style.display = 'block';
            }
          }
        }, 100);
      } else {
        console.log('No animation available, re-initializing...');
        // Re-initialize animation if not available
        setTimeout(initListenAnimation, 200);
      }
    }
    
    // Reset Done button to normal Done
    if (confirmBtn) {
      confirmBtn.src = 'assets/btn/Done.png';
    }
  }

  // Model selector functionality
  const modelSelector = document.getElementById('model-selector');
  const modelDropdown = document.getElementById('model-dropdown');
  const currentModelIcon = document.getElementById('current-model-icon');
  const currentModelName = document.getElementById('current-model-name');
  
  if (modelSelector && modelDropdown) {
    // Toggle dropdown on click
    modelSelector.addEventListener('click', (e) => {
      e.stopPropagation();
      modelDropdown.classList.toggle('is-open');
      modelSelector.classList.toggle('is-open');
      
      // Update selected state
      updateModelSelection();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!modelSelector.contains(e.target)) {
        modelDropdown.classList.remove('is-open');
        modelSelector.classList.remove('is-open');
      }
    });
    
    // Handle model option clicks
    modelDropdown.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      const modelOption = e.target.closest('.model-option');
      if (modelOption) {
        const modelId = modelOption.getAttribute('data-model');
        const modelIcon = modelOption.getAttribute('data-icon');
        const modelName = modelOption.querySelector('span').textContent;
        
        // Update current model
        currentModel = {
          id: modelId,
          name: modelName,
          icon: modelIcon
        };
        
        // Update UI
        currentModelIcon.src = modelIcon;
        currentModelName.textContent = modelName;
        
        // Close dropdown immediately
        modelDropdown.classList.remove('is-open');
        modelSelector.classList.remove('is-open');
        
        // Update selection in dropdown
        updateModelSelection();
      }
    });
  }
});

/* Dropdown and modals logic */
function attachProjectDropdown(listItem, moreBtn, linkEl) {
  // Create dropdown element
  const dropdown = document.createElement('div');
  dropdown.className = 'project-dropdown';
  dropdown.innerHTML = `
    <ul class="project-menu">
      <li class="project-menu-item" data-action="share"><img src="assets/icon/Share.png?v=${ASSET_VER}" alt="Share"><span>Share</span></li>
      <li class="project-menu-item has-submenu" data-action="export"><img src="assets/icon/export.png?v=${ASSET_VER}" alt="Export"><span>Export</span></li>
      <li class="project-menu-item" data-action="rename"><img src="assets/icon/rename.png?v=${ASSET_VER}" alt="Rename"><span>Rename</span></li>
      <li class="project-menu-item" data-action="archive"><img src="assets/icon/archive.png?v=${ASSET_VER}" alt="Archive"><span>Archive</span></li>
      <li class="project-menu-item danger" data-action="delete"><img src="assets/icon/Delete.png?v=${ASSET_VER}" alt="Delete"><span>Delete</span></li>
    </ul>
  `;
  listItem.appendChild(dropdown);

  // Position dropdown to the right/below of more icon
  function positionDropdown() {
    // Use viewport coordinates to place a fixed dropdown at the right side of the button
    const rect = moreBtn.getBoundingClientRect();
    const top = rect.top - 6; // slight nudge upward
    const left = rect.right + 8; // 8px to the right of the button
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  }

  function toggleDropdown(show) {
    if (show === undefined) {
      dropdown.classList.toggle('is-open');
    } else if (show) {
      dropdown.classList.add('is-open');
    } else {
      dropdown.classList.remove('is-open');
    }
    if (dropdown.classList.contains('is-open')) {
      positionDropdown();
      document.addEventListener('click', onDocClick, { capture: true });
    } else {
      document.removeEventListener('click', onDocClick, { capture: true });
      closeExportSubmenu();
    }
  }

  function onDocClick(e) {
    if (!dropdown.contains(e.target) && e.target !== moreBtn) {
      toggleDropdown(false);
    }
  }

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Export submenu
  let exportSubmenu;
  function ensureExportSubmenu() {
    if (exportSubmenu) return exportSubmenu;
    exportSubmenu = document.createElement('div');
    exportSubmenu.className = 'project-submenu';
    exportSubmenu.innerHTML = `
      <ul class="project-menu">
        <li class="project-menu-item" data-format="md">Markdown (.md)</li>
        <li class="project-menu-item" data-format="pdf">PDF (.pdf)</li>
        <li class="project-menu-item" data-format="txt">Text (.txt)</li>
      </ul>
    `;
    dropdown.appendChild(exportSubmenu);
    return exportSubmenu;
  }
  function openExportSubmenu(anchorEl) {
    const sm = ensureExportSubmenu();
    sm.classList.add('is-open');
  }
  function closeExportSubmenu() {
    if (exportSubmenu) exportSubmenu.classList.remove('is-open');
  }

  dropdown.addEventListener('click', (ev) => {
    const item = ev.target.closest('.project-menu-item');
    if (!item) return;
    const action = item.getAttribute('data-action');
    if (action === 'export') {
      openExportSubmenu(item);
      return;
    }
    toggleDropdown(false);
    switch (action) {
      case 'share':
        openShareModal(linkEl.textContent.trim());
        break;
      case 'rename':
        // Inline rename instead of modal
        startInlineRename(listItem, linkEl);
        break;
      case 'archive':
        archiveProject(listItem);
        break;
      case 'delete':
        confirmDelete(listItem);
        break;
      default:
        break;
    }
  });

  // Click export format
  dropdown.addEventListener('click', (ev) => {
    const fmtItem = ev.target.closest('.project-submenu .project-menu-item');
    if (!fmtItem) return;
    const format = fmtItem.getAttribute('data-format');
    simulateDownload(linkEl.textContent.trim(), format);
    toggleDropdown(false);
  });
}

function openShareModal(projectName) {
  if (!modalOverlay) return;
  
  // Generate a real shareable URL based on current location
  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${encodeURIComponent(projectName)}&id=${Date.now()}`;
  
  modalOverlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="modal-title">Share project</div>
        <button class="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:12px;">Share link for <strong>${projectName}</strong></div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input class="input" id="share-url" value="${shareUrl}" readonly style="flex:1; min-width:0;">
          <button class="btn" id="copy-link" style="white-space:nowrap;">Copy Link</button>
        </div>
        <div id="copy-feedback" style="margin-top:12px; color:#059669; font-size:12px; display:none;">✓ Link copied to clipboard</div>
      </div>
    </div>
  `;
  modalOverlay.classList.add('is-open');
  modalOverlay.querySelector('.modal-close').addEventListener('click', closeAllModals);
  
  const copyBtn = modalOverlay.querySelector('#copy-link');
  const input = modalOverlay.querySelector('#share-url');
  const feedback = modalOverlay.querySelector('#copy-feedback');
  
  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Copy button clicked');
    
    // Force focus and select the input
    input.focus();
    input.select();
    input.setSelectionRange(0, 99999);
    
    // Always show feedback regardless of copy success
    showCopyFeedback();
    
    // Try to copy in background
    setTimeout(() => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(input.value).then(() => {
            console.log('Modern clipboard copy successful');
          }).catch(err => {
            console.log('Modern clipboard failed, trying fallback:', err);
            document.execCommand('copy');
          });
        } else {
          console.log('Using fallback copy method');
          document.execCommand('copy');
        }
      } catch (err) {
        console.error('All copy methods failed:', err);
      }
    }, 0);
    
    function showCopyFeedback() {
      console.log('Showing copy feedback - element exists:', !!feedback);
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#059669';
        feedback.style.fontSize = '12px';
        feedback.style.marginTop = '12px';
        feedback.textContent = '✓ Link copied to clipboard';
        console.log('Feedback element styled and shown');
        
        setTimeout(() => {
          console.log('Hiding feedback after 3 seconds');
          if (feedback && feedback.style.display === 'block') {
            feedback.style.display = 'none';
          }
        }, 3000);
      } else {
        console.error('Feedback element not found!');
      }
    }
  });
}

function startInlineRename(listItem, linkEl) {
  const originalName = linkEl.textContent.trim();

  // Create input overlaying the link
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalName;
  input.className = 'project-rename-input';
  input.setAttribute('aria-label', 'Rename project');

  // Replace link with input visually (keep link in DOM for metrics if needed)
  linkEl.style.display = 'none';
  listItem.classList.add('is-renaming');
  listItem.insertBefore(input, linkEl.nextSibling);
  input.focus();
  input.select();

  const finish = (commit) => {
    const newName = input.value.trim();
    input.remove();
    linkEl.style.display = '';
    listItem.classList.remove('is-renaming');
    if (!commit || !newName || newName === originalName) return;

    // Update link text
    linkEl.textContent = newName;

    // Move history key if changed
    if (projectChatHistory[originalName] && !projectChatHistory[newName]) {
      projectChatHistory[newName] = projectChatHistory[originalName];
      delete projectChatHistory[originalName];
    }

    // Update currentProjectId if renaming the current one
    if (currentProjectId === originalName) {
      currentProjectId = newName;
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
}

function confirmDelete(listItem) {
  if (!modalOverlay) return;
  const name = listItem.querySelector('a').textContent.trim();
  modalOverlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <div class="modal-title">Delete project</div>
        <button class="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        Are you sure you want to delete <strong>${name}</strong>?
        <div class="modal-actions">
          <button class="btn" id="del-cancel">Cancel</button>
          <button class="btn danger" id="del-confirm">Delete</button>
        </div>
      </div>
    </div>
  `;
  modalOverlay.classList.add('is-open');
  modalOverlay.querySelector('.modal-close').addEventListener('click', closeAllModals);
  modalOverlay.querySelector('#del-cancel').addEventListener('click', closeAllModals);
  modalOverlay.querySelector('#del-confirm').addEventListener('click', () => {
    listItem.remove();
    closeAllModals();
  });
}

function archiveProject(listItem) {
  listItem.classList.add('archived');
}

function simulateDownload(projectName, format) {
  const blob = new Blob([`Export of ${projectName} as ${format.toUpperCase()}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function closeAllModals() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('is-open');
  modalOverlay.innerHTML = '';
}

// Project management functions
function createProject(projectName) {
  if (!projectListEl) return;
  
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = projectName;
  li.appendChild(a);
  
  // add more button (image)
  const moreBtn = document.createElement('button');
  moreBtn.className = 'project-more';
  moreBtn.type = 'button';
  moreBtn.setAttribute('aria-label', 'More actions');
  const moreImg = document.createElement('img');
  moreImg.src = `assets/icon/more.png?v=${ASSET_VER}`;
  moreImg.alt = 'More';
  moreImg.width = 24;
  moreImg.height = 24;
  moreBtn.appendChild(moreImg);
  li.appendChild(moreBtn);
  
  // Initialize empty chat history for this project
  projectChatHistory[projectName] = [];
  
  // select on click and switch project
  a.addEventListener('click', (ev) => {
    ev.preventDefault();
    switchToProject(projectName, li);
  });
  
  // attach dropdown to more button
  attachProjectDropdown(li, moreBtn, a);
  projectListEl.appendChild(li);
  
  // Auto-select the new project
  switchToProject(projectName, li);
}

function switchToProject(projectName, listItem) {
  // Save current chat to previous project
  if (currentProjectId) {
    saveCurrentChatHistory();
  }
  
  // Switch to new project
  currentProjectId = projectName;
  
  // Update visual selection
  projectListEl.querySelectorAll('li').forEach((n) => n.classList.remove('selected'));
  listItem.classList.add('selected');
  
  // Load chat history for this project
  loadChatHistory(projectName);
}

function saveCurrentChatHistory() {
  if (!currentProjectId) return;
  
  const chatBubbles = chatLog.querySelectorAll('.chat-bubble');
  const history = [];
  
  chatBubbles.forEach(bubble => {
    if (bubble.classList.contains('user-bubble')) {
      const text = bubble.querySelector('p').textContent;
      history.push({ type: 'user', message: text });
    } else if (bubble.classList.contains('ai-bubble')) {
      const text = bubble.querySelector('.bubble-content p').textContent;
      history.push({ type: 'ai', message: text });
    }
  });
  
  projectChatHistory[currentProjectId] = history;
}

function loadChatHistory(projectName) {
  // Clear current chat
  chatLog.innerHTML = '';
  
  // Load history for this project
  const history = projectChatHistory[projectName] || [];
  
  history.forEach(item => {
    if (item.type === 'user') {
      addUserMessage(item.message, false); // false = don't save to history
    } else if (item.type === 'ai') {
      // Temporarily store current model
      const originalModel = {...currentModel};
      
      // Use the model from the saved message if available
      if (item.model) {
        currentModel = item.model;
      }
      
      addAIMessage(item.message, false); // false = don't save to history
      
      // Restore current model
      currentModel = originalModel;
    }
  });
  
  // Scroll to bottom
  scrollToBottom();
}

// Chat messaging functions
function sendMessage() {
  // Check if still in composition mode (Chinese input)
  if (textarea.hasAttribute('data-composing')) {
    return;
  }
  
  const message = textarea.value.trim();
  if (!message) return;
  
  // Add user message
  addUserMessage(message);
  
  // Clear input
  textarea.value = '';
  autoResize();
  updateSendIconByInput();
  
  // Scroll to bottom
  scrollToBottom();
  
  // Generate AI response after delay
  setTimeout(() => {
    addAIMessage(generateAIResponse(message));
    scrollToBottom();
  }, 1000 + Math.random() * 1000); // 1-2 second delay
}

// Add user message bubble
function addUserMessage(message, saveToHistory = true) {
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user-bubble';
  userBubble.innerHTML = `<p>${escapeHtml(message)}</p>`;
  chatLog.appendChild(userBubble);
  
  // Save to current project's history
  if (saveToHistory && currentProjectId) {
    if (!projectChatHistory[currentProjectId]) {
      projectChatHistory[currentProjectId] = [];
    }
    projectChatHistory[currentProjectId].push({ type: 'user', message: message });
  }
}

// Add AI message bubble
function addAIMessage(message, saveToHistory = true) {
  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-bubble ai-bubble';
  aiBubble.innerHTML = `
    <div class="bubble-header">
      <img src="${currentModel.icon}" alt="${currentModel.name} Icon">
      <span>${currentModel.name}</span>
    </div>
    <div class="bubble-content">
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="bubble-toolbar">
      <button class="icon-button toolbar-button" aria-label="Copy">
        <span class="icon-wrap">
          <img src="assets/btn/Copy_Default.png" alt="Copy">
        </span>
        <span class="hover-label">Copy</span>
      </button>
      <button class="icon-button toolbar-button" aria-label="Share">
        <span class="icon-wrap">
          <img src="assets/btn/Share_Default-1.png" alt="Share">
        </span>
        <span class="hover-label">Share</span>
      </button>
      <button class="icon-button toolbar-button" aria-label="Refresh">
        <span class="icon-wrap">
          <img src="assets/btn/Refresh_Default.png" alt="Refresh">
        </span>
        <span class="hover-label">Refresh</span>
      </button>
    </div>
  `;
  chatLog.appendChild(aiBubble);
  
  // Save to current project's history with model info
  if (saveToHistory && currentProjectId) {
    if (!projectChatHistory[currentProjectId]) {
      projectChatHistory[currentProjectId] = [];
    }
    projectChatHistory[currentProjectId].push({ 
      type: 'ai', 
      message: message,
      model: {
        id: currentModel.id,
        name: currentModel.name,
        icon: currentModel.icon
      }
    });
  }
}

// Generate AI response based on user input
function generateAIResponse(userMessage) {
  const modelSpecificGreeting = getModelGreeting();
  
  const responses = [
    "I understand your question. Let me provide you with a comprehensive answer that addresses your concerns.",
    "That's a great question! Based on the information you've provided, here's what I can help you with.",
    "I can definitely assist you with that. Here are some key points to consider:",
    "Thank you for reaching out. I've analyzed your request and here's my response:",
    "I appreciate you sharing that with me. Let me break this down for you:",
    "That's an interesting point you've raised. Here's my perspective on this topic:",
    "I see what you're asking about. Let me provide you with some useful insights:",
    "Based on your message, I can offer the following guidance and information:"
  ];
  
  // Simple response selection based on message content
  if (userMessage.toLowerCase().includes('help')) {
    return "I'm here to help! Please let me know what specific assistance you need, and I'll do my best to provide you with accurate and helpful information.";
  } else if (userMessage.toLowerCase().includes('question')) {
    return "I'd be happy to answer your question. Please provide more details so I can give you the most relevant and useful response.";
  } else if (userMessage.toLowerCase().includes('thank')) {
    return "You're very welcome! I'm glad I could help. If you have any other questions or need further assistance, please don't hesitate to ask.";
  } else if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
    return modelSpecificGreeting;
  } else if (userMessage.toLowerCase().includes('how are you')) {
    return "I'm doing well, thank you for asking! I'm ready to help you with whatever you need. What can I assist you with today?";
  } else {
    // Random response for general messages
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

function getModelGreeting() {
  const modelName = currentModel.name;
  if (modelName.includes('GPT')) {
    return `Hello! I'm ${modelName}, and I'm here to assist you with any questions or tasks you might have. How can I help you today?`;
  } else if (modelName.includes('Gemini')) {
    return `Hi there! I'm ${modelName} from Google. I'm ready to help you with a wide range of tasks and questions. What would you like to explore today?`;
  } else if (modelName.includes('Claude')) {
    return `Hello! I'm ${modelName} from Anthropic. I'm designed to be helpful, harmless, and honest. How can I assist you today?`;
  } else if (modelName.includes('Mistral')) {
    return `Bonjour! I'm ${modelName}. I'm here to help you with various tasks and provide thoughtful responses. What can I do for you today?`;
  } else {
    return `Hello! I'm ${modelName}, and I'm here to assist you with any questions or tasks you might have. How can I help you today?`;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// File upload handling
function handleFileUpload(files) {
  Array.from(files).forEach(file => {
    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2); // Convert to MB
    const fileType = file.type;
    
    // Create a message showing the uploaded file
    const fileInfo = `📎 Uploaded: ${fileName} (${fileSize} MB)`;
    addUserMessage(fileInfo);
    
    // Scroll to bottom
    scrollToBottom();
    
    // Generate AI response for file upload
    setTimeout(() => {
      let response = "";
      if (fileType.startsWith('image/')) {
        response = `I can see you've uploaded an image file "${fileName}". I can help you analyze, describe, or work with this image. What would you like me to do with it?`;
      } else if (fileType.startsWith('video/')) {
        response = `You've uploaded a video file "${fileName}". I can help you with video-related tasks like extracting information, creating summaries, or providing guidance on video editing.`;
      } else if (fileType.startsWith('audio/')) {
        response = `I see you've uploaded an audio file "${fileName}". I can assist with audio-related tasks, transcription guidance, or audio processing suggestions.`;
      } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        response = `Great! You've uploaded a PDF document "${fileName}". I can help you summarize the content, extract key information, or answer questions about the document.`;
      } else if (fileType.includes('document') || fileName.toLowerCase().match(/\.(doc|docx|txt)$/)) {
        response = `You've uploaded a document "${fileName}". I can help you review, summarize, edit, or work with the content of this document.`;
      } else {
        response = `Thank you for uploading "${fileName}". I can help you work with this file or provide guidance on how to use it effectively.`;
      }
      
      addAIMessage(response);
      scrollToBottom();
    }, 1000 + Math.random() * 1000);
  });
  
  // Clear the file input for next upload
  document.getElementById('file-upload').value = '';
}

// Search functionality
function updateSearchResults() {
  const searchTerm = document.getElementById('search-project-input').value.toLowerCase().trim();
  const searchResults = document.getElementById('search-results');
  
  if (!searchResults) return;
  
  // Get all project names
  const projectNames = Object.keys(projectChatHistory);
  
  // Filter projects based on search term
  let filteredProjects;
  if (searchTerm === '') {
    // Show all projects when search is empty
    filteredProjects = projectNames;
  } else {
    // Filter projects based on search term (fuzzy search)
    filteredProjects = projectNames.filter(name => 
      name.toLowerCase().includes(searchTerm) || 
      fuzzyMatch(name.toLowerCase(), searchTerm)
    );
  }
  
  // Clear previous results
  searchResults.innerHTML = '';
  
  if (filteredProjects.length === 0 && searchTerm !== '') {
    // Show "no results" message only when there's a search term
    const noResultsEl = document.createElement('div');
    noResultsEl.className = 'search-no-results';
    noResultsEl.textContent = 'No projects found';
    searchResults.appendChild(noResultsEl);
  } else if (filteredProjects.length > 0) {
    // Show filtered results
    filteredProjects.forEach((projectName, index) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'search-result-item';
      resultItem.textContent = projectName;
      resultItem.addEventListener('click', () => {
        navigateToProject(projectName);
      });
      searchResults.appendChild(resultItem);
    });
  }
}

function updateSearchSelection() {
  const resultItems = document.querySelectorAll('.search-result-item');
  resultItems.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedSearchIndex);
  });
}

function navigateToProject(projectName) {
  // Close search dropdown
  document.getElementById('search-dropdown').classList.remove('is-open');
  document.getElementById('search-project-input').value = '';
  selectedSearchIndex = -1;
  
  // Find the project list item and switch to it
  const projectLinks = document.querySelectorAll('#project-list a');
  for (const link of projectLinks) {
    if (link.textContent.trim() === projectName) {
      const listItem = link.closest('li');
      switchToProject(projectName, listItem);
      break;
    }
  }
}

function fuzzyMatch(text, pattern) {
  // Simple fuzzy matching algorithm
  if (pattern.length === 0) return true;
  if (text.length === 0) return false;
  
  let patternIndex = 0;
  for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
    if (text[i] === pattern[patternIndex]) {
      patternIndex++;
    }
  }
  return patternIndex === pattern.length;
}

// Model selection functions
function updateModelSelection() {
  const modelOptions = document.querySelectorAll('.model-option');
  modelOptions.forEach(option => {
    const modelId = option.getAttribute('data-model');
    option.classList.toggle('selected', modelId === currentModel.id);
  });
}

// Update send icon function (moved from DOMContentLoaded for global access)
function updateSendIconByInput() {
  if (!sendIconEl) return;
  const hasText = (textarea && textarea.value.trim().length > 0);
  const targetSrc = hasText ? 'assets/btn/Send_text.png' : 'assets/btn/Send_Default.png';
  if (sendIconEl.getAttribute('src') !== targetSrc) {
    sendIconEl.setAttribute('src', targetSrc);
  }
  const wrapper = document.getElementById('send');
  if (wrapper) {
    wrapper.classList.toggle('has-text', !!hasText);
  }
}

// Chat search functionality
function initChatSearch() {
  const chatSearchBtn = document.getElementById('chat-search-btn');
  const chatSearchDropdown = document.getElementById('chat-search-dropdown');
  const chatSearchInput = document.getElementById('chat-search-input');
  const chatSearchResults = document.getElementById('chat-search-results');

  if (!chatSearchBtn || !chatSearchDropdown || !chatSearchInput || !chatSearchResults) {
    console.warn('Chat search elements not found');
    return;
  }

  // Toggle dropdown on button click
  chatSearchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = chatSearchDropdown.classList.contains('is-open');
    if (isOpen) {
      closeChatSearch();
    } else {
      openChatSearch();
    }
  });

  // Search as user types
  chatSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    searchChatMessages(query);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!chatSearchDropdown.contains(e.target) && !chatSearchBtn.contains(e.target)) {
      closeChatSearch();
    }
  });

  // Handle keyboard navigation
  chatSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeChatSearch();
    }
  });

  function openChatSearch() {
    chatSearchDropdown.classList.add('is-open');
    chatSearchInput.focus();
    chatSearchInput.value = '';
    // Show all user messages initially
    displayAllUserMessages();
  }

  function closeChatSearch() {
    chatSearchDropdown.classList.remove('is-open');
    chatSearchInput.value = '';
    chatSearchResults.innerHTML = '';
  }

  function searchChatMessages(query) {
    if (!query) {
      displayAllUserMessages();
      return;
    }

    // Get current project's chat history
    const currentHistory = projectChatHistory[currentProjectId] || [];
    const results = [];

    // Search through USER messages only
    currentHistory.forEach((item, index) => {
      // Only search user messages, not AI responses
      if (item.type === 'user') {
        const message = item.message.toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (message.includes(queryLower)) {
          results.push({
            index: index,
            type: item.type,
            message: item.message,
            model: item.model || null
          });
        }
      }
    });

    displaySearchResults(results, query);
  }

  function displayAllUserMessages() {
    // Get current project's chat history
    const currentHistory = projectChatHistory[currentProjectId] || [];
    const userMessages = [];

    // Get all user messages
    currentHistory.forEach((item, index) => {
      if (item.type === 'user') {
        userMessages.push({
          index: index,
          type: item.type,
          message: item.message,
          model: item.model || null
        });
      }
    });

    if (userMessages.length === 0) {
      chatSearchResults.innerHTML = '<div class="chat-search-no-results">No messages in this project yet</div>';
      return;
    }

    displaySearchResults(userMessages, '');
  }

  function displaySearchResults(results, query) {
    if (results.length === 0) {
      chatSearchResults.innerHTML = '<div class="chat-search-no-results">No messages found</div>';
      return;
    }

    const resultsHtml = results.map(result => {
      const highlightedText = highlightText(result.message, query);
      
      return `
        <div class="chat-search-result-item" data-message-index="${result.index}">
          <div class="chat-search-result-meta">
            <span class="chat-search-result-type user">You</span>
          </div>
          <div class="chat-search-result-preview">${highlightedText}</div>
        </div>
      `;
    }).join('');

    chatSearchResults.innerHTML = resultsHtml;

    // Add click handlers to result items
    chatSearchResults.querySelectorAll('.chat-search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const messageIndex = parseInt(item.dataset.messageIndex);
        jumpToMessage(messageIndex);
        closeChatSearch();
      });
    });
  }

  function highlightText(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="chat-search-result-highlight">$1</span>');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function jumpToMessage(messageIndex) {
    // Find the message bubble in the chat log
    const chatBubbles = chatLog.querySelectorAll('.chat-bubble');
    
    if (messageIndex < chatBubbles.length) {
      const targetBubble = chatBubbles[messageIndex];
      
      // Scroll to the message
      targetBubble.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add highlight effect
      targetBubble.classList.add('highlighted');
      
      // Remove highlight after animation
      setTimeout(() => {
        targetBubble.classList.remove('highlighted');
      }, 2000);
    }
  }
}

// Settings Modal functionality
function openSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
}

function closeSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  if (settingsModal) {
    settingsModal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

function initSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  const settingsClose = document.getElementById('settings-close');
  const settingsNavItems = document.querySelectorAll('.settings-nav-item');
  const settingsTabs = document.querySelectorAll('.settings-tab');
  
  if (!settingsModal) return;
  
  // Close modal on close button click
  if (settingsClose) {
    settingsClose.addEventListener('click', closeSettingsModal);
  }
  
  // Close modal on overlay click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.classList.contains('is-open')) {
      closeSettingsModal();
    }
  });
  
  // Handle tab switching
  settingsNavItems.forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      const tabId = navItem.getAttribute('data-tab');
      
      // Update active nav item
      settingsNavItems.forEach(item => item.classList.remove('active'));
      navItem.classList.add('active');
      
      // Update active tab
      settingsTabs.forEach(tab => tab.classList.remove('active'));
      const targetTab = document.getElementById(`tab-${tabId}`);
      if (targetTab) {
        targetTab.classList.add('active');
      }
    });
  });
  
  // Handle settings actions
  const btnChange = document.querySelector('.btn-change');
  const btnManage = document.querySelector('.btn-manage');
  const btnArchiveAll = document.querySelector('.btn-archive-all');
  const editBtn = document.querySelector('.edit-btn');
  
  if (btnChange) {
    btnChange.addEventListener('click', () => {
      openChangePasswordModal();
    });
  }
  
  if (btnManage) {
    btnManage.addEventListener('click', () => {
      console.log('Manage archived projects clicked');
      // TODO: Implement archived projects management
    });
  }
  
  if (btnArchiveAll) {
    btnArchiveAll.addEventListener('click', () => {
      console.log('Archive all projects clicked');
      // TODO: Implement archive all functionality
    });
  }
  
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      console.log('Edit user info clicked');
      // TODO: Implement user info editing
    });
  }
  
  // Initialize settings selectors
  initSettingsModelSelector();
  initSettingsLanguageSelector();
}

// Settings Model Selector functionality
function initSettingsModelSelector() {
  const selector = document.getElementById('settings-model-selector');
  const dropdown = document.getElementById('settings-model-dropdown');
  const currentIcon = document.getElementById('settings-current-model-icon');
  const currentName = document.getElementById('settings-current-model-name');
  
  if (!selector || !dropdown) return;
  
  // Toggle dropdown
  selector.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('is-open');
    
    // Close all other dropdowns first
    document.querySelectorAll('.model-dropdown.is-open').forEach(dd => {
      if (dd !== dropdown) {
        dd.classList.remove('is-open');
        dd.parentElement.classList.remove('is-open');
      }
    });
    
    if (!isOpen) {
      dropdown.classList.add('is-open');
      selector.classList.add('is-open');
    } else {
      dropdown.classList.remove('is-open');
      selector.classList.remove('is-open');
    }
  });
  
  // Handle model selection
  dropdown.querySelectorAll('.model-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const modelValue = option.getAttribute('data-model');
      const iconSrc = option.getAttribute('data-icon');
      const modelText = option.querySelector('span').textContent;
      
      // Update display
      if (currentIcon) currentIcon.src = iconSrc;
      if (currentName) currentName.textContent = modelText;
      
      // Close dropdown
      dropdown.classList.remove('is-open');
      selector.classList.remove('is-open');
      
      // Sync with main model selector if needed
      console.log('Settings: Model changed to:', modelValue);
      // TODO: Sync with main app model selection
    });
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!selector.contains(e.target)) {
      dropdown.classList.remove('is-open');
      selector.classList.remove('is-open');
    }
  });
}

// Settings Language Selector functionality
function initSettingsLanguageSelector() {
  const selector = document.getElementById('settings-language-selector');
  const dropdown = document.getElementById('settings-language-dropdown');
  const currentLanguage = document.getElementById('settings-current-language');
  
  if (!selector || !dropdown) return;
  
  // Set initial state - show check for English
  const initialOption = dropdown.querySelector('[data-lang="en"]');
  if (initialOption) {
    const checkIcon = initialOption.querySelector('.check-icon');
    if (checkIcon) checkIcon.style.display = 'block';
  }
  
  // Toggle dropdown
  selector.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('is-open');
    
    // Close all other dropdowns first
    document.querySelectorAll('.language-dropdown.is-open, .model-dropdown.is-open').forEach(dd => {
      if (dd !== dropdown) {
        dd.classList.remove('is-open');
        dd.parentElement.classList.remove('is-open');
      }
    });
    
    if (!isOpen) {
      dropdown.classList.add('is-open');
      selector.classList.add('is-open');
    } else {
      dropdown.classList.remove('is-open');
      selector.classList.remove('is-open');
    }
  });
  
  // Handle language selection
  dropdown.querySelectorAll('.language-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const langValue = option.getAttribute('data-lang');
      const langText = option.querySelector('span').textContent;
      
      // Update display
      if (currentLanguage) currentLanguage.textContent = langText;
      
      // Update check icons
      dropdown.querySelectorAll('.check-icon').forEach(icon => {
        icon.style.display = 'none';
      });
      const checkIcon = option.querySelector('.check-icon');
      if (checkIcon) checkIcon.style.display = 'block';
      
      // Close dropdown
      dropdown.classList.remove('is-open');
      selector.classList.remove('is-open');
      
      console.log('Settings: Language changed to:', langValue);
      // TODO: Implement actual language change functionality
    });
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!selector.contains(e.target)) {
      dropdown.classList.remove('is-open');
      selector.classList.remove('is-open');
    }
  });
}

// Change Password Modal logic
function openChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  const current = document.getElementById('cp-current');
  if (current) current.focus();
}

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

function initChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (!modal) return;
  // Close when clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeChangePasswordModal();
  });
  // Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeChangePasswordModal();
    }
  });

  // Toggle visibility buttons
  modal.querySelectorAll('.cp-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      const img = btn.querySelector('img');
      if (img) {
        img.src = isPwd ? 'assets/icon/Eye_closed.png' : 'assets/icon/Eye.png';
      }
    });
  });

  // Submit handler with basic validation
  const form = document.getElementById('cp-form');
  const errorEl = document.getElementById('cp-error');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = document.getElementById('cp-current');
      const next = document.getElementById('cp-new');
      const confirm = document.getElementById('cp-confirm');
      const submitBtn = document.getElementById('cp-submit');
      errorEl.style.display = 'none';
      errorEl.textContent = '';
      
      const currentVal = current.value.trim();
      const newVal = next.value.trim();
      const confirmVal = confirm.value.trim();
      
      if (!currentVal || !newVal || !confirmVal) {
        errorEl.textContent = 'Please fill in all fields.';
        errorEl.style.display = 'block';
        return;
      }
      if (newVal.length < 8) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        errorEl.style.display = 'block';
        return;
      }
      if (newVal !== confirmVal) {
        errorEl.textContent = 'New password and confirm password do not match.';
        errorEl.style.display = 'block';
        return;
      }

      // Simulate async submit
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
      try {
        await new Promise(r => setTimeout(r, 1200));
        // Success
        closeChangePasswordModal();
        // Optionally show a toast/snackbar here
      } catch (err) {
        errorEl.textContent = 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change password';
        form.reset();
      }
    });
  }
}
// User popup menu functionality
function initUserPopup() {
  const userProfile = document.getElementById('user-profile');
  const userPopup = document.getElementById('user-popup');
  
  if (!userProfile || !userPopup) return;
  
  // Toggle popup on user profile click
  userProfile.addEventListener('click', (e) => {
    e.stopPropagation();
    userPopup.classList.toggle('is-open');
  });
  
  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!userPopup.contains(e.target) && !userProfile.contains(e.target)) {
      userPopup.classList.remove('is-open');
    }
  });
  
  // Handle menu item clicks
  const userMenuItems = userPopup.querySelectorAll('.user-menu-item');
  userMenuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const action = item.getAttribute('data-action');
      
      switch (action) {
        case 'setting':
          openSettingsModal();
          break;
        case 'logout':
          console.log('Logging out...');
          // TODO: Implement logout functionality
          break;
      }
      
      // Close popup after action
      userPopup.classList.remove('is-open');
    });
  });
}
