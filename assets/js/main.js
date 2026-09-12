// punto di ingresso JS — aggiunta logica qui

(function () {
  const secretLogo = document.querySelector('.hero-secret-logo');
  const secretTarget = secretLogo?.dataset.secretTarget || 'current-pg.html';
  let secretClicks = 0;
  let secretTimer = null;

  function initSecretLogo() {
    if (!secretLogo) return;
    secretLogo.addEventListener('click', () => {
      secretClicks += 1;
      if (secretClicks >= 5) {
        window.location.href = secretTarget;
        return;
      }
      clearTimeout(secretTimer);
      secretTimer = setTimeout(() => {
        secretClicks = 0;
      }, 3500);
    });
  }

  function initWorksiteCountdown() {
    const worksite = document.querySelector('.current-pg-worksite[data-release-date]');
    const countdownValue = worksite?.querySelector('.worksite-countdown-value');
    const countdownDate = worksite?.querySelector('.worksite-countdown-date');
    if (!worksite || !countdownValue || !countdownDate) return;

    const releaseDate = new Date(worksite.dataset.releaseDate);
    if (Number.isNaN(releaseDate.getTime())) return;

    countdownDate.textContent = releaseDate.toLocaleString('it-IT', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    function updateCountdown() {
      const remainingSeconds = Math.max(0, Math.ceil((releaseDate.getTime() - Date.now()) / 1000));
      const days = Math.floor(remainingSeconds / 86400);
      const hours = Math.floor((remainingSeconds % 86400) / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      countdownValue.textContent = remainingSeconds === 0
        ? 'DISPONIBILE ORA'
        : `${days}g ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    updateCountdown();
    window.setInterval(updateCountdown, 1000);
  }

  function initBetaCarousel() {
    const carousel = document.querySelector('.beta-carousel');
    const controls = carousel?.querySelectorAll('.beta-carousel-dots button');
    if (!carousel) return;

    let slide = 0;
    const selectSlide = (nextSlide) => {
      slide = nextSlide;
      carousel.dataset.slide = String(slide);
    };

    const advance = () => {
      if (document.hidden || carousel.matches(':hover, :focus-within')) return;
      selectSlide(slide === 0 ? 1 : 0);
    };

    controls[0]?.addEventListener('click', () => selectSlide(slide === 0 ? 1 : 0));
    controls[1]?.addEventListener('click', () => selectSlide(slide === 0 ? 1 : 0));

    window.setInterval(advance, 9000);
  }

  const canvas = document.getElementById('stars');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const changelogContent = document.getElementById('changelog-content');

  let W, H, stars, meteors;

  // ── Setup ────────────────────────────────────────────────────────────

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }

  function buildStars() {
    stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.2,
    }));
  }

  function makeMeteor() {
    // nasce sul bordo superiore o destro
    const fromTop = Math.random() < 0.6;
    return {
      x: fromTop ? Math.random() * W * 1.4 : W + 10,
      y: fromTop ? -10 : Math.random() * H * 0.4,
      len: Math.random() * 180 + 80,
      spd: Math.random() * 5 + 4,
      // angolo tra 20° e 50° sotto l'orizzontale
      ang: (Math.random() * 30 + 20) * (Math.PI / 180),
      life: 1,
      fade: Math.random() * 0.01 + 0.008,
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function renderChangelog(commits) {
    if (!changelogContent) return;

    changelogContent.innerHTML = `
      <article class="readme-card">
        <ul>
          ${commits.map((commit) => {
            const message = (commit.commit?.message || commit.message || '').split('\n')[0];
            const date = formatDate(commit.commit?.author?.date || commit.date || '');
            const sha = (commit.sha || '').slice(0, 7);
            return `
              <li>
                <div class="changelog-item__meta">${escapeHtml(date)}</div>
                <strong>${escapeHtml(message)}</strong>
                <div class="changelog-item__hash">${escapeHtml(sha)}</div>
              </li>
            `;
          }).join('')}
        </ul>
      </article>
    `;
  }

  async function loadChangelog() {
    if (!changelogContent) return;

    const fallbackCommits = [
      { sha: '2ce3040', date: '2026-08-10T00:00:00Z', commit: { message: 'update readme', author: { date: '2026-08-10T00:00:00Z' } } },
      { sha: 'cfe632c', date: '2026-08-10T00:00:00Z', commit: { message: 'Added tips', author: { date: '2026-08-10T00:00:00Z' } } },
      { sha: 'febb037', date: '2026-08-10T00:00:00Z', commit: { message: 'Added enemy assets and changed abyss functionality', author: { date: '2026-08-10T00:00:00Z' } } },
      { sha: '147234e', date: '2026-08-10T00:00:00Z', commit: { message: 'Update README.md', author: { date: '2026-08-10T00:00:00Z' } } }
    ];

    try {
      const response = await fetch('https://api.github.com/repos/Gianni0177/JuanLab/commits?per_page=8');
      if (!response.ok) throw new Error('Commit history unavailable');
      const commits = await response.json();
      const filteredCommits = commits.filter((commit) => {
        const message = (commit.commit?.message || commit.message || '').split('\n')[0];
        return !message.toLowerCase().startsWith('merge ');
      }).slice(0, 5);
      renderChangelog(filteredCommits);
    } catch (error) {
      renderChangelog(fallbackCommits);
    }
  }

  // ── Loop ─────────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // stelle statiche
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    // meteore
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      const dx = Math.cos(m.ang) * m.len;
      const dy = Math.sin(m.ang) * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, m.x - dx, m.y - dy);
      grad.addColorStop(0, `rgba(255,255,255,${m.life})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - dx, m.y - dy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      m.x += Math.cos(m.ang) * m.spd;
      m.y += Math.sin(m.ang) * m.spd;
      m.life -= m.fade;

      if (m.life <= 0 || m.x > W + 200 || m.y > H + 200) {
        meteors.splice(i, 1);
      }
    }

    // spawn casuale
    if (Math.random() < 0.012) meteors.push(makeMeteor());

    requestAnimationFrame(draw);
  }

  // ── Init ─────────────────────────────────────────────────────────────

  meteors = [];
  resize();
  window.addEventListener('resize', resize);
  initSecretLogo();
  initWorksiteCountdown();
  initBetaCarousel();
  loadChangelog();
  draw();
}());
