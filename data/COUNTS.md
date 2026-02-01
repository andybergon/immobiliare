# Rome Zones - Listing Counts

Generated: 2026-02-01 | Source: immobiliare.it mobile API

```
roma/                                    Website    Local
├── centro/                                1,648        0
│   ├── centro-storico                     1,013        -
│   ├── esquilino                            209        -
│   ├── san-lorenzo                          138        -
│   ├── testaccio                             48        -
│   └── trastevere                           240        -
│
├── nord/                                  1,189        0
│   ├── flaminio                             140        -
│   ├── fleming                              252        -
│   ├── monte-sacro                            ?        -  ← slug mismatch
│   ├── nomentano                              ?        -  ← slug mismatch
│   ├── parioli                              303        -
│   ├── prati                                210        -
│   ├── salario                                ?        -  ← slug mismatch
│   ├── talenti                                ?        -  ← slug mismatch
│   ├── trieste                                ?        -  ← slug mismatch
│   └── vigna-clara                          284        -
│
├── sud/                                   1,195        0
│   ├── ardeatino                              ?        -  ← slug mismatch
│   ├── eur                                  152        -
│   ├── garbatella                           202        -
│   ├── laurentino                             ?        -  ← slug mismatch
│   ├── marconi                              312        -
│   ├── ostiense                             125        -
│   ├── san-paolo                             99        -
│   └── torrino                              305        -
│
├── est/                                   1,434        0
│   ├── appio-latino                         157        -
│   ├── centocelle                           336        -
│   ├── cinecitta                            392        -
│   ├── pietralata                           214        -
│   ├── prenestino                             ?        -  ← slug mismatch
│   ├── san-giovanni                         210        -
│   ├── tiburtino                              ?        -  ← slug mismatch
│   ├── torpignattara                        125        -
│   └── tuscolano                              ?        -  ← slug mismatch
│
├── ovest/                                   498        0
│   ├── aurelio                                ?        -  ← slug mismatch
│   ├── balduina                             313        -
│   ├── boccea                               185        -
│   ├── gianicolense                           ?        -  ← slug mismatch
│   ├── monteverde                             ?        -  ← slug mismatch
│   ├── primavalle                             ?        -  ← slug mismatch
│   └── trionfale                              ?        -  ← slug mismatch
│
├── litorale/                              3,324      100
│   ├── acilia                               407        -
│   ├── axa                                  121      100  ✓ 83%
│   ├── casal-palocco                        207        -
│   ├── infernetto                           538        -
│   ├── lido-di-ostia-castel-fusano        1,013        -
│   ├── ostia-antica                         157        -
│   ├── ostia-levante                        348        -
│   └── ostia-ponente                        533        -
│
└── periferia/                               410        0
    ├── bufalotta                             78        -
    ├── porta-di-roma                         55        -
    ├── tor-bella-monaca                       ?        -  ← slug mismatch
    └── torre-angela                         277        -

─────────────────────────────────────────────────────────
TOTAL (35/51 zones working)                9,698      100
Coverage                                              1%
```

## Summary

| Metric | Value |
|--------|------:|
| Total zones | 51 |
| Working slugs | 35 |
| Slug mismatches | 16 |
| Website listings | ~9,698 |
| Local listings | 100 |
| Coverage | 1% |

## Refresh

```bash
bun run jobs/collect-data/get-counts.ts
```
