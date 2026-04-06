# Rollback Plan (auto) — Summa Social

Generat: 2026-04-06 13:11
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 11e176b5
SHA branca a publicar (codex/hero-flow-identity): 1af6199c

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/hero-flow-identity
git revert 1af6199c --no-edit
git push origin codex/hero-flow-identity
bash scripts/deploy.sh codex/hero-flow-identity
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 11e176b5
git push origin prod --force-with-lease
```
