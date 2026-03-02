# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 16:18
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 6cab992
SHA main a publicar: 0f70c0f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 0f70c0f --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 6cab992
git push origin prod --force-with-lease
```
