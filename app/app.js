const demos = [
  {
    id: 'episode-01',
    title: 'The system behind consistent content',
    duration: '42:18',
    meta: 'Episode 01 · 2 hours ago',
    tone: ''
  },
  {
    id: 'episode-02',
    title: 'What creators should stop doing manually',
    duration: '38:04',
    meta: 'Episode 02 · Yesterday',
    tone: 'coral'
  },
  {
    id: 'episode-03',
    title: 'From one recording to a full series',
    duration: '51:32',
    meta: 'Episode 03 · Aug 28',
    tone: 'blue'
  }
];

const defaultCaption =
  'The shortcut is not working harder. It is building a repeatable system that makes every recording go further. #creatorworkflow #contentstrategy';

const STORAGE_KEY = 'seriesforge-draft-v1';

let saved = null;

try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
} catch {
  saved = null;
}

const state = {
  selected: demos[0],
  localUrl: null,
  previewMode: false,
  approved: false,

  title: '',
  caption: defaultCaption,
  visibility: 'Everyone',
  schedule: 'Now',
  scheduleDate: '',
  comments: true,
  duet: false,
  stitch: false,

  ...(saved || {})
};

const $ = id => document.getElementById(id);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* --------------------------------
   State defaults / validation
--------------------------------- */

if (!state.caption) state.caption = defaultCaption;
if (!state.visibility) state.visibility = 'Everyone';
if (!state.schedule) state.schedule = 'Now';

if (typeof state.comments !== 'boolean') state.comments = true;
if (typeof state.duet !== 'boolean') state.duet = false;
if (typeof state.stitch !== 'boolean') state.stitch = false;
if (typeof state.previewMode !== 'boolean') state.previewMode = false;
if (typeof state.approved !== 'boolean') state.approved = false;

if (typeof state.title !== 'string') state.title = '';
if (typeof state.scheduleDate !== 'string') state.scheduleDate = '';

if (!['Everyone', 'Friends', 'Only me'].includes(state.visibility)) {
  state.visibility = 'Everyone';
}

if (!['Now', 'Schedule'].includes(state.schedule)) {
  state.schedule = 'Now';
}

/*
 * A local object URL cannot survive a page refresh.
 * If a saved draft contains a local upload, fall back to
 * the first demo video.
 */
if (state.selected?.local) {
  state.selected = demos[0];
  state.localUrl = null;
}

/* --------------------------------
   Local storage
--------------------------------- */

function save() {
  const saveDraft = $('saveDraft');

  if (!saveDraft?.checked) return;

  const draft = {
    selected: state.selected?.local
      ? demos[0]
      : state.selected,

    title: state.title,
    caption: state.caption,
    visibility: state.visibility,
    schedule: state.schedule,

    // Don't preserve stale scheduling data when publishing now.
    scheduleDate:
      state.schedule === 'Schedule'
        ? state.scheduleDate || ''
        : '',

    comments: state.comments,
    duet: state.duet,
    stitch: state.stitch,
    previewMode: state.previewMode,
    approved: state.approved
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    status(
      'This browser could not save the draft locally.',
      'warning'
    );
  }
}

/* --------------------------------
   Status
--------------------------------- */

function status(message, kind = '') {
  const el = $('status');

  if (!el) return;

  el.textContent = message;
  el.className = `status ${kind}`;
}

/* --------------------------------
   Video list
--------------------------------- */

function renderVideos() {
  const videoGrid = $('videoGrid');

  if (!videoGrid) return;

  const videos =
    state.selected?.local
      ? [state.selected, ...demos]
      : demos;

  videoGrid.innerHTML = videos
    .map(video => {
      const selected =
        state.selected?.id === video.id
          ? 'selected'
          : '';

      return `
        <button
          class="video-choice ${selected}"
          data-id="${escapeHtml(video.id)}"
          type="button"
        >
          <div class="thumb ${escapeHtml(video.tone || 'local')}">
            <span class="play" aria-hidden="true">▶</span>
            <span class="duration">
              ${escapeHtml(video.duration || 'Local')}
            </span>
          </div>

          <div class="video-info">
            <span class="video-title">
              ${escapeHtml(video.title)}
            </span>

            <span class="video-meta">
              ${escapeHtml(
                video.meta || 'Uploaded from this device'
              )}
            </span>
          </div>
        </button>
      `;
    })
    .join('');

  videoGrid
    .querySelectorAll('.video-choice')
    .forEach(button => {
      button.addEventListener('click', () => {
        selectVideo(button.dataset.id);
      });
    });
}

/* --------------------------------
   Select video
--------------------------------- */

function selectVideo(id) {
  const chosen =
    state.selected?.local &&
    state.selected.id === id
      ? state.selected
      : demos.find(video => video.id === id);

  if (!chosen) return;

  state.selected = chosen;
  state.approved = false;

  renderVideos();
  renderPreview();
  updateSummary();
  save();

  $('approveBtn').textContent = 'Approve draft';

  status(
    'Video selected. Review the preview and caption before approving.',
    'success'
  );
}

/* --------------------------------
   Preview
--------------------------------- */

function renderPreview() {
  const previewFrame = $('previewFrame');

  if (!previewFrame) return;

  const video = state.selected || demos[0];

  previewFrame.replaceChildren();

  if (video.local && state.localUrl) {
    const videoElement = document.createElement('video');

    videoElement.controls = true;
    videoElement.playsInline = true;
    videoElement.src = state.localUrl;

    videoElement.setAttribute(
      'aria-label',
      `Preview of ${video.title}`
    );

    previewFrame.appendChild(videoElement);

    return;
  }

  const art = document.createElement('div');
  art.className = `preview-art ${video.tone || ''}`;

  const play = document.createElement('span');
  play.className = 'big-play';
  play.textContent = '▶';
  play.setAttribute('aria-hidden', 'true');

  const title = document.createElement('strong');
  title.textContent = video.title;

  const details = document.createElement('small');
  details.textContent =
    `${video.duration || 'Local'} · Preview placeholder`;

  art.append(play, title, details);
  previewFrame.appendChild(art);
}

/* --------------------------------
   Summary / form state
--------------------------------- */

function updateSummary() {
  const caption = state.caption || '';

  $('title').value = state.title || '';

  $('caption').value = caption;
  $('captionCount').textContent = caption.length;

  $('summaryVideo').textContent =
    state.selected?.title || 'No video selected';

  $('summaryVisibility').textContent =
    state.visibility;

  $('summaryTiming').textContent =
    state.schedule === 'Schedule'
      ? state.scheduleDate
        ? new Date(state.scheduleDate).toLocaleString()
        : 'Choose a date'
      : 'Immediately';

  $('summaryComments').textContent =
    state.comments ? 'Allowed' : 'Off';

  $('summaryCaption').textContent =
    caption || 'Add a caption to see it here.';

  $('visibility').value = state.visibility;
  $('schedule').value = state.schedule;

  $('scheduleField').hidden =
    state.schedule !== 'Schedule';

  $('scheduleDate').value =
    state.schedule === 'Schedule'
      ? state.scheduleDate || ''
      : '';

  $('comments').checked = state.comments;
  $('duet').checked = state.duet;
  $('stitch').checked = state.stitch;
}

/* --------------------------------
   Scheduling
--------------------------------- */

function getLocalDateTimeMinimum() {
  const now = new Date();

  const offset =
    now.getTimezoneOffset() * 60000;

  return new Date(now - offset)
    .toISOString()
    .slice(0, 16);
}

function validateSchedule() {
  if (state.schedule !== 'Schedule') {
    return true;
  }

  if (!state.scheduleDate) {
    status(
      'Choose a date and time before approving.',
      'warning'
    );

    $('scheduleDate').focus();

    return false;
  }

  const selectedDate =
    new Date(state.scheduleDate);

  if (
    Number.isNaN(selectedDate.getTime()) ||
    selectedDate.getTime() <= Date.now()
  ) {
    status(
      'Choose a future date and time.',
      'warning'
    );

    $('scheduleDate').focus();

    return false;
  }

  return true;
}

/* --------------------------------
   Export
--------------------------------- */

function exportPlan() {
  if (!validateSchedule()) return;

  const plan = {
    product: 'SeriesForge',
    status: state.approved
      ? 'approved-draft'
      : 'draft',

    draftName: state.title || '',

    video: state.selected,

    caption: state.caption,

    audience: state.visibility,

    timing:
      state.schedule === 'Schedule'
        ? state.scheduleDate
        : 'now',

    allowComments: state.comments,
    allowDuet: state.duet,
    allowStitch: state.stitch,

    exportedAt: new Date().toISOString()
  };

  const blob = new Blob(
    [JSON.stringify(plan, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;
  link.download = 'seriesforge-publish-plan.json';

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  status(
    'Publish plan downloaded.',
    'success'
  );
}

/* --------------------------------
   Preview mode
--------------------------------- */

$('connectBtn').addEventListener('click', () => {
  state.previewMode = true;

  $('connectionDot').classList.add('ready');
  $('connectionText').textContent = 'Preview mode';
  $('connectBtn').textContent = 'Preview active';

  status(
    'Preview mode is active. Connect TikTok OAuth later to load real videos and publish.',
    'warning'
  );

  save();
});

/* --------------------------------
   Draft name
--------------------------------- */

$('title').addEventListener('input', event => {
  state.title = event.target.value;
  save();
});

/* --------------------------------
   Caption
--------------------------------- */

$('caption').addEventListener('input', event => {
  state.caption = event.target.value;

  $('captionCount').textContent =
    state.caption.length;

  $('summaryCaption').textContent =
    state.caption ||
    'Add a caption to see it here.';

  save();
});

/* --------------------------------
   Audience
--------------------------------- */

$('visibility').addEventListener('change', event => {
  state.visibility = event.target.value;

  updateSummary();
  save();
});

/* --------------------------------
   Schedule
--------------------------------- */

$('schedule').addEventListener('change', event => {
  state.schedule = event.target.value;

  if (state.schedule === 'Now') {
    state.scheduleDate = '';
  }

  updateSummary();
  save();
});

$('scheduleDate').addEventListener('change', event => {
  state.scheduleDate = event.target.value;

  updateSummary();
  save();
});

/* --------------------------------
   Interaction options
--------------------------------- */

['comments', 'duet', 'stitch'].forEach(id => {
  $(id).addEventListener('change', event => {
    state[id] = event.target.checked;

    updateSummary();
    save();
  });
});

/* --------------------------------
   Save draft toggle
--------------------------------- */

$('saveDraft').addEventListener('change', () => {
  if ($('saveDraft').checked) {
    save();

    status(
      'Draft saving is enabled.',
      'success'
    );
  }
});

/* --------------------------------
   Local video upload
--------------------------------- */

$('videoUpload').addEventListener(
  'change',
  event => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('video/')) {
      status(
        'Please choose a video file.',
        'warning'
      );

      event.target.value = '';
      return;
    }

    if (state.localUrl) {
      URL.revokeObjectURL(state.localUrl);
    }

    state.localUrl =
      URL.createObjectURL(file);

    state.selected = {
      id: 'local-upload',
      title: file.name,
      duration: 'Local video',
      meta: 'Uploaded from this device',
      tone: 'local',
      local: true
    };

    state.approved = false;

    renderVideos();
    renderPreview();
    updateSummary();

    $('approveBtn').textContent =
      'Approve draft';

    save();

    status(
      'Local video loaded for preview. The file stays in this browser.',
      'success'
    );
  }
);

/* --------------------------------
   Approve
--------------------------------- */

$('approveBtn').addEventListener('click', () => {
  if (!state.selected) {
    status(
      'Choose a video before approving.',
      'warning'
    );

    return;
  }

  if (!validateSchedule()) return;

  state.approved = true;

  save();

  status(
    'Draft approved locally. Export the publish plan or connect TikTok later to publish it for real.',
    'success'
  );

  $('approveBtn').textContent =
    'Draft approved';
});

/* --------------------------------
   Export
--------------------------------- */

$('exportBtn').addEventListener(
  'click',
  exportPlan
);

/* --------------------------------
   Initial setup
--------------------------------- */

if (state.previewMode) {
  $('connectionDot').classList.add('ready');
  $('connectionText').textContent =
    'Preview mode';

  $('connectBtn').textContent =
    'Preview active';
}

$('scheduleDate').min =
  getLocalDateTimeMinimum();

renderVideos();
renderPreview();
updateSummary();
