# Rollback Plan (auto) — Summa Social

Generat: 2026-02-17 21:53
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: cee7133
SHA main a publicar: f67e979

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert f67e979 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard cee7133
git push origin prod --force-with-lease
```
