# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 10:49
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 592ae8a
SHA main a publicar: f66e3fa

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert f66e3fa --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 592ae8a
git push origin prod --force-with-lease
```
