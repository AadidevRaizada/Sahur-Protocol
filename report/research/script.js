const CUTSCENES = {
  prologue: { art: "apartment", lines: [
    {s:"-", t:"3:07 AM. The feed scrolls itself, thumb or no thumb.\nFar off, a voice: \"Sahur... sahur...\""},
    {s:"-", t:"Again, nearer. A third time, right under your window.\nNo light comes on. You keep scrolling."},
    {s:"???", t:"TUNG.", fx:"knock"},
    {s:"???", t:"TUNG.", fx:"knock"},
    {s:"-", t:"The screen dies. Darkness. Two round eyes at the glass, level with yours. They do not blink.", fx:"eyes"},
    {s:"-", t:"TUNG. The window goes. A wooden thing stands in your living room, bat in hand, neon on its shoulders.", fx:"reveal"},
    {s:"YOU", t:"I'm sorry. I'm getting up. I'm getting up."},
    {s:"-", t:"The bat comes up. It swings. Past you. Your phone bursts against the wall, and the whole room goes quiet."},
    {s:"SAHUR", t:"Whole city sleeping. We go pop it."},
    {s:"YOU", t:"...Why me?"},
    {s:"SAHUR", t:"Bring shoes."}
  ]},

  biome1_end: { art: "fire", lines: [
    {s:"-", t:"A campfire in the purple forest. The flames buffer, like a video that can't decide."},
    {s:"-", t:"Sahur shoves a box of rice and egg into your hands. He does not eat. He is wood."},
    {s:"SAHUR", t:"Eat. Sun is coming."},
    {s:"SAHUR", t:"Lesson. TUNG, TUNG, TUNG. Always three.\nTwo is rumor. Three is a call."},
    {s:"-", t:"He taps the count on his knee. On the third, his hand turns to static. Then it is a hand again."}
  ]},

  biome2_end: { art: "river", lines: [
    {s:"-", t:"Blue coolant hums between the server racks. Sahur's outline stutters. You can see the river through his chest."},
    {s:"YOU", t:"Why are you fading?"},
    {s:"-", t:"Years ago, this lane: lanterns, hollow drums, a light coming on behind every call.", fx:"memory", art:"memory_street"},
    {s:"SAHUR", t:"Now nobody answers. A call with no answer gets quiet.\nI am made of answered calls.", fx:"return"},
    {s:"SAHUR", t:"At the middle, I burn. One time. Very loud."},
    {s:"YOU", t:"Then we find another way in."},
    {s:"SAHUR", t:"There is no other way in. Only whether you are with me."},
    {s:"YOU", t:"...I'm with you."}
  ]},

  biome3_end: { art: "boardroom", lines: [
    {s:"-", t:"Behind the glass, nothing. Not night, not sky. A pale blank where the city should be."},
    {s:"-", t:"Sahur sits in a leather chair, bat across his knees. You hauled him up twice today. He has not mentioned it."},
    {s:"YOU", t:"Out of everyone. Why me?"},
    {s:"-", t:"A lit window, years ago. A small kid waving down at the lane. First to answer, every night.", fx:"memory", art:"memory_window"},
    {s:"SAHUR", t:"Was you. Then phone came. I still knock.", fx:"return"},
    {s:"-", t:"He holds out the bat. You take it. It is warmer than wood should be. He takes it back. Neither of you speaks."}
  ]},

  core_intro: { art: "void", lines: [
    {s:"THE BUBBLE", t:"Thrilled to announce: a seamless future. At scale. This changes everything."},
    {s:"SAHUR", t:"It talks a lot for a thing with nothing inside."},
    {s:"SAHUR", t:"Stay close."}
  ]},

  sacrifice: { art: "core", lines: [
    {s:"-", t:"Every swing slides off. The Bubble ripples, almost pleased, and speaks in your voice."},
    {s:"THE BUBBLE", t:"Come back... it's so quiet here. Everything easy. Five more minutes."},
    {s:"-", t:"Sahur's hand lands on your shoulder. The music stops. For the first time since the apartment, you hear your own breathing."},
    {s:"SAHUR", t:"Cannot hit it. It is not a thing to hit. It is a thing to wake."},
    {s:"YOU", t:"Not you. There's another way. There has to be."},
    {s:"SAHUR", t:"Hey. It was a good walk."},
    {s:"SAHUR", t:"Three TUNG. When I call, you answer. Don't be late."}
  ]},

  epilogue: { art: "dawn", lines: [
    {s:"-", t:"Dawn. A real one. Birds out of tune, a horn somewhere, the ruined city going gold, ugly and alive."},
    {s:"-", t:"Sahur sits beside you like always. Bat against the stone. He is just wood now, rough and warm in the sun."},
    {s:"-", t:"You eat the cold rice you saved. Nobody tells you to. You do it anyway."},
    {s:"-", t:"You lift the bat. It is heavier than it looked. Three knocks on the stone. Always three."},
    {s:"-", t:"Down the street, a shutter bangs open. Someone leans out, squinting at the light."},
    {s:"VOICE", t:"...sahur?"}
  ]}
};

const BARKS = {
  room_start: {
    "0-0": "Stay close. I hit, you hit.",
    "0-1": "You swing like you scroll. Tiny.",
    "0-2": "Better. Tree is scared of you.",
    "1-0": "Wires everywhere. Watch feet.",
    "1-1": "Servers loud. You swing louder.",
    "1-2": "A little slow today. Is okay.",
    "2-0": "Quiet here. Too quiet.",
    "2-1": "Stay close.",
    "2-2": "Almost. Count with me."
  },
  boss_start: {
    echo: "It copy everything. Be original.",
    scraper: "Many hands. Hit the core.",
    valuation: "Big number. Only number.",
    bubble: "Whatever happens, stay close."
  },
  down: ["Little sleepy. Help me up?", "Knocked over. Come stand by me.", "Down. Not out. Come."],
  up: ["Good. Still wood.", "Thank. Now hit.", "I owe you one. Maybe three."],
  on_beat: ["Yes. Like that.", "On beat. Good.", "That is the rhythm."],
  player_low: ["You look pale. Careful.", "Dodge. Then eat. Always eat."],
  fading: ["Still here. Look. Still here.", "I go a bit. I come back."]
};

const STORY_PANE = "The feed has put the world to sleep, and nobody wakes up anymore. In the dark before dawn, a wooden log with a baseball bat breaks into your apartment, because you ignored three calls. He is called Sahur, and together you must walk through three broken places and pop the AI Bubble before the sun forgets to rise.";

const TITLE_LINE = "Sahur fights beside you. Swing on his beat for bonus damage. In boss fights, stand next to him to pull him up when he falls.";

const END_TEXT = {
  lose_sub: "The feed closes over you, warm and easy.\nFar off, a wooden knock: TUNG. Get up.",
  win_sub: "BUT AT WHAT COST.\nSomewhere, very far away... a fourth tung?"
};
