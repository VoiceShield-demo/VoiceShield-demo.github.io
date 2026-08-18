const audioPlayers = [...document.querySelectorAll('audio')];
const videoDialog = document.querySelector('#video-dialog');
const videoDialogPlayer = document.querySelector('#video-dialog-player');
const videoDialogTitle = document.querySelector('#video-dialog-title');
const videoDialogClose = document.querySelector('#video-dialog-close');
const videoDialogStatus = document.querySelector('#video-dialog-status');
const videoOpenButtons = [...document.querySelectorAll('[data-video-src]')];
const seekableVideoURLs = new Map();
let videoRequestToken = 0;

for (const player of audioPlayers) {
  player.addEventListener('play', () => {
    for (const otherPlayer of audioPlayers) {
      if (otherPlayer !== player && !otherPlayer.paused) otherPlayer.pause();
    }
  });
}

function closeVideoDialog() {
  if (!videoDialog?.open) return;
  videoDialog.close();
}

function setVideoStatus(message = '') {
  if (!videoDialogStatus) return;
  videoDialogStatus.textContent = message;
  videoDialogStatus.hidden = !message;
}

function waitForMetadata(player) {
  if (player.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      player.removeEventListener('loadedmetadata', handleReady);
      player.removeEventListener('error', handleError);
    };
    const handleReady = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('The video could not be decoded.'));
    };
    player.addEventListener('loadedmetadata', handleReady);
    player.addEventListener('error', handleError);
  });
}

async function loadSeekableVideo(source, requestToken) {
  let objectURL = seekableVideoURLs.get(source);
  if (!objectURL) {
    // Anonymous GitHub's video proxy does not advertise byte-range support.
    // Downloading once into a Blob gives the native player a local, fully
    // seekable source instead of a forward-only HTTP response.
    const response = await fetch(source, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error(`Video download failed (${response.status}).`);
    }
    const videoBlob = await response.blob();
    objectURL = URL.createObjectURL(videoBlob);
    seekableVideoURLs.set(source, objectURL);
  }
  if (requestToken !== videoRequestToken || !videoDialog?.open) return;

  videoDialogPlayer.src = objectURL;
  videoDialogPlayer.load();
  await waitForMetadata(videoDialogPlayer);
  if (requestToken !== videoRequestToken || !videoDialog?.open) return;
  setVideoStatus();
  videoDialogPlayer.play().catch(() => {
    // The player remains open with working controls if autoplay is blocked.
  });
}

for (const button of videoOpenButtons) {
  button.addEventListener('click', async () => {
    if (!videoDialog || !videoDialogPlayer) return;
    const source = button.dataset.videoSrc;
    if (!source) return;

    for (const audioPlayer of audioPlayers) audioPlayer.pause();
    videoDialogTitle.textContent = button.dataset.videoTitle || 'System demonstration';
    const requestToken = ++videoRequestToken;
    videoDialogPlayer.removeAttribute('src');
    videoDialogPlayer.load();
    setVideoStatus('Loading the complete video for seekable playback…');
    videoDialog.showModal();
    try {
      await loadSeekableVideo(source, requestToken);
    } catch (error) {
      if (requestToken !== videoRequestToken) return;
      setVideoStatus(error instanceof Error ? error.message : 'The video could not be loaded.');
    }
  });
}

videoDialogClose?.addEventListener('click', closeVideoDialog);
videoDialog?.addEventListener('click', (event) => {
  if (event.target === videoDialog) closeVideoDialog();
});
videoDialog?.addEventListener('close', () => {
  if (!videoDialogPlayer) return;
  videoRequestToken += 1;
  videoDialogPlayer.pause();
  videoDialogPlayer.removeAttribute('src');
  videoDialogPlayer.load();
  setVideoStatus();
});

window.addEventListener('pagehide', () => {
  for (const objectURL of seekableVideoURLs.values()) {
    URL.revokeObjectURL(objectURL);
  }
  seekableVideoURLs.clear();
});
