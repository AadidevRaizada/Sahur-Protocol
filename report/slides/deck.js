// Slide content for the Sahur Protocol presentation (simple, SE-first, one summary per slide).
module.exports = function deck({ add, crt, A, stat, P }) {
  const pts = (items) => `<ul class="pts">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
  const sum = (t) => `<div class="summary"><span>IN ONE LINE</span>${t}</div>`;

  // 1 ── title
  add(0, '', `
<div class="title-grid">
  <div>
    <div class="pre">★ SOFTWARE ENGINEERING MINI-PROJECT ★</div>
    <h1 class="mega">SAHUR<br>PROTOCOL</h1>
    <div class="sub">Building a browser game, the software engineering way</div>
    <div class="meta">SVKM's NMIMS · MPSTME · Computer Engineering<br>Semester V · Class E · AY 2026–27</div>
  </div>
  ${crt('shots/01-title.png', 'style="box-shadow:0 0 0 4px #2c2440, 0 0 90px rgba(255,46,136,.45)"')}
</div>
<div class="players">${[1, 2, 3].map((i) => `<div class="pl" style="--pc:${P[i].c}"><span class="p">PLAYER ${i}</span><span class="n">${P[i].name.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')}</span><span class="r">${P[i].roll}</span></div>`).join('')}</div>
`, `~25 s · AADIDEV
SAY: "Good morning. We are Aadidev, Kush and Pratham."
SAY: "We made a browser game called Sahur Protocol, and we used it as our Software Engineering project."
SAY: "Today we'll show you each step we followed, from choosing the project to testing it."`);

  // 2 ── overview + SE process
  add(1, 'OVERVIEW', `
<h2>What we built, and how</h2>
<div class="two wide-left">
  <div>
    ${pts([
      '<b>Sahur Protocol</b> is a 2D action game that runs in any web browser.',
      'You and your companion <b>Sahur</b> fight through <b>3 worlds</b> and <b>4 bosses</b>.',
      'Built as <b>one HTML file</b> and published online.',
    ])}
    <div class="label" style="margin-top:34px">OUR SOFTWARE ENGINEERING PROCESS</div>
    <div class="flow">${['Survey', 'Requirements', 'NFR stories', 'Use case', 'Activity', 'Class', 'Sequence', 'Build', 'Test'].map((s, i) => `<span>${i + 1}. ${s}</span>`).join('<i>→</i>')}</div>
  </div>
  <figure>${crt('shots/07-biome2-combat.png')}<figcaption>Gameplay: the player, Sahur and enemies</figcaption></figure>
</div>
${sum('We built a game and took it through every step of the software engineering life cycle.')}
`, `~50 s · AADIDEV
SAY: "Sahur Protocol is a 2D action game. It runs in the browser, so there's nothing to install."
SAY: "You play alongside a character called Sahur and fight through three worlds and four bosses."
POINT AT THE FLOW: "These are the nine steps we followed, one after another. Each lab experiment was one step."
SAY: "We'll go through them in this order."`);

  // 3 ── literature survey
  add(1, 'STEP 1 · LITERATURE SURVEY · EXP 1', `
<h2>Choosing the project</h2>
<div class="three">
  <div>
    <div class="label">5 IDEAS WE COMPARED</div>
    <ul class="opts"><li>Library Management</li><li>Hospital Management</li><li>Food Delivery</li><li>Student Attendance</li><li class="win">2D action game ✔ SELECTED</li></ul>
  </div>
  <div>
    <div class="label">WHY THE GAME</div>
    ${pts(['Real-time behaviour gives <b>richer diagrams</b>.', 'Can be finished in <b>one semester</b>.', 'Ideas taken from games like <b>Rogue, Hades</b> and <b>The Binding of Isaac</b>.'])}
  </div>
  <div>
    <div class="label">TECHNOLOGY CHOSEN</div>
    <div class="techs"><div><b>Unity</b><span>game engine</span></div><div><b>Godot</b><span>game engine</span></div><div><b>Phaser</b><span>JS library</span></div><div class="pick"><b>HTML5 Canvas ✔</b><span>plain JavaScript</span></div></div>
    <p class="small">No install, no build step: it opens from a link.</p>
  </div>
</div>
${sum('We compared 5 project ideas and chose the game because it gave us the most to design and model.')}
`, `~55 s · AADIDEV
SAY: "Experiment 1 began with a literature survey. We compared five project ideas."
SAY: "We chose the game because it has real-time behaviour, which makes the diagrams more interesting, and it was possible to finish in one semester."
SAY: "We also looked at four ways to build it. We picked plain HTML5 Canvas and JavaScript, so the game opens from a link with nothing to install."`);

  // 4 ── requirements (positive)
  add(1, 'STEP 2 · REQUIREMENTS · EXP 1', `
<h2>What the game must do</h2>
<div class="two">
  <div class="reqbox fr">
    <div class="label">FUNCTIONAL · WHAT IT DOES</div>
    ${pts(['Start a new game or <b>continue</b> a saved one', 'Move with <b>WASD</b>, swing with <b>Space</b>', 'Sahur attacks enemies <b>automatically</b>', '3 worlds × 3 rooms + a boss, then the final boss', 'Pick a <b>skill upgrade</b> after every room', '<b>Auto-save</b> at checkpoints', '<b>Touch controls</b> on phones'])}
  </div>
  <div class="reqbox nfr">
    <div class="label">NON-FUNCTIONAL · HOW WELL</div>
    ${pts(['<b>Performance:</b> smooth play on any screen', '<b>Portability:</b> desktop and mobile browsers', '<b>Usability:</b> readable text, clear menus', '<b>Reliability:</b> keeps running even if saving is blocked', '<b>Maintainability:</b> content kept in simple data tables'])}
    <div class="stats tight">${stat('21', 'functional', 'var(--magenta)')}${stat('14', 'non-functional', 'var(--cyan)')}</div>
  </div>
</div>
${sum('We wrote 21 functional and 14 non-functional requirements, and the finished game meets them.')}
`, `~60 s · AADIDEV
SAY: "Next we wrote the requirements."
SAY: "Functional requirements say WHAT the system does. For example: start or continue a game, move and attack, pick an upgrade after each room, and auto-save."
SAY: "Non-functional requirements say HOW WELL it does it: smooth performance, runs on desktop and phone, easy to read, reliable."
SAY: "In total we wrote 21 functional and 14 non-functional requirements."
HAND OVER: "Kush will explain how we wrote the quality requirements as user stories."`);

  // 5 ── agile NFRs
  add(2, 'STEP 3 · AGILE NFRs · EXP 2', `
<h2>Quality written as user stories</h2>
<div class="two">
  <div class="story">
    <div class="sh"><span class="sid">NFR-US-02</span><b>Steady frames</b><span class="tag">PERFORMANCE</span></div>
    <p><b>As a</b> player on a slow device, <b>I want</b> the game to stay fair when it slows down, <b>so that</b> enemies never jump across the screen.</p>
    <div class="label">ACCEPTANCE CRITERIA</div>
    <ol><li>The game redraws on every screen refresh.</li><li>Each update step is at most <b>33 ms</b>.</li></ol>
  </div>
  <div>
    <div class="label">HOW IT WORKS</div>
    <div class="flow vert"><span>User story: who wants what, and why</span><i>↓</i><span>Acceptance criteria: how we test it</span><i>↓</i><span>Definition of Done: when it's finished</span></div>
    <div class="stats tight">${stat('10', 'stories', 'var(--magenta)')}${stat('34', 'criteria', 'var(--cyan)')}${stat('7', 'constraints', 'var(--yellow)')}</div>
  </div>
</div>
${sum('Every quality goal became a user story with acceptance criteria that can be tested.')}
`, `~55 s · KUSH
SAY: "Experiment 2 is about non-functional requirements in Agile."
SAY: "In Agile, we write a quality as a user story: as a player, I want something, so that I get a benefit."
POINT AT THE CARD: "Then we add acceptance criteria. These are measurable checks, like 'each update step is at most 33 milliseconds'."
SAY: "We wrote 10 stories with 34 criteria. A story is done only when all its criteria pass. That's the Definition of Done."`);

  // 6 ── use case
  add(2, 'STEP 4 · USE CASE DIAGRAM · EXP 3', `
<h2>Who uses the system, and for what</h2>
<div class="two wide-left">
  <div class="diagram"><img src="${A('diagrams/exp3-usecase.png')}"></div>
  <div>
    ${pts(['<b>Actor:</b> who uses it, mainly the <b>Player</b>, plus audio, storage and display', '<b>Use case:</b> a goal, e.g. <i>Start New Game, Play, Pause, Settings</i>', '<b>«include»:</b> always happens (a new game always plays the intro)', '<b>«extend»:</b> optional (Resume / Restart from pause)'])}
    <div class="stats tight">${stat('4', 'actors', 'var(--magenta)')}${stat('26', 'use cases', 'var(--cyan)')}</div>
  </div>
</div>
${sum('The use case diagram shows every goal a player can achieve in the game.')}
`, `~55 s · KUSH
SAY: "Experiment 3 is the use case diagram. It shows the system from the user's point of view."
POINT AT THE STICK FIGURE: "The actor is the Player. The ovals are use cases, the goals the player can achieve, like start a game, play, pause or change settings."
SAY: "'Include' means a step always happens: a new game always plays the intro. 'Extend' means it's optional: from pause you may resume or restart."
SAY: "In total there are 4 actors and 26 use cases."`);

  // 7 ── activity
  add(2, 'STEP 5 · ACTIVITY DIAGRAM · EXP 4', `
<h2>The flow of one game run</h2>
<div class="act">
  <div class="diagram tallimg"><img src="${A('diagrams/exp4-activity.png')}"></div>
  <div>
    <div class="flow vert small-flow"><span>Start game → intro story</span><i>↓</i><span>Room loop: fight → pick upgrade (repeat)</span><i>↓</i><span>Boss fight → final boss</span><i>↓</i><span>Decision: HP above 0?</span></div>
    <div class="ends">
      <figure>${crt('shots/14-victory.png')}<figcaption>End 1: Victory</figcaption></figure>
      <figure>${crt('shots/15-gameover.png')}<figcaption>End 2: Game Over</figcaption></figure>
    </div>
  </div>
</div>
${sum('The activity diagram maps the step-by-step flow of a run, with its loop, decisions and two endings.')}
`, `~55 s · KUSH
SAY: "Experiment 4 is the activity diagram. It's like a flowchart of one game run."
TRACE IT: "We start the game, watch the intro, then enter the room loop: fight, pick an upgrade, repeat. When the rooms are done, we fight the boss and then the final boss."
POINT AT THE DIAMONDS: "These are decisions, like 'Is the player's HP above zero?'"
SAY: "So the flow has two endings: victory or game over. These are the real screens from our game."`);

  // 8 ── class
  add(2, 'STEP 6 · CLASS DIAGRAM · EXP 5', `
<h2>The building blocks of the game</h2>
<div class="two wide-left">
  <div class="diagram"><img src="${A('diagrams/exp5-class.png')}"></div>
  <div>
    ${pts(['<b>Classes:</b> GameState, Player, Sahur, Enemy, Boss, Skill, Biome…', '<b>Attributes:</b> data, e.g. Player has <i>hp, speed, damage</i>', '<b>Operations:</b> actions, e.g. <i>attack(), takeDamage()</i>', '<b>Relationships:</b> composition, aggregation, association, inheritance'])}
    <div class="stats tight">${stat('10', 'classes', 'var(--magenta)')}${stat('54', 'attributes', 'var(--cyan)')}${stat('25', 'operations', 'var(--yellow)')}</div>
  </div>
</div>
${sum('The class diagram shows what the game is made of and how the parts are connected.')}
`, `~55 s · KUSH
SAY: "Experiment 5 is the class diagram, the static structure of the game."
SAY: "Each box is a class, like Player, Enemy, Boss or Skill. Inside are attributes, which are data like HP and speed, and operations, which are actions like attack."
SAY: "The lines are relationships. For example, Boss is a kind of Enemy, which is inheritance, and GameState owns the Player, which is composition."
SAY: "We have 10 classes, and we mapped each one to where it lives in our code."
HAND OVER: "Pratham will cover the sequence diagram, the build and testing."`);

  // 9 ── sequence
  add(3, 'STEP 7 · SEQUENCE DIAGRAM · EXP 6', `
<h2>Objects talking, step by step</h2>
<div class="seq">${[1, 2, 3, 4].map((i) => `<figure><div class="diagram"><img src="${A(`diagrams/exp6-seq-part${i}.png`)}"></div><figcaption>Part ${i} · ${['New game', 'Rooms & boss', 'Next world / game over', 'Final boss & ending'][i - 1]}</figcaption></figure>`).join('')}</div>
<div class="legend"><span><b>Lifeline</b> = an object (GameUI, GameCtrl, RoomMgr, SaveMgr)</span><span><b>Arrow</b> = a message, in time order</span><span><b>loop / alt</b> = repeat / choice</span></div>
${sum('The sequence diagram shows, in time order, how the parts of the game talk to each other during a run.')}
`, `~55 s · PRATHAM
SAY: "Experiment 6 is the sequence diagram. It shows how objects talk to each other over time."
SAY: "Each vertical line is an object, like the game controller or the save manager. Each arrow is a message, and time flows from top to bottom."
SAY: "A loop box means 'repeat', like once per room. An alt box means 'choose one', like win or lose."
SAY: "A full game is long, so we split it into four parts: new game, the rooms and boss, moving to the next world, and the ending."`);

  // 10 ── implementation
  add(3, 'STEP 8 · IMPLEMENTATION', `
<h2>How we built it</h2>
<div class="impl">
  <div class="stats grid2">${stat('1', 'HTML file', 'var(--magenta)')}${stat('2,143', 'lines of code', 'var(--cyan)')}${stat('0', 'dependencies', 'var(--yellow)')}${stat('7', 'game screens/modes', 'var(--lime)')}</div>
  <div class="stack">
    <div><b>HTML5 Canvas</b><span>draws the game</span></div>
    <div><b>JavaScript</b><span>all game logic</span></div>
    <div><b>Web Audio</b><span>music made in code</span></div>
    <div><b>localStorage</b><span>auto-save</span></div>
    <div><b>Vercel</b><span>hosted online</span></div>
  </div>
  <figure>${crt('shots/16-mobile-touch.png')}<figcaption>Also playable on phones</figcaption></figure>
</div>
${sum('One HTML file with Canvas graphics, code-made music and auto-save, running on desktop and phone.')}
`, `~50 s · PRATHAM
SAY: "This is how we built it. The whole game is one HTML file of about 2,100 lines, with no extra libraries."
SAY: "Canvas draws the graphics, JavaScript runs the logic, Web Audio makes the music in code, and localStorage saves progress automatically."
SAY: "It's hosted on Vercel and also works on phones with touch controls."`);

  // 11 ── testing (positive)
  add(3, 'STEP 9 · TESTING', `
<h2>Testing the finished game</h2>
<div class="two">
  <div>
    <div class="label">BLACK-BOX TESTS FROM OUR USE CASES</div>
    <table class="tt"><tr><th>Test</th><th>Result</th></tr>
      <tr><td>Start a new game</td><td class="ok">✔ Pass</td></tr>
      <tr><td>Move and attack</td><td class="ok">✔ Pass</td></tr>
      <tr><td>Defeat a boss, unlock a skill</td><td class="ok">✔ Pass</td></tr>
      <tr><td>Pause, resume, main menu</td><td class="ok">✔ Pass</td></tr>
      <tr><td>Continue a saved game</td><td class="ok">✔ Pass</td></tr>
      <tr><td>Touch layout remembered</td><td class="ok">✔ Pass</td></tr>
    </table>
  </div>
  <div>
    <div class="stats grid2">${stat('14', 'test cases', 'var(--cyan)')}${stat('11', 'passed', 'var(--lime)')}</div>
    <div class="label" style="margin-top:30px">IMPROVEMENTS FOR VERSION 2</div>
    ${pts(['Ask before replacing a saved game', 'Remember volume and mute settings', 'Pause the game while the phone is upright'])}
  </div>
</div>
${sum('Tests based on our use cases confirmed the game works, and gave us a clear list for the next version.')}
`, `~55 s · PRATHAM
SAY: "Finally, testing. We used black-box testing, which means we check the behaviour without looking at the code."
SAY: "We wrote 14 test cases from our use cases, like start a game, defeat a boss and continue a save. They were run on the real game in a browser, on desktop and on a phone view."
SAY: "11 passed outright. The other three gave us improvements for version 2, like asking before replacing a saved game."
IF ASKED (exact split): 11 pass, 1 fail (no confirm before overwriting a save), 2 'observed' (volume not remembered; portrait overlay doesn't pause).`);

  // 12 ── conclusion
  add(3, 'CONCLUSION', `
<h2>What we achieved</h2>
<div class="two">
  <div>
    ${pts(['Built and published a <b>complete, playable game</b>', 'Followed every SE step: <b>requirements → design → build → test</b>', 'Drew <b>4 UML diagrams</b> and checked each one against the real game', 'Learned that <b>clear requirements make testing easy</b>'])}
    <div class="label" style="margin-top:28px">FUTURE SCOPE</div>
    <div class="chips"><span>Difficulty levels</span><span>Key remapping</span><span>Colour-blind mode</span><span>Gamepad support</span><span>Offline app</span></div>
  </div>
  <figure>${crt('shots/24-cutscene-epilogue.png')}<figcaption>Thank you! Any questions?</figcaption></figure>
</div>
${sum('A finished game, a full software engineering process, and four UML models that match the real code.')}
`, `~45 s · PRATHAM
SAY: "To conclude: we built a complete game and published it online."
SAY: "We followed every software engineering step: requirements, design with four UML diagrams, building, and testing."
SAY: "Our biggest learning: when requirements and use cases are clear, writing tests becomes easy."
SAY: "In future we'd add difficulty levels, key remapping and a colour-blind mode."
SAY: "Thank you. We're happy to take questions."
BACK POCKET:
• Why plain JavaScript? No install, easy to share, and we learned how a game loop works.
• What is a roguelite? Each run is a fresh attempt, and you get stronger by picking upgrades.
• Where is the report? It covers all six experiments in detail.`);
};
