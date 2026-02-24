# Rollback Plan (auto) — Summa Social

Generat: 2026-02-24 12:48
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 84873cf
SHA main a publicar: 9c8a388

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 9c8a388 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 84873cf
git push origin prod --force-with-lease
```
