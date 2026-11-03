# Typing test analysis

## Character error rate per part

| part | chars | errors (edit ops) | CER |
|---|---|---|---|
| T1a | 247 | 38 | 15% |
| T1b | 196 | 33 | 17% |
| T2a | 193 | 39 | 20% |
| T2b | 209 | skipped | – |
| T3a | 191 | skipped | – |
| T3b | 259 | 56 | 22% |
| T3c | 128 | 36 | 28% |
| T4a | 190 | 107 | 56% |
| T4b | 200 | 61 | 30% |
| T5 | 247 | 74 | 30% |
| **all typed** | 1660 | 444 | **27%** |

## Error categories (letter-level)

- neighbour key (≤1.5 keys away): 219
- other replace (length changed): 128
- extra chars: 39
- missing chars: 28
- hidden letter wrong: 20
- far key: 6
- punctuation/other: 2
- hidden letter wrong (typed its parent): 1
- space vs letter: 1

## Hidden (long-press) letters: wrong / right

- е (under э): wrong 5, right 4
- к (under г): wrong 6, right 3
- п (under б): wrong 2, right 0
- ф (under в): wrong 2, right 2
- щ (under ш): wrong 0, right 1
- ъ (under ь): wrong 2, right 5
- ю (under у): wrong 1, right 0
- ё (under я): wrong 6, right 0

## Top 30 substitutions (intended → typed, count, distance in keys)

- л → о: 27 (distance 1.0)
- д → л: 22 (distance 1.0)
- г → ш: 20 (distance 1.0)
- й → ы: 20 (distance 1.0)
- а → ө: 19 (distance 1.0)
- у → ж: 17 (distance 1.0)
- т → ь: 17 (distance 0.9)
- и → т: 11 (distance 0.9)
- о → р: 11 (distance 1.0)
- н → х: 7 (distance 1.2)
- к → з: 5
- с → м: 5 (distance 0.9)
- р → х: 5 (distance 1.0)
- р → о: 4 (distance 1.0)
- г → р: 4 (distance 1.2)
- я → ы: 3 (distance 1.1)
- ё → с: 3
- ё → ч: 2
- х → и: 2 (distance 1.1)
- ц → у: 2 (distance 1.0)
- ж → э: 2 (distance 1.0)
- э → н: 2 (distance 1.0)
- ө → б: 2 (distance 1.0)
- ү → з: 2 (distance 1.0)
- ү → о: 2 (distance 1.2)
- ф → ц: 2
- е → с: 2
- ц → з: 2 (distance 8.0)
- л → р: 2 (distance 2.0)
- с → ы: 1 (distance 2.4)
