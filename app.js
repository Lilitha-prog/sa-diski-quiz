const TRIVIA_QUESTIONS = [
  { q: "In which year did South Africa host the FIFA World Cup?", opts: ["2006", "2008", "2010", "2012"], answer: 2 },
  { q: "Which South African club has won the most PSL titles?", opts: ["Orlando Pirates", "Kaizer Chiefs", "Mamelodi Sundowns", "SuperSport United"], answer: 2 },
  { q: "Who is Bafana Bafana's all-time leading goal scorer?", opts: ["Benni McCarthy", "Shaun Bartlett", "Doctor Khumalo", "Steven Pienaar"], answer: 0 },
  { q: "In which stadium was the 2010 World Cup Final played?", opts: ["Cape Town Stadium", "Ellis Park", "Soccer City", "Loftus Versfeld"], answer: 2 },
  { q: "Which SA player moved from Sundowns to Brighton & Hove Albion?", opts: ["Keagan Dolly", "Percy Tau", "Themba Zwane", "Bongani Zungu"], answer: 1 },
  { q: "What year did Bafana Bafana win the Africa Cup of Nations?", opts: ["1992", "1994", "1996", "1998"], answer: 2 },
  { q: "Which club does goalkeeper Ronwen Williams play for?", opts: ["Orlando Pirates", "Kaizer Chiefs", "Mamelodi Sundowns", "SuperSport United"], answer: 2 },
  { q: "Who scored South Africa's first ever World Cup goal?", opts: ["Benni McCarthy", "Shaun Bartlett", "Phil Masinga", "Doctor Khumalo"], answer: 2 }
];

const PLAYER_QUESTIONS = [
  { clues: ["South Africa", "Forward", "Champions League"], answer: "Percy Tau", number: 22, colors: ["#f7d23f", "#152c86"], opts: ["Bongani Zungu", "Percy Tau", "Themba Zwane", "Keagan Dolly"] },
  { clues: ["South Africa", "Striker", "100+ Caps"], answer: "Benni McCarthy", number: 17, colors: ["#f0f2f2", "#0c8b4d"], opts: ["Benni McCarthy", "Shaun Bartlett", "Steven Pienaar", "Sibusiso Zuma"] },
  { clues: ["South Africa", "Midfielder", "Mamelodi Sundowns"], answer: "Themba Zwane", number: 18, colors: ["#f7d23f", "#17378a"], opts: ["Sibusiso Vilakazi", "Themba Zwane", "Andile Jali", "Hlompho Kekana"] },
  { clues: ["South Africa", "Goalkeeper", "Bafana Bafana Captain"], answer: "Ronwen Williams", number: 30, colors: ["#68d8ff", "#111827"], opts: ["Itumeleng Khune", "Darren Keet", "Ronwen Williams", "Bruce Bvuma"] }
];

const State = {
  currentScreen: "screen-auth",
  currentMode: "trivia",
  user: null,
  authMode: "login",
  quizIndex: 0,
  quizScore: 0,
  quizRound: 1,
  quizAnswered: false,
  playerIndex: 0,
  playerScore: 0,
  timerInterval: null,
  timerValue: 15,
  totalXP: 1840,
  streak: 7,
  dailyDone: 3,
  dailyTotal: 5
};

const Storage = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); }
};

const Auth = {
  // Firebase-ready seam: replace this method with signInWithEmailAndPassword/createUserWithEmailAndPassword later.
  async signInProvider(payload) {
    await new Promise(resolve => setTimeout(resolve, 550));
    return { uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ...payload };
  },

  switchMode(mode) {
    State.authMode = mode;
    const screen = document.getElementById("screen-auth");
    const login = document.getElementById("login-tab");
    const signup = document.getElementById("signup-tab");
    screen.classList.toggle("signup-mode", mode === "signup");
    login.classList.toggle("active", mode === "login");
    signup.classList.toggle("active", mode === "signup");
    login.setAttribute("aria-selected", mode === "login");
    signup.setAttribute("aria-selected", mode === "signup");
    document.getElementById("auth-title").textContent = mode === "login" ? "Welcome back" : "Create your club profile";
    document.getElementById("auth-subtitle").textContent = mode === "login"
      ? "Log in to keep your streak, XP and quiz progress ready for Firebase Authentication later."
      : "Sign up locally for now. The same form structure can connect to Firebase when deployment is decided.";
    document.getElementById("auth-submit").textContent = mode === "login" ? "Enter Stadium" : "Create Account";
    Auth.clearErrors();
  },

  togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
  },

  validate(form) {
    Auth.clearErrors();
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = {};
    if (State.authMode === "signup" && (!data.name || data.name.trim().length < 2)) errors.name = "Enter at least 2 characters.";
    if (!/^\S+@\S+\.\S+$/.test(data.email || "")) errors.email = "Enter a valid email address.";
    if (!data.password || data.password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (State.authMode === "signup" && data.password !== data.confirm) errors.confirm = "Passwords must match.";
    Object.entries(errors).forEach(([field, message]) => Auth.setError(field, message));
    return { valid: Object.keys(errors).length === 0, data };
  },

  setError(field, message) {
    const input = document.getElementById(`${field}-input`);
    const error = document.getElementById(`${field}-error`);
    if (input) input.classList.add("invalid");
    if (error) error.textContent = message;
  },

  clearErrors() {
    document.querySelectorAll(".field input").forEach(input => input.classList.remove("invalid"));
    document.querySelectorAll(".field-error").forEach(error => { error.textContent = ""; });
  },

  async submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = Auth.validate(form);
    if (!result.valid) return;
    App.showLoader(true);
    const displayName = result.data.name || result.data.email.split("@")[0] || "Legend";
    const user = await Auth.signInProvider({ email: result.data.email, displayName, authMode: State.authMode });
    State.user = user;
    if (document.getElementById("remember-input").checked) Storage.set("saDiskiUser", user);
    else Storage.remove("saDiskiUser");
    App.updateHomeUI();
    App.showLoader(false);
    App.goTo("screen-intro");
    Intro.runCountdown();
  },

  bootstrap() {
    const remembered = Storage.get("saDiskiUser");
    if (remembered) {
      State.user = remembered;
      document.getElementById("remember-input").checked = true;
      App.updateHomeUI();
    }
    document.getElementById("auth-form").addEventListener("submit", Auth.submit);
  },

  logout() {
    Storage.remove("saDiskiUser");
    State.user = null;
    App.clearTimer();
    App.goTo("screen-auth");
  }
};

const App = {
  showLoader(show) { document.getElementById("app-loader").classList.toggle("hidden", !show); },
  goTo(screenId) {
    const current = document.getElementById(State.currentScreen);
    const next = document.getElementById(screenId);
    if (!next || screenId === State.currentScreen) return;
    if (current) {
      current.classList.add("exit");
      setTimeout(() => current.classList.remove("active", "exit"), 420);
    }
    next.classList.add("active");
    State.currentScreen = screenId;
  },
  goHome() { App.clearTimer(); App.updateHomeUI(); App.goTo("screen-home"); },
  showProfile() { alert(`Profile ready for Firebase later\nXP: ${State.totalXP}\nStreak: ${State.streak} days`); },
  updateHomeUI() {
    const name = State.user?.displayName || "Legend";
    const initials = name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "SA";
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText("home-greet", `Good ${timeOfDay}, ${name}`);
    setText("streak-txt", `${State.streak}-day streak`);
    setText("xp-txt", `${State.totalXP} XP`);
    setText("auth-xp", State.totalXP);
    setText("daily-val", `${State.dailyDone} / ${State.dailyTotal} done`);
    setText("home-avatar", initials);
    const dailyFill = document.getElementById("daily-fill");
    if (dailyFill) dailyFill.style.width = `${(State.dailyDone / State.dailyTotal) * 100}%`;
  },
  clearTimer() { if (State.timerInterval) clearInterval(State.timerInterval); State.timerInterval = null; },
  startTimer(seconds, onTick, onExpire) {
    App.clearTimer();
    State.timerValue = seconds;
    onTick(seconds);
    State.timerInterval = setInterval(() => {
      State.timerValue -= 1;
      onTick(State.timerValue);
      if (State.timerValue <= 0) { App.clearTimer(); onExpire(); }
    }, 1000);
  },
  startMode(mode) {
    State.currentMode = mode;
    if (mode === "player") { App.goTo("screen-player-intro"); Intro.setupPlayerIntro(); return; }
    if (mode === "tactical") { App.goTo("screen-tactical-intro"); Intro.setupTactical(); return; }
    App.initTrivia();
    App.goTo("screen-trivia");
  },
  startGuessPlayer() { App.initGuessPlayer(); App.goTo("screen-player"); },
  startTactical() { App.initTrivia(); App.goTo("screen-trivia"); },
  playAgain() { State.currentMode === "player" ? App.startGuessPlayer() : (App.initTrivia(), App.goTo("screen-trivia")); },
  initTrivia() { State.quizIndex = 0; State.quizScore = 0; State.quizAnswered = false; App.renderQuestion(); },
  renderQuestion() {
    const q = TRIVIA_QUESTIONS[State.quizIndex];
    if (!q) { App.showResults(); return; }
    State.quizAnswered = false;
    document.getElementById("quiz-meta-q").textContent = `Q${State.quizIndex + 1} of ${TRIVIA_QUESTIONS.length}`;
    document.getElementById("quiz-meta-score").textContent = `Score: ${State.quizScore}`;
    document.getElementById("quiz-progress").style.width = `${(State.quizIndex / TRIVIA_QUESTIONS.length) * 100}%`;
    document.getElementById("quiz-question").textContent = q.q;
    const container = document.getElementById("quiz-options");
    container.innerHTML = "";
    q.opts.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.type = "button";
      btn.textContent = opt;
      btn.onclick = () => App.selectAnswer(i);
      container.appendChild(btn);
    });
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-next").style.display = "none";
    const timerEl = document.getElementById("timer-display");
    App.startTimer(15, t => { timerEl.textContent = `${t}s`; }, () => App.selectAnswer(-1));
  },
  selectAnswer(index) {
    if (State.quizAnswered) return;
    State.quizAnswered = true;
    App.clearTimer();
    const q = TRIVIA_QUESTIONS[State.quizIndex];
    const buttons = document.querySelectorAll("#quiz-options .quiz-option");
    const fb = document.getElementById("quiz-feedback");
    buttons.forEach((btn, i) => {
      btn.classList.add("answered");
      if (i === q.answer) btn.classList.add("correct");
      else if (i === index) btn.classList.add("wrong");
    });
    if (index === q.answer) {
      State.quizScore += 1;
      fb.textContent = State.timerValue > 10 ? "Correct. Speed bonus." : "Correct. Well played.";
      fb.style.color = "#0d7a3f";
    } else {
      fb.textContent = index === -1 ? `Time up. Answer was: ${q.opts[q.answer]}` : `Incorrect. Answer: ${q.opts[q.answer]}`;
      fb.style.color = "#c43428";
    }
    document.getElementById("quiz-meta-score").textContent = `Score: ${State.quizScore}`;
    document.getElementById("quiz-next").style.display = "block";
  },
  nextQuestion() { State.quizIndex += 1; State.quizIndex >= TRIVIA_QUESTIONS.length ? App.showResults() : App.renderQuestion(); },
  initGuessPlayer() { State.playerIndex = 0; State.playerScore = 0; App.renderPlayerQuestion(); },
  renderPlayerQuestion() {
    const p = PLAYER_QUESTIONS[State.playerIndex];
    if (!p) { App.showResults(); return; }
    document.getElementById("player-meta").textContent = `Score: ${State.playerScore} - Round ${State.playerIndex + 1}`;
    const jersey = document.querySelector(".jersey-card");
    jersey.style.setProperty("--kit-a", p.colors[0]);
    jersey.style.setProperty("--kit-b", p.colors[1]);
    document.getElementById("jersey-number").textContent = p.number;
    document.getElementById("jersey-name").textContent = "NAME";
    const cluesEl = document.getElementById("player-clues");
    cluesEl.innerHTML = "";
    p.clues.forEach((clue, i) => {
      const el = document.createElement("div");
      el.className = "player-clue";
      el.textContent = i < 2 ? clue : "???";
      if (i < 2) setTimeout(() => el.classList.add("revealed"), i * 300 + 180);
      cluesEl.appendChild(el);
    });
    const optsEl = document.getElementById("player-options");
    optsEl.innerHTML = "";
    [...p.opts].sort(() => Math.random() - 0.5).forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "player-option";
      btn.textContent = opt;
      btn.style.setProperty("--option-a", ["#8ef04f", "#f6c44f", "#58bdff", "#ff7161"][i % 4]);
      btn.style.setProperty("--option-b", ["#0d3b22", "#152c86", "#111827", "#681a12"][i % 4]);
      btn.onclick = () => App.selectPlayerAnswer(opt, p.answer);
      optsEl.appendChild(btn);
    });
  },
  selectPlayerAnswer(selected, correct) {
    document.querySelectorAll(".player-option").forEach(btn => {
      btn.classList.add("answered");
      btn.disabled = true;
      if (btn.textContent === correct) btn.classList.add("correct");
      else if (btn.textContent === selected) btn.classList.add("wrong");
    });
    const p = PLAYER_QUESTIONS[State.playerIndex];
    document.getElementById("jersey-name").textContent = correct.toUpperCase().split(" ").pop();
    const lastClue = document.querySelectorAll(".player-clue")[2];
    if (lastClue) { lastClue.textContent = p.clues[2]; setTimeout(() => lastClue.classList.add("revealed"), 160); }
    if (selected === correct) State.playerScore += 1;
    setTimeout(() => { State.playerIndex += 1; State.playerIndex >= PLAYER_QUESTIONS.length ? App.showResults() : App.renderPlayerQuestion(); }, 1450);
  },
  showResults() {
    App.clearTimer();
    const isPlayer = State.currentMode === "player";
    const score = isPlayer ? State.playerScore : State.quizScore;
    const total = isPlayer ? PLAYER_QUESTIONS.length : TRIVIA_QUESTIONS.length;
    const accuracy = total ? Math.round((score / total) * 100) : 0;
    const xpEarned = score * 50 + (accuracy === 100 ? 100 : 0);
    State.totalXP += xpEarned;
    if (score === total) State.streak += 1;
    document.getElementById("results-subtitle").textContent = `${isPlayer ? "Guess Player" : "PSL Trivia"} - Round ${State.quizRound}`;
    document.getElementById("results-score").textContent = score;
    document.getElementById("results-max").textContent = `out of ${total} correct`;
    document.getElementById("res-accuracy").textContent = `${accuracy}%`;
    document.getElementById("res-time").textContent = "14s";
    document.getElementById("res-streak").textContent = State.streak;
    document.getElementById("res-xp").textContent = `+${xpEarned} XP earned`;
    State.quizRound += 1;
    App.updateHomeUI();
    App.goTo("screen-results");
  }
};

const Intro = {
  runCountdown() {
    const display = document.getElementById("countdown-display");
    const label = document.getElementById("countdown-label");
    const ring = document.getElementById("progress-ring");
    const btn = document.getElementById("intro-btn");
    if (!display) return;
    btn.classList.remove("visible");
    const total = 654;
    const labels = ["Get ready", "Set", "Go"];
    let count = 3;
    if (ring) ring.style.strokeDashoffset = total;
    function tick() {
      display.style.animation = "none";
      void display.offsetWidth;
      display.style.animation = "scaleIn .35s ease both";
      display.textContent = count > 0 ? count : "GO";
      label.textContent = labels[3 - count] || "";
      if (ring) ring.style.strokeDashoffset = total - total * ((4 - count) / 3);
      count -= 1;
      if (count >= 0) setTimeout(tick, 850);
      else setTimeout(() => btn.classList.add("visible"), 420);
    }
    setTimeout(tick, 360);
  },
  setupPlayerIntro() {
    const btn = document.querySelector(".player-kick");
    btn.classList.remove("visible");
    setTimeout(() => btn.classList.add("visible"), 900);
  },
  setupTactical() {
    const container = document.getElementById("tac-dots");
    container.innerHTML = "";
    const positions = [[50,82],[27,70],[50,68],[73,70],[18,55],[39,53],[61,53],[82,55],[31,36],[50,32],[69,36]];
    positions.forEach(([x, y], i) => {
      const dot = document.createElement("div");
      dot.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:22px;height:22px;border-radius:50%;background:${i === 0 ? "#fff" : i < 4 ? "#8ef04f" : i < 8 ? "#58bdff" : "#f6c44f"};border:2px solid rgba(255,255,255,.32);transform:translate(-50%,-50%);opacity:0;animation:popIn .35s ease ${i * 80}ms forwards`;
      container.appendChild(dot);
    });
    const btn = document.querySelector(".tac-kick");
    btn.classList.remove("visible");
    setTimeout(() => btn.classList.add("visible"), 1000);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  Auth.bootstrap();
  App.updateHomeUI();
  setTimeout(() => App.showLoader(false), 500);
});

/* Trial mode expansion */
const SA_DISKI_TRIVIA_POOL = [
  ...TRIVIA_QUESTIONS,
  { q: "Which club is known as Amakhosi?", opts: ["Kaizer Chiefs", "AmaZulu", "Golden Arrows", "Cape Town Spurs"], answer: 0 },
  { q: "Which club is nicknamed the Buccaneers?", opts: ["Moroka Swallows", "Orlando Pirates", "Chippa United", "Royal AM"], answer: 1 },
  { q: "Which coach led Bafana Bafana to AFCON glory in 1996?", opts: ["Clive Barker", "Jomo Sono", "Pitso Mosimane", "Carlos Queiroz"], answer: 0 },
  { q: "Which South African player captained Everton in the Premier League?", opts: ["Lucas Radebe", "Steven Pienaar", "Quinton Fortune", "Aaron Mokoena"], answer: 1 },
  { q: "Which SA club won the 2016 CAF Champions League?", opts: ["Kaizer Chiefs", "Orlando Pirates", "Mamelodi Sundowns", "SuperSport United"], answer: 2 },
  { q: "Who was nicknamed Rhoo?", opts: ["Lucas Radebe", "Doctor Khumalo", "Mark Fish", "Neil Tovey"], answer: 0 },
  { q: "Which Bafana goalkeeper is famous for Kaizer Chiefs and penalty saves?", opts: ["Itumeleng Khune", "Andre Arendse", "Brian Baloyi", "Moeneeb Josephs"], answer: 0 },
  { q: "Which city hosted the 2010 World Cup final?", opts: ["Durban", "Johannesburg", "Cape Town", "Pretoria"], answer: 1 },
  { q: "Which former Sundowns coach later managed Al Ahly?", opts: ["Pitso Mosimane", "Gavin Hunt", "Benni McCarthy", "Eric Tinkler"], answer: 0 },
  { q: "Which SA club won the 1995 CAF Champions League?", opts: ["Orlando Pirates", "Kaizer Chiefs", "Santos", "Wits"], answer: 0 },
  { q: "Which club is strongly associated with Naturena?", opts: ["Kaizer Chiefs", "Orlando Pirates", "Swallows", "Polokwane City"], answer: 0 },
  { q: "Which Bafana legend played for Manchester United?", opts: ["Quinton Fortune", "Benni McCarthy", "Siphiwe Tshabalala", "Teko Modise"], answer: 0 },
  { q: "Who scored the opening goal of the 2010 FIFA World Cup?", opts: ["Siphiwe Tshabalala", "Katlego Mphela", "Steven Pienaar", "Teko Modise"], answer: 0 },
  { q: "Which team is associated with the Sea Robbers nickname?", opts: ["Cape Town City", "Orlando Pirates", "Marumo Gallants", "Stellenbosch"], answer: 1 },
  { q: "Which club often plays major home games at Loftus Versfeld?", opts: ["Mamelodi Sundowns", "TS Galaxy", "Sekhukhune United", "Richards Bay"], answer: 0 },
  { q: "Which team wears the famous yellow home kit?", opts: ["Mamelodi Sundowns", "AmaZulu", "Cape Town City", "SuperSport United"], answer: 0 }
];

const SA_DISKI_PLAYER_UPDATES = [
  { clues: ["Loan spell at Union SG before Belgium breakthrough", "Played for Brighton after leaving Sundowns", "Nicknamed the Lion of Judah"], answer: "Percy Tau", number: 22, colors: ["#f7d23f", "#152c86"], opts: ["Bongani Zungu", "Percy Tau", "Themba Zwane", "Keagan Dolly"] },
  { clues: ["Won the UEFA Champions League with Porto", "Scored freely for Bafana and Blackburn", "Later coached AmaZulu and worked at Manchester United"], answer: "Benni McCarthy", number: 17, colors: ["#f0f2f2", "#0c8b4d"], opts: ["Benni McCarthy", "Shaun Bartlett", "Steven Pienaar", "Sibusiso Zuma"] },
  { clues: ["Known as Mshishi", "Central creator for Sundowns", "CAF Champions League winner in yellow"], answer: "Themba Zwane", number: 18, colors: ["#f7d23f", "#17378a"], opts: ["Sibusiso Vilakazi", "Themba Zwane", "Andile Jali", "Hlompho Kekana"] },
  { clues: ["AFCON 2023 penalty hero", "Bafana captain", "Moved from SuperSport to Sundowns"], answer: "Ronwen Williams", number: 30, colors: ["#68d8ff", "#111827"], opts: ["Itumeleng Khune", "Darren Keet", "Ronwen Williams", "Bruce Bvuma"] },
  { clues: ["Opened the 2010 World Cup with a rocket", "Left-footed winger", "Kaizer Chiefs crowd favourite"], answer: "Siphiwe Tshabalala", number: 14, colors: ["#f7d23f", "#111827"], opts: ["Siphiwe Tshabalala", "Teko Modise", "Lerato Chabangu", "Bernard Parker"] },
  { clues: ["Midfield conductor nicknamed The General", "Starred for Pirates and Sundowns", "One of PSL's great playmakers"], answer: "Teko Modise", number: 10, colors: ["#111827", "#f7d23f"], opts: ["Teko Modise", "Oupa Manyisa", "Doctor Khumalo", "Jabu Pule"] },
  { clues: ["Played Premier League football for Leeds", "Bafana captain and defensive leader", "Known internationally as Rhoo"], answer: "Lucas Radebe", number: 5, colors: ["#ffffff", "#1d4ed8"], opts: ["Lucas Radebe", "Aaron Mokoena", "Mark Fish", "Neil Tovey"] },
  { clues: ["Manchester United midfielder", "Left-footed Cape Town talent", "Represented Bafana at two World Cups"], answer: "Quinton Fortune", number: 15, colors: ["#ef4444", "#111827"], opts: ["Quinton Fortune", "Steven Pienaar", "Benedict Vilakazi", "Kagisho Dikgacoi"] }
];
PLAYER_QUESTIONS.length = 0;
PLAYER_QUESTIONS.push(...SA_DISKI_PLAYER_UPDATES);

const SA_DISKI_MODES = {
  lineup:{title:"Missing Lineup",xp:60,label:"Big Match XI",visual:"pitch",questions:[
    {match:"Bafana vs Mexico - 2010 opener",q:"Who is missing from this XI?",lineup:["Khune","Gaxa","Mokoena","Booth","Tshabalala","Modise","Dikgacoi","Pienaar","Mphela","?","Parker"],answer:"Siphiwe Tshabalala",opts:["Siphiwe Tshabalala","Teko Modise","Katlego Mphela","Bernard Parker"]},
    {match:"Sundowns CAF final era",q:"Who completes the midfield triangle?",lineup:["Onyango","Langerman","Arendse","Nthethe","Mbekile","Kekana","?","Zwane","Billiat","Castro","Laffor"],answer:"Tiyani Mabunda",opts:["Tiyani Mabunda","Andile Jali","Oupa Manyisa","Surprise Moriri"]},
    {match:"Pirates continental night",q:"Who is the missing wide threat?",lineup:["Meyiwa","Jele","Mahamutsa","Sangweni","Matlaba","Manyisa","Jali","?","Mbesuma","Myeni","Klate"],answer:"Daine Klate",opts:["Daine Klate","Teko Modise","Sifiso Myeni","Kermit Erasmus"]},
    {match:"Chiefs title-chasing XI",q:"Who is missing from the spine?",lineup:["Khune","Gaxa","Mathoho","Mashamaite","Masilela","Katsande","?","Tshabalala","Parker","Rusike","Musona"],answer:"Reneilwe Letsholonyane",opts:["Reneilwe Letsholonyane","Willard Katsande","George Maluleka","Josta Dladla"]},
    {match:"Bafana AFCON 1996 final",q:"Who is the missing finisher?",lineup:["Williams","Mkhalele","Radebe","Fish","Tovey","Masinga","Moshoeu","?","Bartlett","Khumalo","Sithole"],answer:"Mark Williams",opts:["Mark Williams","Phil Masinga","Shaun Bartlett","Doctor Khumalo"]},
    {match:"Bidvest Wits title run",q:"Who anchors this back line?",lineup:["Josephs","?","Mkhwanazi","Hlanti","Monare","Kebede","Myeni","Klate","Pelembe","Rodgers","Mahlambi"],answer:"Thulani Hlatshwayo",opts:["Thulani Hlatshwayo","Sifiso Hlanti","Daine Klate","Phakamani Mahlambi"]},
    {match:"Cape Town City cup night",q:"Who is missing from the attack?",lineup:["Stephens","Seedat","Fielies","Cupido","Mkhize","Nodada","Mdantsane","?","Mayo","Manyama","Morris"],answer:"Khanyisa Mayo",opts:["Khanyisa Mayo","Lebogang Manyama","Thabo Nodada","Mduduzi Mdantsane"]},
    {match:"AmaZulu revival XI",q:"Who is missing as the creator?",lineup:["Mothwa","Mobara","Mabiliso","Nyongo","Xoki","Makhaula","?","Qalinge","Majoro","Ntuli","Mulenga"],answer:"Luvuyo Memela",opts:["Luvuyo Memela","Lehlohonolo Majoro","Bongi Ntuli","Augustine Mulenga"]}
  ]},
  career:{title:"Career Path",xp:70,label:"Club Trail",visual:"timeline",questions:[
    {q:"Which player followed this career path?",path:["Seven Stars","Ajax CT","Porto","Blackburn","West Ham","Pirates"],answer:"Benni McCarthy",opts:["Benni McCarthy","Steven Pienaar","Quinton Fortune","Shaun Bartlett"]},
    {q:"Which player wore these shirts?",path:["Kaizer Chiefs","Leeds United","Bafana captain"],answer:"Lucas Radebe",opts:["Lucas Radebe","Mark Fish","Aaron Mokoena","Neil Tovey"]},
    {q:"Which player fits this route?",path:["Ajax CT","Ajax","Dortmund","Everton","Sunderland"],answer:"Steven Pienaar",opts:["Steven Pienaar","Quinton Fortune","Thulani Serero","Kamohelo Mokotjo"]},
    {q:"Which player moved along this path?",path:["Sundowns","Union SG","Club Brugge","Brighton","Al Ahly"],answer:"Percy Tau",opts:["Percy Tau","Keagan Dolly","Bongani Zungu","Luther Singh"]},
    {q:"Which midfielder had this path?",path:["Sundowns","Rangers","Amiens","Bafana"],answer:"Bongani Zungu",opts:["Bongani Zungu","Kamohelo Mokotjo","Andile Jali","Thulani Serero"]},
    {q:"Which winger followed this route?",path:["Ajax CT","Sundowns","Montpellier","Kaizer Chiefs"],answer:"Keagan Dolly",opts:["Keagan Dolly","Luther Singh","Dino Ndlovu","Lebogang Manyama"]},
    {q:"Which player matches this timeline?",path:["Pirates","Sundowns","Cape Town City","PSL legend"],answer:"Teko Modise",opts:["Teko Modise","Oupa Manyisa","Jabu Pule","Benedict Vilakazi"]},
    {q:"Which keeper follows this trail?",path:["SuperSport","Sundowns","Bafana captain"],answer:"Ronwen Williams",opts:["Ronwen Williams","Itumeleng Khune","Darren Keet","Moeneeb Josephs"]}
  ]},
  stadium:{title:"SA Stadiums",xp:40,label:"Venue Clues",visual:"stadium",questions:[
    {q:"Which stadium is this?",clues:["Johannesburg","2010 World Cup final","Around 94,000 capacity"],answer:"FNB Stadium",opts:["FNB Stadium","Ellis Park","Moses Mabhida","Loftus Versfeld"]},
    {q:"Which stadium has the famous arch?",clues:["Durban landmark","Built for 2010","SkyCar attraction"],answer:"Moses Mabhida Stadium",opts:["Moses Mabhida Stadium","Cape Town Stadium","Mbombela Stadium","Nelson Mandela Bay Stadium"]},
    {q:"Which Cape venue hosted a World Cup semi-final?",clues:["Green Point area","Coastal bowl design","Cape Town"],answer:"Cape Town Stadium",opts:["Cape Town Stadium","Athlone Stadium","Newlands","Danie Craven"]},
    {q:"Which Pretoria ground do Sundowns often use?",clues:["Pretoria","Rugby and football venue","Near the Union Buildings"],answer:"Loftus Versfeld",opts:["Loftus Versfeld","Lucas Moripe","Royal Bafokeng","Tuks Stadium"]},
    {q:"Which Soweto stadium is Pirates' home?",clues:["Compact derby atmosphere","Orlando East","Black and white nights"],answer:"Orlando Stadium",opts:["Orlando Stadium","Dobsonville Stadium","FNB Stadium","Rand Stadium"]},
    {q:"Which stadium has giraffe-inspired supports?",clues:["Mbombela","2010 venue","Distinctive roof columns"],answer:"Mbombela Stadium",opts:["Mbombela Stadium","Peter Mokaba Stadium","Royal Bafokeng","Moses Mabhida"]},
    {q:"Which Gqeberha venue sits near North End Lake?",clues:["2010 venue","Eastern Cape","Five-tier roof look"],answer:"Nelson Mandela Bay Stadium",opts:["Nelson Mandela Bay Stadium","Buffalo City Stadium","Harry Gwala","Athlone Stadium"]},
    {q:"Which Polokwane venue hosted 2010 matches?",clues:["Limpopo","Named after an anti-apartheid leader","Four corner towers"],answer:"Peter Mokaba Stadium",opts:["Peter Mokaba Stadium","Mbombela Stadium","Royal Bafokeng","Loftus Versfeld"]}
  ]},
  tactical:{title:"Tactical Mode",xp:90,label:"Coach's Call",visual:"tactic",questions:[
    {q:"Your fullbacks are pinned by fast wingers. What protects the wide channels?",clues:["Opponent overloads both flanks","Your wingers are late tracking runners"],answer:"Drop into a 4-1-4-1 out of possession",opts:["Drop into a 4-1-4-1 out of possession","Push both centre-backs into midfield","Remove the holding midfielder","Press with only the striker"]},
    {q:"Leading 1-0 with 10 minutes left. Smartest game-state call?",clues:["Opponent chasing with two strikers","You have pace on the bench"],answer:"Add a ball-winner and counter into space",opts:["Add a ball-winner and counter into space","Commit both fullbacks forward","Switch to all-out press","Play without a striker"]},
    {q:"A low block is killing central space. What creates chances?",clues:["Central lanes crowded","Striker isolated"],answer:"Use width and cutbacks from the byline",opts:["Use width and cutbacks from the byline","Shoot from halfway repeatedly","Stop switching play","Keep every attack central"]},
    {q:"Your build-up is pressed man-to-man. What breaks it?",clues:["Keeper is comfortable","Midfielders are followed tightly"],answer:"Create a free man with the goalkeeper",opts:["Create a free man with the goalkeeper","Always dribble through the press","Tell centre-backs not to split","Remove short passing options"]},
    {q:"Your number 10 receives with back to goal. Best tweak?",clues:["DM marks tightly","Space opens behind marker"],answer:"Rotate the 10 with a deeper midfielder",opts:["Rotate the 10 with a deeper midfielder","Keep the 10 static","Move wingers to centre-back","Stop playing through midfield"]},
    {q:"Opponent holds a high line. Best attacking cue?",clues:["Centre-backs turn slowly","Keeper stands far out"],answer:"Run early diagonals behind the line",opts:["Run early diagonals behind the line","Only play backwards","Crowd your own half","Stop through passes"]},
    {q:"You are losing second balls. What fixes the platform?",clues:["Long balls drop centrally","Front three disconnected"],answer:"Push one midfielder closer to the striker",opts:["Push one midfielder closer to the striker","Leave one midfielder alone","Make both fullbacks strikers","Avoid all duels"]},
    {q:"Their left-back is on a yellow card. Sharpest plan?",clues:["Your right winger is quick","Referee is strict"],answer:"Isolate that side with 1v1 runs",opts:["Isolate that side with 1v1 runs","Avoid attacking that flank","Only cross from the left","Slow the game down"]}
  ]},
  worldcup:{title:"World Cup Edition",xp:100,label:"Global Finals",visual:"worldcup",questions:[
    {q:"Who scored the opening goal of the 2010 World Cup?",clues:["Bafana Bafana","Soccer City","Left-foot rocket"],answer:"Siphiwe Tshabalala",opts:["Siphiwe Tshabalala","Katlego Mphela","Rafael Marquez","Steven Pienaar"]},
    {q:"Which country won the 2010 World Cup in South Africa?",clues:["Extra-time final","Andres Iniesta winner","First title"],answer:"Spain",opts:["Spain","Netherlands","Germany","Uruguay"]},
    {q:"Which stadium hosted the 2010 final?",clues:["Johannesburg","Calabash design","Largest SA venue"],answer:"FNB Stadium",opts:["FNB Stadium","Moses Mabhida","Cape Town Stadium","Ellis Park"]},
    {q:"Which African team reached the 2010 quarter-finals?",clues:["Penalty drama vs Uruguay","Asamoah Gyan hit the bar","West Africa"],answer:"Ghana",opts:["Ghana","Nigeria","Cameroon","Ivory Coast"]},
    {q:"Who won the Golden Ball at the 2010 World Cup?",clues:["Uruguay forward","Number 10","Atletico Madrid star"],answer:"Diego Forlan",opts:["Diego Forlan","Wesley Sneijder","David Villa","Lionel Messi"]},
    {q:"Which country did Bafana beat 2-1 in 2010?",clues:["Group stage","Famous European opponent","Still went out on goal difference"],answer:"France",opts:["France","Mexico","Uruguay","Spain"]},
    {q:"Which player scored Spain's winner in the 2010 final?",clues:["Midfielder","Extra time","Removed shirt celebration"],answer:"Andres Iniesta",opts:["Andres Iniesta","Xavi","David Villa","Fernando Torres"]},
    {q:"Which ball was used at the 2010 World Cup?",clues:["Adidas design","Controversial flight","Zulu-inspired name"],answer:"Jabulani",opts:["Jabulani","Brazuca","Telstar","Teamgeist"]}
  ]}
};

function sdqShuffle(items){ return [...items].sort(() => Math.random() - 0.5); }
function sdqActiveQuestions(){ return State.currentMode === "trivia" ? TRIVIA_QUESTIONS : State.currentMode === "player" ? PLAYER_QUESTIONS : SA_DISKI_MODES[State.currentMode].questions; }
function sdqModeTitle(){ return State.currentMode === "trivia" ? "PSL Trivia" : State.currentMode === "player" ? "Guess Player" : SA_DISKI_MODES[State.currentMode].title; }

const oldAuthSwitchMode = Auth.switchMode.bind(Auth);
Auth.switchMode = function(mode){
  oldAuthSwitchMode(mode);
  document.getElementById("auth-subtitle").textContent = mode === "login" ? "Log in to keep your streak, XP and quiz progress ready." : "Sign up with a display name so the quiz feels like your own matchday profile.";
  document.getElementById("auth-note").textContent = mode === "login" ? "New here? Sign up to build your Diski profile." : "Already signed up? Log in and keep your streak moving.";
};

Auth.submit = async function(event){
  event.preventDefault();
  const result = Auth.validate(event.currentTarget);
  if (!result.valid) return;
  App.showLoader(true);
  const profiles = Storage.get("saDiskiProfiles", {});
  const email = result.data.email.toLowerCase();
  const displayName = State.authMode === "signup" ? result.data.name.trim() : profiles[email]?.displayName || result.data.email.split("@")[0] || "Legend";
  profiles[email] = { displayName };
  Storage.set("saDiskiProfiles", profiles);
  State.user = await Auth.signInProvider({ email, displayName, authMode: State.authMode });
  if (document.getElementById("remember-input").checked) Storage.set("saDiskiUser", State.user); else Storage.remove("saDiskiUser");
  App.updateHomeUI();
  App.showLoader(false);
  App.goTo("screen-intro");
  Intro.runCountdown();
};

App.startMode = function(mode){
  State.currentMode = mode;
  if (mode === "player") { App.goTo("screen-player-intro"); Intro.setupPlayerIntro(); return; }
  if (mode === "tactical") { App.goTo("screen-tactical-intro"); Intro.setupTactical(); return; }
  if (mode === "trivia") { App.initTrivia(); App.goTo("screen-trivia"); return; }
  App.initChallenge(mode);
  App.goTo("screen-challenge");
};
App.startTactical = function(){ App.initChallenge("tactical"); App.goTo("screen-challenge"); };
App.playAgain = function(){
  if (State.currentMode === "player") App.startGuessPlayer();
  else if (State.currentMode === "trivia") { App.initTrivia(); App.goTo("screen-trivia"); }
  else { App.initChallenge(State.currentMode); App.goTo("screen-challenge"); }
};
App.initTrivia = function(){
  TRIVIA_QUESTIONS.length = 0;
  TRIVIA_QUESTIONS.push(...sdqShuffle(SA_DISKI_TRIVIA_POOL).slice(0, 8));
  State.quizIndex = 0;
  State.quizScore = 0;
  State.quizAnswered = false;
  App.renderQuestion();
};
App.renderPlayerQuestion = function(){
  const p = PLAYER_QUESTIONS[State.playerIndex];
  if (!p) { App.showResults(); return; }
  document.getElementById("player-meta").textContent = `Score: ${State.playerScore} - Round ${State.playerIndex + 1}`;
  const jersey = document.querySelector(".jersey-card");
  jersey.style.setProperty("--kit-a", p.colors[0]);
  jersey.style.setProperty("--kit-b", p.colors[1]);
  document.getElementById("jersey-number").textContent = p.number;
  document.getElementById("jersey-name").textContent = "NAME";
  const cluesEl = document.getElementById("player-clues");
  cluesEl.innerHTML = "";
  p.clues.forEach((clue, i) => {
    const el = document.createElement("div");
    el.className = "player-clue";
    el.textContent = clue;
    setTimeout(() => el.classList.add("revealed"), i * 260 + 160);
    cluesEl.appendChild(el);
  });
  const optsEl = document.getElementById("player-options");
  optsEl.innerHTML = "";
  sdqShuffle(p.opts).forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "player-option";
    btn.textContent = opt;
    btn.style.setProperty("--option-a", ["#8ef04f", "#f6c44f", "#58bdff", "#ff7161"][i % 4]);
    btn.style.setProperty("--option-b", ["#0d3b22", "#152c86", "#111827", "#681a12"][i % 4]);
    btn.onclick = () => App.selectPlayerAnswer(opt, p.answer);
    optsEl.appendChild(btn);
  });
};
App.initChallenge = function(mode){
  State.currentMode = mode;
  State.challengeIndex = 0;
  State.challengeScore = 0;
  State.challengeAnswered = false;
  App.renderChallenge();
};
App.renderChallenge = function(){
  const data = SA_DISKI_MODES[State.currentMode];
  const item = data.questions[State.challengeIndex];
  if (!item) { App.showResults(); return; }
  State.challengeAnswered = false;
  document.getElementById("challenge-meta").textContent = `Score: ${State.challengeScore} - Round ${State.challengeIndex + 1}`;
  document.getElementById("challenge-mode-label").textContent = data.label;
  document.getElementById("challenge-question").textContent = item.q;
  document.getElementById("challenge-feedback").textContent = "";
  App.renderChallengeVisual(data.visual, item);
  const clues = document.getElementById("challenge-clues");
  clues.innerHTML = "";
  (item.clues || [item.match]).filter(Boolean).forEach(text => {
    const clue = document.createElement("span");
    clue.textContent = text;
    clues.appendChild(clue);
  });
  const options = document.getElementById("challenge-options");
  options.innerHTML = "";
  item.opts.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.onclick = () => App.selectChallengeAnswer(opt);
    options.appendChild(btn);
  });
};
App.renderChallengeVisual = function(type, item){
  const visual = document.getElementById("challenge-visual");
  visual.className = `challenge-visual ${type}-visual`;
  if (type === "pitch") {
    visual.innerHTML = `<div class="lineup-pitch">${item.lineup.map((name, i) => `<span class="lineup-player ${name === "?" ? "missing" : ""}" style="--i:${i}">${name}</span>`).join("")}</div>`;
    return;
  }
  if (type === "timeline") {
    visual.innerHTML = `<div class="career-path">${item.path.map(team => `<span class="career-shirt">${team}</span>`).join("<b></b>")}</div>`;
    return;
  }
  if (type === "stadium") {
    visual.innerHTML = `<div class="stadium-icon"><span></span><span></span><span></span><strong>STADIUM</strong></div>`;
    return;
  }
  if (type === "worldcup") {
    visual.innerHTML = `<div class="worldcup-icon"><span>2010</span><strong>World Cup</strong></div>`;
    return;
  }
  visual.innerHTML = `<div class="tactic-board-mini"><span>Press</span><span>Cover</span><span>Switch</span><span>Finish</span></div>`;
};
App.selectChallengeAnswer = function(selected){
  if (State.challengeAnswered) return;
  State.challengeAnswered = true;
  const item = SA_DISKI_MODES[State.currentMode].questions[State.challengeIndex];
  const fb = document.getElementById("challenge-feedback");
  document.querySelectorAll("#challenge-options .quiz-option").forEach(btn => {
    btn.classList.add("answered");
    if (btn.textContent === item.answer) btn.classList.add("correct");
    else if (btn.textContent === selected) btn.classList.add("wrong");
  });
  if (selected === item.answer) { State.challengeScore += 1; fb.textContent = "Correct. Good read."; fb.style.color = "#8ef04f"; }
  else { fb.textContent = `Answer: ${item.answer}`; fb.style.color = "#ffb1a8"; }
  document.getElementById("challenge-meta").textContent = `Score: ${State.challengeScore} - Round ${State.challengeIndex + 1}`;
  setTimeout(() => { State.challengeIndex += 1; App.renderChallenge(); }, 1450);
};
App.showResults = function(){
  App.clearTimer();
  const isPlayer = State.currentMode === "player";
  const isTrivia = State.currentMode === "trivia";
  const score = isPlayer ? State.playerScore : isTrivia ? State.quizScore : State.challengeScore;
  const total = sdqActiveQuestions().length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const xpBase = isPlayer ? 80 : isTrivia ? 50 : SA_DISKI_MODES[State.currentMode].xp;
  const xpEarned = score * xpBase + (accuracy === 100 ? 100 : 0);
  State.totalXP += xpEarned;
  if (score === total) State.streak += 1;
  document.getElementById("results-subtitle").textContent = `${sdqModeTitle()} - Round ${State.quizRound}`;
  document.getElementById("results-score").textContent = score;
  document.getElementById("results-max").textContent = `out of ${total} correct`;
  document.getElementById("res-accuracy").textContent = `${accuracy}%`;
  document.getElementById("res-time").textContent = "14s";
  document.getElementById("res-streak").textContent = State.streak;
  document.getElementById("res-xp").textContent = `+${xpEarned} XP earned`;
  State.quizRound += 1;
  App.updateHomeUI();
  App.goTo("screen-results");
};

/* Randomize every mode per playthrough */
App.initGuessPlayer = function(){
  State.playerQuestions = sdqShuffle(PLAYER_QUESTIONS).slice(0, 8);
  State.playerIndex = 0;
  State.playerScore = 0;
  App.renderPlayerQuestion();
};
App.renderPlayerQuestion = function(){
  const bank = State.playerQuestions || PLAYER_QUESTIONS;
  const p = bank[State.playerIndex];
  if (!p) { App.showResults(); return; }
  document.getElementById("player-meta").textContent = `Score: ${State.playerScore} - Round ${State.playerIndex + 1}`;
  const jersey = document.querySelector(".jersey-card");
  jersey.style.setProperty("--kit-a", p.colors[0]);
  jersey.style.setProperty("--kit-b", p.colors[1]);
  document.getElementById("jersey-number").textContent = p.number;
  document.getElementById("jersey-name").textContent = "NAME";
  const cluesEl = document.getElementById("player-clues");
  cluesEl.innerHTML = "";
  p.clues.forEach((clue, i) => {
    const el = document.createElement("div");
    el.className = "player-clue";
    el.textContent = clue;
    setTimeout(() => el.classList.add("revealed"), i * 260 + 160);
    cluesEl.appendChild(el);
  });
  const optsEl = document.getElementById("player-options");
  optsEl.innerHTML = "";
  sdqShuffle(p.opts).forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "player-option";
    btn.textContent = opt;
    btn.style.setProperty("--option-a", ["#8ef04f", "#f6c44f", "#58bdff", "#ff7161"][i % 4]);
    btn.style.setProperty("--option-b", ["#0d3b22", "#152c86", "#111827", "#681a12"][i % 4]);
    btn.onclick = () => App.selectPlayerAnswer(opt, p.answer);
    optsEl.appendChild(btn);
  });
};
App.initChallenge = function(mode){
  State.currentMode = mode;
  State.challengeQuestions = sdqShuffle(SA_DISKI_MODES[mode].questions).slice(0, 8);
  State.challengeIndex = 0;
  State.challengeScore = 0;
  State.challengeAnswered = false;
  App.renderChallenge();
};
App.renderChallenge = function(){
  const data = SA_DISKI_MODES[State.currentMode];
  const bank = State.challengeQuestions || data.questions;
  const item = bank[State.challengeIndex];
  if (!item) { App.showResults(); return; }
  State.challengeAnswered = false;
  document.getElementById("challenge-meta").textContent = `Score: ${State.challengeScore} - Round ${State.challengeIndex + 1}`;
  document.getElementById("challenge-mode-label").textContent = data.label;
  document.getElementById("challenge-question").textContent = item.q;
  document.getElementById("challenge-feedback").textContent = "";
  App.renderChallengeVisual(data.visual, item);
  const clues = document.getElementById("challenge-clues");
  clues.innerHTML = "";
  (item.clues || [item.match]).filter(Boolean).forEach(text => {
    const clue = document.createElement("span");
    clue.textContent = text;
    clues.appendChild(clue);
  });
  const options = document.getElementById("challenge-options");
  options.innerHTML = "";
  sdqShuffle(item.opts).forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.onclick = () => App.selectChallengeAnswer(opt);
    options.appendChild(btn);
  });
};
App.selectChallengeAnswer = function(selected){
  if (State.challengeAnswered) return;
  State.challengeAnswered = true;
  const bank = State.challengeQuestions || SA_DISKI_MODES[State.currentMode].questions;
  const item = bank[State.challengeIndex];
  const fb = document.getElementById("challenge-feedback");
  document.querySelectorAll("#challenge-options .quiz-option").forEach(btn => {
    btn.classList.add("answered");
    if (btn.textContent === item.answer) btn.classList.add("correct");
    else if (btn.textContent === selected) btn.classList.add("wrong");
  });
  if (selected === item.answer) { State.challengeScore += 1; fb.textContent = "Correct. Good read."; fb.style.color = "#8ef04f"; }
  else { fb.textContent = `Answer: ${item.answer}`; fb.style.color = "#ffb1a8"; }
  document.getElementById("challenge-meta").textContent = `Score: ${State.challengeScore} - Round ${State.challengeIndex + 1}`;
  setTimeout(() => { State.challengeIndex += 1; App.renderChallenge(); }, 1450);
};
App.showResults = function(){
  App.clearTimer();
  const isPlayer = State.currentMode === "player";
  const isTrivia = State.currentMode === "trivia";
  const score = isPlayer ? State.playerScore : isTrivia ? State.quizScore : State.challengeScore;
  const total = isPlayer ? (State.playerQuestions || PLAYER_QUESTIONS).length : isTrivia ? TRIVIA_QUESTIONS.length : (State.challengeQuestions || SA_DISKI_MODES[State.currentMode].questions).length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const xpBase = isPlayer ? 80 : isTrivia ? 50 : SA_DISKI_MODES[State.currentMode].xp;
  const xpEarned = score * xpBase + (accuracy === 100 ? 100 : 0);
  State.totalXP += xpEarned;
  if (score === total) State.streak += 1;
  document.getElementById("results-subtitle").textContent = `${sdqModeTitle()} - Round ${State.quizRound}`;
  document.getElementById("results-score").textContent = score;
  document.getElementById("results-max").textContent = `out of ${total} correct`;
  document.getElementById("res-accuracy").textContent = `${accuracy}%`;
  document.getElementById("res-time").textContent = "14s";
  document.getElementById("res-streak").textContent = State.streak;
  document.getElementById("res-xp").textContent = `+${xpEarned} XP earned`;
  State.quizRound += 1;
  App.updateHomeUI();
  App.goTo("screen-results");
};
