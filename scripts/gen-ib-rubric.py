import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(root, 'backend-integration/sehs-official-rubric-2026.json')))
out = {"criteria": [{"code": c["code"], "name": c["name"], "maxMarks": c["max_marks"],
  "bands": [{"min": b["band"][0], "max": b["band"][-1], "text": b["text"]} for b in c["band_descriptors"]]} for c in d["criteria"]]}
ts = ("// GENERATED from backend-integration/sehs-official-rubric-2026.json by scripts/gen-ib-rubric.py.\n"
      "// Do not edit by hand; scripts/ib-rubric.test.mjs fails if this drifts from the JSON.\n"
      "export const IB_RUBRIC = " + json.dumps(out, indent=2, ensure_ascii=False) + " as const;\n")
open(os.path.join(root, 'src/lib/ibRubricData.ts'), 'w').write(ts)
