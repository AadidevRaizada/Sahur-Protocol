# Black-box test run

Run: 2026-10-13T18:40:27.908Z · Chrome headless via puppeteer-core · unmodified Sahur_Protocol.html

| ID | Scenario | Expected | Observed | Verdict |
|---|---|---|---|---|
| TC-01 | Start New Game | Prologue, FIRST UPGRADE, room 1/3 | prologue cutscene (prologue); "FIRST UPGRADE" with 3 cards; play in biome 1, room 1/3, 5 enemies queued/alive | Pass |
| TC-02 | Advance the prologue | 1st press completes line, 2nd advances | typing true→false on line 0; next press moved to line 1 | Pass |
| TC-03 | Move and attack | 8-way move; one swing per tap | D for 0.4 s moved 94 px; W+D moved 65/67 px (diagonal 93 px, normalised); holding Space 1 s gave 1 swing, 3 taps gave 3 | Pass |
| TC-04 | Clear Room | Up to 3 distinct upgrade cards | "CHOOSE AN UPGRADE" with 3 cards, all distinct: true | Pass |
| TC-05 | Fight Boss: Echo | Cutscene, Signal Roll, biome 2 | boss echo in room 4; defeat → cutscene biome1_end → "SIGNAL ROLL" → biome 2, room 1 | Pass |
| TC-06 | Fight Boss: Valuation | "NOT YET" until its big burst | valuation: hit before burst 560→560 HP; window opened after its burst: true; hit in window 560→550 HP; window closed after 4 s: true | Pass |
| TC-07 | Pause, resume, main menu | World freezes; CONTINUE shown | Esc → pause (overlay flex); world frozen for 0.6 s: true; RESUME → play; MAIN MENU → title, CONTINUE display block | Pass |
| TC-08 | Continue Game | Saved room, skills and HP | save: biome 2 room 1, HP 90; restored: biome 2 room 1, HP 90; skill levels identical: true | Pass |
| TC-09 | New game over a save | Warning before overwriting | save existed: true; WAKE UP → cutscene immediately, 0 confirmation dialogs, save afterwards: deleted | Fail |
| TC-10 | HP reaches 0 | ABSORBED; RETRY CHECKPOINT | mode end, title "ABSORBED", button "RETRY CHECKPOINT", save kept: true; button → play | Pass |
| TC-11 | HP 0 with Second Wind | Revive at 50% HP | revives 1→0; HP 50/100; mode stays play | Pass |
| TC-12 | Mute and volume | All audio silenced or scaled | M: muted true, music gain 0, choir volume 0; volume 30% → master 0.3, music gain 0.30000001192092896; after reload: muted false, master 0.7 (slider 70) | Observed |
| TC-13 | Touch layout, then reload | Layout kept | coarse pointer: true; joystick size set to 160 px → stored {"stickSize":160,"stickLeft":8,"stickBottom":8,"attackSize":92,"moveMode":"joystick"}; after reload size 160 px (slider 160) | Pass |
| TC-14 | Phone in portrait | ROTATE DEVICE overlay | overlay display "flex" on load and "flex" during play; mode play; world kept updating under the overlay: true | Observed |
| E2E | Finale end to end | Victory; save deleted; CONTINUE hidden | cutscene sacrifice → beats → epilogue → "WE WON." ("AGAIN - FOR HIM"); save present: false; CONTINUE display after reload: none | Pass |
| X-01 | Storage blocked | Game stays playable; nothing saved | with every localStorage call throwing: new run, room clear, upgrade, pause and main menu all worked (mode title); CONTINUE display none; uncaught errors: 0 | Pass |
