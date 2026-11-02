# Elo model — backtest results

Generated 2026-11-02 by `node model/backtest.js`. Data: ESPN final scores
(regular season, play-in and playoffs) in `backend/data/history-<league>.json`.

**Method.** Walk-forward: every test game is predicted using only games played
before it. K and home advantage were tuned on the first half of the last full
season only; the test period was never used for tuning. Season-to-season
regression is a fixed prior, not tuned. Lower Brier and log loss are better
(50/50 guessing scores 0.2500 and 0.6931).

| League | Test games | Model | Accuracy | Brier ↓ | Log loss ↓ |
|---|---:|---|---:|---:|---:|
| NBA | 753 | **Elo** (K=10, HFA=40) | **70.1%** | **0.1956** | **0.5759** |
| | | Always home (p=0.556) | 55.0% | 0.2476 | 0.6882 |
| | | 50/50 | — | 0.2500 | 0.6931 |
| NFL | 262 | **Elo** (K=18, HFA=45) | **64.5%** | **0.2201** | **0.6288** |
| | | Always home (p=0.556) | 51.9% | 0.2510 | 0.6951 |
| | | 50/50 | — | 0.2500 | 0.6931 |
| MLB | 3708 | **Elo** (K=6, HFA=15) | **54.7%** | **0.2462** | **0.6855** |
| | | Always home (p=0.547) | 53.2% | 0.2492 | 0.6915 |
| | | 50/50 | — | 0.2500 | 0.6931 |
| NHL | 928 | **Elo** (K=2, HFA=15) | **57.5%** | **0.2450** | **0.6832** |
| | | Always home (p=0.523) | 52.9% | 0.2492 | 0.6915 |
| | | 50/50 | — | 0.2500 | 0.6931 |

## Plain verdict

- **NBA**: Elo clearly beats the always-home baseline (log loss −0.1123, accuracy +15.1 pts).
- **NFL**: Elo clearly beats the always-home baseline (log loss −0.0663, accuracy +12.6 pts).
- **MLB**: Elo only barely beats the always-home baseline (log loss −0.0060, accuracy +1.5 pts).
- **NHL**: Elo only barely beats the always-home baseline (log loss −0.0083, accuracy +4.6 pts).

## Test period by season

| League | Period | Games | Accuracy | Brier | Log loss |
|---|---|---:|---:|---:|---:|
| NBA | rest of first season | 661 | 71.1% | 0.1916 | 0.5677 |
| | latest season (to 2026-11-02) | 92 | 63.0% | 0.2238 | 0.6350 |
| NFL | rest of first season | 143 | 67.8% | 0.2129 | 0.6133 |
| | latest season (to 2026-11-02) | 119 | 60.5% | 0.2287 | 0.6474 |
| MLB | rest of first season | 1239 | 55.0% | 0.2459 | 0.6847 |
| | latest season (to 2026-10-29) | 2469 | 54.5% | 0.2464 | 0.6859 |
| NHL | rest of first season | 697 | 56.0% | 0.2460 | 0.6852 |
| | latest season (to 2026-11-02) | 231 | 62.3% | 0.2420 | 0.6771 |

"First season" is the last full season (its second half; the first half was
used for tuning). "Latest season" is the current one: complete for MLB, a few
weeks old for NBA, NFL and NHL, so those rows are small samples. Early-season
games use ratings that were just regressed toward the mean.

**What this does not show.** There is no historical betting-line data here, so
the model is compared with simple baselines, not with the market. Sportsbook
closing lines are much harder to beat than "always pick home"; a model edge
over these baselines is not evidence of an edge over the books.

## Periods and parameters

| League | Tune period (games) | Test period (games) | Chosen parameters |
|---|---|---|---|
| NBA | 2025-10-21 → 2026-01-23 (661) | 2026-01-23 → 2026-11-02 (753) | K=10, HFA=40, revert=0.25 |
| NFL | 2025-09-05 → 2025-11-09 (142) | 2025-11-09 → 2026-11-02 (263; 1 tie not scored) | K=18, HFA=45, revert=0.33 |
| MLB | 2025-03-18 → 2025-06-28 (1238) | 2025-06-28 → 2026-10-29 (3708) | K=6, HFA=15, revert=0.33 |
| NHL | 2025-10-07 → 2026-01-10 (697) | 2026-01-10 → 2026-11-02 (928) | K=2, HFA=15, revert=0.33 |
