/* ════════════════════════════════════════
   MZANTSI FOOTBALL QUIZ — app.js
   Handles: screen routing, countdown intro,
   tactical dot animation, trivia engine,
   guess-player engine, results & XP
════════════════════════════════════════ */
 
/* ── Question Banks ── */
const TRIVIA_QUESTIONS = [
  {
    q: "In which year did South Africa host the FIFA World Cup?",
    opts: ["2006", "2008", "2010", "2012"],
    answer: 2
  },
  {
    q: "Which South African club has won the most PSL titles?",
    opts: ["Orlando Pirates", "Kaizer Chiefs", "Mamelodi Sundowns", "SuperSport United"],
    answer: 2
  },
  {
    q: "Who is Bafana Bafana's all-time leading goal scorer?",
    opts: ["Benni McCarthy", "Shaun Bartlett", "Doctor Khumalo", "Steven Pienaar"],
    answer: 0
  },
  {
    q: "In which stadium was the 2010 World Cup Final played?",
    opts: ["Cape Town Stadium", "Ellis Park", "Soccer City", "Loftus Versfeld"],
    answer: 2
  },
  {
    q: "Which SA player moved from Sundowns to Brighton & Hove Albion?",
    opts: ["Keagan Dolly", "Percy Tau", "Themba Zwane", "Bongani Zungu"],
    answer: 1
  },
  {
    q: "What year did Bafana Bafana win the Africa Cup of Nations?",
    opts: ["1992", "1994", "1996", "1998"],
    answer: 2
  },
  {
    q: "Which club does goalkeeper Ronwen Williams play for?",
    opts: ["Orlando Pirates", "Kaizer Chiefs", "Mamelodi Sundowns", "SuperSport United"],
    answer: 2
  },
  {
    q: "Who scored South Africa's first ever World Cup goal?",
    opts: ["Benni McCarthy", "Shaun Bartlett", "Phil Masinga", "Doctor Khumalo"],
    answer: 2
  }
];
 
const PLAYER_QUESTIONS = [
  {
    clues: ["South Africa", "Forward", "Champions League"],
    answer: "Percy Tau",
    opts: ["Bongani Zungu", "Percy Tau", "Themba Zwane", "Keagan Dolly"]
  },
  {
    clues: ["South Africa", "Striker", "100+ Caps"],
    answer: "Benni McCarthy",
    opts: ["Benni McCarthy", "Shaun Bartlett", "Steven Pienaar", "Sibusiso Zuma"]
  },
  {
    clues: ["South Africa", "Midfielder", "Mamelodi Sundowns"],
    answer: "Themba Zwane",
    opts: ["Sibusiso Vilakazi", "Themba Zwane", "Andile Jali", "Hlompho Kekana"]
  },
  {
    clues: ["South Africa", "Goalkeeper", "Bafana Bafana Captain"],
    answer: "Ronwen Williams",
    opts: ["Itumeleng Khune", "Darren Keet", "Ronwen Williams", "Bruce Bvuma"]
  }
];
 
/* ── App State ── */
const State = {
  currentScreen: 'screen-intro',
  currentMode: 'trivia',
  quizIndex: 0,
  quizScore: 0,
  quizRound: 1,
  quizAnswered: false,
  playerIndex: 0,
  playerScore: 0,
  playerRound: 1,
  timerInterval: null,
  timerValue: 15,
  totalXP: 1840,
  streak: 7,
  dailyDone: 3,
  dailyTotal: 5,
};
 
/* ── Screen Router ── */
const App = {
 
  goTo(screenId) {
    const current = document.getElementById(State.currentScreen);
    const next    = document.getElementById(screenId);
    if (!next || screenId === State.currentScreen) return;
 
    current.classList.add('exit');
    setTimeout(() => {
      current.classList.remove('active', 'exit');
    }, 450);
 
    next.classList.add('active');
    State.currentScreen = screenId;
  },
 
  goHome() {
    App.clearTimer();
    App.updateHomeUI();
    App.goTo('screen-home');
  },
 
  startMode(mode) {
    State.currentMode = mode;
    switch (mode) {
      case 'trivia':
        App.initTrivia();
        App.goTo('screen-trivia');
        break;
      case 'player':
        App.goTo('screen-player-intro');
        Intro.setupPlayerIntro();
        break;
      case 'tactical':
        App.goTo('screen-tactical-intro');
        Intro.setupTactical();
        break;
      case 'lineup':
      case 'career':
      case 'stadium':
        /* Placeholder for additional modes — routes to trivia as demo */
        App.initTrivia();
        App.goTo('screen-trivia');
        break;
    }
  },
 
  startGuessPlayer() {
    App.initGuessPlayer();
    App.goTo('screen-player');
  },
 
  startTactical() {
    /* Tactical mode routes to trivia as demo */
    App.initTrivia();
    App.goTo('screen-trivia');
  },
 
  playAgain() {
    if (State.currentMode === 'player') {
      App.startGuessPlayer();
    } else {
      App.initTrivia();
      App.goTo('screen-trivia');
    }
  },
 
  /* ── Home UI ── */
  updateHomeUI() {
    const greet = document.getElementById('home-greet');
    if (greet) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      greet.textContent = `Good ${timeOfDay}, Legend`;
    }
    const streakEl = document.getElementById('streak-txt');
    if (streakEl) streakEl.textContent = `${State.streak}-day streak`;
 
    const dailyVal  = document.getElementById('daily-val');
    const dailyFill = document.getElementById('daily-fill');
    if (dailyVal)  dailyVal.textContent = `${State.dailyDone} / ${State.dailyTotal} done`;
    if (dailyFill) dailyFill.style.width = `${(State.dailyDone / State.dailyTotal) * 100}%`;
 
    const av = document.getElementById('home-avatar');
    if (av) av.onclick = () => console.log('Profile — coming soon');
  },
 
  /* ── Timer ── */
  clearTimer() {
    if (State.timerInterval) {
      clearInterval(State.timerInterval);
      State.timerInterval = null;
    }
  },
 
  startTimer(seconds, onTick, onExpire) {
    App.clearTimer();
    State.timerValue = seconds;
    onTick(seconds);
    State.timerInterval = setInterval(() => {
      State.timerValue--;
      onTick(State.timerValue);
      if (State.timerValue <= 0) {
        App.clearTimer();
        onExpire();
      }
    }, 1000);
  },
 
 
  /* ════════════════════════
     TRIVIA ENGINE
  ════════════════════════ */
  initTrivia() {
    State.quizIndex = 0;
    State.quizScore = 0;
    State.quizAnswered = false;
    App.renderQuestion();
  },
 
  renderQuestion() {
    const q = TRIVIA_QUESTIONS[State.quizIndex];
    if (!q) { App.showResults(); return; }
 
    State.quizAnswered = false;
 
    /* Meta bar */
    document.getElementById('quiz-meta-q').textContent =
      `Q${State.quizIndex + 1} of ${TRIVIA_QUESTIONS.length}`;
    document.getElementById('quiz-meta-score').textContent =
      `Score: ${State.quizScore}`;
 
    /* Progress */
    const pct = (State.quizIndex / TRIVIA_QUESTIONS.length) * 100;
    document.getElementById('quiz-progress').style.width = pct + '%';
 
    /* Question */
    document.getElementById('quiz-question').textContent = q.q;
 
    /* Options */
    const container = document.getElementById('quiz-options');
    container.innerHTML = '';
    q.opts.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.onclick = () => App.selectAnswer(i);
      container.appendChild(btn);
    });
 
    /* Feedback & next */
    document.getElementById('quiz-feedback').textContent = '';
    const nextBtn = document.getElementById('quiz-next');
    nextBtn.style.display = 'none';
 
    /* Timer */
    const timerEl = document.getElementById('timer-display');
    App.startTimer(15,
      (t) => { if (timerEl) timerEl.textContent = t + 's'; },
      ()  => { App.selectAnswer(-1); }  /* time up = wrong */
    );
  },
 
  selectAnswer(index) {
    if (State.quizAnswered) return;
    State.quizAnswered = true;
    App.clearTimer();
 
    const q       = TRIVIA_QUESTIONS[State.quizIndex];
    const buttons = document.querySelectorAll('#quiz-options .quiz-option');
    const fb      = document.getElementById('quiz-feedback');
    const timeLeft = State.timerValue;
 
    buttons.forEach((btn, i) => {
      btn.classList.add('answered');
      if (i === q.answer) btn.classList.add('correct');
      else if (i === index) btn.classList.add('wrong');
    });
 
    if (index === q.answer) {
      State.quizScore++;
      fb.textContent = `Correct! ${timeLeft > 10 ? '⚡ Speed bonus!' : 'Well done!'}`;
      fb.style.color = '#2d7a3a';
    } else {
      fb.textContent = index === -1
        ? `Time's up! Answer was: ${q.opts[q.answer]}`
        : `Incorrect. Answer: ${q.opts[q.answer]}`;
      fb.style.color = '#c0392b';
    }
 
    document.getElementById('quiz-meta-score').textContent = `Score: ${State.quizScore}`;
    document.getElementById('quiz-next').style.display = 'block';
  },
 
  nextQuestion() {
    State.quizIndex++;
    if (State.quizIndex >= TRIVIA_QUESTIONS.length) {
      App.showResults();
    } else {
      App.renderQuestion();
    }
  },
 
 
  /* ════════════════════════
     GUESS PLAYER ENGINE
  ════════════════════════ */
  initGuessPlayer() {
    State.playerIndex = 0;
    State.playerScore = 0;
    App.renderPlayerQuestion();
  },
 
  renderPlayerQuestion() {
    const p = PLAYER_QUESTIONS[State.playerIndex];
    if (!p) { App.showResults(); return; }
 
    document.getElementById('player-meta').textContent =
      `Score: ${State.playerScore} · Round ${State.playerIndex + 1}`;
 
    /* Clues — reveal one at a time */
    const cluesEl = document.getElementById('player-clues');
    cluesEl.innerHTML = '';
    p.clues.forEach((clue, i) => {
      const el = document.createElement('div');
      el.className = 'player-clue';
      el.textContent = i < 2 ? clue : '???';
      if (i < 2) setTimeout(() => el.classList.add('revealed'), i * 400 + 300);
      cluesEl.appendChild(el);
    });
 
    /* Options */
    const optsEl = document.getElementById('player-options');
    optsEl.innerHTML = '';
    const shuffled = [...p.opts].sort(() => Math.random() - 0.5);
    shuffled.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'player-option';
      btn.textContent = opt;
      btn.onclick = () => App.selectPlayerAnswer(opt, p.answer);
      optsEl.appendChild(btn);
    });
  },
 
  selectPlayerAnswer(selected, correct) {
    const buttons = document.querySelectorAll('.player-option');
    buttons.forEach(btn => {
      btn.classList.add('answered');
      if (btn.textContent === correct)  btn.classList.add('correct');
      else if (btn.textContent === selected) btn.classList.add('wrong');
    });
 
    /* Reveal last clue */
    const clues = document.querySelectorAll('.player-clue');
    if (clues[2]) {
      clues[2].textContent = PLAYER_QUESTIONS[State.playerIndex].clues[2];
      setTimeout(() => clues[2].classList.add('revealed'), 200);
    }
 
    if (selected === correct) State.playerScore++;
 
    setTimeout(() => {
      State.playerIndex++;
      if (State.playerIndex >= PLAYER_QUESTIONS.length) {
        App.showResults();
      } else {
        App.renderPlayerQuestion();
      }
    }, 1500);
  },
 
 
  /* ════════════════════════
     RESULTS SCREEN
  ════════════════════════ */
  showResults() {
    App.clearTimer();
    const isPlayer = State.currentMode === 'player';
    const score    = isPlayer ? State.playerScore : State.quizScore;
    const total    = isPlayer ? PLAYER_QUESTIONS.length : TRIVIA_QUESTIONS.length;
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
    const xpEarned = score * 50 + (accuracy === 100 ? 100 : 0);
 
    State.totalXP += xpEarned;
    if (score === total) State.streak++;
 
    document.getElementById('results-subtitle').textContent =
      `${isPlayer ? 'Guess Player' : 'PSL Trivia'} · Round ${State.quizRound}`;
    document.getElementById('results-score').textContent = score;
    document.getElementById('results-max').textContent   = `out of ${total} correct`;
    document.getElementById('res-accuracy').textContent  = accuracy + '%';
    document.getElementById('res-time').textContent      = '14s';
    document.getElementById('res-streak').textContent    = State.streak;
    document.getElementById('res-xp').textContent        = `+${xpEarned} XP earned!`;
 
    State.quizRound++;
    App.goTo('screen-results');
  }
};
 
 
/* ════════════════════════
   INTRO ANIMATIONS
════════════════════════ */
const Intro = {
 
  /* ── C: Countdown ── */
  runCountdown() {
    const display = document.getElementById('countdown-display');
    const label   = document.getElementById('countdown-label');
    const ring    = document.getElementById('progress-ring');
    const btn     = document.getElementById('intro-btn');
    const total   = 654; /* circumference of r=104 circle */
    const msgs    = ['GET READY', 'SET...', ''];
    let count = 3;
 
    function tick() {
      if (!display) return;
      display.style.animation = 'none';
      void display.offsetWidth;
      display.style.animation = 'scaleIn 0.35s ease both';
 
      display.textContent = count > 0 ? count : 'GO!';
      if (label) label.textContent = msgs[3 - count] || '';
 
      if (ring) {
        const pct = (4 - count) / 3;
        ring.style.transition   = count > 0 ? 'stroke-dashoffset 0.8s ease' : 'none';
        ring.style.strokeDashoffset = total - total * pct;
      }
 
      count--;
      if (count >= 0) {
        setTimeout(tick, 900);
      } else {
        /* Show kick-off button */
        setTimeout(() => {
          if (btn) btn.classList.add('visible');
        }, 600);
      }
    }
 
    /* Draw pitch lines then start countdown */
    setTimeout(tick, 700);
  },
 
  /* ── D: Player Spotlight ── */
  setupPlayerIntro() {
    const btn = document.querySelector('.player-kick');
    if (btn) {
      btn.classList.remove('visible');
      setTimeout(() => btn.classList.add('visible'), 2400);
    }
  },
 
  /* ── E: Tactical Board ── */
  setupTactical() {
    const container = document.getElementById('tac-dots');
    if (!container) return;
    container.innerHTML = '';
 
    const positions = [
      { x: 195, y: 760 },
      { x: 100, y: 650 }, { x: 195, y: 640 }, { x: 290, y: 650 },
      { x: 60,  y: 520 }, { x: 145, y: 510 }, { x: 245, y: 510 }, { x: 330, y: 520 },
      { x: 115, y: 385 }, { x: 195, y: 372 }, { x: 275, y: 385 }
    ];
    const colors = ['#fff', '#4caf50','#4caf50','#4caf50', '#378ADD','#378ADD','#378ADD','#378ADD', '#f0b429','#f0b429','#f0b429'];
 
    /* Canvas for connection lines */
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2';
    canvas.width  = 390;
    canvas.height = 844;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
 
    /* Dots */
    positions.forEach((p, i) => {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position:absolute;
        left:${p.x - 12}px;top:${p.y - 12}px;
        width:24px;height:24px;
        border-radius:50%;
        background:${colors[i]};
        border:2px solid rgba(255,255,255,0.2);
        opacity:0;
        animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.8 + i * 0.1}s forwards;
        z-index:4
      `;
      container.appendChild(dot);
    });
 
    /* Lines */
    const connections = [[0,1],[0,2],[0,3],[1,4],[2,5],[2,6],[3,7],[4,8],[5,9],[6,9],[7,10]];
    setTimeout(() => {
      connections.forEach(([a, b], i) => {
        setTimeout(() => {
          ctx.strokeStyle = 'rgba(76,175,80,0.25)';
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.moveTo(positions[a].x, positions[a].y);
          ctx.lineTo(positions[b].x, positions[b].y);
          ctx.stroke();
        }, i * 90);
      });
    }, 1800);
 
    const btn = document.querySelector('.tac-kick');
    if (btn) {
      btn.classList.remove('visible');
      setTimeout(() => btn.classList.add('visible'), 3000);
    }
  }
};
 
 
/* ════════════════════════
   BOOT
════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Show intro screen */
  const introScreen = document.getElementById('screen-intro');
  if (introScreen) introScreen.classList.add('active');
  State.currentScreen = 'screen-intro';
 
  /* Start countdown */
  Intro.runCountdown();
 
  /* Populate home */
  App.updateHomeUI();
});