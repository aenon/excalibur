# The Resistance: Avalon — Rules Reference

Reference for developers and agents building Excalibur, and for players who need a reminder.

**Excalibur follows the standard Avalon set but implements only a subset of it** — at MVP the app covers rooms, role assignment, and post-game review. The rest (quests, voting, Assassin phase, etc.) is played offline; this doc describes the full game so the app stays aligned with the rules and can support more of the flow later. The development plan is open to customized or optional rules in later phases.

**Source:** Official rules, The Resistance: Avalon — Indie Boards & Cards, designer Don Eskridge (2012). This doc summarizes the core game only (no expansions or house rules).

- **Official game page (publisher):** [Indie Boards & Cards — The Resistance: Avalon](https://indieboardsandcards.com/our-games/the-resistance-avalon/)
- **Game info & rulebook files:** [BoardGameGeek — The Resistance: Avalon](https://boardgamegeek.com/boardgame/128882/the-resistance-avalon) (see Files section for rulebook PDFs)

---

## Scope of this document

- **What we document:** Official core rules — roles, team sizes, quest sizes, win conditions, night phase, Assassin. Enough to implement and reason about the app.
- **What we don’t document here (for now):** Optional modules (e.g. Lady of the Lake), house rules, or variants. The product roadmap may add support for customized rules later.

---

## Summary (core rules)

### Overview

- **Players:** 5–10.
- **Teams:** Good (Loyal Servants of Arthur) vs Evil (Minions of Mordred). Roles are secret.
- **Good wins:** Complete 3 of 5 quests successfully.
- **Evil wins:** Cause 3 quests to fail, OR (if Good has already won 3 quests) correctly assassinate Merlin.

### Roles

| Role | Team | Night-phase information |
|------|------|-------------------------|
| **Merlin** | Good | Sees all Evil players except Mordred (thumbs up from Minions). Must hide identity or Evil can steal the win. |
| **Percival** | Good | Sees Merlin and Morgana (thumbs up); does not know which is which. |
| **Loyal Servant** | Good | No special knowledge. |
| **Assassin** | Evil | Knows all Evil (except Oberon). At end, if Good won 3 quests, names a player; if Merlin, Evil wins. |
| **Morgana** | Evil | Appears to Percival as Merlin/Morgana. Knows all Evil (except Oberon). |
| **Mordred** | Evil | Unknown to Merlin. Knows all Evil (except Oberon). |
| **Oberon** | Evil | Does not know other Evil; other Evil do not know Oberon. |
| **Minion** | Evil | Generic Evil. Knows all Evil (except Oberon). |

_Excalibur MVP does not show night-phase info in the app; players do that in person or over video._

### Quest (mission) team sizes

Team size per mission and player count:

| Players | Quest 1 | Quest 2 | Quest 3 | Quest 4 | Quest 5 |
|---------|---------|---------|---------|---------|---------|
| 5 | 2 | 3 | 2 | 3 | 3 |
| 6 | 2 | 3 | 4 | 3 | 4 |
| 7 | 2 | 3 | 3 | 4* | 4 |
| 8 | 3 | 4 | 4 | 5* | 5* |
| 9 | 3 | 4 | 4 | 5* | 5* |
| 10 | 3 | 4 | 4 | 5* | 5* |

\* **Two-fail rule:** On missions marked with \*, the quest **fails only if at least two** Fail cards are played. One Fail alone is not enough.

### Game flow (rounds)

1. **Leader** proposes a team of a given size (see table for current quest and player count).
2. **Vote:** All players vote Approve or Reject. Majority Approve → team is locked and goes to the quest. Reject → Leader passes to the next player; new proposal. **If 5 proposals in a row are rejected, Evil wins** (no quest is run).
3. **Quest:** Selected players secretly choose Success or Fail. Cards are revealed. All Success → quest succeeds. One or more Fail → quest fails (except on two-fail quests, where two Fails are required).
4. **Next round:** Leader passes clockwise; repeat for the next quest (1–5). Game ends when 3 quests succeed (Good) or 3 fail (Evil), or after Assassin phase if applicable.

### Assassin phase

- Triggers only if **Good have won 3 quests**.
- The **Assassin** (or Evil collectively) names one player as Merlin.
- If that player is Merlin, **Evil wins** instead. Otherwise Good wins.
