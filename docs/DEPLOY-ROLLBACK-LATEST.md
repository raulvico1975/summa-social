# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 18:10
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: aa7407f
SHA main a publicar: 63d5bec

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 63d5bec --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard aa7407f
git push origin prod --force-with-lease
```
