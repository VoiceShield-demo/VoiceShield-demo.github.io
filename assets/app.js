const audioPlayers = [...document.querySelectorAll('audio')];
const videoDialog = document.querySelector('#video-dialog');
const videoDialogPlayer = document.querySelector('#video-dialog-player');
const videoDialogTitle = document.querySelector('#video-dialog-title');
const videoDialogClose = document.querySelector('#video-dialog-close');
const videoDialogStatus = document.querySelector('#video-dialog-status');
const videoOpenButtons = [...document.querySelectorAll('[data-video-src]')];
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

async function loadVideo(source, requestToken) {
  if (requestToken !== videoRequestToken || !videoDialog?.open) return;

  // GitHub Pages advertises byte-range support, so the native player can
  // stream and seek without downloading the complete video up front.
  videoDialogPlayer.src = source;
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
    setVideoStatus('Loading video…');
    videoDialog.showModal();
    try {
      await loadVideo(source, requestToken);
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
