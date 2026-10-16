---
type: appendix
letter: A
title: "How to Play: Controls & Screens"
kicker: Everything you can press, tap or click, and what every screen means.
objectives:
  - Keyboard controls
  - Touch controls and the layout sliders
  - Menus and screens, from WAKE UP to the end
  - HUD legend
---

This appendix is a player's reference for the final build. It covers desktop and touch play; there is no gamepad support and keys cannot be remapped.

## Keyboard and mouse

Table: Keyboard and mouse controls {#tbl:appa-keys}
| Action | Input | Notes |
|---|---|---|
| Move | [[W]] [[A]] [[S]] [[D]] or arrows | Eight directions; diagonals are not faster |
| Swing the bat | [[Space]] or [[J]] | Tap once per swing; holding does not repeat; 0.38 s cooldown |
| Pause and resume | [[Esc]] | Works during play and on the pause screen |
| Mute or unmute | [[M]] | Works on every screen |
| Challenge panel | [[C]] | Opens or closes the list of eleven challenges |
| Advance cutscene | [[Space]], [[Enter]] or a click | First press finishes the line, second press moves on |
| Menus and cards | Mouse click | The mouse never attacks |

Sahur needs no input at all. He follows the player and performs his TUNG slam on his own timer.

::: plain
Left hand walks, right thumb bonks. That is the whole control scheme. Sahur handles his own TUNGs, which makes him the only teammate in gaming history who never asks you to press anything for him.
:::

## Touch controls

Touch controls appear automatically on phones and tablets (any device whose main pointer is a finger). The layout can be changed from **Options** on the title screen or from **Pause → CONTROLS** during a run, and the settings are remembered between visits.

Table: Touch controls and their adjustable settings {#tbl:appa-touch}
| Control or setting | Where | Range | Default |
|---|---|---|---|
| Move mode | Options or Pause → CONTROLS | Joystick, or Touch to move | Joystick |
| Joystick size | Bottom-left stick | 96–190 px | 128 px |
| Joystick horizontal position | Distance from the left edge | 3–24 vw | 8 vw |
| Joystick height from bottom | Distance from the bottom edge | 3–24 vh | 8 vh |
| SWING button size | Bottom-right button | 72–150 px | 92 px |

In **Touch to move** mode the stick is hidden and the player walks towards the finger. Tapping the top-right corner of the arena opens the challenge panel, and the **II** button at the top-left pauses. The game is meant to be played in landscape: in portrait a ROTATE DEVICE screen appears and the game tries to switch to full screen and lock the orientation.

:::: gallery cols="2"
::: figure src="shots/16-mobile-touch.png" id="appa-touch-shot" frame="crt"
Touch play in landscape: joystick at the bottom left, SWING at the bottom right, and Sahur's TUNG ring in the middle.
:::
::: figure src="shots/04c-pause-controls.png" id="appa-controls-shot" frame="crt"
Pause → CONTROLS, with the move-mode switch and the four layout sliders at their defaults.
:::
::::

## Screens and menus

Table: Screens and the options on each {#tbl:appa-screens}
| Screen | What it offers | Notes |
|---|---|---|
| Title | WAKE UP, CONTINUE, How to play, Story, Options | CONTINUE appears only when a save exists; there is no Exit button |
| How to play | Controls summary and the goal of a run | Back returns to the title |
| Story | One paragraph of premise | Cutscenes are seen only during a run |
| Options | Music and sound On/Off, Volume (0–100, default 70), mobile controls | Sound settings reset when the page reloads |
| Cutscene | Picture, speaker name and text; hint "SPACE / CLICK >" | No skip-all; text waits for the player |
| Upgrade picker | FIRST UPGRADE, CHOOSE AN UPGRADE, FINAL UPGRADE or SIGNAL ROLL | Click or tap a card (Appendix C) |
| Pause | CONTROLS, RESUME, MAIN MENU, RESTART RUN | Pausing saves; RESTART RUN deletes the save |
| Game over | "ABSORBED" | RETRY CHECKPOINT if a save exists, otherwise WAKE UP AGAIN |
| Victory | "WE WON." / "BUT AT WHAT COST." | AGAIN - FOR HIM starts a new run; the save is deleted |

## HUD legend

Table: Elements of the in-game HUD {#tbl:appa-hud}
| Element | Position | Meaning |
|---|---|---|
| HP bar | Bottom-left | Current and maximum HP, e.g. "HP 97/118"; turns red below 30% |
| UPGRADES line | Above the HP bar | Every skill owned and its level, e.g. "Wider Bat Lv.2" |
| Area label | Bottom-right | Biome name and "ROOM n/3"; the room part is hidden in boss fights |
| Challenges | Top-right | "CHALLENGE COMPLETE" toast and the "C CHALLENGES n/11" toggle |
| II | Top-left | Pause button |
| Boss bar | Top-centre | Boss name, HP bar and BOSS TIMER "m:ss / limit", cyan under the limit and red over it |
| "!" rings | Arena edges | An enemy will enter here in 0.7 s |
| Rhythm meter | Above Sahur | Fills towards his next TUNG; turns red when his rhythm is gone |
| Pop-ups | Over targets | Damage numbers (gold when boosted), "TUNG!", "PIVOT!", "NOT YET", "SECOND WIND" |

::: plain
If you remember only three things: the green bar is you, the little meter above Sahur tells you when the next TUNG lands, and a pulsing "!" at the edge means company is coming in 0.7 seconds.
:::
