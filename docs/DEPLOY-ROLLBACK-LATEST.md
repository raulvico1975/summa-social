# Rollback Plan (auto) — Summa Social

Generat: 2026-02-16 17:54
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: db4713c
SHA main a publicar: 3906099

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 3906099 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard db4713c
git push origin prod --force-with-lease
```
