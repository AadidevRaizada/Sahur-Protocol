"""Builds Game_Design_Project_Report_3.docx.

Starts from the team's Project 2 report (cover, team table, Topics 1 and 2 and their styles), removes the
template instructions, fills the contents table and appends Project Topic 3 (Sahur Protocol).
Run:  python -I gamedesign/report/build_report.py <path to Game_Design_Project_Report_2.docx>
Then: powershell -File gamedesign/report/finalize.ps1 -Pdf   (PDF; hangs when launched from Python, so run it directly)
"""
import copy
import os
import re
import sys

import docx
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SHOTS = os.path.join(ROOT, 'gamedesign', 'assets', 'shots')
FIGS = os.path.join(HERE, 'figs')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)

src = sys.argv[1]
d = docx.Document(src)
body = d.element.body

# ───────────────────────────── 1. remove the template instructions (pages 3–4)
paras = d.paragraphs
i0 = next(i for i, p in enumerate(paras) if p.text.strip() == 'Instructions:')
i1 = next(i for i, p in enumerate(paras) if p.text.strip().startswith('Project Topic 1'))
for p in paras[i0:i1]:
    p._p.getparent().remove(p._p)
topic1 = next(p for p in d.paragraphs if p.text.strip().startswith('Project Topic 1'))
topic1.paragraph_format.page_break_before = True

# ───────────────────────────── 2. contents table
toc = d.tables[1]
for n, row in enumerate(toc.rows[1:], 1):
    c = row.cells[0].paragraphs[0]
    for r in c.runs[1:]:
        r._r.getparent().remove(r._r)
    c.runs[0].text = f'{n}.'
cell = toc.rows[3].cells[1].paragraphs[0]
txt = ''.join(r.text for r in cell.runs)
for r in cell.runs[1:]:
    r._r.getparent().remove(r._r)
cell.runs[0].text = 'Project_Topic3: Sahur Protocol – Game Ideation'
# add an 8th row for References? (row 7 already says References) – keep as is.


# ───────────────────────────── helpers (match Project 2 look: Book Antiqua headings, Times body)
def _run(p, text, bold=None, italic=None, size=None, font='Times New Roman', color=None):
    r = p.add_run(text)
    r.font.name = font
    r.underline = False
    r._r.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), font)
    if bold is not None:
        r.bold = bold
    if italic is not None:
        r.italic = italic
    if size:
        r.font.size = Pt(size)
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return r


def H1(text, new_page=True):
    p = d.add_paragraph()
    p.paragraph_format.page_break_before = new_page
    p.paragraph_format.space_after = Pt(6)
    _run(p, text, bold=True, size=16, font='Book Antiqua')
    return p


def H2(text):
    p = d.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    _run(p, text, bold=True, size=14, font='Book Antiqua')
    return p


def H3(text):
    p = d.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    _run(p, text, bold=True, size=12)
    return p


def rich(p, text, size=12):
    """**bold** and *italic* inline markup."""
    for part in re.split(r'(\*\*[^*]+\*\*|\*[^*]+\*)', text):
        if not part:
            continue
        if part.startswith('**'):
            _run(p, part[2:-2], bold=True, size=size)
        elif part.startswith('*'):
            _run(p, part[1:-1], italic=True, size=size)
        else:
            _run(p, part, size=size)


def P(text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, size=12):
    p = d.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    rich(p, text, size)
    return p


def B(items, size=12):
    for t in items:
        p = d.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.3)
        p.paragraph_format.first_line_indent = Inches(-0.2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.1
        rich(p, '•  ' + t, size)


def caption(text):
    p = d.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(10)
    _run(p, f'[ {text} ]', bold=True, size=11)


missing = []


def IMG(path, width=6.0, cap=None):
    if not os.path.exists(path):
        missing.append(os.path.basename(path))
        return False
    from PIL import Image
    im = Image.open(path).convert('RGB')
    px = int(width * 220)
    if im.width > px:
        im = im.resize((px, round(im.height * px / im.width)), Image.LANCZOS)
    tmp = os.path.join(OUT, '_img', os.path.splitext(os.path.basename(path))[0] + '.jpg')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    im.save(tmp, quality=88)
    p = d.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(tmp, width=Inches(width))
    if cap:
        caption(cap)
    return True


def SHOT(name, cap, width=6.0):
    return IMG(os.path.join(SHOTS, name), width, cap)


def TABLE(head, rows, widths=None, size=10.5):
    t = d.add_table(rows=1, cols=len(head))
    t.style = d.styles['Table Grid']
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]
        c.paragraphs[0].text = ''
        _run(c.paragraphs[0], h, bold=True, size=size)
        tcPr = c._tc.get_or_add_tcPr()
        shd = tcPr.makeelement(qn('w:shd'), {qn('w:val'): 'clear', qn('w:color'): 'auto', qn('w:fill'): 'F2E3C6'})
        tcPr.append(shd)
    for r in rows:
        cells = t.add_row().cells
        for i, v in enumerate(r):
            cells[i].paragraphs[0].text = ''
            rich(cells[i].paragraphs[0], str(v), size)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Inches(w)
    d.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


# ═════════════════════════════════════════════════════════════════════ PROJECT TOPIC 3
H1('Project Topic 3: Sahur Protocol – Game Ideation')
P('**Sahur Protocol** is a top-down 2D action roguelite that runs in any web browser. The player wakes at 3:07 AM in a '
  'world that has been put to sleep by its own feed, and is pulled out of bed by **Tung Tung Tung Sahur**, a living '
  'wooden log with a baseball bat. Together they fight through three broken places, room by room, to pop **The AI '
  'Bubble**, the hype machine at the centre of it all. The game is playable at **sahur-protocol.vercel.app** and its '
  'source is at github.com/AadidevRaizada/Sahur-Protocol.')
SHOT('v3-01-title-fresh.png', 'Title screen of the current build (v3)', 5.6)

H2('a. Source of our idea')
P('The idea came from three places that met in one meme:')
B(['**The meme.** "Tung Tung Tung Sahur" is one of the best-known Italian-brainrot characters of 2025: a wooden figure '
   'with a bat and a three-knock chant. A later viral clip nicknamed him **"Triple T"** and sent him in as a baseball '
   '*pinch hitter* when a team was losing. Our target players already know the character and the chant, so the game '
   'starts with recognition instead of explanation.',
   '**The tradition behind the meme.** In Indonesia, people beat a hollow wooden *kentongan* and call "sahur!" before dawn '
   'during Ramadan to wake the neighbourhood for the pre-dawn meal. We kept that respectfully as the heart of the story: '
   'Sahur\'s job is to **wake people up**. The game credits the tradition on its victory screen and never jokes about '
   'religious practice.',
   '**The thing we wanted to say.** We wanted a light satire of AI and tech hype: a feed that scrolls itself, buzzword '
   'drones, yes-men and a final boss literally called **The AI Bubble**. "Waking up" from an endless feed became the '
   'core metaphor, and the three knocks became both the story and the main mechanic.',
   '**Games we learned from.** The room-by-room structure and upgrade picks come from roguelites such as *Hades*, '
   '*The Binding of Isaac*, *Brotato* and *Vampire Survivors*; the companion who fights beside you and needs protecting '
   'was inspired by escort and companion characters in action games.'])

H2('b. Genre and why we chose it')
TABLE(['Aspect', 'Our choice'], [
    ['Primary genre', 'Top-down **2D arena action roguelite** (room clearing, upgrades between rooms, a boss per biome)'],
    ['Secondary layer', 'A light **rhythm** layer: swings on the music\'s beat hit harder, and the companion\'s slam lands on the beat'],
    ['Narrative layer', 'Short illustrated cutscenes with a sincere companion story and a playable ending'],
    ['Platform', 'Web browser (desktop and phone, portrait or landscape); one HTML file, no install'],
], [1.6, 4.9])
P('**Why a roguelite?** A run is short and complete, every run is different (random upgrade cards, room modifiers, elite '
  'enemies), and failure is quick to recover from because the game checkpoints every room. This suits our players, '
  'who often play in short bursts on a phone. **Why top-down action?** It needs only movement plus one attack button, '
  'which works with a keyboard or two thumbs, and it lets the companion be visible next to the player at all times. '
  '**Why a rhythm layer?** The meme *is* a rhythm (TUNG, TUNG, TUNG). Making on-beat play a bonus rather than a '
  'requirement keeps the game accessible while rewarding players who listen.')

H2('c. Challenges')
P('Following Fullerton\'s formal elements, the conflict in Sahur Protocol comes from three sources: obstacles, opponents '
  'and dilemmas.')
TABLE(['Type', 'Challenge in the game'], [
    ['Opponents', '6 enemy types with distinct behaviours: slopling (chases), buzzword drone (keeps distance and shoots), prompt wraith (drifts then lunges), scraper hand (winds up then grabs), yes-man (circles and shoots), pivot golem (heavy, splits in two on death)'],
    ['Bosses', 'ECHO, THE ENGAGEMENT WRAITH (bullet bursts, summons, dash); THE SCRAPER (spread shots, an "offbeat" ring); THE VALUATION (only damageable for 4 s after it over-extends); THE AI BUBBLE (three phases: HYPE, SCALE, COLLAPSE). Every boss also **snipes at Sahur**.'],
    ['Escalation', 'Enemies per room grow from 5 to 11; enemy HP scales ×1.0 / ×1.35 / ×1.7 across the three biomes; boss timers (0:55, 1:10, 1:30) reward fast clears'],
    ['Protecting a companion', 'In boss fights Sahur has 120 HP. If he is knocked down the player must stand beside him for 1.4 s to help him up, while still dodging'],
    ['Dilemmas', 'Which of three upgrade cards to take, whether to chase an elite for its chest, when to spend the TRIPLE T ultimate, whether to risk staying on the beat'],
    ['Room modifiers', 'Rules that change per room, e.g. SHADOWBANNED (dark arena, light only near you and Sahur), LAG SPIKE (slower but tougher enemies), RATIO\'D (faster enemies)'],
], [1.5, 5.0])

H2('d. Players')
P('**Player count and pattern:** single player, with one AI companion (Sahur) – a *single player versus game* pattern in '
  'Fullerton\'s terms, with a cooperative NPC. **Target audience:**')
TABLE(['Player type', 'Who they are', 'What they get from the game'], [
    ['The meme generation (10–20)', 'Know Tung Tung Tung Sahur and Triple T from short-video platforms', 'The character they know, plus combo names, power-scaling versus cards, grades like "SAHUR SOLOS" and a copyable score line'],
    ['Roguelite fans', 'Play *Hades*, *Brotato*, *Vampire Survivors*', 'Builds, 17 skills, 4 evolutions, elites and chests, bosses with gimmicks, a reason for one more run'],
    ['Casual phone players', 'Have 5–10 minutes on a commute', 'One link, portrait play, auto-swing on touch, saves every room, CHILL difficulty'],
    ['Story players', 'Play for characters and feelings', 'A companion who grows on you and an ending you play, not watch'],
], [1.5, 2.0, 3.0])

H2('e. Goal')
P('**Short-term goal:** clear the current room (defeat every enemy) without losing all HP. **Mid-term goal:** finish each '
  'biome by beating its boss, ideally under the boss timer and without letting Sahur fall. **Long-term goal:** reach the '
  'Core and pop The AI Bubble by answering Sahur\'s three final calls. **Mastery goals** for repeat play: better grades '
  '(D "STILL LOADING" to S+ "SAHUR SOLOS"), higher combos (up to "UNPRICED" at 99 hits), the 13 challenges, the 12 Hall of '
  'TUNG achievements and finishing on SPICY difficulty.')

H2('f. Rules')
H3('Procedures (what the player does)')
B(['Move with **W A S D** / arrow keys (touch: joystick or touch-to-move).',
   'Swing with **Space** / **J** (hold to keep swinging). The swing is a 360° ring of radius 80 px around the player.',
   'Dash with **Shift** / **K**: a short burst with 0.28 s of invulnerability, 0.85 s cooldown.',
   'Fire the **TRIPLE T** ultimate with **E** when its three-segment meter is full.',
   '**Esc** pauses, **M** mutes, **C** shows challenges. Cutscenes advance with Space/Enter/click and can be skipped with *SKIP SCENE >>*.'])
H3('Rules (what governs the world)')
B(['A run is 3 biomes × (3 combat rooms + 1 boss), then the final boss: **13 encounters**.',
   'A room is cleared when no enemies are left; the player then picks **1 of 3 upgrade cards**.',
   'Every room after the first rolls one **room modifier**; the same modifier never appears twice in a row.',
   'A swing within ±0.11 s of the music\'s beat deals **×1.3 damage**; off-beat swings still deal full damage.',
   'Sahur slams (TUNG) automatically on a cooldown, timed to land on the next beat: 26 damage in a 135 px radius.',
   'Taking damage gives 0.7 s of invulnerability. At 0 HP the run ends (**ABSORBED**) unless the player owns *Second Wind*.',
   'The game saves a checkpoint at the start of every room; *RETRY CHECKPOINT* restarts that room.',
   'When two recipe skills both reach level 2, a **BRAINROT GOD** evolution card is guaranteed in the next pick.',
   'The AI Bubble cannot be killed by damage: below 33% HP it collapses, and the player ends it by answering Sahur\'s three TUNG calls.'])
H3('Outcome')
P('**Win:** the three answers pop the Bubble, followed by the dawn epilogue and "WE WON. / BUT AT WHAT COST.". '
  '**Lose:** "ABSORBED", with a grade and the option to retry from the last checkpoint. Each biome also ends in a '
  '**BIOME CLEAR** results card with a grade.')

# ═════════════════════════════════════════════════════════════════════ VISUALIZATION
H1('Project Topic 3: Visualization')
P('We used four visual tools to communicate the design: a **flowchart** of the whole run, a **core-loop diagram**, a '
  '**mind map** of the game\'s pillars, **tables** of content, and a **comic strip / concept art** taken from our 3D '
  'promotional film.')
H2('1. Flowchart: one complete run')
IMG(os.path.join(FIGS, 'fig-flow.png'), 3.55, 'Flowchart of a full run, from the title screen to the ending')
P('The flowchart shows the three nested loops of the game: the **room loop** (fight, then pick an upgrade), the **biome '
  'loop** (three rooms, a versus card, a boss, a results card, a story scene and a skill unlock) and the **run loop** '
  '(three biomes, then the Core). The only failure branch is the player\'s HP reaching zero, and it always returns to the '
  'last checkpoint, which keeps the cost of failure low.')
H2('2. Core loop (30 seconds of play)')
IMG(os.path.join(FIGS, 'fig-loop.png'), 6.5, 'Core gameplay loop')
P('Moment to moment, the player moves and swings, Sahur slams on the beat, hits build a combo, and kills drop aura orbs '
  'that charge the TRIPLE T ultimate. Clearing the room leads to an upgrade, which changes how the next loop feels.')
H2('3. Mind map')
IMG(os.path.join(FIGS, 'fig-mind.png'), 6.5, 'Mind map of the six design pillars')
H2('4. Tables: the world and its bosses')
TABLE(['#', 'Biome', 'Enemies', 'Boss', 'Boss gimmick', 'Music'], [
    ['1', 'HYPE CYCLE FOREST', 'slopling, drone', 'ECHO, THE ENGAGEMENT WRAITH', 'Bullet bursts, summons, dash; after-images', 'forest, 104 BPM'],
    ['2', 'SERVER FARM WASTES', 'scraper hand, drone, wraith', 'THE SCRAPER', 'Spread shots and an "offbeat" bullet ring ("...tung. tung... tung? WRONG.")', 'wastes, 122 BPM'],
    ['3', 'BOARDROOM OF BROKEN PROMISES', 'yes-man, golem, wraith', 'THE VALUATION', 'Only damageable for 4 s after its big burst ("OVEREXTENDED - STRIKE NOW")', 'boardroom, 128 BPM'],
    ['–', 'THE CORE (white arena)', 'Bubble summons', 'THE AI BUBBLE', 'Three phases: HYPE, SCALE, COLLAPSE; ends with the player answering Sahur', 'core, 62 BPM'],
], [0.3, 1.25, 1.1, 1.3, 1.85, 0.8], size=9.5)
H2('5. Comic strip and concept art')
P('Our wordless 75-second promotional film was storyboarded as a comic before it was built in 3D. Six frames from it '
  'retell the story in strip form:')
IMG(os.path.join(FIGS, 'fig-comic.png'), 6.5, 'Comic strip of the story, from frames of our promotional film')
P('The character concept for Sahur (a cream-coloured player "blob" and a tall wooden log with a bat) was kept identical '
  'between the 2D game sprites and the 3D film models, so the trailer and the game feel like the same world.')

# ═════════════════════════════════════════════════════════════════════ GDD
H1('Project Topic 3: Game Design Document')
H2('1. Overall Vision')
TABLE(['Question', 'Answer'], [
    ['Working title', 'Sahur Protocol'],
    ['High concept (one line)', 'Your best friend is a log with a bat, and the final boss is the AI hype bubble.'],
    ['Elevator pitch', 'A fast, funny browser roguelite where you and Tung Tung Tung Sahur fight through a world that fell asleep to its feed, and wake it up three knocks at a time.'],
    ['Genre / platform', '2D top-down action roguelite with a rhythm bonus; web browser on desktop and mobile'],
    ['Target audience', 'Meme-literate players aged about 10–20, roguelite fans, casual phone players, story players'],
    ['Player experience goal', 'Laugh at the jokes, feel powerful in the fights, and by the end genuinely care about Sahur'],
    ['Unique selling points', 'TRIPLE T baseball ultimate; swing on the companion\'s beat; protect a companion who protects you; a finale the player performs; one link, no install'],
    ['Tone', 'Strange, urgent, heartfelt: pixel horror, internet satire and a sincere sacrifice'],
    ['Session length', 'One room is under a minute; a full run is 13 encounters, checkpointed every room'],
], [1.7, 4.8])

H2('2. Mechanics')
P('Mechanics are the rules and components of the game (the *M* in the MDA framework of Hunicke, LeBlanc and Zubek).')
TABLE(['Mechanic', 'Exact rule in the build'], [
    ['Player', '100 HP (+4 per completed challenge), 225 px/s, swing 13 damage every 0.38 s in an 80 px ring'],
    ['Dash', '0.16 s at 780 px/s, 0.85 s cooldown, 0.28 s invulnerability'],
    ['On-beat swing', 'Within ±0.11 s of a beat: ×1.3 damage, an "ON BEAT" tag and double ultimate charge'],
    ['Sahur\'s TUNG', '26 damage in a 135 px radius with knockback; cooldown about 3.5 / 4.3 / 5.1 s by biome; waits for the next beat'],
    ['Sahur\'s health', '120 HP in boss fights only; regenerates after 3 s untouched; knocked down at 0, helped up by standing within 64 px for 1.4 s'],
    ['TRIPLE T ultimate', 'Meter fills from hits, kills and orbs. Press E: a 2.7 s broadcast sequence, three knocks, then a HOME RUN that launches every enemy and deals max(90, 17% of boss max HP) to the boss. Player invulnerable throughout'],
    ['Combo', '+1 per hit, resets after 2.6 s idle; tier names at 3, 6, 9, 15, 25, 40, 60 and 99 hits; score ×(1 + combo/30), capped at ×3'],
    ['Upgrades', '17 skills in 4 families (SIGNAL, GROUNDING, NOSTALGIA, CHAOS) and 5 rarities; 11 picks per run; weighted towards rarer and already-owned skills'],
    ['Evolutions', 'THREE-PEAT, FIFTH TUNG, FAMILY MEAL, PERFECT PITCH, each unlocked by two recipe skills at level 2+'],
    ['Elites and chests', 'About 4.5% of enemies spawn as Gold (70%), Diamond (24%) or Rainbow (6%) with more HP; their chests give free skill levels'],
    ['Room modifiers', 'ALGORITHM BOOST, RATIO\'D, GOLDEN HOUR, LAG SPIKE, TRENDING, SHADOWBANNED, PATCH NOTES, TOUCH GRASS (and two more defined)'],
    ['Drops', 'Aura orbs (score and ultimate charge), rice boxes (heal 14 HP), snacks in boss fights (heal Sahur 30%)'],
    ['Difficulty', 'CHILL: take ×0.5 damage, enemies ×0.85 HP, Sahur ×1.5 HP. SPICY: take ×1.35 damage, enemies ×1.35 HP, ×1.6 score, ×1.8 elites'],
], [1.5, 5.0], size=10)

H2('3. Dynamics')
P('Dynamics are the run-time behaviour that emerges when the player meets the mechanics.')
B(['**Positioning dance.** Because the swing is a ring around the player, the best play is to pull enemies into a tight '
   'group and then hit them all at once, ideally right before Sahur\'s TUNG lands. Players naturally learn to "herd" '
   'enemies towards the log.',
   '**Listening to the music.** The ×1.3 on-beat bonus and the beat-snapped TUNG push players to swing in time. Over a '
   'few rooms the intent is that players swing in time without being told; off-beat play is never punished.',
   '**Risk and reward around elites.** A shiny elite is tougher, but its chest is a free upgrade. Under GOLDEN HOUR '
   'elites are four times as common, which changes how aggressively players play that room.',
   '**Guarding the companion.** In boss fights the boss telegraphs a red line at Sahur. Players learn to stand in the line '
   'to block, or to rush to him when he falls, which creates tense "leave the fight to save a friend" moments.',
   '**Saving the ultimate.** TRIPLE T charges slowly, so players decide whether to clear a crowded room now or keep it for '
   'the boss, where it deals a guaranteed chunk of damage and pierces The Valuation\'s shield.',
   '**Build-crafting.** Weighted card draws make a build "snowball"; once players know an evolution recipe they start '
   'choosing cards to reach it.',
   '**Combo chasing.** Score multipliers, rising pitch and tier names reward continuous aggression, balanced by enemy '
   'bullets and contact damage.'])

H2('4. Aesthetics')
P('Aesthetics are the emotional responses we want (using the MDA taxonomy of eight kinds of fun):')
TABLE(['Aesthetic (MDA)', 'How the game delivers it'], [
    ['Sensation', 'Hit-stop of 40–300 ms, knockback, squash and stretch, screen shake capped at 14 px, a 0.55 s slow-motion on the last kill, haptics on phones, a pitch that climbs with the combo'],
    ['Fantasy', 'Being chosen by a meme legend; a broadcast-style home run with announcer captions ("NOW BATTING... TRIPLE T.")'],
    ['Narrative', '8 illustrated scenes and 53 lines: the 3:07 AM wake-up, the campfire lesson ("Always three. Two is rumor. Three is a call."), the sacrifice and the dawn'],
    ['Challenge', 'Bosses with gimmicks, boss timers, grades, SPICY mode, 13 challenges, Hall of TUNG'],
    ['Fellowship', 'A companion who talks back and needs you; a COPY SCORE line to share in group chats'],
    ['Discovery', 'Room modifiers, rare Rainbow elites, hidden evolution recipes, a rival cameo (GRR GRR PATATAM)'],
    ['Expression', 'Build choices across 17 skills and 4 evolutions; difficulty and control preferences'],
    ['Submission', 'CHILL mode and auto-swing let a tired player simply enjoy the rhythm and the story'],
], [1.5, 5.0], size=10)
P('**Look and sound.** Neon-on-black pixel art drawn on an HTML5 canvas, one accent colour per biome (green, amber, cyan, '
  'then a white Core), a CRT scanline overlay, readable Verdana text for menus and dialogue, and *Press Start 2P* for '
  'titles. All music is synthesised in code (a 16-step sequencer with six tracks from 62 to 142 BPM); the only recorded '
  'audio is the "TUNG TUNG TUNG SAHUUUR" choir on the title screen and in the finale.')

H2('5. Development')
TABLE(['Item', 'Detail'], [
    ['Engine / language', 'No engine. One HTML file (1.17 MB, 3,671 lines) with vanilla JavaScript, the Canvas 2D API and the Web Audio API'],
    ['Why not Unity', 'A browser build had to open instantly from a link on any phone; a single HTML file has no download, no install and no build step. The design concepts from class (components, state, loops, object-oriented thinking) map directly onto the JavaScript data tables and state machine'],
    ['Architecture', 'A game-state machine (title, cutscene, choose, play, pause, beats, end), data tables for skills, enemies, biomes, bosses, cutscenes and modifiers, and a requestAnimationFrame loop'],
    ['Saving', 'Browser localStorage: run checkpoint, controls, audio, preferences and Hall of TUNG'],
    ['Deployment', 'Static hosting on Vercel (sahur-protocol.vercel.app); source on GitHub'],
    ['Marketing assets', 'A 75-second wordless 3D promotional film made with Remotion and three.js, with an original synthesised score'],
    ['Prototypes', 'Paper and digital prototype v0.2 → playtested v3 → a separate 3D renderer prototype of the final boss fight'],
    ['Iteration process', 'Build, play, write down what felt wrong, research how other games solve it (game feel, onboarding, mobile), change one system at a time, re-test'],
    ['Team', 'Aadidev (N152), Aditya (C115), Arnav (C114), Zeshawn (C118), Viraj (C095)'],
], [1.5, 5.0], size=10)
P('**Layered tetrad (Gibson).** *Inscribed layer:* the rules, numbers, art, cutscene text and synthesised music written into '
  'the file. *Dynamic layer:* the herding, on-beat play, protect-the-companion moments and build-crafting that appear '
  'only in play. *Cultural layer:* the Italian-brainrot meme, the Triple T baseball clip, the Indonesian kentongan '
  'tradition, and the shareable score line that carries the game back into group chats.')

# ═════════════════════════════════════════════════════════════════════ PROTOTYPING
H1('Project Topic 3: Prototyping')
P('We built a **digital prototype**, because the core of the game (real-time movement, a companion acting on a '
  'rhythm, music) cannot be judged on paper. It went through two playable versions: **v0.2** proved the whole run from '
  'title to ending, and after testing it we built **v3**, the current prototype shown below. A separate **3D prototype** '
  'of the final fight explores where the game could go next.')
H2('Stage 1 – Digital prototype v0.2')
P('v0.2 (July 2026) implemented the full run: three biomes, four bosses, 11 skills, seven cutscenes, saving and touch '
  'controls. It was deployed on Vercel and tested (see Play Testing). Its main weaknesses were a flat combat feel, no '
  'score or reason to replay, a non-interactive ending, and some missing safety features.')
H2('Stage 2 – Digital prototype v3 (current build), scene by scene')
scenes = [
    ('v3-01-title-fresh.png', 'Title screen', 'SAHUR PROTOCOL / TUNG TUNG TUNG with WAKE UP, CONTINUE (only when a save exists), How to play, Story and Options. The choir starts on the first key press.'),
    ('v3-02-difficulty-options.png', 'Options and difficulty', 'CHILL / NORMAL / SPICY with a one-line description each, auto-swing, screen shake, sound, volume and the mobile control layout.'),
    ('v3-03c-prologue-sahur.png', 'Prologue cutscene', 'An illustrated panel with a typewriter dialogue box. Sahur breaks into the apartment "because you ignored three calls". Every scene can be skipped.'),
    ('v3-09a-first-upgrade.png', 'First upgrade', 'Before the first room the player picks one of three skill cards, each showing rarity, family, effect and level.'),
    ('v3-04-biome1-combat.png', 'Biome 1 – Hype Cycle Forest', 'Combat with sloplings and drones. The HUD shows HP, the BEAT light, the TRIPLE T meter, score, aura and the combo counter; Sahur\'s TUNG ring is visible.'),
    ('v3-08a-modifier.png', 'Room modifier', 'Every room after the first announces a modifier card for 3.2 s, then keeps its name under the score.'),
    ('v3-07a-elite.png', 'Elite enemy', 'A crowned elite with its coloured ring and HP sliver; killing it drops a chest.'),
    ('v3-07b-chest.png', 'Chest', 'The chest grants a free skill level with a toast such as "GOLD CHEST. Shiny. Take it."'),
    ('v3-09b-upgrade-choice.png', 'Choose an upgrade', 'After each cleared room: three weighted cards. An evolution card appears here when its recipe is complete.'),
    ('v3-10-evolution.png', 'BRAINROT GOD evolution', 'With Louder Voice and Quick Wit at level 2, the FIFTH TUNG evolution card appears with its rainbow border.'),
    ('v3-11b-walkup.png', 'TRIPLE T – walk-up', 'The world freezes, letterbox bars and a LIVE tag appear, and the announcer caption plays while Sahur steps up to the plate.'),
    ('v3-11d-home-run.png', 'TRIPLE T – home run', 'Every enemy is launched off-screen, bullets are cleared and the boss takes a guaranteed hit.'),
    ('v3-12b-versus-echo.png', 'Versus card', 'Before each boss a power-scaling card: "SAHUR VS ECHO", "AURA: 12 vs 9000".'),
    ('v3-13a-boss-echo.png', 'Boss – Echo', 'Boss bar, boss timer, bullet bursts and the snipe line aimed at Sahur, whose HP bar appears in boss fights.'),
    ('v3-20a-cutscene-campfire.png', 'End of biome 1 – campfire', 'SAHUR: "Lesson. TUNG, TUNG, TUNG. Always three. Two is rumor. Three is a call."'),
    ('v3-05-biome2-combat.png', 'Biome 2 – Server Farm Wastes', 'Scraper hands wind up and grab; wraiths lunge. Enemy HP is ×1.35.'),
    ('v3-13b-boss-scraper.png', 'Boss – The Scraper', 'A data core orbited by grasping hands, with its "offbeat" ring attack.'),
    ('v3-06-biome3-combat.png', 'Biome 3 – Boardroom of Broken Promises', 'Yes-men circle and shoot, pivot golems split into two on death.'),
    ('v3-13c-boss-valuation.png', 'Boss – The Valuation', 'A growing "$NB" figure over an up-only chart; it can only be hit for 4 s after its big burst.'),
    ('v3-16a-biome-clear-1.png', 'Biome clear and grade', 'Results card with grade, kills (TUNGS), best combo, on-beat %, aura, Sahur saves, time and a COPY SCORE button.'),
    ('v3-14b-bubble-phase1.png', 'The AI Bubble – phase 1', 'The white Core arena; the iridescent Bubble with its almost-right face fires bursts, spreads and spirals.'),
    ('v3-14d-bubble-collapse.png', 'The AI Bubble – collapse', 'Below 33% HP the music stops, the Bubble leaks and Sahur\'s TUNG stops.'),
    ('v3-15b-finale-call.png', 'Finale – answer him', 'Sahur calls TUNG and the prompt "ANSWER HIM" appears; the player\'s three answers pop the Bubble.'),
    ('v3-15e-epilogue.png', 'Dawn epilogue', 'The player wakes at dawn and knocks three times; the scene ends with "...sahur?".'),
    ('v3-15f-epilogue-title.png', 'Epilogue I card', 'Black title cards: "EPILOGUE I / THE FIRST ANSWER", the sequel stinger and "TO BE CONTINUED".'),
    ('v3-16b-victory.png', 'Victory', '"WE WON. / BUT AT WHAT COST." with the final grade and stats, then "AGAIN - FOR HIM".'),
    ('v3-17-game-over.png', 'Game over', '"ABSORBED" with a grade and RETRY CHECKPOINT.'),
    ('v3-18d-mobile-play.png', 'Mobile, portrait', 'The arena becomes 540×960, the HUD moves to the top, and the joystick, DASH and SWING buttons sit under the thumbs (here in a GOLDEN HOUR room with a gold elite).'),
    ('v3-18f-mobile-triple-t.png', 'Mobile, TRIPLE T', 'The broadcast sequence in portrait: LIVE PINCH HITTER, "NOW BATTING... TRIPLE T."'),
]
avail = set(os.listdir(SHOTS)) if os.path.isdir(SHOTS) else set()
n = 0
for f, title, desc in scenes:
    alt = f if f in avail else next((a for a in sorted(avail) if a.startswith(f[:6]) and title.split()[0].lower() in a), None)
    if not alt or alt not in avail:
        missing.append(f)
        continue
    n += 1
    H3(f'Scene {n}: {title}')
    P(desc)
    portrait = 'mobile' in alt or 'portrait' in alt
    SHOT(alt, title, 2.6 if portrait else 5.4)

H2('Stage 3 – 3D prototype of the final fight')
SHOT('v3-19a-3d-bubble.png', '3D renderer prototype: The AI Bubble fight', 5.4)
SHOT('v3-19e-3d-pop.png', '3D prototype: the three answers pop the Bubble', 5.4)
P('A separate build renders the final fight in WebGL 3D, reusing the models of our promotional film, while the 2D game '
  'logic stays unchanged underneath. It offers 3D-high, 3D-low and 2D quality modes and drops quality automatically if '
  'the frame rate falls below 40 fps.')

H2('What changed between prototypes, and why').paragraph_format.page_break_before = True
TABLE(['Area', 'v0.2', 'v3', 'Reason'], [
    ['Combat feel', 'Screen shake only', 'Hit-stop, knockback, squash, slow-mo, haptics, rising combo pitch', 'Make every hit feel heavy'],
    ['Player verbs', 'Move, tap to swing', '+ dash, hold to swing, TRIPLE T, auto-swing option', 'More to master; less tapping on phones'],
    ['Rhythm', 'Theme only', 'On-beat swings ×1.3; TUNG lands on the beat', 'The name promised rhythm, the play did not deliver it'],
    ['Sahur', 'Invulnerable', 'Has HP in boss fights; you help him up', 'Give players a reason to protect him'],
    ['Ending', 'Watched', 'Played: answer three calls, knock three times', 'Give the player\'s hands the emotional climax'],
    ['Replay value', 'No score', 'Score, combos, grades, Hall of TUNG, elites, modifiers, evolutions', 'Give a reason for a second run'],
    ['Safety', 'New game erased the save silently', '"START OVER?" confirm; audio settings saved', 'Found in black-box testing (TC-09)'],
    ['Mobile', 'Landscape only', 'Portrait and landscape layouts', 'Phones are held upright'],
    ['Access', 'No options', 'CHILL / NORMAL / SPICY, shake off, skippable scenes', 'Wider audience'],
], [1.1, 1.4, 2.4, 1.6], size=9.5)

# ═════════════════════════════════════════════════════════════════════ PLAY TESTING
H1('Project Topic 3: Play Testing')
H2('1. Feedback form')
P('We used the following form with testers (team members, other groups, and family and friends outside the course). '
  'Questions 1–20 use a 1–5 scale (1 = strongly disagree, 5 = strongly agree) unless stated.')
form = [
    ['Functional', '1. The game loaded and ran without crashing.', 'Yes / No'],
    ['Functional', '2. The controls did what I expected (move, swing, dash, TRIPLE T).', '1–5'],
    ['Functional', '3. My progress was saved when I came back.', 'Yes / No'],
    ['Internally complete', '4. I always knew what to do next (room, upgrade, boss).', '1–5'],
    ['Internally complete', '5. The rules made sense; nothing felt like a dead end or a loophole.', '1–5'],
    ['Internally complete', '6. Upgrade and modifier descriptions matched what actually happened.', '1–5'],
    ['Balanced', '7. The difficulty rose at a fair pace.', '1–5'],
    ['Balanced', '8. Which boss was hardest? Was any too easy?', 'Open'],
    ['Balanced', '9. Some upgrades felt far stronger or weaker than others.', '1–5'],
    ['Balanced', '10. Highest biome reached and difficulty used.', 'Open'],
    ['Fun', '11. I wanted to play another run.', '1–5'],
    ['Fun', '12. Hitting enemies felt satisfying.', '1–5'],
    ['Fun', '13. TRIPLE T was exciting to use.', '1–5'],
    ['Fun', '14. I cared about Sahur by the end.', '1–5'],
    ['Fun', '15. Best moment / most boring moment.', 'Open'],
    ['Accessible', '16. All text was readable on my screen.', '1–5'],
    ['Accessible', '17. The touch controls were comfortable (phone players).', '1–5'],
    ['Accessible', '18. I could understand the game without the meme background.', '1–5'],
    ['Accessible', '19. Flashing or shaking was uncomfortable.', 'Yes / No'],
    ['Accessible', '20. Device, browser and orientation used.', 'Open'],
]
TABLE(['Area', 'Question', 'Answer type'], form, [1.4, 4.1, 1.0], size=10)

H2('2. Test protocol')
B(['**Who:** team members, members of other groups, and family and friends outside the course, on their own '
   'laptops and phones.',
   '**How:** each tester opens the live link with no instructions beyond "play until you want to stop". An observer notes '
   'where they hesitate, die or laugh, and the tester then fills in the form.',
   '**Automated checks:** to answer "is it functional?" objectively, we also scripted black-box tests that drive the '
   'unmodified game in Chrome with real keyboard, mouse and touch input and record the results.'])

H2('3. Automated black-box test results')
LOGS = [os.path.join(ROOT, 'gamedesign', 'research', 'test-log-v3.md'), os.path.join(ROOT, 'report', 'research', 'test-log.md')]
log = next((l for l in LOGS if os.path.exists(l)), None)
if log:
    rows = []
    for line in open(log, encoding='utf8'):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if line.startswith('|') and len(cells) >= 5 and cells[-1].split()[0] in ('Pass', 'Fail', 'Observed'):
            rows.append([cells[0], cells[1], cells[-1]])
    P(f'The table summarises the automated run recorded in *{os.path.relpath(log, ROOT)}* (full observed values are kept in that log).')
    TABLE(['ID', 'Scenario', 'Verdict'], rows, [0.7, 4.6, 1.2], size=9.5)
    passed = sum(1 for r in rows if r[2].lower().startswith('pass'))
    P(f'**{passed} of {len(rows)}** scenarios passed. Every gameplay system worked; all four failures and the one '
      '"observed" case are places where on-screen text promises something the code does not do (listed under question b '
      'below). Some preconditions (for example a full TRIPLE T meter, or jumping straight to a boss) were set by script to '
      'save time; the log lists each one.')
    H3('Performance')
    TABLE(['Setup', 'Frames in 10 s', 'Worst frame (ms)', 'Frames over 33 ms', 'Game-loop cost avg / worst (ms)'], [
        ['Desktop 1280×720, biome 3, 28 enemies', '1,440', '7.2', '0', '0.6 / 1.9'],
        ['Phone emulation, CPU slowed 4×, 28 enemies', '1,421', '20.8', '0', '2.9 / 11.6'],
    ], [2.4, 1.0, 1.0, 1.0, 1.1], size=9.5)
    P('Even on a phone emulated at a quarter of normal CPU speed, the game\'s own work per frame stayed well under the '
      '16.7 ms budget for 60 fps, and no uncaught errors appeared in any test.')

H2('4. Answers to the five play-testing questions')
H3('a. Is the game functional?')
P('Yes. The whole run can be completed from the title screen to the victory screen on desktop and mobile browsers, '
  'with saving, pausing, retrying from a checkpoint, touch controls and every cutscene working (see the automated '
  'results above: 0 crashes, 0 soft-locks, 0 uncaught errors). The game also keeps working when browser storage is '
  'blocked, and it pauses itself when the tab is hidden.')
H3('b. Is the game internally complete?')
P('Mostly. Every state has a way in and a way out, the Bubble fight cannot soft-lock (if the player does not answer within '
  '5 s, the game answers for them), and there is no dead end. Our own audit of the rules against the code found a few '
  'loose ends that we have logged for the next version:')
B(['The BEAT DROP room modifier ("On the beat, it counts twice") is announced but has no effect (BEAT-02), and SPONSORED is defined but never rolls.',
   'TRENDING promises "more score" but only adds enemies (MOD-03).',
   'The first upgrade screen says "Nine core skills" although 14 are available (COPY-01).',
   'FAMILY MEAL says it heals "you and Sahur" but heals only the player (EVO-02).',
   'The CHILL and SPICY descriptions mention enemy speed and heal changes that the game does not apply (DIFF-02).'])
P('None of these break play, and each is a one-line fix: either implement the promised effect or correct the text.')
H3('c. Is the game balanced?')
P('Difficulty rises on several axes at once but gently: enemies per room 5 → 11, enemy HP ×1.0 → ×1.7, Sahur\'s TUNG slows '
  'from about 3.5 s to 5.1 s between slams, and each boss adds a new rule. Healing (rice boxes, room-clear heals, '
  '+4 max HP per challenge) and the low cost of failure (retry the same room) keep frustration down. Upgrade weights favour '
  'rarer and already-owned skills, which makes builds snowball; this is deliberate but needs watching, because a strong '
  'build can trivialise biome 3. CHILL and SPICY give roughly ±35–50% on damage taken and enemy health for players at both '
  'ends of the skill range. Boss health is not scaled by difficulty, so boss timers stay comparable across modes.')
H3('d. Is the game fun?')
P('The fun is built from layered feedback: hit-stop, knockback, shake and a rising pitch on every hit; combo names that '
  'escalate from "TUNG TUNG TUNG" to "UNPRICED"; the TRIPLE T home run as a burst of power; and variety from modifiers, '
  'elites and evolutions. Grades and the Hall of TUNG give reasons for another run, and the playable ending turns the '
  'story into a moment the player performs.')
H3('e. Is the game accessible?')
P('It opens from a link with no install, runs in portrait or landscape, and offers a large touch layout with adjustable '
  'joystick and button sizes, auto-swing (on by default on touch), CHILL difficulty, a screen-shake switch, support for '
  'the operating system\'s reduced-motion setting (which also caps flashes), skippable cutscenes, saved volume and mute, '
  'and readable body text. Still missing: key remapping, colour-blind options, a text-size setting and gamepad support.')


# ═════════════════════════════════════════════════════════════════════ REFERENCES
H1('Project Topic 3: References')
H2('Offline assistance')
B(['Course lectures and guidance of our faculty, Prof. Pratidnya S. HegdePatil, Game Design (Open Elective-1), MPSTME.',
   'Playtesters: team members, other course groups, and family and friends who played the prototypes.'])
H2('Books and papers')
refs = [
    'T. Fullerton, *Game Design Workshop: A Playcentric Approach to Creating Innovative Games*, 4th ed. CRC Press, 2018.',
    'J. G. Gibson, *Introduction to Game Design, Prototyping, and Development*. Pearson Education, 2015.',
    'J. Schell, *The Art of Game Design: A Book of Lenses*, 2nd ed. CRC Press, 2014.',
    'E. Adams, *Fundamentals of Game Design*, 3rd ed. Pearson Education, 2013.',
    'K. Salen Tekinbaş and E. Zimmerman, *Rules of Play: Game Design Fundamentals*. MIT Press, 2003.',
    'R. Hunicke, M. LeBlanc and R. Zubek, "MDA: A Formal Approach to Game Design and Game Research," AAAI Workshop on Challenges in Game AI, 2004.',
    'B. Winn, "The Design, Play, and Experience Framework," in *Handbook of Research on Effective Electronic Gaming in Education*, vol. 3, ch. 58, 2009.',
    'S. Swink, *Game Feel: A Game Designer\'s Guide to Virtual Sensation*. Morgan Kaufmann, 2009.',
]
B(refs, 11)
H2('Online assistance')
online = [
    'Coursera, "Principles of Game Design," Michigan State University (reference e-course).',
    'Know Your Meme, "Tung Tung Tung Sahur" and "Tung Tung Tung Sahur / Triple T Baseball GIF": knowyourmeme.com.',
    'Wikipedia, "Italian brainrot": en.wikipedia.org/wiki/Italian_brainrot.',
    'MDN Web Docs: Canvas API, Optimizing canvas, Web Audio API, Window.localStorage: developer.mozilla.org.',
    'M. Jonasson and P. Purho, "Juice it or lose it" (talk), and Vlambeer, "The art of screenshake" (talk): game-feel references.',
    'Reference games studied: *Hades* (Supergiant Games), *The Binding of Isaac* (Edmund McMillen), *Brotato* (Blobfish), *Vampire Survivors* (poncle).',
    'Tools: Vercel (hosting), GitHub (version control), Remotion and three.js (promotional film and 3D prototype), Puppeteer (automated testing and screenshots), Mermaid (flowcharts).',
    'Live game: https://sahur-protocol.vercel.app · Source: https://github.com/AadidevRaizada/Sahur-Protocol',
]
B(online, 11)

out = os.path.join(OUT, 'Game_Design_Project_Report_3.docx')
d.save(out)
print('saved', out)
if missing:
    print('MISSING:', ', '.join(missing))

# ───────────────────────────── page numbers into the contents table, then PDF (Word, via finalize.ps1)
import subprocess
PS = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', os.path.join(HERE, 'finalize.ps1')]
res = subprocess.run(PS + ['-Pages'], capture_output=True, text=True, timeout=300)
print(res.stdout.strip()[-200:], res.stderr.strip()[:300])
pages = dict(l.strip().split('=') for l in res.stdout.splitlines() if re.match(r'^\d+=\d+$', l.strip()))
print('pages', pages)
d = docx.Document(out)
toc = d.tables[1]
for row, pg in pages.items():
    row = int(row) - 1
    if row < len(toc.rows):
        p = toc.rows[row].cells[2].paragraphs[0]
        p.text = ''
        _run(p, pg, size=12)
d.save(out)
print('docx done; now run: powershell -File gamedesign/report/finalize.ps1 -Pdf  (from an interactive shell)')
