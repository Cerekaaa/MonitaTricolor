const card = document.getElementById("card");
const cardFlip = card.querySelector(".card-flip");
const playButton = document.getElementById("playSound");
const audio = document.getElementById("speciesAudio");
const holdIndicator = document.querySelector(".hold-indicator");

let flipTimer = null;
let armingTimer = null;
let isInSafeZone = false;

const ARMING_DELAY = 180;
const HOLD_TO_FLIP_DELAY = 950;

const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let touchStartedOnSafeZone = false;
let touchStartedFlipped = false;
let isDraggingTouch = false;
let flipDirection = 1;
let currentTouchAngle = 0;

if (isTouchDevice && holdIndicator) {
  holdIndicator.textContent = "Desliza la carta con el dedo para girarla";
}

function clearTimers() {
  clearTimeout(armingTimer);
  clearTimeout(flipTimer);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetTilt() {
  card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
}

function setTouchAngle(angle) {
  currentTouchAngle = angle;
  cardFlip.style.transform = `rotateY(${angle}deg)`;
}

function updateHoloFromPoint(clientX, clientY) {
  const rect = card.getBoundingClientRect();
  const px = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  const py = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

  card.style.setProperty("--mx", `${px}%`);
  card.style.setProperty("--my", `${py}%`);
  card.classList.add("is-interacting");
}

function resetHolo() {
  card.style.setProperty("--mx", "50%");
  card.style.setProperty("--my", "50%");
  card.classList.remove("is-interacting");
}

function animateBounce(fromAngle, toAngle) {
  const overshoot = toAngle === 0
    ? (fromAngle > 0 ? 10 : -10)
    : (toAngle > 0 ? toAngle - 12 : toAngle + 12);

  cardFlip.classList.remove("is-bouncing");

  cardFlip.style.setProperty("--bounce-from", `${fromAngle}deg`);
  cardFlip.style.setProperty("--bounce-mid", `${overshoot}deg`);
  cardFlip.style.setProperty("--bounce-to", `${toAngle}deg`);

  void cardFlip.offsetWidth;

  cardFlip.classList.add("is-bouncing");

  setTimeout(() => {
    cardFlip.classList.remove("is-bouncing");
  }, 420);
}

function finishTouchFlip(shouldBeFlipped) {
  const fromAngle = currentTouchAngle;
  const toAngle = shouldBeFlipped ? flipDirection * 180 : 0;

  cardFlip.style.transition = "none";
  setTouchAngle(toAngle);
  animateBounce(fromAngle, toAngle);

  if (shouldBeFlipped) {
    card.classList.add("is-flipped");
  } else {
    card.classList.remove("is-flipped");
  }

  resetTilt();
  isDraggingTouch = false;
}

function startSequence() {
  clearTimers();

  if (isInSafeZone) return;

  armingTimer = setTimeout(() => {
    if (!isInSafeZone && !card.classList.contains("is-flipped")) {
      card.classList.add("is-arming");
    }
  }, ARMING_DELAY);

  flipTimer = setTimeout(() => {
    if (!isInSafeZone) {
      card.classList.remove("is-arming");
      card.classList.add("is-flipped");
      cardFlip.style.transform = "";
      cardFlip.style.transition = "";
    }
  }, HOLD_TO_FLIP_DELAY);
}

function resetCard() {
  clearTimers();
  card.classList.remove("is-arming");
}

/* =========================
   ESCRITORIO
========================= */
if (!isTouchDevice) {
  card.addEventListener("mouseenter", () => {
    startSequence();
  });

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / 18);
    const rotateY = (x - centerX) / 18;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    updateHoloFromPoint(e.clientX, e.clientY);
  });

  card.addEventListener("mouseleave", () => {
    resetCard();
    card.classList.remove("is-flipped");
    cardFlip.style.transform = "";
    cardFlip.style.transition = "";
    resetTilt();
    resetHolo();
    isInSafeZone = false;
  });

  document.querySelectorAll(".no-flip").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      isInSafeZone = true;
      clearTimers();
      card.classList.remove("is-arming");
    });

    el.addEventListener("mouseleave", () => {
      isInSafeZone = false;

      if (!card.classList.contains("is-flipped")) {
        startSequence();
      }
    });
  });
}

/* =========================
   CELULAR / TABLET
========================= */
if (isTouchDevice) {
  card.addEventListener(
    "touchstart",
    (e) => {
      touchStartedOnSafeZone = !!e.target.closest(".no-flip");
      if (touchStartedOnSafeZone) return;

      const touch = e.touches[0];

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchCurrentX = touch.clientX;
      touchCurrentY = touch.clientY;

      touchStartedFlipped = card.classList.contains("is-flipped");
      isDraggingTouch = true;

      clearTimers();
      card.classList.remove("is-arming");

      cardFlip.style.transition = "none";
      updateHoloFromPoint(touch.clientX, touch.clientY);

      if (touchStartedFlipped) {
        setTouchAngle(flipDirection * 180);
      } else {
        setTouchAngle(0);
      }
    },
    { passive: true }
  );

  card.addEventListener(
    "touchmove",
    (e) => {
      if (!isDraggingTouch || touchStartedOnSafeZone) return;

      const touch = e.touches[0];
      touchCurrentX = touch.clientX;
      touchCurrentY = touch.clientY;

      const dx = touchCurrentX - touchStartX;
      const dy = touchCurrentY - touchStartY;

      const tiltY = clamp(dx / 10, -12, 12);
      const tiltX = clamp(-dy / 16, -8, 8);
      card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;

      updateHoloFromPoint(touch.clientX, touch.clientY);

      const dragPower = 1.8;
      const progress = clamp(Math.abs(dx) * dragPower, 0, 180);

      if (Math.abs(dx) > 2) {
        flipDirection = dx >= 0 ? 1 : -1;
      }

      if (!touchStartedFlipped) {
        setTouchAngle(flipDirection * progress);
      } else {
        const remainingAngle = clamp(180 - progress, 0, 180);
        setTouchAngle(flipDirection * remainingAngle);
      }
    },
    { passive: true }
  );

  card.addEventListener(
    "touchend",
    () => {
      if (touchStartedOnSafeZone) {
        touchStartedOnSafeZone = false;
        resetTilt();
        resetHolo();
        return;
      }

      if (!isDraggingTouch) return;

      const absAngle = Math.abs(currentTouchAngle);

      if (!touchStartedFlipped) {
        finishTouchFlip(absAngle > 70);
      } else {
        finishTouchFlip(absAngle > 110);
      }

      resetHolo();
    },
    { passive: true }
  );

  card.addEventListener(
    "touchcancel",
    () => {
      touchStartedOnSafeZone = false;

      if (touchStartedFlipped) {
        finishTouchFlip(true);
      } else {
        finishTouchFlip(false);
      }

      resetHolo();
    },
    { passive: true }
  );
}

playButton.addEventListener("click", (e) => {
  e.stopPropagation();

  audio.currentTime = 0;
  audio.play().catch(() => {});

  for (let i = 0; i < 8; i++) {
    createSpark();
  }
});

function createSpark() {
  const spark = document.createElement("span");
  spark.classList.add("spark");

  const x = Math.random() * card.offsetWidth;
  const y = Math.random() * card.offsetHeight;

  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;

  card.appendChild(spark);

  setTimeout(() => {
    spark.remove();
  }, 800);
}