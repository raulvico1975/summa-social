# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 10:46
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 2deb4ee
SHA main a publicar: 57f3250

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 57f3250 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 2deb4ee
git push origin prod --force-with-lease
```
