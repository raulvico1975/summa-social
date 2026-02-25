# Rollback Plan (auto) — Summa Social

Generat: 2026-02-25 12:09
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: ce56ff2
SHA main a publicar: 35384c0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 35384c0 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ce56ff2
git push origin prod --force-with-lease
```
