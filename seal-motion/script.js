const stage = document.querySelector('.stage');
const runner = document.querySelector('.runner');
const oval = document.querySelector('.oval');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let timer, travel, charge, held = null;
let direction = -1, beat = 0;

// 진행 중인 움직임을 현재 화면의 자세와 위치에서 멈춘다.
function stopHere() {
  clearTimeout(timer);
  const transform = getComputedStyle(runner).transform;
  const x = transform === 'none' ? 0 : new DOMMatrix(transform).m41;
  const pose = getComputedStyle(oval).transform;
  travel?.cancel();
  charge?.cancel();
  runner.style.transform = 'translateX(' + x + 'px)';
  oval.style.transform = pose;
  stage.classList.remove('stroke');
  return x;
}

function stroke(power, manual = false) {
  if (reduced.matches || held !== null) return;
  const x = stopHere();
  const edge = Math.max(0, (stage.clientWidth - runner.offsetWidth * 1.35) / 2);
  const stride = Math.min(230, stage.clientWidth * .23) * power;
  if (edge - direction * x < stride * .65) direction *= -1;
  // 진행 방향을 바꿀 때만 좌우를 뒤집어 머리가 먼저 나아가게 한다.
  runner.style.setProperty('--facing', -direction);
  const end = Math.max(-edge, Math.min(edge, x + direction * stride));
  const ms = manual ? 800 : 980;
  stage.style.setProperty('--time', ms + 'ms');
  stage.style.setProperty('--start', oval.style.transform);
  stage.style.setProperty('--lift', 5 + 'deg');
  stage.style.setProperty('--settle', -2 + 'deg');
  // 강하게 누른 뒤에는 다시 움츠리지 않고 바로 펴진다.
  if (manual) stage.style.setProperty('--start', getComputedStyle(oval).transform);
  void oval.offsetWidth;
  stage.classList.add('stroke');
  const from = 'translateX(' + x + 'px)';
  travel = runner.animate([
    { transform:from, offset:0 },
    { transform:from, offset:manual ? .08 : .20, easing:'cubic-bezier(.16,.68,.27,1)' },
    { transform:'translateX(' + end + 'px)', offset:.9 },
    { transform:'translateX(' + end + 'px)', offset:1 }
  ], { duration:ms, fill:'forwards' });
  // 두 번 짧게 밀고 한 번 길게 미끄러진 뒤 한 박자 쉰다.
  timer = setTimeout(auto, ms + (beat % 3 === 0 ? 850 : 130));
}

function auto() {
  const lengths = [.42, .55, 1];
  const power = lengths[beat % 3];
  beat++;
  stroke(power);
}

function press() {
  if (held !== null) return;
  stopHere();
  held = performance.now();
  stage.classList.add('pressed');
  if (!reduced.matches) {
    charge = oval.animate([
      { transform:oval.style.transform },
      { transform:'scale(.87,1.06)' }
    ], { duration:850, easing:'ease-out', fill:'forwards' });
  }
}

function release() {
  if (held === null) return;
  const strength = Math.min(1, (performance.now()-held)/850);
  held = null;
  stage.classList.remove('pressed');
  stroke(.38 + strength * .97, true);
}

function reset() {
  stopHere();
  held = null;
  stage.classList.remove('pressed');
  oval.style.transform = 'none';
  runner.style.transform = 'none';
  if (!reduced.matches && !document.hidden) timer = setTimeout(auto, 1100);
}

// 마우스와 터치 모두 같은 누르기/놓기 입력을 사용한다.
stage.onpointerdown = e => {
  if (!e.isPrimary || e.button !== 0) return;
  stage.setPointerCapture(e.pointerId);
  press();
};
stage.onpointerup = e => { if (e.isPrimary) release(); };
stage.onpointercancel = reset;
stage.onkeydown = e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); }
};
stage.onkeyup = e => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); }
};
stage.onblur = () => { if (held !== null) reset(); };
reduced.addEventListener('change', reset);
document.addEventListener('visibilitychange', reset);
window.addEventListener('resize', reset);
reset();
