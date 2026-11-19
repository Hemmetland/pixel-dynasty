#!/usr/bin/env python3
"""Build the LEVERANS.md section and manifest lines for one hardware type from a JSON meta file.
usage: mk_leverans.py <meta.json>   (prints markdown to stdout)"""
import json, sys
m = json.load(open(sys.argv[1]))
t = m['type']
out = []
out.append(f"## Hårdvara: {m['title']} i {len(m['gens'])} generationer och tre utseenden (handritat)\n")
out.append(m['intro'] + "\n")
out.append("| Generation | Lanseringsår | Utseende |\n| --- | --- | --- |")
for i, g in enumerate(m['gens'], 1):
    out.append(f"| `g{i}` | {g['years']} | {g['desc']} |")
out.append("")
out.append("**Utseenden (`#1`, `#2`, `#3`):** " + "; ".join(f"`#{i}` {s}" for i, s in enumerate(m['styles'], 1)) + ". Samma form i alla tre, så det är färgvarianter av samma design.\n")
out.append(f"- **Modell:** `assets/hw/{t}/model-g<N>-s<S>.png`, 64x64, hård alfa, 3/4-vy snett uppifrån med ljus uppifrån vänster. Nyckel `hw.{t}.g<N>#<S>`. Motivet är {m['model_size']} px.")
out.append(f"- **Ikon:** `assets/hw/{t}/icon-g<N>-s<S>.png`, 32x32, samma design omritad för 32 px, för plattan med accentfärgen `{m['accent']}`. Nyckel `ui.hw.{t}.g<N>#<S>`. Motivet är {m['icon_size']} px.")
out.append(f"- **Val i spelet:** generation efter lanseringsåret (`yearOf(P.t ?? G.t)`): " + ", ".join(f"g{i} {g['range']}" for i, g in enumerate(m['gens'], 1)) + ". Utseendet väljs fritt, förslag `P.id % 3 + 1`.")
out.append(f"- **Reserv:** den äldre ikonen `ui.hw.{t}` (`assets/ui/hw-{ {'sound':'sound','gpu':'gpu','pc':'pc','cpu':'cpu','handheld':'handheld','console':'console','vr':'vr'}[t] }.png`) finns kvar.")
if m.get('colours'):
    out.append("- **Färger:** " + m['colours'])
out.append("\n```json")
lines = []
for i, g in enumerate(m['gens'], 1):
    for s, sn in enumerate(m['styles'], 1):
        lines.append(f'"hw.{t}.g{i}#{s}": {{ "file": "hw/{t}/model-g{i}-s{s}.png", "fw": 64, "fh": 64, "note": "{m["title"]}, generation {i}, {sn.split(" (")[0]} (Kör)" }}')
        lines.append(f'"ui.hw.{t}.g{i}#{s}": {{ "file": "hw/{t}/icon-g{i}-s{s}.png", "fw": 32, "fh": 32, "note": "{m["title"]}, ikon generation {i}, {sn.split(" (")[0]} (Kör)" }}')
out.append(",\n".join(lines))
out.append("```\n")
out.append("- **Begränsningar:** " + m['limits'] + "\n")
print("\n".join(out))
