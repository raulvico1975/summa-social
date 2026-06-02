# Rollback Plan (auto) — Summa Social

Generat: 2026-06-02 16:58
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 047a37fe0
SHA branca a publicar (main): 4b2e38397

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 4b2e38397 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 047a37fe0
git push origin prod --force-with-lease
```
