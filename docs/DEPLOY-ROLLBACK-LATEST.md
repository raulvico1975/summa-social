# Rollback Plan (auto) — Summa Social

Generat: 2026-03-24 09:52
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a8db7ba6
SHA branca a publicar (codex/release-1-support-docs-20260324): 79997b1e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/release-1-support-docs-20260324
git revert 79997b1e --no-edit
git push origin codex/release-1-support-docs-20260324
bash scripts/deploy.sh codex/release-1-support-docs-20260324
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a8db7ba6
git push origin prod --force-with-lease
```
