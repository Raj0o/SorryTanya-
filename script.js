/* ==========================================================================
   FOR TANYA — vanilla JS, no dependencies.
   Sections:
   1. Sound helper (synthesised, no audio files, never autoplays)
   2. Loader
   3. Background particles (hearts + diya glows)
   4. Envelope open -> scroll -> typewriter
   5. Button ripple
   6. "Still Angry?" chase logic
   7. "Forgive Me" -> confetti + floating hearts + overlay
   8. Cursor sparkle trail
   9. Easter eggs: secret star + random quotes
   ========================================================================== */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     1. SOUND HELPER
     Tiny WebAudio synth so the site needs zero external audio assets.
     AudioContext is only created lazily, on the user's first interaction —
     nothing ever plays on page load.
     ------------------------------------------------------------------------ */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  /**
   * Play a short, soft tone. Used for envelope-open, clicks, and success chime.
   * @param {number} freq - starting frequency in Hz
   * @param {number} duration - seconds
   * @param {string} type - oscillator waveform
   * @param {number} freqEnd - optional ending frequency for a little glide
   */
  function playTone(freq, duration = 0.25, type = "sine", freqEnd = null) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  const sounds = {
    envelopeOpen: () => {
      playTone(320, 0.18, "sine", 520);
      setTimeout(() => playTone(500, 0.22, "sine", 680), 90);
    },
    click: () => playTone(440, 0.09, "triangle"),
    flee: () => playTone(600, 0.08, "square", 380),
    forgive: () => {
      playTone(523.25, 0.2, "sine", 659.25); // C5 -> E5
      setTimeout(() => playTone(659.25, 0.2, "sine", 783.99), 120); // E5 -> G5
      setTimeout(() => playTone(783.99, 0.35, "sine"), 260); // G5
    },
    sparkle: () => playTone(1200, 0.05, "sine"),
  };

  /* ------------------------------------------------------------------------
     2. LOADER
     ------------------------------------------------------------------------ */
  const loader = document.getElementById("loader");
  window.addEventListener("load", () => {
    const minShow = 1100; // let the heart actually finish a stroke or two
    setTimeout(() => {
      loader.classList.add("loader-hidden");
    }, minShow);
  });

  /* ------------------------------------------------------------------------
     3. BACKGROUND PARTICLES — hearts + tiny diya glows drifting upward
     A single canvas is far cheaper than hundreds of animated DOM nodes.
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById("particle-canvas");
  const ctx2d = canvas.getContext("2d");
  let particles = [];
  let canvasW, canvasH;

  function resizeCanvas() {
    canvasW = canvas.width = window.innerWidth;
    canvasH = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function makeParticle() {
    const isDiya = Math.random() < 0.35;
    return {
      x: Math.random() * canvasW,
      y: canvasH + Math.random() * 100,
      size: isDiya ? 3 + Math.random() * 3 : 10 + Math.random() * 14,
      speed: 0.25 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.6,
      sway: Math.random() * Math.PI * 2,
      isDiya,
      opacity: 0.15 + Math.random() * 0.35,
    };
  }

  const PARTICLE_COUNT = prefersReducedMotion ? 0 : window.innerWidth < 600 ? 16 : 28;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = makeParticle();
    p.y = Math.random() * canvasH; // spread initial positions through the screen
    particles.push(p);
  }

  function drawHeart(x, y, size, opacity) {
    ctx2d.save();
    ctx2d.globalAlpha = opacity;
    ctx2d.fillStyle = "#ff8aa1";
    ctx2d.translate(x, y);
    ctx2d.scale(size / 20, size / 20);
    ctx2d.beginPath();
    ctx2d.moveTo(0, 4);
    ctx2d.bezierCurveTo(-6, -4, -14, 2, 0, 14);
    ctx2d.bezierCurveTo(14, 2, 6, -4, 0, 4);
    ctx2d.fill();
    ctx2d.restore();
  }

  function drawDiya(x, y, size, opacity) {
    ctx2d.save();
    ctx2d.globalAlpha = opacity;
    const glow = ctx2d.createRadialGradient(x, y, 0, x, y, size * 4);
    glow.addColorStop(0, "rgba(255, 207, 138, 0.9)");
    glow.addColorStop(1, "rgba(255, 207, 138, 0)");
    ctx2d.fillStyle = glow;
    ctx2d.beginPath();
    ctx2d.arc(x, y, size * 4, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  }

  function animateParticles() {
    ctx2d.clearRect(0, 0, canvasW, canvasH);
    for (const p of particles) {
      p.y -= p.speed;
      p.sway += 0.01;
      const x = p.x + Math.sin(p.sway) * 10 + p.drift * (canvasH - p.y) * 0.002;
      if (p.isDiya) {
        drawDiya(x, p.y, p.size, p.opacity);
      } else {
        drawHeart(x, p.y, p.size, p.opacity);
      }
      if (p.y < -30) {
        Object.assign(p, makeParticle());
        p.y = canvasH + 20;
      }
    }
    requestAnimationFrame(animateParticles);
  }
  if (!prefersReducedMotion) animateParticles();

  /* ------------------------------------------------------------------------
     4. ENVELOPE -> SCROLL -> TYPEWRITER
     ------------------------------------------------------------------------ */
  const envelope = document.getElementById("envelope");
  const letterCard = document.getElementById("letterCard");
  const letterPaper = document.querySelector(".letter-paper");
  const typewriterEl = document.getElementById("typewriter-text");
  const typewriterCursor = document.getElementById("typewriter-cursor");
  const signatureEl = document.querySelector(".signature");
  const skipHintEl = document.querySelector(".skip-hint");
  const actionsEl = document.getElementById("actions");

  // The letter itself. Edit this to change the words — everything else
  // (typewriter speed, cursor, reveal) adapts automatically.
  const LETTER_TEXT =
    "It's been a while since I sat down to actually say this properly — not through a joke, not through a text that dodges the point, just this.\n\n" +
    "I keep thinking about us roaming around campus like we had somewhere to be, when really we just didn't want the conversation to end. And Varanasi — it was only supposed to be a quick dermatologist appointment, but you somehow turned a hospital waiting room into one of my favourite memories. You have a talent for that.\n\n" +
    "I also know this isn't the first time. Not exactly this, but this shape of it — where I go quiet, or careless, and you're left carrying more than you should have to. I said it wouldn't happen again. It did anyway.\n\n" +
    "I'm not writing this to explain it away. Things at home were heavy — my mother wasn't doing well, and I was holding a lot I didn't know how to put into words — but that's context, not a pass. You still deserved better than the version of me that showed up instead.\n\n" +
    "So — I'm sorry. Actually sorry, not the kind that's just trying to end an argument quickly.\n\n" +
    "I still owe you a joke as bad as the ones from that waiting room. Whenever you're ready.";

  let typewriterRunning = false;
  let typewriterDone = false;
  let typeTimeoutId = null;

  function typeWriter(text, el, speed = 22) {
    typewriterRunning = true;
    let i = 0;
    el.textContent = "";

    function step() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        // slightly longer pause on punctuation and line breaks for a natural feel
        const c = text.charAt(i - 1);
        const pause = c === "\n" ? speed * 8 : c === "," ? speed * 4 : c === "." ? speed * 6 : speed;
        typeTimeoutId = setTimeout(step, pause);
      } else {
        finishTypewriter();
      }
    }
    step();
  }

  function finishTypewriter() {
    clearTimeout(typeTimeoutId);
    typewriterEl.textContent = LETTER_TEXT;
    typewriterRunning = false;
    typewriterDone = true;
    typewriterCursor.classList.add("cursor-done");
    signatureEl.classList.add("is-visible");
    skipHintEl.classList.remove("is-visible");
    actionsEl.classList.add("is-visible");
  }

  // Tap the letter to skip straight to the end
  letterPaper.addEventListener("click", () => {
    if (typewriterRunning && !typewriterDone) finishTypewriter();
  });

  let letterRevealed = false;
  function revealLetter() {
    if (letterRevealed) return;
    letterRevealed = true;
    letterCard.classList.add("is-visible");
    skipHintEl.classList.add("is-visible");
    setTimeout(() => typeWriter(LETTER_TEXT, typewriterEl), 500);
  }

  envelope.addEventListener("click", () => {
    if (envelope.classList.contains("is-open")) return;
    envelope.classList.add("is-open");
    sounds.envelopeOpen();

    setTimeout(() => {
      document.getElementById("letter-section").scrollIntoView({ behavior: "smooth" });
      revealLetter();
    }, 550);
  });

  // Also reveal (without needing the envelope) if the user just scrolls down
  const letterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) revealLetter();
      });
    },
    { threshold: 0.4 }
  );
  letterObserver.observe(document.getElementById("letter-section"));

  /* ------------------------------------------------------------------------
     5. RIPPLE EFFECT ON BUTTONS
     ------------------------------------------------------------------------ */
  function addRipple(e, btn) {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${(e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
    ripple.style.top = `${(e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }

  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      addRipple(e, btn);
      sounds.click();
    });
  });

  /* ------------------------------------------------------------------------
     6. "STILL ANGRY?" CHASE LOGIC
     ------------------------------------------------------------------------ */
  const angryBtn = document.getElementById("angryBtn");
  const angryCounter = document.getElementById("angryCounter");
  const MAX_ATTEMPTS = 5;
  let angryAttempts = 0;
  let angrySurrendered = false;

  const encouragingNudges = [
    "aw, come on 🥺",
    "you know you want to forgive me",
    "okay that one was close",
    "I'll wait right here (kidding, I won't)",
    "the other button is right there, just saying",
  ];

  function moveAngryButton() {
    if (angrySurrendered) return;
    const rect = angryBtn.getBoundingClientRect();
    const margin = 24;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    const newX = margin + Math.random() * Math.max(1, maxX - margin);
    const newY = margin + Math.random() * Math.max(1, maxY - margin);

    angryBtn.classList.add("is-fleeing");
    angryBtn.style.left = `${newX}px`;
    angryBtn.style.top = `${newY}px`;
  }

  function surrenderAngryButton() {
    angrySurrendered = true;
    angryBtn.classList.remove("is-fleeing");
    angryBtn.style.left = "";
    angryBtn.style.top = "";
    angryBtn.querySelector(".btn-label").textContent = "Okay okay... maybe press the other one 🥺";
    angryCounter.textContent = "";
  }

  // On desktop, flee on hover (harder!); on touch, flee on click.
  const canHover = window.matchMedia("(hover: hover)").matches;

  function handleAngryEvasion() {
    if (angrySurrendered) return;
    angryAttempts++;
    sounds.flee();
    moveAngryButton();

    if (angryAttempts >= MAX_ATTEMPTS) {
      setTimeout(surrenderAngryButton, 150);
    } else {
      angryCounter.textContent =
        encouragingNudges[Math.min(angryAttempts - 1, encouragingNudges.length - 1)];
    }
  }

  if (canHover) {
    angryBtn.addEventListener("mouseenter", handleAngryEvasion);
  }
  angryBtn.addEventListener("click", (e) => {
    if (angrySurrendered) return; // once surrendered, clicking does nothing special — just sits there, defeated
    e.preventDefault();
    handleAngryEvasion();
  });

  /* ------------------------------------------------------------------------
     7. "FORGIVE ME" -> CONFETTI + FLOATING HEARTS + OVERLAY
     ------------------------------------------------------------------------ */
  const forgiveBtn = document.getElementById("forgiveBtn");
  const overlay = document.getElementById("successOverlay");
  const closeOverlayBtn = document.getElementById("closeOverlay");
  const confettiCanvas = document.getElementById("confetti-canvas");
  const cctx = confettiCanvas.getContext("2d");

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeConfettiCanvas);

  function launchConfetti() {
    resizeConfettiCanvas();
    const colors = ["#ff8aa1", "#ffcf8a", "#e2607d", "#fff7f3", "#c97b86"];
    const pieces = Array.from({ length: prefersReducedMotion ? 0 : 140 }, () => ({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * confettiCanvas.height * 0.4,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let frame = 0;
    const maxFrames = 260;

    function drawFrame() {
      frame++;
      cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      pieces.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
        cctx.save();
        cctx.translate(p.x, p.y);
        cctx.rotate((p.rotation * Math.PI) / 180);
        cctx.fillStyle = p.color;
        if (p.shape === "rect") {
          cctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          cctx.beginPath();
          cctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          cctx.fill();
        }
        cctx.restore();
      });
      if (frame < maxFrames) {
        requestAnimationFrame(drawFrame);
      } else {
        cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    drawFrame();
  }

  function spawnFloatingHearts(originEl, count = 12) {
    if (prefersReducedMotion) return;
    const rect = originEl.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const heart = document.createElement("span");
      heart.className = "floating-heart";
      heart.textContent = Math.random() > 0.5 ? "❤️" : "💗";
      heart.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 40}px`;
      heart.style.top = `${rect.top}px`;
      heart.style.fontSize = `${14 + Math.random() * 14}px`;
      heart.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 2500);
    }
  }

  let forgiven = false;
  forgiveBtn.addEventListener("click", () => {
    if (forgiven) return;
    forgiven = true;
    sounds.forgive();
    spawnFloatingHearts(forgiveBtn, 16);
    launchConfetti();
    setTimeout(() => overlay.classList.remove("hidden"), 500);
  });

  closeOverlayBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });

  /* ------------------------------------------------------------------------
     8. CURSOR SPARKLE TRAIL
     Throttled so it stays lightweight even on fast mouse movement.
     ------------------------------------------------------------------------ */
  let lastSparkleTime = 0;
  if (!prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("mousemove", (e) => {
      const now = Date.now();
      if (now - lastSparkleTime < 60) return; // throttle
      lastSparkleTime = now;

      const sparkle = document.createElement("span");
      sparkle.className = "sparkle";
      sparkle.textContent = "✦";
      sparkle.style.left = `${e.clientX + (Math.random() - 0.5) * 6}px`;
      sparkle.style.top = `${e.clientY + (Math.random() - 0.5) * 6}px`;
      document.body.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 900);
    });
  }

  /* ------------------------------------------------------------------------
     9. EASTER EGGS: secret star + floating quote bubble
     ------------------------------------------------------------------------ */
  const secretStar = document.getElementById("secretStar");
  const quoteBubble = document.getElementById("quoteBubble");

  const secretQuotes = [
    "found it. that's the whole easter egg. 🤍",
    "some things are worth waiting for.",
    "still here, still hoping.",
    "you have great taste in hidden stars, apparently.",
  ];

  function showQuoteBubble(text, x, y) {
    quoteBubble.textContent = text;
    quoteBubble.style.left = `${Math.min(x, window.innerWidth - 260)}px`;
    quoteBubble.style.top = `${Math.max(y - 70, 10)}px`;
    quoteBubble.classList.remove("hidden");
    setTimeout(() => quoteBubble.classList.add("hidden"), 3200);
  }

  secretStar.addEventListener("click", (e) => {
    sounds.sparkle();
    spawnFloatingHearts(secretStar, 8);
    const quote = secretQuotes[Math.floor(Math.random() * secretQuotes.length)];
    showQuoteBubble(quote, e.clientX, e.clientY);
  });

  // A small, occasional nudge near the fleeing button — never intrusive.
  let lastNudgeTime = 0;
  angryBtn.addEventListener("mouseenter", () => {
    const now = Date.now();
    if (canHover && now - lastNudgeTime > 4000 && Math.random() > 0.6 && !angrySurrendered) {
      lastNudgeTime = now;
      const rect = angryBtn.getBoundingClientRect();
      showQuoteBubble(
        encouragingNudges[Math.floor(Math.random() * encouragingNudges.length)],
        rect.left,
        rect.top
      );
    }
  });
})();
