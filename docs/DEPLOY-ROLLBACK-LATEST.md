# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 08:56
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 96ceb25
SHA main a publicar: 32b1a69

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 32b1a69 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 96ceb25
git push origin prod --force-with-lease
```
