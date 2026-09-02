const BRIDGE = 'http://localhost:3455';
const APP_ORIGIN = 'https://seriesforge.online';

const $ = id => document.getElementById(id);

const state = {
  creator: null,
  file: null,
  localUrl: null,
  privacy: '',
  caption: '',
  comments: false,
  duet: false,
  stitch: false,
  commercial: false,
  brandOrganic: false,
  brandContent: false,
  aigc: false,
  posting: false
};

const privacyLabels = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me'
};

function status(message, kind = '') {
  const el = $('status');
  el.textContent = message;
  el.className = `status ${kind}`;
}

function setConnected(creator) {
  state.creator = creator;

  $('connectionDot').classList.add('ready');
  $('connectionText').textContent = creator.creator_nickname || 'TikTok connected';
  $('connectionHandle').textContent = creator.creator_username
    ? `@${creator.creator_username}`
    : '';
  $('connectBtn').textContent = 'Reconnect';

  $('summaryAccount').textContent = creator.creator_username
    ? `${creator.creator_nickname || 'TikTok'} (@${creator.creator_username})`
    : creator.creator_nickname || 'TikTok connected';

  const avatar = $('creatorAvatar');
  if (creator.creator_avatar_url) {
    avatar.src = creator.creator_avatar_url;
    avatar.hidden = false;
  }

  populatePrivacyOptions(creator.privacy_level_options || []);
  configureInteraction('comments', creator.comment_disabled, 'Comments are disabled in this TikTok account\'s settings.');
  configureInteraction('duet', creator.duet_disabled, 'Duet is disabled in this TikTok account\'s settings.');
  configureInteraction('stitch', creator.stitch_disabled, 'Stitch is disabled in this TikTok account\'s settings.');

  updateSummary();
  updatePublishState();
}

function setDisconnected() {
  state.creator = null;
  $('connectionDot').classList.remove('ready');
  $('connectionText').textContent = 'Not connected';
  $('connectionHandle').textContent = '';
  $('connectBtn').textContent = 'Connect TikTok';
  $('creatorAvatar').hidden = true;
  $('summaryAccount').textContent = 'Not connected';

  $('visibility').innerHTML = '<option value="">Connect TikTok to load privacy choices</option>';
  $('visibility').disabled = true;

  ['comments', 'duet', 'stitch'].forEach(id => {
    $(id).checked = false;
    $(id).disabled = true;
    state[id] = false;
  });

  updateSummary();
  updatePublishState();
}

function populatePrivacyOptions(options) {
  const select = $('visibility');
  select.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select audience';
  placeholder.selected = true;
  select.appendChild(placeholder);

  options.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = privacyLabels[value] || value;
    select.appendChild(option);
  });

  state.privacy = '';
  select.disabled = false;
}

function configureInteraction(id, disabledByTikTok, disabledMessage) {
  const input = $(id);
  const help = $(`${id}Help`);

  input.checked = false;
  state[id] = false;

  if (disabledByTikTok) {
    input.disabled = true;
    input.closest('.toggle').classList.add('option-disabled');
    help.textContent = disabledMessage;
  } else {
    input.disabled = false;
    input.closest('.toggle').classList.remove('option-disabled');
  }
}

async function bridgeFetch(path, options = {}) {
  const requestOptions = {
    mode: 'cors',
    cache: 'no-store',
    ...options
  };

  try {
    const req = new Request(`${BRIDGE}${path}`, {
      ...requestOptions,
      targetAddressSpace: 'loopback'
    });
    return await fetch(req);
  } catch (firstError) {
    return fetch(`${BRIDGE}${path}`, requestOptions);
  }
}

async function loadCreator() {
  status('Checking local TikTok connection...');

  try {
    const response = await bridgeFetch('/api/creator');

    if (response.status === 401) {
      setDisconnected();
      status('TikTok is not connected. Start the local SeriesForge bridge, then connect TikTok.', 'warning');
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load TikTok creator information.');
    }

    setConnected(data.creator);
    status('TikTok connected. Choose a video and review the posting settings.', 'success');
  } catch (error) {
    setDisconnected();
    status('Local SeriesForge bridge is not running. Start tiktok_bridge.py before connecting or posting.', 'warning');
  }
}

function renderPreview(file) {
  const frame = $('previewFrame');
  frame.replaceChildren();

  if (state.localUrl) {
    URL.revokeObjectURL(state.localUrl);
  }

  state.localUrl = URL.createObjectURL(file);

  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.src = state.localUrl;
  video.setAttribute('aria-label', `Preview of ${file.name}`);
  frame.appendChild(video);
}

function updateSummary() {
  $('summaryVideo').textContent = state.file?.name || 'No video selected';
  $('summaryVisibility').textContent = state.privacy
    ? privacyLabels[state.privacy] || state.privacy
    : 'Not selected';
  $('summaryComments').textContent = state.comments ? 'Allowed' : 'Off';
  $('summaryDuet').textContent = state.duet ? 'Allowed' : 'Off';
  $('summaryStitch').textContent = state.stitch ? 'Allowed' : 'Off';
  $('summaryCaption').textContent = state.caption || 'Add a caption to see it here.';

  updateCommercialRules();

  const branded = state.commercial && state.brandContent;
  $('consentText').textContent = branded
    ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation"
    : "By posting, you agree to TikTok's Music Usage Confirmation";

  updatePublishState();
}

function updateCommercialRules() {
  const options = $('commercialOptions');
  options.hidden = !state.commercial;

  const branded = $('brandContent');
  const notice = $('commercialNotice');
  const privatePost = state.privacy === 'SELF_ONLY';

  if (privatePost) {
    branded.disabled = true;
    if (state.brandContent) {
      state.brandContent = false;
      branded.checked = false;
    }
  } else {
    branded.disabled = false;
  }

  if (!state.commercial) {
    notice.textContent = '';
  } else if (!state.brandOrganic && !state.brandContent) {
    notice.textContent = 'Choose at least one disclosure option before posting.';
  } else if (state.brandContent) {
    notice.textContent = "This video will be labeled as 'Paid partnership'.";
  } else if (state.brandOrganic) {
    notice.textContent = "This video will be labeled as 'Promotional content'.";
  }

  if (privatePost && state.commercial) {
    const extra = ' Branded content is unavailable when the audience is Only me.';
    notice.textContent = `${notice.textContent}${extra}`.trim();
  }
}

function updatePublishState() {
  const disclosureValid = !state.commercial || state.brandOrganic || state.brandContent;
  const ready = Boolean(
    state.creator &&
    state.file &&
    state.privacy &&
    $('consent').checked &&
    disclosureValid &&
    !state.posting
  );

  $('publishBtn').disabled = !ready;
}

function boolForm(value) {
  return value ? 'true' : 'false';
}

async function pollPublishStatus(publishId) {
  for (let attempt = 0; attempt < 75; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 4000));

    const response = await bridgeFetch(`/api/status?publish_id=${encodeURIComponent(publishId)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not check TikTok processing status.');
    }

    const current = data.status || 'PROCESSING';
    status(`TikTok processing status: ${current}`);

    if (current === 'PUBLISH_COMPLETE') {
      status('Published successfully. TikTok has completed processing the post.', 'success');
      return;
    }

    if (current === 'FAILED') {
      throw new Error(data.fail_reason || 'TikTok processing failed.');
    }
  }

  status('Upload finished and TikTok is still processing. It may take a few more minutes.', 'warning');
}

$('connectBtn').addEventListener('click', () => {
  window.location.href = `${BRIDGE}/login`;
});

$('videoUpload').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;

  const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (file.type && !allowed.includes(file.type)) {
    status('Choose an MP4, MOV, or WebM video.', 'warning');
    event.target.value = '';
    return;
  }

  state.file = file;
  $('selectedVideoInfo').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  renderPreview(file);
  updateSummary();
  status('Video loaded. Review the preview and TikTok settings before posting.', 'success');
});

$('caption').addEventListener('input', event => {
  state.caption = event.target.value;
  const length = state.caption.length;
  $('captionCount').textContent = `${length} / 2200`;
  updateSummary();
});

$('visibility').addEventListener('change', event => {
  state.privacy = event.target.value;
  updateSummary();
});

['comments', 'duet', 'stitch'].forEach(id => {
  $(id).addEventListener('change', event => {
    state[id] = event.target.checked;
    updateSummary();
  });
});

$('commercialToggle').addEventListener('change', event => {
  state.commercial = event.target.checked;
  if (!state.commercial) {
    state.brandOrganic = false;
    state.brandContent = false;
    $('brandOrganic').checked = false;
    $('brandContent').checked = false;
  }
  updateSummary();
});

$('brandOrganic').addEventListener('change', event => {
  state.brandOrganic = event.target.checked;
  updateSummary();
});

$('brandContent').addEventListener('change', event => {
  state.brandContent = event.target.checked;
  updateSummary();
});

$('aigc').addEventListener('change', event => {
  state.aigc = event.target.checked;
});

$('consent').addEventListener('change', updatePublishState);

$('publishBtn').addEventListener('click', async () => {
  if (!state.creator || !state.file || !state.privacy || !$('consent').checked) {
    updatePublishState();
    return;
  }

  if (state.commercial && !state.brandOrganic && !state.brandContent) {
    status('Choose at least one content disclosure option before posting.', 'warning');
    return;
  }

  state.posting = true;
  updatePublishState();
  $('publishBtn').textContent = 'Uploading...';
  status('Uploading the approved video to TikTok...');

  const form = new FormData();
  form.append('video', state.file, state.file.name);
  form.append('caption', state.caption);
  form.append('privacy_level', state.privacy);
  form.append('allow_comment', boolForm(state.comments));
  form.append('allow_duet', boolForm(state.duet));
  form.append('allow_stitch', boolForm(state.stitch));
  form.append('brand_organic_toggle', boolForm(state.commercial && state.brandOrganic));
  form.append('brand_content_toggle', boolForm(state.commercial && state.brandContent));
  form.append('is_aigc', boolForm(state.aigc));
  form.append('consent', 'true');

  try {
    const response = await bridgeFetch('/api/post', {
      method: 'POST',
      body: form
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'TikTok upload failed.');
    }

    status(`Upload accepted. TikTok is processing publish ID ${data.publish_id}.`);
    await pollPublishStatus(data.publish_id);
  } catch (error) {
    status(error.message || 'TikTok upload failed.', 'warning');
  } finally {
    state.posting = false;
    $('publishBtn').textContent = 'Post to TikTok';
    updatePublishState();
  }
});

window.addEventListener('beforeunload', () => {
  if (state.localUrl) URL.revokeObjectURL(state.localUrl);
});

const params = new URLSearchParams(window.location.search);
if (params.get('tiktok') === 'connected') {
  history.replaceState({}, '', window.location.pathname);
}

updateSummary();
loadCreator();
