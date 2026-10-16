// SAHUR PROTOCOL v3 copy deck. Limits: labels <=24, barks <=38, descs <=70.
const COPY = {

  // 1. ANNOUNCER: caption bar during TRIPLE T (pinch-hitter broadcast)
  announcer: {
    walkup: [
      "NOW BATTING... TRIPLE T.",
      "The bubble leads. A log approaches the plate.",
      "Down 0-2. Send in the log.",
      "An anomaly steps into the box.",
      "No warm-up swings. He does not need them.",
      "He takes one practice swing. The stadium leans away."
    ],
    homerun: [
      "TUNG. TUNG. TUNG. And that is gone.",
      "That ball has left the city.",
      "Deep. Deeper. Out of the feed entirely.",
      "Retired side, and a few retired postcodes.",
      "No doubt. Nobody has been in doubt since 3:07.",
      "Replay unavailable. It has not landed yet."
    ],
    boss: [
      "A valuation of infinity. A bat of one.",
      "He is swinging at the big one. Bold.",
      "Bottom of the ninth. Top of the market.",
      "The Bubble has been called. Three times."
    ]
  },

  // 2. COMBO NAMES (hits -> label)
  combo: [
    { n: 3,  label: "TUNG TUNG TUNG" },
    { n: 6,  label: "SIX TUNG. NO NOTES" },
    { n: 9,  label: "SAHUUUR" },
    { n: 15, label: "BRAINROT GOD" },
    { n: 25, label: "TIER: SECRET" },
    { n: 40, label: "TIER: ???" },
    { n: 60, label: "SAHUR SOLOS" },
    { n: 99, label: "UNPRICED" }
  ],

  // 3. ROOM MODIFIERS
  modifiers: [
    { id: "algorithm_boost", name: "ALGORITHM BOOST", line: "The feed likes you today. Aura doubles.", effect: "aura x2" },
    { id: "ratiod", name: "RATIO'D", line: "Everyone showed up, and faster. Aura pays more.", effect: "enemies faster, aura +50%" },
    { id: "golden_hour", name: "GOLDEN HOUR", line: "Everything shiny is about to be hit.", effect: "more gold elites" },
    { id: "beat_drop", name: "BEAT DROP", line: "On the beat, it counts twice.", effect: "on-beat bonus x2" },
    { id: "lag_spike", name: "LAG SPIKE", line: "Slow enemies. Sturdy enemies. Sorry.", effect: "enemies slower, more HP" },
    { id: "trending", name: "TRENDING", line: "More of them. More score. Same you.", effect: "more enemies, score x1.5" },
    { id: "shadowbanned", name: "SHADOWBANNED", line: "Nobody can see you. Stay near the log.", effect: "dark arena, light around you and Sahur" },
    { id: "patch_notes", name: "PATCH NOTES", line: "Minor fixes. One upgrade, free.", effect: "one random free upgrade" },
    { id: "touch_grass", name: "TOUCH GRASS", line: "Kills drop little green sprouts. Eat one.", effect: "every 5th kill drops a heal orb" },
    { id: "sponsored", name: "SPONSORED", line: "An ad bubble floats by. Pop it for loot.", effect: "roaming ad bubble drops big loot if popped" }
  ],

  // 4. ELITE VARIANTS (ladder)
  elites: {
    gold:    { label: "GOLD",    prefix: "Gold",    toast: "GOLD CHEST. Shiny. Take it." },
    diamond: { label: "DIAMOND", prefix: "Diamond", toast: "DIAMOND CHEST. Heavier than it looks." },
    rainbow: { label: "RAINBOW", prefix: "Rainbow", toast: "RAINBOW CHEST. Everyone saw that." }
  },

  // 5. NEW SKILLS
  skills: [
    { key: "boomerang_bat", name: "Boomerang Bat", family: "CHAOS", rarity: "RARE",
      desc: "Every 3rd swing throws a spinning bat. It comes back." },
    { key: "kentongan_horn", name: "Kentongan Horn", family: "SIGNAL", rarity: "RARE",
      desc: "Dashing releases a shockwave that stuns nearby enemies." },
    { key: "pinch_hitter", name: "Pinch Hitter", family: "NOSTALGIA", rarity: "EPIC",
      desc: "TRIPLE T charges faster. The log likes the spotlight." },
    { key: "rice_box", name: "Rice Box", family: "GROUNDING", rarity: "COMMON",
      desc: "Heal a little every time you clear a room." },
    { key: "sahur_snack", name: "Sahur Snack", family: "NOSTALGIA", rarity: "COMMON",
      desc: "Sahur gets more HP and heals over time. He is wood. He accepts." },
    { key: "aura_farmer", name: "Aura Farmer", family: "SIGNAL", rarity: "RARE",
      desc: "On-beat hits drop extra aura. Keep the rhythm, keep the crop." }
  ],

  // 6. EVOLUTIONS (rarity BRAINROT GOD; recipe = two skills at level 2+)
  evolutions: [
    { name: "THREE-PEAT", rarity: "BRAINROT GOD",
      desc: "Sahur slams three times in a row. Then pretends nothing happened.",
      recipe: ["Wider Bat", "Faster Rhythm"], recipeLine: "Wider Bat + Faster Rhythm" },
    { name: "FIFTH TUNG", rarity: "BRAINROT GOD",
      desc: "Every 5th swing sends out a shockwave. It was always five.",
      recipe: ["Louder Voice", "Quick Wit"], recipeLine: "Louder Voice + Quick Wit" },
    { name: "FAMILY MEAL", rarity: "BRAINROT GOD",
      desc: "Big heal on room clear, for you and Sahur. Seconds, even.",
      recipe: ["Mixtape '07", "Touch Grass"], recipeLine: "Mixtape '07 + Touch Grass" },
    { name: "PERFECT PITCH", rarity: "BRAINROT GOD",
      desc: "On-beat swings always crit. Off-beat is a lifestyle choice.",
      recipe: ["Sharp Take", "Borrowed Beat"], recipeLine: "Sharp Take + Borrowed Beat" }
  ],

  // 7. BOSS VERSUS CARDS (tier-list / powerscaling)
  versus: {
    patatam: {
      name: "GRR GRR PATATAM",
      sub: "Mossy. Offended. Technically a tree.",
      rows: ["AURA: 4,000 vs 9000", "MOSS: 100% vs 0%", "TIER: GOD vs ???"],
      barks: [
        { s: "PATATAM", t: "GRR. GRR. PATATAM." },
        { s: "SAHUR",   t: "Is a lot of words. Come swing." }
      ]
    },
    echo: {
      name: "ECHO THE ENGAGEMENT WRAITH",
      sub: "Repeats you. Says it was its idea.",
      rows: ["AURA: 12 vs 9000", "ORIGINAL IDEAS: 0 vs 1", "TIER: SECRET vs ???"]
    },
    scraper: {
      name: "THE SCRAPER",
      sub: "Took everything. Credited no one.",
      rows: ["HANDS: 40 vs 2", "LICENSE: NONE vs WOOD", "TIER: MYTHIC vs ???"]
    },
    valuation: {
      name: "THE VALUATION",
      sub: "A number with a mouth.",
      rows: ["VALUE: INFINITE vs 1 BAT", "PROFIT: NONE vs RICE", "TIER: SECRET vs ???"]
    },
    bubble: {
      name: "THE AI BUBBLE",
      sub: "Seamless. At scale. Empty.",
      rows: ["HYPE: MAX vs HONEST", "INSIDE: NOTHING vs 3 TUNGS", "TIER: SECRET vs ???"]
    }
  },

  // 8. TUTORIAL PROMPTS (max 4 words)
  tutorial: {
    desktop: {
      move:          { t: "MOVE", key: "WASD / ARROWS" },
      swing:         { t: "SWING", key: "SPACE / J" },
      swing_on_beat: { t: "SWING ON THE BEAT", key: "SPACE / J" },
      dash:          { t: "DASH THROUGH BULLETS", key: "SHIFT / K" },
      triple_t_ready:{ t: "TRIPLE T READY", key: "E / L" },
      help_up:       { t: "HELP SAHUR UP", key: "STAND NEAR HIM" },
      skip:          { t: "HOLD TO SKIP", key: "ENTER" }
    },
    touch: {
      move:          { t: "MOVE", key: "LEFT STICK" },
      swing:         { t: "SWING", key: "TAP HIT" },
      swing_on_beat: { t: "SWING ON THE BEAT", key: "TAP HIT" },
      dash:          { t: "DASH THROUGH BULLETS", key: "TAP DASH" },
      triple_t_ready:{ t: "TRIPLE T READY", key: "TAP TRIPLE T" },
      help_up:       { t: "HELP SAHUR UP", key: "STAND NEAR HIM" },
      skip:          { t: "HOLD TO SKIP", key: "HOLD SCREEN" }
    }
  },

  // 9. RESULTS SCREEN
  grades: {
    D: "STILL LOADING",
    C: "BASIC",
    B: "RESPECTABLE WOOD",
    A: "BRAINROT GOD",
    S: "SECRET TIER",
    "S+": "SAHUR SOLOS"
  },
  statLabels: ["TUNGS", "BEST COMBO", "ON-BEAT %", "AURA", "SAHUR SAVES", "TIME"],
  share: "SAHUR PROTOCOL - Biome {biome} - Grade {grade} - {tungs} TUNGs - best combo {combo} - tung tung tung",

  // 10. HALL OF TUNG
  achievements: [
    { id: "pinch_hitter",   name: "PINCH HITTER",        cond: "Win a boss fight at 1-10 HP." },
    { id: "metronome",      name: "METRONOME",           cond: "Land 25 on-beat swings in one run." },
    { id: "triple_t_trio",  name: "THREE UP, THREE DOWN", cond: "TRIPLE T hits 3+ enemies at once." },
    { id: "wake_on_time",   name: "NOBODY LEFT BEHIND",  cond: "Beat a boss without Sahur falling." },
    { id: "clean_room",     name: "UNTOUCHED",           cond: "Clear a room without taking damage." },
    { id: "first_answer",   name: "FIRST ANSWER",        cond: "Finish the game." },
    { id: "spicy",          name: "SPICY WOOD",          cond: "Finish the game on SPICY." },
    { id: "ninety_nine",    name: "UNPRICED",            cond: "Reach a 99 combo." },
    { id: "aura_farmer",    name: "AURA FARMER",         cond: "Collect 500 aura in one run." },
    { id: "rainbow",        name: "NOW IT'S PERSONAL",   cond: "Defeat a Rainbow elite." },
    { id: "evolved",        name: "BRAINROT GOD",        cond: "Take an evolution." },
    { id: "overbooked",     name: "OVERBOOKED",          cond: "Clear 3 rooms in a row at under 20 s each." }
  ],

  // 11. SAHUR BARKS (max 38 chars)
  barks: {
    triple_t_first: "They call me Triple T. Watch.",
    triple_t_used: ["TUNG.", "Three. As promised.", "Send in the log."],
    elite_spotted: ["Shiny one. Hit it twice.", "That one is wearing gold."],
    modifier: ["Today is different. Okay.", "Rules changed. Bat did not."],
    combo25: ["Still counting. Good.", "Many TUNG. I am proud."],
    dash_lot: "You run more than I knock.",
    idle: "You sleeping again?",
    rival: {
      spawn: "Moss man. I know this one.",
      exchange: [
        { s: "PATATAM", t: "GRR GRR." },
        { s: "SAHUR",   t: "Yes yes. Tree. I am wood too." }
      ],
      defeat: "Is only moss. Takes time."
    }
  },

  // 12. DIFFICULTY
  difficulty: {
    CHILL:  { name: "CHILL",  line: "Slower enemies. Sahur gets up faster. Vibes." },
    NORMAL: { name: "NORMAL", line: "The intended walk. Three knocks, no mercy." },
    SPICY:  { name: "SPICY",  line: "Faster enemies, no free heals. Sahur says good luck." }
  },

  // 13. STORY ADDITIONS (existing script otherwise unchanged)
  story: {
    // add to biome2_end memory (art memory_street), after the lanterns line
    memory_line: "The kids on the lane gave him a name: Triple T, because he always knocked three times.",
    epilogue_title: ["EPILOGUE I", "THE FIRST ANSWER"],
    // post-credits stinger, then "TO BE CONTINUED"
    stinger: [
      "Far away, another quiet city. Another dark window.",
      "The Bubble had siblings. They did not get the memo.",
      "TUNG. TUNG. TUNG.",
      "...TUNG?",
      "TO BE CONTINUED"
    ],
    credits_tag: "Made with respect for the kentongan sahur tradition of Indonesia."
  }
};
