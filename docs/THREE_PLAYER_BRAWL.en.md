[简体中文](THREE_PLAYER_BRAWL.md) | **English** | [日本語](THREE_PLAYER_BRAWL.ja.md)

# Three-player brawl

Choose **三人混战** on the main menu for a local match with 1P against two CPUs; each side then picks three characters in turn.
Online, the host sets the battle mode to **三人混战**; the other two join with the same room number, and the match starts once all three have picked and readied.
Online, everyone uses their own normal 1P keys. The mode identifier is `3ffa`, protocol version 23.

- All three characters are on stage at once, each fighting for themselves; normal attacks, heavy attacks and area skills hit other players by their actual reach, and a projectile hits whoever it touches first.
- When the active character is knocked down, that side shows a 5-second reserve countdown while the other two keep moving and attacking.
- After 5 seconds the next character switches in by selection order, at full health with at least 30 energy and 1 second of entry protection; the unlimited-energy rule still means 100 energy.
- A side is eliminated when its three characters are exhausted; a player with a reserve still waiting is not eliminated. The last surviving side wins, and a simultaneous full elimination is a draw.
- Custom timers still apply; when time runs out the remaining character count is compared first, then current health, and an exact tie is a draw. Unlimited time can be enabled.
- A side cannot pick the same character twice, but different players may share a character; brawls do not enable bans. Stages, multi-height terrain and the other custom battle rules still apply.
- Pausing freezes the battle and the reserve countdown, and restarting restores all three full lineups. When someone disconnects, the online match pauses so nobody is eliminated while disconnected.
- A single knockdown does not pop up the full-screen result; the result plays only when the match finally ends. Super finishes keep the 1-second super art cut-in and the advance after the voice line finishes.

The implementation still shares one set of battle rules between the browser and the Scala/GraalJS server. `npm run check` includes regression checks for three-way input, two-target attacks, the exact 5000 ms reserve handoff, protection and energy, simultaneous elimination, third-party wins, pause and restart, and snapshots.
The temporary browser and three-endpoint online evidence is kept in the ignored `output/brawl/` directory.

After updating, restart the online host and have all three players refresh to the same version.
